import {ObjectId} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {getDb} from './db';
import {materialize} from './tenderhut/store';
import {indiaDay,statusOf} from './domain';
import {hash} from './ai/grounding';
import {watchSchema,type Watch} from './workflow-schema';
import type {Bid,Tender} from './schemas';
type Outbox={id:string;ownerId:string;tenderId:string;title:string;url:string;createdAt:string;status:string;email:boolean;sourceKey:string;error?:string;attempts:number;nextAt:Date};
export function reminderDays(date:string,now=new Date()){return Math.round((Date.parse(indiaDay(date))-Date.parse(indiaDay(now.toISOString())))/86400000);}
export function dueLead(days:number,leads:number[]){if(!leads.length)return undefined;if(days<0)return -1;return [...new Set(leads)].sort((a,b)=>a-b).find(lead=>days<=lead);}
export async function monitorOnce(){
 const db=await getDb(),token=randomUUID(),leases=db.collection<{_id:string;token:string;until:Date}>('workerLeases');
 await leases.deleteOne({_id:'monitor',until:{$lt:new Date()}});try{await leases.insertOne({_id:'monitor',token,until:new Date(Date.now()+10*60000)});}catch{return {skipped:true};}
 let errors=0;
 try{
 const watches=await db.collection<Watch&{ownerId:string}>('watches').find({enabled:true}).limit(100).toArray(),allIds=new Set<string>();
 const scopes=new Map<string,{watch:Watch;bids:Bid[];ids:string[]}>();
 for(const raw of watches){const watch=watchSchema.parse(raw),bids=watch.bids?await db.collection<Bid>('bids').find({ownerId:raw.ownerId,stage:{$nin:['won','lost','no-bid']}}).limit(200).toArray():[],saved=watch.saved?await db.collection('favorites').find({ownerId:raw.ownerId}).limit(200).toArray():[],ids=[...new Set([...bids.map(b=>b.tenderId),...saved.map(s=>String(s.tenderId))])].filter(id=>/^th-\d+$/.test(id));ids.forEach(id=>allIds.add(id));scopes.set(raw.ownerId,{watch,bids,ids});}
 const checks=await db.collection<{tenderId:string;nextAt:Date;failures:number}>('monitorChecks').find({tenderId:{$in:[...allIds]}}).toArray();
 const dueIds=[...allIds].filter(id=>!checks.some(c=>c.tenderId===id&&c.nextAt>new Date()));
 const records=await db.collection<Tender>('tenders').find({id:{$in:dueIds}}).sort({checkedAt:1}).limit(20).toArray();
 for(const t of records){let failed=false;try{const result=await materialize(t.id,true);failed=result.freshness.state==='stale';}catch{failed=true;}if(failed)errors++;const failures=failed?(checks.find(c=>c.tenderId===t.id)?.failures||0)+1:0;await db.collection('monitorChecks').updateOne({tenderId:t.id},{$set:{tenderId:t.id,attemptedAt:new Date(),nextAt:new Date(Date.now()+Math.min(21600000,3600000*2**Math.min(failures,3))),failures}},{upsert:true});await leases.updateOne({_id:'monitor',token},{$set:{until:new Date(Date.now()+10*60000)}});}
 const wanted=new Set<string>(),now=new Date(),base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
 const enqueue=async(ownerId:string,tenderId:string,title:string,sourceKey:string,email:boolean,url:string)=>{const id=hash([ownerId,sourceKey]);wanted.add(id);await db.collection<Outbox>('deliveryOutbox').updateOne({id},{$setOnInsert:{id,ownerId,tenderId,title,url,sourceKey,email,createdAt:now.toISOString(),status:'pending',attempts:0,nextAt:now}},{upsert:true});};
 for(const [ownerId,scope] of scopes){const {watch,bids,ids}=scope,tenders=await db.collection<Tender>('tenders').find({id:{$in:ids}}).toArray();
  for(const t of tenders){if(!t.closesAt||!['active','upcoming deadline'].includes(statusOf(t,now)))continue;const days=reminderDays(t.closesAt,now);const lead=dueLead(days,watch.days);if(days>=0&&lead!==undefined)await enqueue(ownerId,t.id,`${t.title}: submission due in ${days} day(s)`,`deadline:${t.id}:${t.closesAt}:${lead}`,watch.email,`${base}/tenders/${t.id}`);}
  for(const b of bids)for(const task of b.tasks){if(task.done||!task.dueAt)continue;const days=reminderDays(task.dueAt,now);const lead=dueLead(days,watch.days);if(lead!==undefined)await enqueue(ownerId,b.tenderId,`${task.title}: ${days<0?'overdue':`due in ${days} day(s)`}`,`task:${b.id}:${task.id}:${task.dueAt}:${lead}`,watch.email,`${base}/bids/${b.id}`);}
  const changes=await db.collection('notifications').find({ownerId,tenderId:{$in:ids},id:{$not:/^reminder:/},createdAt:{$gte:new Date(now.getTime()-86400000).toISOString()}}).toArray();for(const change of changes)await enqueue(ownerId,String(change.tenderId),String(change.title),`change:${change.id}`,watch.email,`${base}/tenders/${change.tenderId}`);
 }
 await db.collection<Outbox>('deliveryOutbox').updateMany({status:{$in:['pending','retry']},id:{$nin:[...wanted]}},{$set:{status:'cancelled',error:'Watch disabled, deadline changed, or work completed'}});
 // An interrupted SMTP handoff has an uncertain outcome; do not automatically send it twice.
 await db.collection<Outbox>('deliveryOutbox').updateMany({status:'sending'},{$set:{status:'delivery uncertain',error:'Worker interrupted during delivery; check the recipient before resending.'}});
 const pending=await db.collection<Outbox>('deliveryOutbox').find({status:{$in:['pending','retry']},nextAt:{$lte:now}}).sort({createdAt:1}).limit(50).toArray();
 for(const item of pending){await leases.updateOne({_id:'monitor',token},{$set:{until:new Date(Date.now()+10*60000)}});const scope=scopes.get(item.ownerId);if(!scope)continue;const currentWatch=watchSchema.parse(await db.collection('watches').findOne({ownerId:item.ownerId})||{});if(!currentWatch.enabled)continue;
  const claimed=await db.collection<Outbox>('deliveryOutbox').updateOne({id:item.id,status:item.status},{$set:{status:'sending'},$inc:{attempts:1}});if(!claimed.matchedCount)continue;
  await db.collection('notifications').updateOne({id:`reminder:${item.id}`},{$setOnInsert:{id:`reminder:${item.id}`,ownerId:item.ownerId,tenderId:item.tenderId,title:item.title,createdAt:item.createdAt,read:false}},{upsert:true});
  if(!currentWatch.email){await db.collection<Outbox>('deliveryOutbox').updateOne({id:item.id},{$set:{status:'in-app delivered'}});continue;}
  const user=await db.collection('user').findOne({_id:new ObjectId(item.ownerId)});
  const sink=process.env.BIDDESK_MAIL_MODE!=='smtp';let attempted=false;
  try{if(!user?.email)throw new Error('Recipient unavailable');const mail={from:process.env.BIDDESK_MAIL_FROM||'BidDesk <biddesk@localhost>',to:String(user.email),subject:item.title,text:`${item.title}\n\n${item.url}`,messageId:`<${item.id}@biddesk>`};
   if(sink){const dir=path.join(process.env.BIDDESK_MAIL_SINK||path.join(process.cwd(),'.local','mail'),hash(process.env.MONGODB_DB||'biddesk'));await mkdir(dir,{recursive:true,mode:0o700});await writeFile(path.join(dir,`${item.id}.json`),JSON.stringify(mail,null,2),{mode:0o600});}
   else{if(!process.env.BIDDESK_SMTP_HOST||!process.env.BIDDESK_MAIL_FROM)throw new Error('Email configuration missing');const transport=nodemailer.createTransport({host:process.env.BIDDESK_SMTP_HOST,port:Number(process.env.BIDDESK_SMTP_PORT||587),secure:process.env.BIDDESK_SMTP_PORT==='465',requireTLS:true,auth:process.env.BIDDESK_SMTP_USER?{user:process.env.BIDDESK_SMTP_USER,pass:process.env.BIDDESK_SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});try{attempted=true;await transport.sendMail(mail);}finally{transport.close();}}
   await db.collection<Outbox>('deliveryOutbox').updateOne({id:item.id},{$set:{status:sink?'local sink delivered':'email delivered',error:''}});
  }catch{errors++;await db.collection<Outbox>('deliveryOutbox').updateOne({id:item.id},{$set:{status:attempted?'delivery uncertain':'retry',error:attempted?'Email outcome uncertain. Check the recipient before resending.':'Delivery configuration or local sink unavailable; retry scheduled',nextAt:new Date(Date.now()+Math.min(3600000,60000*2**item.attempts))}});}
 }
 await db.collection('workerStatus').updateOne({name:'monitor'},{$set:{name:'monitor',at:new Date().toISOString(),error:errors?`${errors} operation(s) need attention`:''}},{upsert:true});return {checked:records.length,errors};
 }finally{await leases.deleteOne({_id:'monitor',token});}
}

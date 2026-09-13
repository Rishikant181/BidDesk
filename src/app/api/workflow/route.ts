import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {account,sameOrigin,json,failure} from '@/lib/http';
import {getDb,getClient} from '@/lib/db';
import {workflowFor,coverageConfig} from '@/lib/workflow';
import {preferencesSchema,evidenceSchema,watchSchema,decisionSchema,submissionSchema,type Evidence} from '@/lib/workflow-schema';
import {AiError} from '@/lib/ai/runtime';
import {createBid,tenderFor} from '@/lib/store';
import {documentFor} from '@/lib/ai/service';
import {privateFile,deleteFile,boundedBody} from '@/lib/files';
import {hash} from '@/lib/ai/grounding';
import {searchSchema} from '@/lib/tenderhut/client';
import type {Bid} from '@/lib/schemas';
import type {BidRecord} from '@/lib/workflow-schema';
import {dateValue} from '@/lib/schemas';
export const runtime='nodejs';
const identifier=z.string().min(1).max(100);
export async function GET(req:Request){try{
 const u=await account(req),db=await getDb(),p=new URL(req.url).searchParams,mode=p.get('mode');
 if(mode==='tender')return json(await workflowFor(u.id,identifier.parse(p.get('id'))));
 if(mode==='documents'){const d=await documentFor(identifier.parse(p.get('id')),u.id),coverage=await db.collection('pageCoverage').find({ownerId:u.id,documentId:d.id,hash:d.hash,config:coverageConfig()}).toArray();return json({document:d,coverage});}
 const [preferences,evidence,searches,watch,worker,deliveries]=await Promise.all([db.collection('matchingPreferences').findOne({ownerId:u.id}),db.collection<Evidence>('evidence').find({ownerId:u.id,deleted:{$ne:true}}).sort({updatedAt:-1}).limit(500).toArray(),db.collection('savedSearches').find({ownerId:u.id}).limit(100).toArray(),db.collection('watches').findOne({ownerId:u.id}),db.collection('workerStatus').findOne({name:'monitor'}),db.collection('deliveryOutbox').find({ownerId:u.id}).sort({createdAt:-1}).limit(20).toArray()]);
 const reviews=await db.collection('reviews').find({ownerId:u.id}).toArray(),outcomes=await db.collection<BidRecord>('bidRecords').find({ownerId:u.id,'submission.outcome':{$in:['won','lost']}},{projection:{tenderId:1,submission:1}}).limit(200).toArray();
 return json({outcomes,preferences:preferencesSchema.parse(preferences||{}),evidence:evidence.map(e=>({...e,usedBy:reviews.filter(r=>r.requirements?.some((v:{evidenceIds?:string[]})=>v.evidenceIds?.includes(e.id))).map(r=>r.tenderId)})),searches,watch:watchSchema.parse(watch||{}),worker:worker?{at:worker.at,error:worker.error}:null,deliveries:deliveries.map(d=>({id:d.id,status:d.status,title:d.title,createdAt:d.createdAt,error:d.error})),ocrAvailable:true});
 }catch(e){return failure(e);}}
export async function POST(req:Request){try{
 sameOrigin(req);const u=await account(req),db=await getDb(),b=JSON.parse((await boundedBody(req,100000)).toString()),action=z.string().parse(b.action),now=new Date().toISOString();
 if(action==='preferences'){await db.collection('matchingPreferences').updateOne({ownerId:u.id},{$set:{ownerId:u.id,...preferencesSchema.parse(b.value)}},{upsert:true});return json({ok:true});}
 if(action==='feedback'){const tenderId=identifier.parse(b.tenderId);await tenderFor(tenderId);await db.collection('matchFeedback').updateOne({ownerId:u.id,tenderId},{$set:{ownerId:u.id,tenderId,relevant:z.boolean().parse(b.relevant),reason:z.string().max(500).parse(b.reason||''),at:now}},{upsert:true});return json({ok:true});}
 if(action==='watch'){await db.collection('watches').updateOne({ownerId:u.id},{$set:{ownerId:u.id,...watchSchema.parse(b.value),updatedAt:now}},{upsert:true});return json({ok:true});}
 if(action==='search.save'){const id=b.id?identifier.parse(b.id):randomUUID(),name=z.string().trim().min(1).max(100).parse(b.name),raw=z.record(z.string(),z.string()).parse(b.filters),parsed=searchSchema.parse(raw);const filters=Object.fromEntries(Object.entries(raw).filter(([key])=>key in parsed||key==='favorites'));delete filters.page;await db.collection('savedSearches').updateOne({id,ownerId:u.id},{$set:{id,ownerId:u.id,name,filters,updatedAt:now}},{upsert:true});return json({ok:true});}
 if(action==='search.delete'){await db.collection('savedSearches').deleteOne({id:identifier.parse(b.id),ownerId:u.id});return json({ok:true});}
 if(action==='evidence.save'){
  const value=evidenceSchema.parse(b.value);dateValue.parse(value.expiresAt);dateValue.parse(value.issuedAt);if(value.fileId)await privateFile(u.id,value.fileId);
  const id=b.id?identifier.parse(b.id):randomUUID();if(b.id){const result=await db.collection<Evidence>('evidence').updateOne({id,ownerId:u.id,revision:z.number().int().parse(b.revision),deleted:{$ne:true}},{$set:{...value,updatedAt:now},$inc:{revision:1}});if(!result.matchedCount)throw new AiError('Evidence changed. Reload before saving.',409);}else await db.collection<Evidence>('evidence').insertOne({...value,id,ownerId:u.id,revision:0,updatedAt:now});return json({ok:true});
 }
 if(action==='evidence.delete'){const result=await db.collection<Evidence>('evidence').findOneAndUpdate({id:identifier.parse(b.id),ownerId:u.id,revision:z.number().int().parse(b.revision)},{$set:{deleted:true,updatedAt:now},$inc:{revision:1}});if(!result)throw new AiError('Evidence changed. Reload.',409);return json({ok:true});}
 if(action==='document.review'||action==='document.delete'){
  const d=await documentFor(identifier.parse(b.documentId),u.id);
  if(action==='document.delete'){await db.collection('aiDocuments').deleteOne({id:d.id,ownerId:u.id});if(d.fileId)await deleteFile(u.id,d.fileId);return json({ok:true});}
  const pages=z.array(z.number().int().positive()).min(1).max(250).parse(b.pages);if(pages.some(page=>!d.pages.some(p=>p.page===page)))throw new AiError('Select existing pages.');
  for(const page of pages)await db.collection('pageCoverage').updateOne({ownerId:u.id,documentId:d.id,page,hash:d.hash,config:coverageConfig()},{$set:{reviewed:z.boolean().parse(b.reviewed),reviewedAt:now}},{upsert:true});return json({ok:true});
 }
 if(action==='ocr'){const {ocrDocument}=await import('@/lib/ocr');return json(await ocrDocument(u.id,identifier.parse(b.documentId),z.array(z.number().int().positive()).min(1).max(10).parse(b.pages)));}
 const tenderId=identifier.parse(b.tenderId),w=await workflowFor(u.id,tenderId);
 if(b.inputHash!==w.inputHash)throw new AiError('Review inputs changed. Reload before saving.',409);
 if(action==='judgment'){
  const input=z.object({requirementId:identifier,outcome:z.enum(['supporting evidence','evidence gap','needs review']),note:z.string().min(10).max(2000),evidence:z.string().min(3).max(1000),evidenceIds:z.array(identifier).max(30).default([])}).parse(b);
  const row=w.rows.find(r=>r.requirement.id===input.requirementId);if(!row)throw new AiError('Requirement unavailable.',404);
  if(input.outcome==='supporting evidence'&&(row.rule.outcome==='not satisfied'||!row.requirement.confirmed))throw new AiError('Confirm the clause and correct failed local checks first.');
  if(input.evidenceIds.some(id=>!w.evidence.some(e=>e.id===id)))throw new AiError('Evidence unavailable.');
  await db.collection('reviewJudgments').updateOne({ownerId:u.id,tenderId,requirementId:input.requirementId},{$set:{...input,ownerId:u.id,tenderId,inputHash:w.inputHash,recordedAt:now}},{upsert:true});return json({ok:true});
 }
 if(action==='task'){
  const row=w.rows.find(r=>r.requirement.id===b.requirementId);if(!row)throw new AiError('Requirement unavailable.',404);const bid=await createBid(w.tender,u.id);if(!bid)throw new AiError('Bid unavailable.');
  const existingTask=bid.tasks.find(t=>t.requirementId===row.requirement.id);if(existingTask?.done&&row.issues.length){const reopened=await db.collection<Bid>('bids').updateOne({id:bid.id,ownerId:u.id,revision:bid.revision,'tasks.id':existingTask.id},{$set:{'tasks.$.done':false,'tasks.$.changed':true,updatedAt:now},$inc:{revision:1}});if(!reopened.matchedCount)throw new AiError('Bid changed. Retry reopening the task.',409);}
  if(!bid.tasks.some(t=>t.requirementId===row.requirement.id)){if(bid.tasks.length>=200)throw new AiError('Maximum 200 tasks.');const result=await db.collection<Bid>('bids').updateOne({id:bid.id,ownerId:u.id,revision:bid.revision,'tasks.requirementId':{$ne:row.requirement.id}},{$push:{tasks:{id:hash([bid.id,row.requirement.id]).slice(0,32),title:row.requirement.label,done:false,changed:false,notes:row.issues.join('\n'),assignee:'',dueAt:'',requirementId:row.requirement.id}},$inc:{revision:1},$set:{updatedAt:now}});if(!result.matchedCount)throw new AiError('Bid changed. Retry creating the task.',409);}return json({bidId:bid.id});
 }
 if(['decision','submission','records'].includes(action)){
  const decision=action==='submission'?undefined:decisionSchema.parse(action==='records'?b.decision:b.value),submission=action==='decision'?undefined:submissionSchema.parse(action==='records'?b.submission:b.value);
  if(submission){dateValue.parse(submission.submittedAt);dateValue.parse(submission.outcomeDate);if(submission.fileId)await privateFile(u.id,submission.fileId);}
  const patch:Partial<BidRecord>={ownerId:u.id,tenderId,updatedAt:now,...(submission?{submission}:{}),...(decision?{decision,inputHash:w.inputHash,decisionHash:w.decisionHash,snapshot:{version:w.tender.currentVersion,status:w.status,issues:w.issues,coverage:w.coverage},reviewer:u.name,decidedAt:now}:{})};
  const session=getClient().startSession();try{await session.withTransaction(async()=>{
   if(w.bidId){const stage=submission?.outcome==='won'?'won':submission?.outcome==='lost'?'lost':submission?.submittedAt||submission?.reference?'submitted':decision?.choice==='no-bid'?'no-bid':undefined;const result=await db.collection<Bid>('bids').updateOne({id:w.bidId,ownerId:u.id,revision:w.bidRevision},{$set:{updatedAt:now,...(stage?{stage}:{} )},$inc:{revision:1}},{session});if(!result.matchedCount)throw new AiError('Bid changed. Reload before saving records.',409);}
   await db.collection<BidRecord>('bidRecords').updateOne({ownerId:u.id,tenderId},{$set:patch,...(decision?{$push:{history:{$each:[{value:decision,inputHash:w.inputHash,status:w.status,issues:w.issues,at:now,reviewer:u.name}],$slice:-100}}}:{})},{upsert:true,session});
  });}finally{await session.endSession();}return json({ok:true});
 }
 throw new AiError('Unknown action.');
 }catch(e){return failure(e);}}

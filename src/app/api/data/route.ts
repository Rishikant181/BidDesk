import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import type { Filter } from "mongodb";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companySchema, tenderSchema, requirementSchema, bidUpdateSchema, resultSchema, type Tender, type Company, type Bid, type Version, type Award } from "@/lib/schemas";
import { createBid, effectiveRequirements, saveTender, tenderFor, visibleTo } from "@/lib/store";
import { csv, statusOf } from "@/lib/domain";
export const runtime="nodejs";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers); headers.set("Cache-Control", "private, no-store");
  return Response.json(data, {...init, headers});
}
async function user(req: Request) {
  const session=await getAuth().api.getSession({headers:req.headers});
  if (!session) throw new Error("UNAUTHORIZED");
  return session.user;
}
function failure(e: unknown) {
  if (e instanceof SyntaxError) return json({error:"Invalid JSON body"},{status:400});
  if (e instanceof ZodError) return json({error:e.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; ")},{status:400});
  const msg=e instanceof Error ? e.message : "Unexpected error";
  if (msg==="NOT_FOUND") return json({error:"Record not found"},{status:404});
  if (msg==="UNAUTHORIZED") return json({error:"Please sign in again"},{status:401});
  if (msg.startsWith("This ") || msg.startsWith("An amendment")) return json({error:msg},{status:409});
  console.error("BidDesk request failed:",e instanceof Error ? e.name : "Error");
  return json({error:"Request could not be completed. Check the database connection and try again."},{status:503});
}
export async function GET(req:Request) {
  try {
    const u=await user(req), db=await getDb(), p=new URL(req.url).searchParams, mode=p.get("mode") || "workspace";
    if (mode==="tender") {
      const t=await tenderFor(p.get("id") || "",u.id);
      const [versions,requirements,review,bid]=await Promise.all([
        db.collection<Version>("versions").find({tenderId:t.id}).sort({observedAt:-1}).limit(50).toArray(),effectiveRequirements(t,u.id),
        db.collection("reviews").findOne({ownerId:u.id,tenderId:t.id}),db.collection<Bid>("bids").findOne({ownerId:u.id,tenderId:t.id}),
      ]);
      return json({tender:t,versions,requirements,notes:review?.notes || "",bid});
    }
    if (mode==="tenders" || mode==="export") {
      const and: Filter<Tender>[]=[visibleTo(u.id)];
      const q=(p.get("q") || "").trim().slice(0,200);
      if (q) and.push({$text:{$search:q}});
      for (const key of ["state","category","authority","country"] as const) if(p.get(key)) and.push({[key]:p.get(key)});
      const min=Number(p.get("min")), max=Number(p.get("max"));
      if (p.get("min") && Number.isFinite(min)) and.push({value:{$gte:min},currency:p.get("currency") || "INR"});
      if (p.get("max") && Number.isFinite(max)) and.push({value:{$lte:max,$ne:null},currency:p.get("currency") || "INR"});
      if(p.get("from")) and.push({closesAt:{$gte:p.get("from")!}});
      if(p.get("to")) and.push({closesAt:{$lte:p.get("to")!+"T23:59:59Z"}});
      if(p.get("favorites")==="true") {
        const fav=await db.collection("favorites").find({ownerId:u.id}).toArray(); and.push({id:{$in:fav.map(f=>f.tenderId)}});
      }
      const sort=p.get("sort") || "newest";
      const sortMap:Record<string,Record<string,1|-1>>={deadline:{closesAt:1,id:1},newest:{publishedAt:-1,id:1},value:{value:-1,id:1},title:{title:1,id:1}};
      const records=await db.collection<Tender>("tenders").find({$and:and},{projection:{documents:0,requirements:0}}).sort(sortMap[sort] || sortMap.deadline).limit(2000).toArray();
      const filtered=records.filter(t=>!p.get("status") || statusOf(t)===p.get("status"));
      if(mode==="export") return new Response(csv(filtered as unknown as Record<string,unknown>[],["title","reference","authority","country","state","category","value","currency","emd","closesAt","sourceUrl","checkedAt"]),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=biddesk-tenders.csv","Cache-Control":"no-store"}});
      const page=Math.max(1,Math.min(100,Number(p.get("page")) || 1)), size=15;
      return json({tenders:filtered.slice((page-1)*size,page*size),total:filtered.length,page,pages:Math.ceil(filtered.length/size),limit:2000});
    }
    const [company,bids,favorites,notifications,tenders,awards,runs]=await Promise.all([
      db.collection("companies").findOne({ownerId:u.id}),db.collection<Bid>("bids").find({ownerId:u.id}).sort({updatedAt:-1}).limit(200).toArray(),
      db.collection("favorites").find({ownerId:u.id}).toArray(),db.collection("notifications").find({ownerId:u.id}).sort({createdAt:-1}).limit(50).toArray(),
      db.collection<Tender>("tenders").find(visibleTo(u.id),{projection:{documents:0,requirements:0}}).sort({closesAt:1}).limit(2000).toArray(),
      db.collection<Award>("awards").find({$or:[{ownerId:null},{ownerId:u.id}]}).limit(500).toArray(),
      db.collection("importRuns").find({$or:[{ownerId:null},{ownerId:u.id}]}).sort({at:-1}).limit(8).toArray(),
    ]);
    return json({user:{id:u.id,name:u.name,email:u.email},company:company ? companySchema.parse(company) : companySchema.parse({}),bids,favorites:favorites.map(f=>f.tenderId),notifications,tenders,awards,runs});
  } catch(e) { return failure(e); }
}
export async function POST(req:Request) {
  try {
    const origin=req.headers.get("origin");
    if (origin && origin!==new URL(req.url).origin && origin!==process.env.BETTER_AUTH_URL) return json({error:"Invalid request origin"},{status:403});
    if (Number(req.headers.get("content-length"))>2000000) return json({error:"Import text exceeds 2 MB"},{status:413});
    const u=await user(req), db=await getDb();
    const text=await req.text(); if(text.length>2000000) return json({error:"Import text exceeds 2 MB"},{status:413});
    const body=JSON.parse(text), action=z.string().parse(body.action), now=new Date().toISOString();
    if(action==="company") {
      const company=companySchema.parse(body.company);
      await db.collection<Company & {ownerId:string}>("companies").updateOne({ownerId:u.id},{$set:{...company,ownerId:u.id}},{upsert:true});
    } else if(action==="favorite") {
      const t=await tenderFor(z.string().parse(body.id),u.id);
      if(z.boolean().parse(body.saved)) await db.collection("favorites").updateOne({ownerId:u.id,tenderId:t.id},{$setOnInsert:{ownerId:u.id,tenderId:t.id}},{upsert:true});
      else await db.collection("favorites").deleteOne({ownerId:u.id,tenderId:t.id});
    } else if(action==="review") {
      const t=await tenderFor(z.string().parse(body.id),u.id);
      const requirements=z.array(requirementSchema).max(100).parse(body.requirements);
      if(new Set(requirements.map(r=>r.id)).size!==requirements.length) return json({error:"Requirement IDs must be unique"},{status:400});
      if(body.version!==t.currentVersion) throw new Error("This tender has changed. Reload before confirming requirements.");
      await db.collection("reviews").updateOne({ownerId:u.id,tenderId:t.id},{$set:{ownerId:u.id,tenderId:t.id,requirements,notes:z.string().max(10000).parse(body.notes || ""),version:t.currentVersion,updatedAt:now}},{upsert:true});
    } else if(action==="bid.create") {
      const bid=await createBid(await tenderFor(z.string().parse(body.id),u.id),u.id); return json({bid});
    } else if(action==="bid.save") {
      const patch=bidUpdateSchema.parse(body.bid), id=z.string().parse(body.id);
      const update=await db.collection<Bid>("bids").updateOne({id,ownerId:u.id,revision:patch.revision},{$set:{...patch,revision:patch.revision+1,updatedAt:now}});
      if(!update.matchedCount) throw new Error("This bid changed or is unavailable. Reload before saving.");
    } else if(action==="bid.sync") {
      const bid=await db.collection<Bid>("bids").findOne({id:z.string().parse(body.id),ownerId:u.id}); if(!bid) throw new Error("NOT_FOUND");
      const t=await tenderFor(bid.tenderId,u.id), requirements=await effectiveRequirements(t,u.id);
      const newTasks=requirements.filter(r=>r.confirmed&&!bid.tasks.some(t=>t.requirementId===r.id)).map(r=>({id:randomUUID(),title:r.label,done:false,assignee:"",dueAt:"",notes:"",requirementId:r.id,changed:false}));
      if(bid.tasks.length+newTasks.length>200) return json({error:"Maximum 200 tasks per bid"},{status:400});
      const updated=await db.collection<Bid>("bids").updateOne({id:bid.id,ownerId:u.id,revision:bid.revision},{$push:{tasks:{$each:newTasks}},$inc:{revision:1},$set:{updatedAt:now}});
      if(!updated.matchedCount) throw new Error("This bid changed. Retry syncing requirements.");
    } else if(action==="import") {
      const records=z.array(z.unknown()).min(1).max(100).parse(body.records);
      const results: {row:number;id?:string;result:string;error?:string}[]=[];
      if(body.existingId && records.length!==1) return json({error:"An amendment import accepts one record"},{status:400});
      for(let i=0;i<records.length;i++) {
        try {
          const parsed=tenderSchema.parse(records[i]);
          const saved=await saveTender(parsed,u.id,body.existingId ? z.string().parse(body.existingId) : undefined);
          const tender=await tenderFor(saved.id,u.id);
          const documentIds=parsed.documents.map(d=>d.analysisDocumentId).filter(Boolean);
          if(documentIds.length)await db.collection("aiDocuments").updateMany({ownerId:u.id,id:{$in:documentIds},tenderId:""},{$set:{tenderId:saved.id,version:tender.currentVersion}});
          results.push({row:i+1,...saved});
        }catch(e) {results.push({row:i+1,result:"rejected",error:e instanceof ZodError ? e.issues.map(i=>i.message).join("; ") : e instanceof Error && e.message==="NOT_FOUND" ? "Only your private tenders can be amended here" : "Import failed; check data and connection"});}
      }
      await db.collection("importRuns").insertOne({ownerId:u.id,at:now,source:"User import",results}); return json({results});
    } else if(action==="award.import") {
      const award=resultSchema.parse(body.award); await db.collection<Award>("awards").insertOne({...award,id:randomUUID(),ownerId:u.id});
    } else if(action==="notifications.read") {
      await db.collection("notifications").updateMany({ownerId:u.id},{$set:{read:true}});
    } else return json({error:"Unknown action"},{status:400});
    return json({ok:true});
  }catch(e) {return failure(e);}
}

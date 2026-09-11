import { createHash, randomUUID } from "node:crypto";
import type { Filter, ClientSession } from "mongodb";
import { getDb, getClient } from "./db";
import { tenderSchema, type Tender, type TenderInput, type Version, type Bid, type Requirement, type Task } from "./schemas";
import { changesBetween, impactedTasks, stableStringify } from "./domain";

export const visibleTo = (ownerId: string): Filter<Tender> => ({$or:[{ownerId:null},{ownerId}]});
export async function tenderFor(id: string, ownerId: string) {
  const db = await getDb();
  const t = await db.collection<Tender>("tenders").findOne({id,...visibleTo(ownerId)});
  if (!t) throw new Error("NOT_FOUND");
  return t;
}
export async function saveTender(raw: unknown, ownerId: string | null, existingId?: string, checkedAt = new Date().toISOString()) {
  const session = getClient().startSession();
  try { return await session.withTransaction(()=>saveVersion(raw,ownerId,existingId,checkedAt,session)); } finally { await session.endSession(); }
}
async function saveVersion(raw:unknown, ownerId:string|null, existingId:string|undefined, checkedAt:string, session:ClientSession) {
  const input = tenderSchema.parse(raw);
  const db = await getDb();
  const existing = await db.collection<Tender>("tenders").findOne(existingId ? {id:existingId,ownerId} : {ownerId,source:input.source,reference:input.reference},{session});
  if (existingId && !existing) throw new Error("NOT_FOUND");
  if (existing && (input.reference !== existing.reference || input.source !== existing.source)) throw new Error("An amendment must retain the source and reference. Import a re-tender separately.");
  const contentHash = createHash("sha256").update(stableStringify(input)).digest("hex");
  const id = existing?.id || randomUUID();
  if (existing && stableStringify(tenderSchema.parse(existing)) === stableStringify(input)) {
    await db.collection<Tender>("tenders").updateOne({id},{$set:{checkedAt}},{session});
    return {id,result:"unchanged"};
  }
  // Include the predecessor so A → B → A remains three distinct observations.
  const hash = createHash("sha256").update(id+(existing?.currentVersion || "")+contentHash).digest("hex");
  const versionId = hash.slice(0,32);
  const observedAt = new Date().toISOString();
  const version: Version = {id:versionId,tenderId:id,ownerId,hash,observedAt,snapshot:input};
  await db.collection<Version>("versions").insertOne(version,{session});
  if (existing) {
    const before = tenderSchema.parse(existing);
    await db.collection("changeEvents").updateOne({id:versionId},{$setOnInsert:{id:versionId,tenderId:id,before,after:input,at:observedAt}},{upsert:true,session});
  }
  const t: Tender = {...input,id,ownerId,currentVersion:versionId,createdAt:existing?.createdAt || observedAt,updatedAt:observedAt,checkedAt};
  // Optimistic version check prevents concurrent imports from overwriting another version.
  if (existing) {
    const changed = await db.collection<Tender>("tenders").replaceOne({id,currentVersion:existing.currentVersion},t,{session});
    if (!changed.matchedCount) throw new Error("This tender changed during import. Reload and retry.");
  } else await db.collection<Tender>("tenders").insertOne(t,{session});
  await reconcileEvents(id,session);
  return {id,result:existing ? "updated" : "imported"};
}
async function reconcileEvents(tenderId: string, session:ClientSession) {
  const db = await getDb();
  const current = await db.collection<Tender>("tenders").findOne({id:tenderId},{session});
  if (!current) return;
  const event = await db.collection<{id:string;tenderId:string;before:TenderInput;after:TenderInput;at:string}>("changeEvents").findOne({id:current.currentVersion},{session});
  if (!event) return;
  const keys = changesBetween(event.before,event.after).map(v=>v.key);
  const bids = await db.collection<Bid>("bids").find({tenderId},{session}).toArray();
  for (const bid of bids) {
    let tasks = impactedTasks(bid.tasks,event.before.requirements,event.after.requirements);
    // Private interpretations of a changed public document require explicit review.
    if (keys.includes("documents")) tasks = tasks.map(t=>t.requirementId ? {...t,done:false,changed:true} : t);
    await db.collection<Bid>("bids").updateOne({id:bid.id,revision:bid.revision},{$set:{tasks,tenderVersion:event.id,updatedAt:event.at},$inc:{revision:1},$push:{events:{at:event.at,message:`Imported update: review ${keys.join(", ")}.`}}},{session});
  }
  const favorites = await db.collection<{ownerId:string;tenderId:string}>("favorites").find({tenderId},{session}).toArray();
  for (const ownerId of new Set([...bids.map(b=>b.ownerId),...favorites.map(f=>f.ownerId)])) {
    const id = `${ownerId}:${event.id}`;
    await db.collection("notifications").updateOne({id},{$setOnInsert:{id,ownerId,tenderId,title:`${event.after.title}: ${keys.join(", ")} changed`,createdAt:event.at,read:false}},{upsert:true,session});
  }
}
export async function effectiveRequirements(t: Tender, ownerId:string): Promise<Requirement[]> {
  const db=await getDb();
  const review=await db.collection<{ownerId:string;tenderId:string;version:string;requirements:Requirement[]}>("reviews").findOne({ownerId,tenderId:t.id});
  if (!review) return t.requirements;
  return review.version===t.currentVersion ? review.requirements : review.requirements.map(r=>({...r,confirmed:false}));
}
export async function createBid(t: Tender, ownerId:string) {
  const db=await getDb(); const now=new Date().toISOString();
  const requirements=await effectiveRequirements(t,ownerId);
  const tasks: Task[]=requirements.filter(r=>r.confirmed).map(r=>({id:randomUUID(),title:r.label,done:false,assignee:"",dueAt:"",notes:"",requirementId:r.id,changed:false}));
  if (!tasks.length) tasks.push({id:randomUUID(),title:"Review original documents and confirm eligibility requirements",done:false,assignee:"",dueAt:"",notes:"",requirementId:"",changed:false});
  const bid: Bid={id:randomUUID(),ownerId,tenderId:t.id,title:t.title,tenderVersion:t.currentVersion,stage:"shortlisted",notes:"",decision:"",tasks,revision:0,createdAt:now,updatedAt:now,events:[]};
  await db.collection<Bid>("bids").updateOne({ownerId,tenderId:t.id},{$setOnInsert:bid},{upsert:true});
  return db.collection<Bid>("bids").findOne({ownerId,tenderId:t.id});
}

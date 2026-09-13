import { MongoClient } from "mongodb";

const globalDb = globalThis as unknown as { biddeskClient?: MongoClient; biddeskConnection?: Promise<MongoClient> };
export function configurationReady() { return Boolean(process.env.MONGODB_URI && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length >= 32); }
export function getClient() {
  if (!process.env.MONGODB_URI) throw new Error("Atlas is not configured. Add MONGODB_URI to .env.local.");
  if (!globalDb.biddeskClient) globalDb.biddeskClient = new MongoClient(process.env.MONGODB_URI, { maxPoolSize:5, minPoolSize:0, maxIdleTimeMS:60000, serverSelectionTimeoutMS:8000 });
  return globalDb.biddeskClient;
}
export async function getDb() {
  if (!globalDb.biddeskConnection) globalDb.biddeskConnection = getClient().connect().catch(error=>{globalDb.biddeskConnection=undefined;throw error;});
  const client = await globalDb.biddeskConnection;
  return client.db(process.env.MONGODB_DB || "biddesk");
}
export async function ensureIndexes() {
  const db = await getDb();
  await Promise.all([
    ...["matchingPreferences","watches"].map(name=>db.collection(name).createIndex({ownerId:1},{unique:true})),
    ...["privateFiles","evidence","savedSearches","deliveryOutbox"].map(name=>db.collection(name).createIndex({id:1},{unique:true})),
    db.collection("pageCoverage").createIndex({ownerId:1,documentId:1,page:1,hash:1,config:1},{unique:true}),
    db.collection("reviewJudgments").createIndex({ownerId:1,tenderId:1,requirementId:1},{unique:true}),
    db.collection("matchFeedback").createIndex({ownerId:1,tenderId:1},{unique:true}),
    db.collection("bidRecords").createIndex({ownerId:1,tenderId:1},{unique:true}),
    db.collection("tenders").createIndex({id:1},{unique:true}),
    db.collection("tenders").createIndex({title:"text",description:"text",reference:"text",authority:"text"}),
    db.collection("tenders").createIndex({closesAt:1,state:1,category:1}),
    db.collection("versions").createIndex({tenderId:1,hash:1},{unique:true}),
    db.collection("favorites").createIndex({ownerId:1,tenderId:1},{unique:true}),
    db.collection("reviews").createIndex({ownerId:1,tenderId:1},{unique:true}),
    db.collection("companies").createIndex({ownerId:1},{unique:true}),
    db.collection("bids").createIndex({ownerId:1,tenderId:1},{unique:true}),
    db.collection("notifications").createIndex({id:1},{unique:true}),
  ]);
}

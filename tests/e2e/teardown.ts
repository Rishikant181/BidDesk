import { readFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import {hash} from "../../src/lib/ai/grounding";
import { MongoClient } from "mongodb";
export default async function teardown() {
 const {name}=JSON.parse(await readFile(".local/e2e-database.json","utf8"));
 if(name!==process.env.BIDDESK_TEST_DB || !/^biddesk_test_[a-f0-9]{16}$/.test(name)) throw new Error("Refusing cleanup outside this run's database");
 const client=new MongoClient(process.env.MONGODB_URI!);
 try { const archives=await client.db(name).collection("attachmentArchives").find({}).toArray();for(const a of archives){const id=String(a._id);if(/^[a-f0-9-]{36}$/.test(id))await rm(`.local/attachments/${id}`,{recursive:true,force:true});}await rm(path.join(process.env.BIDDESK_FILE_ROOT||".local/documents",hash(name)),{recursive:true,force:true});await rm(path.join(process.env.BIDDESK_MAIL_SINK||".local/mail",hash(name)),{recursive:true,force:true});await client.db(name).dropDatabase(); await unlink(".local/e2e-database.json"); } finally { await client.close(); }
}

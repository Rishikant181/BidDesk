import { config } from "dotenv";
config({path:".env.local",quiet:true});
import { readFile } from "node:fs/promises";
import { getDb,getClient,ensureIndexes,configurationReady } from "../src/lib/db";
import { saveTender } from "../src/lib/store";
import { collectIsro } from "../src/lib/ingestion";

async function main() {
  const [command,...args]=process.argv.slice(2);
  if(!configurationReady()) throw new Error("Configuration missing: set MONGODB_URI and a BETTER_AUTH_SECRET of at least 32 characters in .env.local.");
  const db=await getDb(); await db.command({ping:1});
  if(command==="check") {console.log("Atlas connected. Authentication configuration present. Secrets were not printed.");return;}
  await ensureIndexes();
  if(command==="indexes") {console.log("Database indexes ready.");return;}
  let records:unknown[]=[], checkedAt=new Date().toISOString();
  if(command==="import") {
    const file=args[args.indexOf("--file")+1]; if(!file) throw new Error("Provide --file <JSON path>");
    const data=JSON.parse(await readFile(file,"utf8")); records=Array.isArray(data)?data:data.records; checkedAt=data.retrievedAt || checkedAt;
  } else if(command==="refresh") {
    if(args[args.indexOf("--source")+1]!=="isro") throw new Error("Supported source: --source isro");
    try{records=await collectIsro();}catch{await db.collection("importRuns").insertOne({ownerId:null,at:checkedAt,source:"ISRO",status:"failed",message:"Source unavailable; previous data preserved"});throw new Error("ISRO source fetch failed; database records unchanged.");}
  } else throw new Error("Unknown command");
  if(!Array.isArray(records)) throw new Error("Expected JSON array or { records: [...] }");
  const counts:Record<string,number>={imported:0,updated:0,unchanged:0,rejected:0};
  for(const record of records) {
    try{const saved=await saveTender(record,null,undefined,checkedAt);counts[saved.result]++;}catch{counts.rejected++;}
  }
  await db.collection("importRuns").insertOne({ownerId:null,at:new Date().toISOString(),source:command==="refresh"?"ISRO":"Verified metadata import",counts});
  console.log(counts); if(counts.rejected) process.exitCode=1;
}
main().catch(e=>{console.error(e instanceof Error && !/mongo|server|dns|auth/i.test(e.name) ? e.message : "Database operation failed. Check Atlas connectivity and access; credentials omitted.");process.exitCode=1;}).finally(async()=>{try{await getClient().close();}catch{ /* no client configured */ }});

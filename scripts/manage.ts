import { config } from "dotenv";
config({path:".env.local",quiet:true});
import { getDb,getClient,ensureIndexes,configurationReady } from "../src/lib/db";
import {aiConfig} from "../src/lib/ai/runtime";
async function main(){
 const command=process.argv[2];
 if(!["check","indexes","ai-check"].includes(command))throw new Error("Use check, indexes, or ai-check.");
 if(command==="ai-check"){const c=aiConfig();console.log({configured:c.configured,generationModel:c.generationModel,embeddingModel:c.embeddingModel});return;}
 if(!configurationReady())throw new Error("Configure Atlas and authentication in .env.local.");
 await (await getDb()).command({ping:1});
 if(command==="indexes")await ensureIndexes();
 console.log(command==="indexes"?"Database indexes ready.":"Atlas connected. Authentication configuration present.");
}
main().catch(()=>{console.error("Configuration check failed. Check configuration, connectivity and command; credentials omitted.");process.exitCode=1;}).finally(async()=>{if(process.env.MONGODB_URI)await getClient().close();});

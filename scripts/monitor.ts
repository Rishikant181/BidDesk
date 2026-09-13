import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
import {monitorOnce} from '../src/lib/monitor';
import {getClient,ensureIndexes} from '../src/lib/db';
async function main(){await ensureIndexes();do{console.log(await monitorOnce());if(!process.argv.includes('--watch'))break;await new Promise(resolve=>setTimeout(resolve,60000));}while(true);}
main().catch(()=>{console.error('Monitoring failed. Check configuration and worker status.');process.exitCode=1;}).finally(()=>getClient().close());

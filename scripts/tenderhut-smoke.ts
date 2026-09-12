import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
import {sourceFetch,searchSchema,queryFor} from '../src/lib/tenderhut/client';
import {normalize,htmlObservation,detailPath} from '../src/lib/tenderhut/normalize';
import {getClient} from '../src/lib/db';
import {generate} from '../src/lib/ai/provider';
import {explanationSchema} from '../src/lib/ai/contracts';
async function main(){const list=JSON.parse(await sourceFetch('/bids?'+queryFor(searchSchema.parse({q:'software',size:2}))));const observations=list.bids.map((r:unknown)=>normalize(r));if(!observations.length)throw Error('No sample records returned');const first=observations[0],detail=htmlObservation(await sourceFetch(detailPath(first)),first);console.log(JSON.stringify({source:'TenderHut public',total:list.total,records:observations.length,detailIdentity:first.id,detailFields:Object.keys(detail.fields),retrievedAt:new Date().toISOString()}));if(process.argv.includes('--ai')){const text=`Title: ${first.fields.title}\nScope: ${first.fields.description||first.fields.title}`;const result=await generate('operator-public-source-smoke','explain-matches',{capabilities:'We supply software systems and implementation services.',candidates:[{id:first.id,text}],task:'Explain relevance and one limitation using an exact quote from the supplied public metadata. No eligibility claim.'},explanationSchema);const e=result.value.items.find(i=>i.tenderId===first.id);if(!e||!text.includes(e.quote))throw Error('Live AI explanation failed grounding');console.log(JSON.stringify({gemini:'passed',grounded:true,cached:result.cached}));}}
main().catch(e=>{console.error(e instanceof Error?e.message:'Smoke check failed');process.exitCode=1;}).finally(async()=>{if(process.env.MONGODB_URI)await getClient().close();});

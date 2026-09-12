import {companySchema} from '@/lib/schemas';
import {hash} from '@/lib/ai/grounding';
import {getAuth} from '@/lib/auth';
import {getDb} from '@/lib/db';
import {AiError} from '@/lib/ai/runtime';
import {startMatches,prepareRun,finishRun,profileText,type Run} from '@/lib/tenderhut/matching';
import {z} from 'zod';
export const runtime='nodejs';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){const s=await getAuth().api.getSession({headers:req.headers});if(!s)return json({error:'Sign in first.'},401);const r=await (await getDb()).collection<Run>('sourceMatches').findOne({ownerId:s.user.id},{sort:{generatedAt:-1}});if(r){const c=companySchema.parse(await (await getDb()).collection('companies').findOne({ownerId:s.user.id})||{});r.stale=hash(profileText(c))!==r.profileHash;const current=await(await getDb()).collection('tenders').find({id:{$in:r.items.map(t=>t.id)}}).toArray();if(r.items.some(t=>current.find(c=>c.id===t.id)?.currentVersion!==t.version))r.stale=true;}return json(r);}
export async function POST(req:Request){try{if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AiError('Invalid origin',403);const s=await getAuth().api.getSession({headers:req.headers});if(!s)throw new AiError('Sign in first.',401);const b=z.object({action:z.enum(['start','prepare','finish']),runId:z.string().uuid().optional()}).refine(b=>b.action==='start'||!!b.runId,'Run ID required').parse(await req.json());const r=b.action==='start'?await startMatches(s.user.id):b.action==='prepare'?await prepareRun(s.user.id,b.runId!):await finishRun(s.user.id,b.runId!);return json(r);}catch(e){return json({error:e instanceof AiError?e.message:'Matching could not complete. Existing results remain available.'},e instanceof AiError?e.status:400);}}

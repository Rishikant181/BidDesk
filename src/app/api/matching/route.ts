import {getAuth} from '@/lib/auth';
import {AiError} from '@/lib/ai/runtime';
import {startMatches,loadPage,explainPage,visibleRun,latestMatches} from '@/lib/tenderhut/matching';
import {z} from 'zod';
export const runtime='nodejs';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
function failure(e:unknown){return json({error:e instanceof AiError?e.message:e instanceof z.ZodError?'Invalid matching request.':'Matching could not complete. Existing results remain available.'},e instanceof AiError?e.status:e instanceof z.ZodError?400:503);}
export async function GET(req:Request){try{const s=await getAuth().api.getSession({headers:req.headers});if(!s)throw new AiError('Sign in first.',401);return json(await latestMatches(s.user.id));}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new AiError('Invalid origin',403);
 const s=await getAuth().api.getSession({headers:req.headers});if(!s)throw new AiError('Sign in first.',401);
 const b=z.object({action:z.enum(['start','page','explain']),runId:z.string().uuid().optional(),offset:z.number().int().nonnegative().max(30).optional()}).refine(b=>b.action==='start'||!!b.runId,'Run ID required').refine(b=>b.action==='start'||b.offset!==undefined,'Page offset required').parse(await req.json());
 const r=b.action==='start'?await startMatches(s.user.id):b.action==='page'?await loadPage(s.user.id,b.runId!,b.offset!):await explainPage(s.user.id,b.runId!,b.offset!);
 return json(visibleRun(r));
 }catch(e){return failure(e);}}

import {getAuth} from '@/lib/auth';
import {getDb} from '@/lib/db';
import {AiError} from '@/lib/ai/runtime';
import {grant,cleanup,fileFor,analyzeFile,type Archive} from '@/lib/attachments/store';
import {z} from 'zod';
export const runtime='nodejs';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
async function owner(req:Request){const s=await getAuth().api.getSession({headers:req.headers});if(!s)throw new AiError('Sign in first.',401);return s.user.id;}
function fail(e:unknown){return json({error:e instanceof Error?e.message:'Attachment operation failed'},e instanceof AiError?e.status:400);}
export async function GET(req:Request){try{const id=await owner(req),p=new URL(req.url).searchParams;await cleanup();if(p.has('archive')){const f=await fileFor(id,z.string().uuid().parse(p.get('archive')),z.coerce.number().int().min(0).max(99).parse(p.get('index')));return new Response(new Uint8Array(f.data),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.entry.name.split('/').pop()!)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}return json(await (await getDb()).collection<Archive>('attachmentArchives').find({ownerId:id,tenderId:p.get('tenderId')||'',expiresAt:{$gt:new Date()}}).sort({at:-1}).limit(10).toArray());}catch(e){return fail(e);}}
export async function POST(req:Request){try{if(req.headers.get('origin')!==new URL(req.url).origin)throw new AiError('Invalid origin.',403);const id=await owner(req);const b=z.object({action:z.enum(['pair','read']),tenderId:z.string().optional(),archive:z.string().uuid().optional(),index:z.number().int().min(0).max(99).optional()}).parse(await req.json());if(b.action==='pair'){const host=new URL(req.url);if(!['localhost','127.0.0.1'].includes(host.hostname))throw new AiError('Extension transfer is local-only.');const g=await grant(id,b.tenderId!);return json({code:Buffer.from(JSON.stringify({...g,origin:host.origin})).toString('base64url')});}return json(await analyzeFile(id,b.archive!,b.index!));}catch(e){return fail(e);}}

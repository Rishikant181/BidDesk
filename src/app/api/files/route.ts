import {z} from 'zod';
import {account,sameOrigin,failure,json} from '@/lib/http';
import {saveFile,fileBytes,privateFile,boundedBody} from '@/lib/files';
import {extractPdf} from '@/lib/ai/documents';
import {attachPages} from '@/lib/ai/service';
import {tenderFor} from '@/lib/store';
import {getDb} from '@/lib/db';
import {AiError} from '@/lib/ai/runtime';
export const runtime='nodejs';
export async function POST(req:Request){try{sameOrigin(req);const user=await account(req),p=new URL(req.url).searchParams,tenderId=p.get('tenderId');if(tenderId){const t=await tenderFor(tenderId);if(t.currentVersion!==p.get('version'))throw new AiError('Tender changed. Reload before uploading.',409);}
 const bytes=await boundedBody(req,20*1024*1024),parsed=await extractPdf(bytes),file=await saveFile(user.id,z.string().min(1).max(200).parse(p.get('name')),bytes);
 if(!tenderId)return json(file);
 const d=await attachPages(user.id,{name:file.name,pages:parsed.pages},tenderId,p.get('version')!,file.hash);await(await getDb()).collection('aiDocuments').updateOne({id:d.id,ownerId:user.id},{$set:{fileId:file.id}});return json({...d,fileId:file.id});
 }catch(e){return failure(e);}}
export async function GET(req:Request){try{const user=await account(req),id=new URL(req.url).searchParams.get('id')||'',file=await privateFile(user.id,id),bytes=await fileBytes(user.id,id);return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.name)}`}});}catch(e){return failure(e);}}

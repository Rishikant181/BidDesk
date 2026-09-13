import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getDb} from './db';
import {hash} from './ai/grounding';
import {AiError} from './ai/runtime';
export type PrivateFile={id:string;ownerId:string;name:string;hash:string;size:number;createdAt:string;deleted?:boolean};
function location(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new AiError('File unavailable.',404);return path.join(process.env.BIDDESK_FILE_ROOT||path.join(process.cwd(),'.local','documents'),hash(process.env.MONGODB_DB||'biddesk'),id);}
export async function saveFile(ownerId:string,name:string,bytes:Buffer){
 if(bytes.length>20*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-')throw new AiError('Choose a PDF under 20 MB.');
 const id=randomUUID(),file:PrivateFile={id,ownerId,name:name.slice(0,200),hash:hash(bytes.toString('base64')),size:bytes.length,createdAt:new Date().toISOString()};
 await mkdir(path.dirname(location(id)),{recursive:true,mode:0o700});await writeFile(location(id),bytes,{mode:0o600});
 try{await(await getDb()).collection<PrivateFile>('privateFiles').insertOne(file);}catch(e){await rm(location(id),{force:true});throw e;}return file;
}
export async function privateFile(ownerId:string,id:string){const file=await(await getDb()).collection<PrivateFile>('privateFiles').findOne({id,ownerId,deleted:{$ne:true}});if(!file)throw new AiError('File unavailable or deleted.',404);return file;}
export async function fileBytes(ownerId:string,id:string){await privateFile(ownerId,id);try{return await readFile(location(id));}catch{throw new AiError('Original PDF unavailable. Reattach the document.',404);}}
export async function deleteFile(ownerId:string,id:string){await privateFile(ownerId,id);await(await getDb()).collection('privateFiles').updateOne({id,ownerId},{$set:{deleted:true}});await rm(location(id),{force:true});}
export async function boundedBody(req:Request,max:number){const reader=req.body?.getReader();if(!reader)throw new AiError('Empty request.');let size=0;const chunks:Uint8Array[]=[];while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>max){await reader.cancel();throw new AiError('Request exceeds the size limit.',413);}chunks.push(next.value);}return Buffer.concat(chunks);}

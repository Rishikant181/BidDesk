import {spawn} from 'node:child_process';
import path from 'node:path';
import {documentFor} from './ai/service';
import {fileBytes,privateFile} from './files';
import {getDb} from './db';
import {hash} from './ai/grounding';
import {AiError} from './ai/runtime';
import {randomUUID} from 'node:crypto';
export async function ocrDocument(ownerId:string,id:string,pages:number[]){
 const d=await documentFor(id,ownerId);if(!d.fileId)throw new AiError('Reattach the original PDF to use OCR.');if(pages.length>10||pages.some(p=>!d.pages.some(x=>x.page===p)))throw new AiError('Select up to ten existing pages.');
 const db=await getDb(),token=randomUUID(),locks=db.collection<{_id:string;token:string;until:Date}>('ocrLocks');
 try{await locks.insertOne({_id:ownerId,token,until:new Date(Date.now()+90000)});}catch{await locks.deleteOne({_id:ownerId,until:{$lt:new Date()}});throw new AiError('An OCR job is running. Retry after it finishes.',409);}
 try{
 const original=await privateFile(ownerId,d.fileId),bytes=await fileBytes(ownerId,d.fileId),result=await new Promise<{page:number;text:string;confidence:number}[]>((resolve,reject)=>{
  const child=spawn(process.execPath,['--max-old-space-size=512',path.join(process.cwd(),'scripts/ocr-worker.mjs')],{stdio:['pipe','pipe','ignore']});let output='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new AiError('OCR timed out. Select fewer pages.'));},60000);child.stdout.on('data',data=>{output+=data;if(output.length>300000){child.kill('SIGKILL');}});child.on('error',()=>{clearTimeout(timer);reject(new AiError('OCR worker could not start.'));});child.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(new AiError('OCR could not read these pages. Review the original scan.'));try{resolve(JSON.parse(output));}catch{reject(new AiError('OCR returned invalid text.'));}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({pdfBase64:bytes.toString('base64'),pages}));
 });
 const next=d.pages.map(p=>{const r=result.find(x=>x.page===p.page);return r?{page:p.page,text:r.text}:p;});if(next.reduce((n,p)=>n+p.text.length,0)>700000)throw new AiError('Document text limit exceeded.');
 await documentFor(id,ownerId);const updated=await db.collection('aiDocuments').updateOne({id,ownerId,hash:d.hash},{$set:{pages:next,hash:hash([next,original.hash]),ocr:true,warnings:[...d.warnings.filter(w=>!pages.some(p=>w.startsWith(`Page ${p} `))),...result.map(r=>`Page ${r.page} OCR confidence ${Math.round(r.confidence)}%. Check numbers, tables and wording against the original image.`)]}});if(!updated.matchedCount)throw new AiError('Document changed during OCR. Reload.',409);return {ok:true,pages:result.map(r=>({page:r.page,confidence:r.confidence}))};
 }finally{await locks.deleteOne({_id:ownerId,token});}
}

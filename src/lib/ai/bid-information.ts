import {getDb} from '../db';
import {privateFile,fileBytes,type PrivateFile} from '../files';
import {bidInformationSchema,type BidInformationInput} from '../bid-information-schema';
import type {Company,Requirement,Tender} from '../schemas';
import {hash,mergeEligibility} from './grounding';
import {aiConfig,AiError} from './runtime';
import {extractPdf} from './documents';
import {instruction,PROMPT_VERSION,type SourceDocument} from './contracts';
export class SavedInformationError extends AiError {constructor(error:unknown,public savedRevision:number){super(error instanceof Error?error.message:'Your information is saved, but the check failed. Retry this requirement.',error instanceof AiError?error.status:503);}}
export type BidInformation=BidInformationInput&{
 _id:string;ownerId:string;tenderId:string;requirementId:string;revision:number;updatedAt:string;
 fileName:string;fileHash:string;fileText:string;
 assessment?:{inputHash:string;generatedAt:string;item:ReturnType<typeof mergeEligibility>};
};
export type LoadedBidInformation=BidInformation&{fileAvailable:boolean};
export const informationId=(ownerId:string,tenderId:string,requirementId:string)=>hash([ownerId,tenderId,requirementId]);
export function informationFingerprint(info:LoadedBidInformation){return hash([info.text,info.fileId,info.fileHash,info.fileAvailable,info.amount,info.period,info.expiresAt]);}
export function requirementEligibilityHash(t:Tender,r:Requirement,company:Company,documents:SourceDocument[],info:LoadedBidInformation){
 const ids=new Set(r.citations?.map(c=>c.documentId));
 return hash([t.currentVersion,t.closesAt,r,company,documents.filter(d=>ids.has(d.id)).map(d=>[d.id,d.hash]).sort(),informationFingerprint(info),new Date().toISOString().slice(0,10),aiConfig().generationModel,PROMPT_VERSION,instruction]);
}
export function bidEvidence(info:LoadedBidInformation|undefined){
 if(!info)return [];
 const id=`bid:${info.requirementId}`;
 return [
  {id:id+':details',text:info.text},
  {id:id+':pdf',text:info.fileAvailable&&info.fileText?`PDF: ${info.fileName}\n${info.fileText}`:''},
 ].filter(e=>e.text.trim());
}
export async function loadBidInformation(ownerId:string,tenderId:string,requirementIds:string[]):Promise<LoadedBidInformation[]>{
 const db=await getDb(),records=await db.collection<BidInformation>('bidRequirementInformation').find({ownerId,tenderId,requirementId:{$in:requirementIds}}).limit(100).toArray();
 const files=await db.collection<PrivateFile>('privateFiles').find({ownerId,id:{$in:records.map(r=>r.fileId).filter(Boolean)},deleted:{$ne:true}}).toArray();
 return records.map(r=>({...r,fileAvailable:!!r.fileId&&files.some(f=>f.id===r.fileId&&f.hash===r.fileHash)}));
}
export async function saveBidInformation(ownerId:string,tenderId:string,requirementId:string,revision:number,raw:unknown){
 const value=bidInformationSchema.parse(raw),db=await getDb(),collection=db.collection<BidInformation>('bidRequirementInformation'),_id=informationId(ownerId,tenderId,requirementId);
 const previous=await collection.findOne({_id,ownerId});
 if((previous?.revision||0)!==revision)throw new AiError('This requirement’s information changed. Reload it before saving.',409);
 const file=value.fileId?await privateFile(ownerId,value.fileId):null;
 const changedFile=previous?.fileHash!==file?.hash;
 const record:BidInformation={_id,ownerId,tenderId,requirementId,...value,revision:revision+1,updatedAt:new Date().toISOString(),fileName:file?.name||'',fileHash:file?.hash||'',fileText:!changedFile?previous?.fileText||'':'',...(previous?.assessment?{assessment:previous.assessment}:{})};
 // Persist input before extraction/provider work so failed checks can be retried.
 if(previous){const saved=await collection.replaceOne({_id,ownerId,revision},record);if(!saved.matchedCount)throw new AiError('Information changed while saving. Reload and retry.',409);}
 else {try{await collection.insertOne(record);}catch(e){if((e as {code?:number}).code===11000)throw new AiError('Information was saved in another window. Reload and retry.',409);throw e;}}
 try{if(file&&!record.fileText){
  const parsed=await extractPdf(await fileBytes(ownerId,file.id));
  const text=parsed.pages.map(p=>`Page ${p.page}: ${p.text}`).join('\n');
  if(parsed.pages.some(p=>p.text.trim().length<30))throw new AiError('Your information is saved. This PDF has pages without readable text. Replace it with a text-readable PDF excerpt and retry.');
  if(text.length>20000)throw new AiError('Your information is saved. Upload a shorter PDF excerpt (up to 20,000 extracted characters) and retry.');
  record.fileText=text;
  const updated=await collection.updateOne({_id,ownerId,revision:record.revision},{$set:{fileText:text}});
  if(!updated.matchedCount)throw new AiError('Information changed while reading the PDF. Reload and retry.',409);
 }
 }catch(e){throw new SavedInformationError(e,record.revision);}
 return {...record,fileAvailable:!!file};
}
export async function saveRequirementAssessment(info:LoadedBidInformation,inputHash:string,item:ReturnType<typeof mergeEligibility>){
 const result=await(await getDb()).collection<BidInformation>('bidRequirementInformation').updateOne({_id:info._id,ownerId:info.ownerId,revision:info.revision},{$set:{assessment:{inputHash,item,generatedAt:new Date().toISOString()}}});
 if(!result.matchedCount)throw new AiError('Information changed during the check. Your latest details are saved; recheck this requirement.',409);
}

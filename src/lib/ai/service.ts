import {companyForBidRequirement} from '../bid-information-schema';
import {SavedInformationError,loadBidInformation,saveBidInformation,saveRequirementAssessment,requirementEligibilityHash,bidEvidence,informationFingerprint,type LoadedBidInformation} from './bid-information';
import {compareFindings,reconcileFindings,type SavedFindings} from "./conflicts";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {getDb,getClient} from "../db";
import {tenderFor,effectiveRequirements} from "../store";
import {companySchema,requirementSchema,type Tender,type Requirement} from "../schemas";
import {AiError,aiConfig,aiIndexes} from "./runtime";
import {hash,chunkPages,extractionInput,groundedExtraction,mergeExtractions,mergeEligibility,evidenceFor,validCitation} from "./grounding";
import {generate} from "./provider";
import {sourceDocumentSchema,extractionSchema,eligibilitySchema,extractionInstruction,instruction,PROMPT_VERSION,type SourceDocument,type Draft,type Extraction} from "./contracts";

type StoredAnalysis={id:string;ownerId:string;tenderId:string;inputHash:string;generatedAt:string;items:ReturnType<typeof mergeEligibility>[]};
async function currentTender(id:string,version?:string){const t=await tenderFor(id);if(version&&t.currentVersion!==version)throw new AiError("This tender changed. Reload before continuing.",409);return t;}
export async function documentFor(id:string,ownerId:string){const d=await(await getDb()).collection<SourceDocument>("aiDocuments").findOne({id,ownerId});if(!d)throw new AiError("Document not found.",404);await currentTender(d.tenderId,d.version);return d;}
export async function attachPages(ownerId:string,raw:unknown,tenderId:string,version:string,fileHash?:string){await aiIndexes();await currentTender(tenderId,version);const input=z.object({name:z.string().min(1).max(300),pages:z.array(z.object({page:z.number().int().positive(),text:z.string().max(25000)})).min(1).max(250)}).parse(raw);if(new Set(input.pages.map(p=>p.page)).size!==input.pages.length||input.pages.reduce((n,p)=>n+p.text.length,0)>700000)throw new AiError("Invalid pages or excessive text.");const digest=hash([input.pages,fileHash||null]);const d=sourceDocumentSchema.parse({id:hash([ownerId,tenderId,version,digest]).slice(0,32),ownerId,tenderId,version,name:input.name,url:"",hash:digest,retrievedAt:new Date().toISOString(),method:"local-upload",pages:input.pages,totalPages:input.pages.length,warnings:input.pages.filter(p=>p.text.trim().length<30).map(p=>`Page ${p.page} has little or no readable text.`)});const docs=(await getDb()).collection<SourceDocument>("aiDocuments");if(!await docs.findOne({id:d.id,ownerId})&&await docs.countDocuments({ownerId,tenderId,version})>=20)throw new AiError("Maximum 20 documents per tender version. Remove an unused document first.");await docs.updateOne({id:d.id},{$setOnInsert:d},{upsert:true});return d;}
export async function extractChunk(ownerId:string,documentId:string,pages:number[],index:number){const d=await documentFor(documentId,ownerId),chunks=chunkPages(d,pages);if(index<0||index>=chunks.length)throw new AiError("Unknown analysis chunk.");const model=aiConfig().generationModel,inputHash=hash([d.hash,pages,model,PROMPT_VERSION]),id=hash([ownerId,d.id,inputHash]).slice(0,32);const result=await generate(ownerId,"extract",extractionInput(d,chunks[index]),extractionSchema,extractionInstruction);const data=groundedExtraction(result.value,[d]);const db=await getDb();await documentFor(documentId,ownerId);await db.collection<{_id:string;chunks:Record<string,Extraction>}>("aiChunks").updateOne({_id:id},{$set:{[`chunks.${index}`]:data}},{upsert:true});const saved=await db.collection<{_id:string;chunks:Record<string,Extraction>}>("aiChunks").findOne({_id:id});const completed=Object.keys(saved!.chunks).map(Number).sort((a,b)=>a-b);const merged=mergeExtractions(completed.map(i=>saved!.chunks[i]));if(completed.length<chunks.length)merged.warnings.push(`Partial analysis: ${completed.length} of ${chunks.length} chunks completed. Retry to resume.`);merged.warnings.push(...d.warnings,`Only selected pages ${pages.join(", ")} analyzed. Visual content is not interpreted.`);
 const draft:Draft={id,ownerId,tenderId:d.tenderId,version:d.version,inputHash,documentIds:[d.id],documentHashes:[d.hash],data:merged,generatedAt:new Date().toISOString(),model,coverage:[{documentId:d.id,pages:pages.filter(page=>chunks.every((chunk,i)=>!chunk.some(p=>p.page===page)||completed.includes(i)))}]};await db.collection<Draft>("aiDrafts").updateOne({id,ownerId},{$set:draft},{upsert:true});await saveAnalysis(ownerId,draft);const covered=pages.filter(page=>chunks.every((chunk,i)=>!chunk.some(p=>p.page===page)||completed.includes(i)));for(const page of covered)await db.collection("pageCoverage").updateOne({ownerId,documentId:d.id,page,hash:d.hash,config:hash([PROMPT_VERSION,model])},{$set:{analyzed:true},$setOnInsert:{reviewed:false}},{upsert:true});return {draft,saved:true,totalChunks:chunks.length,completed,cached:result.cached};}
export async function state(ownerId:string,id:string){
 const t=await tenderFor(id),db=await getDb(),requirements=await effectiveRequirements(t,ownerId);
 const [documents,drafts,storedFindings,analysis,information]=await Promise.all([
  db.collection<SourceDocument>('aiDocuments').find({ownerId,tenderId:id,version:t.currentVersion}).sort({retrievedAt:-1}).limit(20).toArray(),
  db.collection<Draft>('aiDrafts').find({ownerId,tenderId:id}).sort({generatedAt:-1}).limit(100).toArray(),
  db.collection<SavedFindings>('aiFindings').findOne({ownerId,tenderId:id}),
  db.collection<StoredAnalysis>('aiEligibility').findOne({ownerId,tenderId:id},{sort:{generatedAt:-1}}),loadBidInformation(ownerId,id,requirements.map(r=>r.id)),
 ]);
 const findings=reconcileFindings(t,storedFindings),company=companySchema.parse(await db.collection('companies').findOne({ownerId})||{});
 const inputHash=eligibilityHash(t,requirements,company,documents,findings);
 const items=requirements.flatMap(r=>{
  const info=information.find(i=>i.requirementId===r.id),baseline=analysis?.items.find(i=>i.requirementId===r.id);
  if(info){
   const scoped=companyForBidRequirement(company,r,info);
   const stale=!info.assessment||info.assessment.inputHash!==requirementEligibilityHash(t,r,company,documents,info)||!!info.fileId&&(!info.fileAvailable||!info.fileText);
   return [{...(info.assessment?.item||mergeEligibility(r,scoped,t.closesAt,undefined,documents)),stale,generatedAt:info.assessment?.generatedAt||''}];
  }
  return baseline?[{...baseline,stale:analysis!.inputHash!==inputHash,generatedAt:analysis!.generatedAt}]:[];
 });
 return {version:t.currentVersion,documents,bidInformation:information,drafts:drafts.map(d=>({...d,stale:!d.documentHashes||d.version!==t.currentVersion||d.documentIds.some((id,i)=>!documents.some(doc=>doc.id===id&&doc.hash===d.documentHashes[i]))})),findings:findings?{...findings,stale:findings.version!==t.currentVersion||findings.documentHashes.some(h=>!documents.some(d=>d.hash===h))}:null,analysis:items.length?{id:analysis?.id||'requirement-checks',ownerId,tenderId:id,generatedAt:analysis?.generatedAt||'',items,stale:items.some(i=>i.stale)}:null};
}
async function saveAnalysis(ownerId:string,draft:Draft){
 const db=await getDb(),session=getClient().startSession();
 try{await session.withTransaction(async()=>{
  const t=await db.collection<Tender>('tenders').findOne({id:draft.tenderId,currentVersion:draft.version},{session});
  if(!t)throw new AiError('Tender changed. Reload and analyze again.',409);
  const docs=await db.collection<SourceDocument>('aiDocuments').find({ownerId,tenderId:t.id,version:t.currentVersion},{session}).toArray();
  if(draft.documentIds.some((id,i)=>!docs.some(d=>d.id===id&&d.hash===draft.documentHashes[i])))throw new AiError('Document changed during analysis. Run analysis again.',409);
  // Touch all included documents so concurrent OCR/deletion conflicts with this save.
  for(const id of docs.map(d=>d.id))await db.collection('aiDocuments').updateOne({ownerId,id},{$inc:{findingsRevision:1}},{session});
  const drafts=await db.collection<Draft>('aiDrafts').find({ownerId,tenderId:t.id,version:t.currentVersion},{session}).sort({generatedAt:1}).toArray();
  const valid=drafts.filter(d=>d.documentHashes&&d.documentIds.every((id,i)=>docs.some(doc=>doc.id===id&&doc.hash===d.documentHashes[i])));
  const extracted=mergeExtractions(valid.map(d=>d.data)),review=await db.collection('reviews').findOne({ownerId,tenderId:t.id},{session});
  const existing=((review?.requirements||t.requirements) as Requirement[]).map(r=>review&&review.version!==t.currentVersion?{...r,confirmed:false}:r);
  const additions=extracted.requirements.map(r=>{
   const id=hash([r.label,r.citations]).slice(0,32),prior=existing.find(e=>e.id===id);
   return requirementSchema.parse({...r,id,confirmed:true,importance:prior?.importance!=='unknown'&&prior?.importance?prior.importance:r.importance,evidenceIds:prior?.evidenceIds||[],type:r.complex?'manual':r.type,threshold:r.complex?null:r.threshold,clause:'Extracted from tender document',page:r.citations[0].page,origin:'ai-assisted'});
  });
  const requirements=[...existing.filter(r=>r.origin!=='ai-assisted'),...additions];
  if(requirements.length>100)throw new AiError('Analysis found more than 100 requirements. Remove an unused document and retry.');
  const {conflicts,comparisonNotes}=compareFindings(t,extracted.fields),documentIds=new Set(valid.flatMap(d=>d.documentIds));
  await db.collection('reviews').updateOne({ownerId,tenderId:t.id},{$set:{ownerId,tenderId:t.id,version:t.currentVersion,requirements,notes:review?.notes||'',updatedAt:new Date().toISOString()}},{upsert:true,session});
  await db.collection<SavedFindings>('aiFindings').updateOne({ownerId,tenderId:t.id},{$set:{ownerId,tenderId:t.id,version:t.currentVersion,draftId:draft.id,fields:extracted.fields,requirements:extracted.requirements,conflicts,comparisonNotes,documentHashes:docs.filter(d=>documentIds.has(d.id)).map(d=>d.hash),updatedAt:new Date().toISOString()}},{upsert:true,session});
 });}finally{await session.endSession();}
}
export function eligibilityHash(t:Tender,requirements:Requirement[],company:ReturnType<typeof companySchema.parse>,documents:SourceDocument[],findings:unknown){return hash([t.currentVersion,requirements,company,documents.map(d=>d.hash).sort(),findings,new Date().toISOString().slice(0,10),aiConfig().generationModel,PROMPT_VERSION,instruction]);}
const eligibilityTask='Compare each requirement with the supplied company evidence and only that requirement’s additionalEvidence. Bid-only evidence must never be applied to a different requirement. Financial thresholds and certificate expiry are checked locally; do not override failed local checks. Include routine bid preparation reminders as next actions, not eligibility gaps.';
async function generateEligibility(ownerId:string,requirements:Requirement[],company:ReturnType<typeof companySchema.parse>,documents:SourceDocument[],information:LoadedBidInformation[]){
 const grounded=requirements.filter(r=>r.confirmed&&r.citations?.length&&r.citations.every(c=>validCitation(c,documents)));
 if(!grounded.length)throw new AiError('Analyze a current tender PDF before checking this requirement.');
 const evidence=evidenceFor(company);
 const result=await generate(ownerId,'eligibility',{requirements:grounded.map(r=>({id:r.id,label:r.label,complex:r.complex||false,citations:r.citations,additionalEvidence:bidEvidence(information.find(i=>i.requirementId===r.id))})),evidence,task:eligibilityTask},eligibilitySchema);
 return result;
}
export async function reviewEligibility(ownerId:string,id:string){
 const t=await tenderFor(id),db=await getDb(),requirements=await effectiveRequirements(t,ownerId),company=companySchema.parse(await db.collection('companies').findOne({ownerId})||{});
 const documents=await db.collection<SourceDocument>('aiDocuments').find({ownerId,tenderId:id,version:t.currentVersion}).limit(20).toArray(),findings=reconcileFindings(t,await db.collection<SavedFindings>('aiFindings').findOne({ownerId,tenderId:id})),information=await loadBidInformation(ownerId,id,requirements.map(r=>r.id));
 if(!requirements.length)throw new AiError('Analyze a tender PDF to identify its requirements.');
 if(!evidenceFor(company).length&&!information.some(i=>bidEvidence(i).length))throw new AiError('Add supporting information in your company profile or directly on a requirement.');
 if(information.some(i=>requirements.some(r=>r.id===i.requirementId)&&i.fileId&&(!i.fileAvailable||!i.fileText)))throw new AiError('A bid-only PDF is unavailable or unreadable. Replace or remove it on its requirement and retry.');
 const inputHash=eligibilityHash(t,requirements,company,documents,findings),informationHash=hash(information.map(informationFingerprint));
 const result=await generateEligibility(ownerId,requirements,company,documents,information);
 const items=requirements.map(r=>{const info=information.find(i=>i.requirementId===r.id);return mergeEligibility(r,companyForBidRequirement(company,r,info),t.closesAt,result.value.items.find(x=>x.requirementId===r.id),documents,bidEvidence(info));});
 if(findings?.conflicts?.length)for(const item of items)item.outcome='needs review';
 const current=await state(ownerId,id),refreshedCompany=companySchema.parse(await db.collection('companies').findOne({ownerId})||{});
 if(inputHash!==eligibilityHash(await tenderFor(id),await effectiveRequirements(t,ownerId),refreshedCompany,current.documents,current.findings?Object.fromEntries(Object.entries(current.findings).filter(([k])=>k!=='stale')):null)||informationHash!==hash(current.bidInformation.map(informationFingerprint)))throw new AiError('Inputs changed during the check. Your information is saved; check again.',409);
 for(const info of information){const r=requirements.find(r=>r.id===info.requirementId),item=items.find(i=>i.requirementId===info.requirementId);if(r&&item)await saveRequirementAssessment(info,requirementEligibilityHash(t,r,company,documents,info),item);}
 const analysis={id:randomUUID(),ownerId,tenderId:id,version:t.currentVersion,inputHash,items,generatedAt:new Date().toISOString(),model:aiConfig().generationModel};
 await db.collection('aiEligibility').insertOne(analysis);return {...analysis,cached:result.cached};
}
export async function reviewRequirement(ownerId:string,tenderId:string,requirementId:string,revision:number,expectedRequirementHash:string,value:unknown){
 const t=await tenderFor(tenderId),r=(await effectiveRequirements(t,ownerId)).find(r=>r.id===requirementId);
 if(!r)throw new AiError('Requirement unavailable.',404);
 if(hash(r)!==expectedRequirementHash)throw new AiError('This requirement changed. Reload it before saving.',409);
 const info=await saveBidInformation(ownerId,tenderId,requirementId,revision,value),db=await getDb();
 try{
 const company=companySchema.parse(await db.collection('companies').findOne({ownerId})||{}),documents=await db.collection<SourceDocument>('aiDocuments').find({ownerId,tenderId,version:t.currentVersion}).limit(20).toArray();
 const inputHash=requirementEligibilityHash(t,r,company,documents,info),result=await generateEligibility(ownerId,[r],company,documents,[info]);
 const item=mergeEligibility(r,companyForBidRequirement(company,r,info),t.closesAt,result.value.items.find(i=>i.requirementId===r.id),documents,bidEvidence(info));
 const refreshedTender=await tenderFor(tenderId),refreshedRequirement=(await effectiveRequirements(refreshedTender,ownerId)).find(x=>x.id===requirementId),refreshedInfo=(await loadBidInformation(ownerId,tenderId,[requirementId])).find(i=>i.requirementId===requirementId);
 const refreshedCompany=companySchema.parse(await db.collection('companies').findOne({ownerId})||{}),refreshedDocuments=await db.collection<SourceDocument>('aiDocuments').find({ownerId,tenderId,version:refreshedTender.currentVersion}).toArray();
 if(!refreshedRequirement||!refreshedInfo||inputHash!==requirementEligibilityHash(refreshedTender,refreshedRequirement,refreshedCompany,refreshedDocuments,refreshedInfo))throw new AiError('Inputs changed during the check. Your latest information is saved; recheck this requirement.',409);
 await saveRequirementAssessment(info,inputHash,item);
 return {saved:true,revision:info.revision,item,cached:result.cached};
 }catch(e){throw new SavedInformationError(e,info.revision);}
}

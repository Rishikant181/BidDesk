import {getDb} from './db';
import {tenderFor,effectiveRequirements} from './store';
import {companySchema,dateValue,type Bid} from './schemas';
import {hash,validCitation} from './ai/grounding';
import {state} from './ai/service';
import {calculateReadiness,type ReadinessRow} from './readiness';
import type {Evidence,ReviewJudgment,BidRecord} from './workflow-schema';
import {PROMPT_VERSION} from './ai/contracts';
import {aiConfig} from './ai/runtime';
export const coverageConfig=()=>hash([PROMPT_VERSION,aiConfig().generationModel]);
export async function workflowFor(ownerId:string,tenderId:string){
 const db=await getDb(),t=await tenderFor(tenderId);
 const [requirements,companyRaw,evidence,judgments,bid,ai]=await Promise.all([
  effectiveRequirements(t,ownerId),db.collection('companies').findOne({ownerId}),db.collection<Evidence>('evidence').find({ownerId}).limit(500).toArray(),
  db.collection<ReviewJudgment & {ownerId:string;tenderId:string}>('reviewJudgments').find({ownerId,tenderId}).toArray(),db.collection<Bid>('bids').findOne({ownerId,tenderId}),state(ownerId,tenderId),
 ]);
 const coverage=await db.collection<{ownerId:string;documentId:string;page:number;hash:string;config:string;analyzed?:boolean;reviewed?:boolean}>('pageCoverage').find({ownerId,documentId:{$in:ai.documents.map(d=>d.id)},config:coverageConfig()}).toArray();
 const files=await db.collection('privateFiles').find({ownerId,id:{$in:evidence.map(e=>e.fileId).filter(Boolean)},deleted:{$ne:true}},{projection:{id:1}}).toArray();for(const e of evidence)e.fileMissing=!!e.fileId&&!files.some(f=>f.id===e.fileId);
 const company=companySchema.parse(companyRaw||{});
 const inputHash=hash([t.currentVersion,requirements,company,evidence.map(e=>[e.id,e.revision,e.deleted,e.fileMissing]).sort(),ai.documents.map(d=>[d.id,d.hash]).sort(),ai.findings]);
 const pages=ai.documents.flatMap(d=>d.pages.map(p=>coverage.find(c=>c.documentId===d.id&&c.hash===d.hash&&c.page===p.page&&c.config===coverageConfig())));
 const reviewedFields=ai.findings&&!ai.findings.stale?ai.findings.fields.filter(f=>f.citations.every(c=>validCitation(c,ai.documents))):[];
 const privateDeadline=reviewedFields.find(f=>f.key==='closesAt')?.value;
 const assessedTender=!t.closesAt&&privateDeadline&&dateValue.safeParse(privateDeadline).success?{...t,closesAt:privateDeadline}:t;
 const result=calculateReadiness(assessedTender,requirements,company,evidence,judgments.map(j=>({...j,stale:j.inputHash!==inputHash})),{total:pages.length,analyzed:pages.filter(p=>p?.analyzed).length,reviewed:pages.filter(p=>p?.reviewed).length},bid);
 for(const row of result.rows){if(row.requirement.citations?.some(c=>!validCitation(c,ai.documents))){row.issues.push('Source evidence missing or changed');result.issues.push({key:`missing:${row.requirement.id}`,title:'Source evidence missing or changed',requirementId:row.requirement.id});if(result.status==='Ready for final review')result.status='Blockers outstanding';}}
 const rows:ReadinessRow[]=result.rows.map(r=>{const a=ai.analysis?.items.find(x=>x.requirementId===r.requirement.id);return {...r,ai:a?.ai?{explanation:a.ai.explanation,stale:!!ai.analysis?.stale}:undefined};});
 if(ai.findings?.conflicts.length){result.issues.push(...ai.findings.conflicts.map(title=>({key:`conflict:${title}`,title})));if(result.status==='Ready for final review')result.status='Blockers outstanding';}
 const decisionHash=hash([inputHash,judgments,pages,result.issues]);
 const records=await db.collection<BidRecord>('bidRecords').findOne({ownerId,tenderId});
 return {tender:t,reviewedFields,inputHash,decisionHash,...result,rows,evidence:evidence.filter(e=>!e.deleted),bidId:bid?.id,bidRevision:bid?.revision,records:records?{...records,decisionStale:records.decisionHash!==decisionHash}:null};
}
export type Workflow=Awaited<ReturnType<typeof workflowFor>>;

import { createHash } from "node:crypto";
import { stableStringify, assess } from "../domain";
import { tenderSchema,type Requirement,type Company } from "../schemas";
import { extractionSchema,type SourceDocument,type Citation,type Extraction,type EligibilitySuggestion } from "./contracts";
export const hash=(value:unknown)=>createHash("sha256").update(stableStringify(value)).digest("hex");
export const normalize=(s:string)=>s.normalize("NFKC").replace(/\s+/g," ").trim();
export function validCitation(c:Citation,documents:SourceDocument[]) {const p=documents.find(d=>d.id===c.documentId)?.pages.find(p=>p.page===c.page);return !!p&&normalize(p.text).includes(normalize(c.quote))&&normalize(c.quote).length>=8;}
export function groundedExtraction(raw:unknown,docs:SourceDocument[]):Extraction {
 const data=extractionSchema.parse(raw),warnings=[...data.warnings];
 const fields=data.fields.filter(f=>{if(!f.citations.every(c=>validCitation(c,docs))){warnings.push(`Unsupported citation: ${f.key} omitted.`);return false;}const v=["value","emd","fee"].includes(f.key)?Number(f.value):f.value;const candidate=tenderSchema.safeParse({title:"Review draft",reference:"draft",[f.key]:v});if(!candidate.success){warnings.push(`Invalid ${f.key} omitted.`);return false;}return true;});
 const requirements=data.requirements.filter(r=>{const valid=r.citations.every(c=>validCitation(c,docs));if(!valid)warnings.push(`Unsupported requirement omitted: ${r.label}`);return valid;}).map(r=>r.complex?{...r,type:"manual" as const,threshold:null}:r);
 return {fields,requirements,warnings:[...new Set(warnings)].slice(0,50)};
}
export function chunkPages(d:SourceDocument,selected:number[]) {
 const pages=d.pages.filter(p=>selected.includes(p.page));if(!pages.length||pages.length!==new Set(selected).size)throw new Error("Select existing readable document pages.");
 if(pages.length>30||pages.reduce((n,p)=>n+p.text.length,0)>120000)throw new Error("Select up to 30 pages and 120,000 characters per run.");
 const chunks:SourceDocument["pages"][]=[];let current:SourceDocument["pages"]=[],size=0;
 for(const p of pages){const pieces=p.text.match(/[\s\S]{1,18000}/g)||[""];for(const text of pieces){if(size+text.length>18000&&current.length){chunks.push(current);current=[];size=0;}current.push({...p,text});size+=text.length;}}
 if(current.length)chunks.push(current);if(chunks.length>12)throw new Error("Too many analysis chunks; select fewer pages.");return chunks.map((chunk,i)=>{if(!i)return chunk;const previous=chunks[i-1].at(-1)!;return [{page:previous.page,text:previous.text.slice(-800)},...chunk];});
}
export function mergeExtractions(results:Extraction[]):Extraction {const fields=new Map<string,Extraction["fields"][number]>(),requirements=new Map<string,Extraction["requirements"][number]>(),warnings:string[]=[];for(const r of results){warnings.push(...r.warnings);for(const f of r.fields){const key=f.key+":"+normalize(f.value);if([...fields.values()].some(x=>x.key===f.key&&normalize(x.value)!==normalize(f.value)))warnings.push(`Conflicting ${f.key} values: review original pages.`);fields.set(key,f);}for(const v of r.requirements)requirements.set(hash([v.label,v.citations]),v);}return {fields:[...fields.values()],requirements:[...requirements.values()],warnings:[...new Set(warnings)]};}
export function evidenceFor(company:Company){return [{id:"capabilities",text:company.aiProfile},...company.projects.filter(p=>p.shareWithAI).map(p=>({id:p.id,text:`${p.title}\n${p.scope}\nCompleted: ${p.completedAt||"unknown"}\nEvidence reference (user declared): ${p.evidence||"not supplied"}`}))].filter(x=>x.text.trim());}
export function mergeEligibility(r:Requirement,company:Company,deadline:string,suggestion:EligibilitySuggestion|undefined,docs:SourceDocument[]){const rule=assess(r,company,deadline);const evidenceIds=new Set(evidenceFor(company).map(e=>e.id));const grounded=!!suggestion&&suggestion.requirementId===r.id&&suggestion.citations.length>0&&suggestion.citations.every(c=>validCitation(c,docs)&&r.citations?.some(source=>source.documentId===c.documentId&&source.page===c.page&&normalize(source.quote).includes(normalize(c.quote))))&&suggestion.evidenceIds.every(id=>evidenceIds.has(id));const ai=grounded?suggestion:null;let outcome=rule.outcome;if(r.complex||!r.confirmed||r.origin==="ai-assisted"&&!(r.citations?.length&&r.citations.every(c=>validCitation(c,docs))))outcome="needs review";if(ai?.suggestion==="potential gap"&&outcome==="appears satisfied")outcome="needs review";return {requirementId:r.id,label:r.label,outcome,rule,ai,nextAction:ai?.nextAction||"Review the original condition and supporting evidence."};}
export function cosine(a:number[],b:number[]){if(a.length!==b.length||!a.length)throw new Error("Incompatible embedding dimensions");let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw new Error("Invalid embedding");dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}if(!aa||!bb)return 0;return dot/Math.sqrt(aa*bb);}

// Build the model-facing source explicitly. MongoDB records also carry _id;
// exposing both identifiers lets the model cite an ID the verifier cannot use.
export function extractionInput(document:SourceDocument,pages:SourceDocument["pages"]){
 return {document:{id:document.id,name:document.name,pages},coverage:"Selected text only. Image content and unselected pages have not been reviewed.",citationRule:`Every citation.documentId must be exactly ${document.id}. Copy an exact quote from the cited page; do not use a filename or another identifier.`};
}

// Deterministic fixtures are reachable only through the isolated-test guard in runtime.ts.
// They never stand in for Gemini in the real demo database.
import type {SourceDocument} from "./contracts";
export function stubGenerate(task:string,input:unknown):unknown {
 const data=input as {document?:SourceDocument;requirements?:{id:string;citations?:unknown[]}[];evidence?:{id:string}[];candidates?:{id:string;text:string}[]};
 if(task==="extract"){const d=data.document!,p=d.pages.find(p=>p.text.trim().length>=8)!;const citations=[{documentId:d.id,page:p.page,quote:p.text.trim().slice(0,100)}];return {fields:[{key:"description",value:p.text.slice(0,200),citations}],requirements:[{label:"Test fixture: review source requirement",type:"manual",threshold:null,value:"",period:"",complex:true,citations}],warnings:["Isolated test provider response"]};}
 if(task==="eligibility")return {items:(data.requirements||[]).map(r=>({requirementId:r.id,suggestion:"supporting evidence",explanation:"Test fixture evidence comparison",evidenceIds:(data.evidence||[]).map(e=>e.id),citations:r.citations||[],nextAction:"Review original evidence"}))};
 if(task==="explain-matches")return {items:(data.candidates||[]).map(c=>({tenderId:c.id,reason:"Test fixture matching explanation",gap:"Eligibility still requires review",quote:c.text.slice(0,100)}))};throw new Error("Unknown test task");
}
export function stubEmbedding(text:string){const result=Array(768).fill(0) as number[];const words=text.toLowerCase().replace(/instrumentation|instrument/g,"laboratory").replace(/construction|partition/g,"civil").match(/[a-z]{3,}/g)||[];for(const word of words){let h=0;for(const c of word)h=(h*31+c.charCodeAt(0))>>>0;result[h%768]++;}return result;}

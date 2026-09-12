import type {Tender} from "../schemas";
import type {Extraction} from "./contracts";
import {normalize} from "./grounding";

export function compareFindings(t:Tender,fields:Extraction["fields"]){
 const conflicts:string[]=[],comparisonNotes:string[]=[];
 for(const f of fields){
  if(!["reference","closesAt","value","emd","fee","currency"].includes(f.key))continue;
  const original=t[f.key];if(original==null||String(original)==="")continue;
  const a=normalize(String(original)),b=normalize(f.value);if(a===b)continue;
  if(f.key==="closesAt"){
   const dateOnly=/^\d{4}-\d{2}-\d{2}$/;
   if((dateOnly.test(a)||dateOnly.test(b))&&a.slice(0,10)===b.slice(0,10)){
    comparisonNotes.push(`Deadline dates agree. ${dateOnly.test(b)?"The document suggestion does not establish the deadline time; the source's precise time is retained.":"The document suggestion adds time precision and still requires source review."}`);continue;
   }
   if(!dateOnly.test(a)&&!dateOnly.test(b)&&Number.isFinite(Date.parse(a))&&Date.parse(a)===Date.parse(b))continue;
  }
  if(["value","emd","fee"].includes(f.key)&&Number.isFinite(Number(b))&&Number(a)===Number(b))continue;
  conflicts.push(`${f.key}: source ${original} / document suggestion ${f.value}`);
 }
 return {conflicts,comparisonNotes};
}
export type SavedFindings={ownerId:string;tenderId:string;version:string;draftId:string;fields:Extraction["fields"];conflicts:string[];comparisonNotes?:string[];documentHashes:string[];updatedAt:string};
export function reconcileFindings<T extends SavedFindings>(t:Tender,findings:T|null){
 if(!findings||findings.version!==t.currentVersion||!Array.isArray(findings.fields))return findings;
 return {...findings,...compareFindings(t,findings.fields as Extraction["fields"])};
}

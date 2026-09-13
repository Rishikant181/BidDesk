import type {ReadinessRow} from './readiness';
export function eligibilitySummary(row:ReadinessRow):{status:'Not met'|'Needs information'|'Appears met'|'Not applicable';explanation:string;nextAction:string}{
 const {requirement,rule,judgment,ai,issues,information}=row;
 if(requirement.importance==='not applicable')return {status:'Not applicable',explanation:'This requirement is marked as not applicable to your bid.',nextAction:''};
 if(rule.outcome==='not satisfied')return {status:'Not met',explanation:rule.reason,nextAction:'Correct the details or resolve this gap before bidding.'};
 if(judgment&&!judgment.stale&&judgment.outcome==='evidence gap')return {status:'Not met',explanation:judgment.note,nextAction:'Resolve the recorded evidence gap before bidding.'};
 const missing=issues.find(i=>i==='Linked evidence is missing'||i.includes('expires before the deadline'));
 if(missing)return {status:'Needs information',explanation:missing,nextAction:'Add current evidence for this requirement.'};
 if(information?.fileId&&!information.fileAvailable)return {status:'Needs information',explanation:'Your bid-only PDF is unavailable.',nextAction:'Replace or remove the PDF and recheck this requirement.'};
 if(information?.assessmentStale)return {status:'Needs information',explanation:'Your bid-only information is saved and needs a current check.',nextAction:'Save & recheck this requirement.'};
 if(ai?.stale||judgment?.stale&&issues.includes('Evidence judgment is stale'))return {status:'Needs information',explanation:'Your documents, profile or assessment settings have changed.',nextAction:'Recheck this requirement using your current documents and information.'};
 const explanation=judgment&&!judgment.stale?judgment.note:ai?.explanation||rule.reason;
 if(ai?.suggestion==='potential gap')return {status:'Needs information',explanation,nextAction:ai.nextAction||'Resolve the potential gap before bidding.'};
 if(!issues.length)return {status:'Appears met',explanation,nextAction:ai?.nextAction||''};
 return {status:'Needs information',explanation,nextAction:ai?.nextAction||'Add the missing details or evidence for this requirement.'};
}

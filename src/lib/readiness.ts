import { assess, indiaDay, statusOf } from './domain';
import type { Tender, Requirement, Company, Bid } from './schemas';
import type { Evidence, ReviewJudgment } from './workflow-schema';
export type Coverage = {total:number;analyzed:number;reviewed:number};
export type ReadinessRow = {requirement:Requirement;rule:ReturnType<typeof assess>;judgment?:ReviewJudgment;issues:string[];evidence:Evidence[];ai?:{explanation:string;stale:boolean}};
export type Readiness = {status:'Review incomplete'|'Blockers outstanding'|'Ready for final review';issues:{key:string;title:string;requirementId?:string}[];rows:ReadinessRow[];coverage:Coverage;warnings:string[]};
export function calculateReadiness(t:Tender,requirements:Requirement[],company:Company,evidence:Evidence[],judgments:ReviewJudgment[],coverage:Coverage,bid?:Bid|null,now=new Date()):Readiness {
 const issues:Readiness['issues']=[],warnings:string[]=[];
 if(!requirements.length)issues.push({key:'requirements',title:'Confirm source-backed requirements'});
 if(!coverage.total||coverage.reviewed<coverage.total)issues.push({key:'coverage',title:`Review supplied documents (${coverage.reviewed} of ${coverage.total} pages reviewed)`});
 if(!t.closesAt)issues.push({key:'deadline',title:'Confirm the submission deadline'});
 if(['closed','cancelled','awarded'].includes(statusOf(t,now)))issues.push({key:'deadline',title:'Tender window is closed or unavailable'});
 const rows=requirements.map(requirement=>{
  const r=requirement,linked=(r.evidenceIds||[]).map(id=>evidence.find(e=>e.id===id&&!e.deleted)).filter((e):e is Evidence=>!!e);
  const financial=linked.find(e=>e.type==='financial'&&e.period===r.period&&e.amount!==null),cert=linked.find(e=>e.type==='certification'&&e.title.trim().toLowerCase()===r.value.trim().toLowerCase());
  const facts={...company,...(financial?{turnover:financial.amount,turnoverPeriod:financial.period,turnoverEvidence:financial.fileId&&!financial.fileMissing?financial.title:''}:{}),certifications:cert?[...company.certifications.filter(c=>c.name.trim().toLowerCase()!==r.value.trim().toLowerCase()),{name:cert.title,expiresAt:cert.expiresAt,evidence:cert.fileId&&!cert.fileMissing?cert.title:''}]:company.certifications};
  const rule=assess(r,facts,t.closesAt,now),judgment=judgments.find(j=>j.requirementId===r.id),problems:string[]=[];
  if(!r.confirmed)problems.push('Confirm this clause against its source');
  if(!r.clause&&!r.page&&!r.citations?.length)problems.push('Add a source clause or page reference');
  if(!r.importance||r.importance==='unknown')problems.push('Confirm importance and applicability');
  if(r.importance!=='not applicable'){
   if(rule.outcome==='not satisfied')problems.push(rule.reason);
   if(rule.outcome==='needs review'&&(!judgment||judgment.stale||judgment.outcome!=='supporting evidence'))problems.push('Resolve the evidence review');
   if(judgment?.stale)problems.push('Evidence judgment is stale');
   if(judgment&&!judgment.stale&&judgment.outcome==='evidence gap')problems.push('Human review identified an evidence gap');
   for(const id of r.evidenceIds||[]){const e=evidence.find(e=>e.id===id);if(!e||e.deleted||e.fileMissing)problems.push('Linked evidence is missing');else if(e.expiresAt&&e.expiresAt<(t.closesAt?indiaDay(t.closesAt):indiaDay(now.toISOString())))problems.push(`${e.title} expires before the deadline`);}
  }
  for(const title of problems){if(r.importance==='optional'&&r.confirmed)warnings.push(`${r.label}: ${title}`);else issues.push({key:`${r.id}:${title}`,title,requirementId:r.id});}
  return {requirement:r,rule,judgment,issues:problems,evidence:linked};
 });
 for(const task of bid?.tasks||[])if(task.changed||!task.done&&task.dueAt&&task.dueAt.slice(0,10)<indiaDay(now.toISOString()))issues.push({key:`task:${task.id}`,title:task.changed?`Review changed task: ${task.title}`:`Overdue: ${task.title}`});
 const incomplete=!requirements.length||!coverage.total||coverage.reviewed<coverage.total||rows.some(r=>!r.requirement.confirmed||!r.requirement.importance||r.requirement.importance==='unknown');
 return {status:incomplete?'Review incomplete':issues.length?'Blockers outstanding':'Ready for final review',issues,rows,coverage,warnings};
}

import {describe,it,expect} from 'vitest';
import {calculateReadiness} from '../../src/lib/readiness';
import {companySchema,requirementSchema,tenderSchema,type Tender} from '../../src/lib/schemas';
import {evidenceSchema,preferencesSchema,type Evidence} from '../../src/lib/workflow-schema';
import {parsePageSelection,pageBatches} from '../../src/lib/document-pages';
import {calendarFile} from '../../src/lib/calendar';
import {relevance} from '../../src/lib/match-relevance';
const t:Tender={...tenderSchema.parse({title:'Laboratory instrumentation',reference:'R',closesAt:'2099-12-01'}),id:'th-1',currentVersion:'v1',createdAt:'2026-01-01',updatedAt:'2026-01-01',checkedAt:'2026-01-01'},c=companySchema.parse({aiProfile:'Laboratory instruments and measurement'}),coverage={total:1,analyzed:1,reviewed:1};
const r=requirementSchema.parse({id:'r',label:'Turnover',type:'turnover',threshold:100,value:'INR',period:'FY26',clause:'4.1',confirmed:true,importance:'mandatory'});
const financial:Evidence={...evidenceSchema.parse({title:'Accounts FY26',type:'financial',period:'FY26',amount:120,fileId:'file'}),id:'e',ownerId:'u',revision:0,updatedAt:'2026-01-01'};
describe('preparation readiness',()=>{
 it('never treats empty requirements or unknown coverage as ready',()=>{expect(calculateReadiness(t,[],c,[],[],coverage).status).toBe('Review incomplete');expect(calculateReadiness(t,[r],c,[],[],{total:0,analyzed:0,reviewed:0}).status).toBe('Review incomplete');});
 it('uses the linked financial period without changing company facts',()=>{const result=calculateReadiness(t,[{...r,evidenceIds:['e']}],c,[financial],[],coverage);expect(result.rows[0].rule.outcome).toBe('appears satisfied');expect(result.status).toBe('Ready for final review');expect(c.turnover).toBeNull();});
 it('does not let a supporting judgment override financial failure',()=>{const result=calculateReadiness(t,[{...r,evidenceIds:['e']}],c,[{...financial,amount:99}],[{requirementId:'r',outcome:'supporting evidence',note:'Reviewed',evidence:'accounts',evidenceIds:['e'],inputHash:'h',recordedAt:'now'}],coverage);expect(result.status).toBe('Blockers outstanding');});
 it('keeps stale judgments and missing linked evidence unresolved',()=>{const manual={...r,type:'manual' as const,evidenceIds:['missing']};const result=calculateReadiness(t,[manual],c,[],[{requirementId:'r',outcome:'supporting evidence',note:'Reviewed',evidence:'project',evidenceIds:[],inputHash:'h',recordedAt:'now',stale:true}],coverage);expect(result.issues.map(i=>i.title)).toContain('Evidence judgment is stale');expect(result.issues.map(i=>i.title)).toContain('Linked evidence is missing');});
 it('keeps confirmed optional gaps as warnings',()=>{const result=calculateReadiness(t,[{...r,importance:'optional'}],c,[],[],coverage);expect(result.status).toBe('Ready for final review');expect(result.warnings.length).toBeGreaterThan(0);});
 it('checks evidence expiry against the bid deadline',()=>{const result=calculateReadiness(t,[{...r,evidenceIds:['e']}],c,[{...financial,expiresAt:'2099-11-30'}],[],coverage);expect(result.status).toBe('Blockers outstanding');});
});
describe('document coverage and calendars',()=>{
 it('parses deduplicated ranges and rejects invalid pages',()=>{expect(parsePageSelection('1-3,2,5',5)).toEqual([1,2,3,5]);for(const v of ['0','5-2','1-300','x'])expect(()=>parsePageSelection(v,250)).toThrow();});
 it('batches remaining pages within page and character limits',()=>{const batches=pageBatches(Array.from({length:35},(_,i)=>({page:i+1,characters:25000})));expect(batches.flat()).toHaveLength(35);expect(batches.every(b=>b.length<=4)).toBe(true);});
 it('exports all-day and timestamp deadlines without invented local times',()=>{const value=calendarFile([{id:'one',title:'Review, source\nAgain',date:'2026-09-14',url:'https://example.test'},{id:'two',title:'Submit',date:'2026-09-14T12:00:00+05:30',url:'https://example.test'}],new Date('2026-09-13T00:00:00Z'));expect(value).toContain('DTSTART;VALUE=DATE:20260914');expect(value).toContain('DTSTART:20260914T063000Z');expect(value).toContain('Review\\, source\\nAgain');});
});
describe('matching preferences',()=>{
 it('retains unknown values under strict preferences',()=>{const p=preferencesSchema.parse({minValue:100,strictValue:true});expect(relevance(t,c,p)?.quality).toContain('Comparable value unknown');expect(relevance({...t,value:50},c,p)).toBeNull();});
 it('honors excluded work and explicit negative feedback',()=>{expect(relevance(t,c,preferencesSchema.parse({excludedWork:['laboratory']}))).toBeNull();expect(relevance(t,c,preferencesSchema.parse({}),false)).toBeNull();});
 it('ranks a labeled relevant notice over an unrelated one with synonyms',()=>{const p=preferencesSchema.parse({});const relevant=relevance({...t,title:'Lab measurement systems',description:'Supply precision instruments'},c,p)!;const unrelated=relevance({...t,title:'Road paving',description:'Bitumen supply'},c,p)!;expect(relevant.score).toBeGreaterThan(unrelated.score);});
});
it('improves top-one selection over the old keyword baseline on a fixed labeled fixture set',()=>{
 const cases=[{profile:'laboratory instruments measurement',relevant:{title:'Lab testing devices',description:'Precision equipment'},noise:{title:'Office furniture',description:'Furniture for a laboratory'}},{profile:'construction building',relevant:{title:'Building refurbishment',description:'Repair public facilities'},noise:{title:'IT documentation',description:'Documentation mentioning construction and building'}},{profile:'solar photovoltaic',relevant:{title:'Photovoltaic panels',description:'Supply panels'},noise:{title:'Office staffing',description:'Staffing for solar photovoltaic offices'}}];
 let oldCorrect=0,newCorrect=0;for(const sample of cases){const company=companySchema.parse({aiProfile:sample.profile}),items=[{...t,...sample.noise,label:false},{...t,...sample.relevant,label:true}],terms=sample.profile.split(' '),baseline=(item:Tender)=>terms.filter(term=>`${item.title} ${item.description}`.toLowerCase().includes(term)).length;oldCorrect+=Number([...items].sort((a,b)=>baseline(b)-baseline(a))[0].label);newCorrect+=Number([...items].sort((a,b)=>relevance(b,company,preferencesSchema.parse({}))!.score-relevance(a,company,preferencesSchema.parse({}))!.score)[0].label);}expect(newCorrect).toBe(cases.length);expect(newCorrect).toBeGreaterThan(oldCorrect);
});

import {describe,it,expect} from 'vitest';
import {pageExplanationSchema,visibleRun,profileHash,type Run,type Item} from '../../src/lib/tenderhut/matching';
import {companySchema} from '../../src/lib/schemas';
import {providerSchema} from '../../src/lib/ai/provider-schema';
const item=(i:number):Item=>({id:`th-${i}`,title:`Tender ${i}`,text:`Public scope for tender ${i}: software delivery and maintenance.`,version:'v',sourceUrl:'',checkedAt:'',rank:i+1,score:1,quality:'Semantic relevance'});
const explanation=(t:Item)=>({tenderId:t.id,reason:'Capabilities fit the stated scope.',gap:'Verify eligibility separately.',quote:t.text});
describe('matching explanation pages',()=>{
 it('requires every requested identity exactly once with a grounded quote',()=>{
  const items=Array.from({length:5},(_,i)=>item(i)),schema=pageExplanationSchema(items),valid=items.map(explanation);
  expect(schema.safeParse({items:valid}).success).toBe(true);
  for(const entries of [valid.slice(0,4),[...valid.slice(0,4),valid[0]],[...valid.slice(0,4),{...valid[4],tenderId:'th-other'}],[...valid.slice(0,4),{...valid[4],quote:'Unsupported source quote'}],[...valid.slice(0,4),{...valid[4],reason:' '}]] )expect(schema.safeParse({items:entries}).success).toBe(false);
  expect(providerSchema(schema)).toHaveProperty('properties.items');
 });
 it('returns loaded cards before explanations,, excluding future candidates and model inputs',()=>{
  const items=Array.from({length:25},(_,i)=>item(i));for(const t of items.slice(0,10))t.explanation=explanation(t);
  const r:Run={_id:'run',ownerId:'private',format:'progressive-pages',profile:'private capability input',profileHash:'hash',queries:['software'],items,retrieved:100,warnings:[],generatedAt:'',shown:10,expiresAt:new Date()};
  const v=visibleRun(r);expect(v.items).toHaveLength(10);expect(v.hasMore).toBe(true);expect(v.total).toBe(25);expect(v).not.toHaveProperty('profile');expect(v.items[0]).not.toHaveProperty('text');
  expect(visibleRun({...r,shown:0}).items).toHaveLength(0);
  expect(visibleRun({...r,shown:11}).items[10].explanation).toBeUndefined();
  for(const t of items)t.explanation=explanation(t);expect(visibleRun({...r,shown:25}).hasMore).toBe(false);
 });
 it('invalidates pagination when region preferences change',()=>{const c=companySchema.parse({aiProfile:'Software delivery and maintenance capabilities',categories:'software',regions:['Gujarat']});expect(profileHash(c)).not.toBe(profileHash({...c,regions:['Karnataka']}));});
});

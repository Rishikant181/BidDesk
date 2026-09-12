import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {normalize,htmlObservation,mergeFields,date} from '../../src/lib/tenderhut/normalize';
import {searchSchema,queryFor} from '../../src/lib/tenderhut/client';
import {planSearches} from '../../src/lib/tenderhut/matching';
import {companySchema} from '../../src/lib/schemas';
const sample=JSON.parse(readFileSync('tests/fixtures/tenderhut-list.json','utf8')).bids[0];const html=readFileSync('tests/fixtures/tenderhut-detail.html','utf8');
describe('TenderHut source boundaries',()=>{
 it('maps stable IDs, unknown amounts and missing nationwide location',()=>{const o=normalize(sample);expect(o.id).toBe('th-6732969');expect(o.fields.value).toBeNull();expect(o.fields.state).toBe('');expect(o.fields.sourceUrl).toContain('158898');});
 it('decodes detail strings and Indian currency without turning zero fees into unknown',()=>{const o=normalize({...sample,estimated_value:'3,08,438',detail_json:JSON.stringify({'Tender Fee in ₹':'0.00','EMD Amount in ₹':'6,169','Work Description':'Actual scope'})});expect(o.fields.value).toBe(308438);expect(o.fields.fee).toBe(0);expect(o.fields.emd).toBe(6169);});
 it('rejects invalid calendar dates and preserves date-only precision',()=>{expect(date('2026-02-30')).toBe('');expect(date('2026-09-12 17:00')).toBe('2026-09-12');});
 it('extracts only the current tender and validates provider identity',()=>{const o=htmlObservation(html,normalize(sample));expect(o.fields.title).toBe(sample.items);expect(o.fields.reference).toBe('1000464360');expect(o.fields.sourceUrl).toContain('158898');expect(o.raw['Publish date']).toBe('2026-09-07');expect(o.fields.value).toBeUndefined();expect(()=>htmlObservation(html,{...normalize(sample),id:'th-1'})).toThrow();expect(()=>htmlObservation('<html>Login</html>',normalize(sample))).toThrow();});
 it('reads actual rich financial labels and preserves raw date times',()=>{const base=normalize({...sample,id:4346054,source:'etenders_central',slug:'2026-aai-288117-1'});const o=htmlObservation(readFileSync('tests/fixtures/tenderhut-rich-detail.html','utf8'),base);expect(o.fields.value).toBe(195000);expect(o.fields.emd).toBe(167000);expect(o.fields.fee).toBe(10000);expect(o.raw['Closing date']).toBe('2026-09-16 17:00');expect(o.raw.categories.split(',')).toHaveLength(3);});
 it('preserves richer fields when a later response is sparse',()=>{expect(mergeFields({description:'Full scope',fee:300},{title:'New title',description:'',fee:null})).toEqual({description:'Full scope',fee:300,title:'New title'});});
 it('validates search limits and encodes categories',()=>{const q=queryFor(searchSchema.parse({category:'Buildings & Structures',page:2}));expect(q).toContain('offset=15');expect(q).toContain('category=Buildings+%26+Structures');expect(()=>searchSchema.parse({size:500})).toThrow();expect(()=>searchSchema.parse({min:100,max:20})).toThrow();});
 it('derives bounded searches without including private financial evidence',()=>{const c=companySchema.parse({aiProfile:'We provide software monitoring and industrial controls',categories:'software, monitoring, controls, maintenance',turnoverEvidence:'PRIVATE'});const queries=planSearches(c);expect(queries).toHaveLength(3);expect(JSON.stringify(queries)).not.toContain('PRIVATE');});
});

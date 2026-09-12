import {load} from 'cheerio';
import {z} from 'zod';
import {tenderSchema,type Tender,type TenderInput} from '../schemas';
export type Observation={id:string;source:string;slug:string;fields:Partial<TenderInput>;raw:Record<string,string>;at:string;surface:'json'|'html'};
export type Freshness={state:'fresh'|'stale';fetchedAt:string;warning?:string};
export const externalId=z.string().regex(/^th-\d{1,16}$/);
export const recordSchema=z.object({id:z.number().int().positive(),source:z.string().min(1).max(100),slug:z.string().min(1).max(300),bid_no:z.string().min(1).max(300),items:z.string().min(3).max(1000)}).catchall(z.unknown());
export function text(v:unknown){return typeof v==='string'?v.trim():typeof v==='number'?String(v):'';}
export function amount(v:unknown){const s=text(v).replace(/[,₹\s]/g,'');return /^\d+(\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;}
export function date(v:unknown){const s=text(v);const day=s.match(/^\d{4}-\d{2}-\d{2}/)?.[0];if(!day)return '';return !Number.isNaN(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day?day:'';}
export function url(v:unknown){try{const u=new URL(text(v));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function normalize(input:unknown,at=new Date().toISOString()):Observation{
 const r=recordSchema.parse(input);let detail:Record<string,unknown>={};try{const parsed=JSON.parse(text(r.detail_json)||'{}');if(parsed&&!Array.isArray(parsed)&&typeof parsed==='object')detail=parsed;}catch{}
 const raw:Record<string,string>={};for(const [k,v] of Object.entries({...r,...detail})){const s=text(v);if(s&&s.length<=30000)raw[k]=s;}const fields:Partial<TenderInput>={title:r.items,reference:r.bid_no,source:'Public notice',sourceUrl:url(r.url),authority:text(r.organisation)||text(r.department),description:text(detail['Work Description']).slice(0,30000),category:text(r.categories).split(',')[0]?.trim().slice(0,100)||'Unclassified',state:text(r.state)==='National'?'':text(r.state),city:text(r.location).slice(0,100),publishedAt:date(r.start_date),closesAt:date(r.end_date),value:amount(r.value_inr)??(amount(r.estimated_value)||null),emd:amount(r.emd_amount)??amount(detail['EMD Amount in ₹']),fee:amount(r.tender_fee)??amount(detail['Tender Fee in ₹']),sourceNote:'Metadata from source portal. Verify the official notice. Date-only displays do not establish an exact deadline time.'};
 return {id:`th-${r.id}`,source:r.source,slug:r.slug,fields,raw,at,surface:'json'};
}
export function htmlObservation(html:string,base:Observation,at=new Date().toISOString()):Observation{
 const $=load(html);const canonical=$('link[rel=canonical]').attr('href');if(!canonical||new URL(canonical).pathname!==detailPath(base))throw new Error('Tender page identity changed.');
 const ids=$('main > .cta-row a').toArray().map(e=>{try{return new URL($(e).attr('href')||'').searchParams.get('bid');}catch{return null;}});if(!ids.includes(base.id.slice(3)))throw new Error('Tender page identity could not be verified.');
 const title=$('.extract-body h1').first().text().trim();if(title.length<3||!$('.fields-card').length)throw new Error('Tender page layout is unavailable.');
 const raw:Record<string,string>={};$('.fields-card dl.fields dt').each((_,e)=>{raw[$(e).text().trim()]=$(e).next('dd').text().trim();});
 const fields:Partial<TenderInput>={title};const mapping={reference:'Tender ID',authority:'Organisation',city:'Location'} as const;for(const [key,label] of Object.entries(mapping))if(raw[label])Object.assign(fields,{[key]:raw[label].slice(0,key==='city'?100:600)});
 for(const [key,label] of [['publishedAt','Publish date'],['closesAt','Closing date']] as const)if(date(raw[label]))fields[key]=date(raw[label]);
 for(const [key,label] of [['value','Tender value'],['emd','EMD'],['fee','Tender fee']] as const)if(amount(raw[label])!==null)fields[key]=amount(raw[label]);
 const categories=$('.fields-card dd .tag').toArray().map(e=>$(e).text().trim());if(categories.length){raw.categories=categories.join(', ');fields.category=categories[0];}
 const source=$('main > .cta-row a').toArray().find(e=>$(e).text().includes('View on source portal'));if(source&&url($(source).attr('href')))fields.sourceUrl=url($(source).attr('href'));
 const note=$('main > .doc-note').text().trim();if(note)raw.attachmentNotice=note;
 return {...base,fields,raw,at,surface:'html'};
}
export function detailPath(o:Pick<Observation,'source'|'slug'>){if(!/^[a-z0-9_]+$/.test(o.source)||! /^[a-z0-9-]+$/i.test(o.slug))throw new Error('Invalid tender path.');return `/tender/${o.source}/${o.slug}`;}
export function mergeFields(old:Partial<TenderInput>,incoming:Partial<TenderInput>){const next={...old};for(const [k,v] of Object.entries(incoming))if(v!==''&&v!==null&&v!==undefined)Object.assign(next,{[k]:v});return next;}
export function asTender(o:Observation):Tender{return {...tenderSchema.parse(o.fields),id:o.id,ownerId:null,currentVersion:'unmaterialized',createdAt:o.at,updatedAt:o.at,checkedAt:o.at};}

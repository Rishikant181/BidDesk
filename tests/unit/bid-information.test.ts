import {it,expect} from 'vitest';
import {bidInformationSchema,companyForBidRequirement} from '../../src/lib/bid-information-schema';
import {bidEvidence,informationFingerprint,requirementEligibilityHash,type LoadedBidInformation} from '../../src/lib/ai/bid-information';
import {mergeEligibility} from '../../src/lib/ai/grounding';
import {companySchema,requirementSchema,tenderSchema} from '../../src/lib/schemas';
import {sourceDocumentSchema} from '../../src/lib/ai/contracts';
const company=companySchema.parse({aiProfile:'Laboratory instruments',turnover:50,turnoverPeriod:'FY26',turnoverEvidence:'Old accounts'});
const doc=sourceDocumentSchema.parse({id:'document',ownerId:'owner',tenderId:'th-1',version:'v',name:'Tender',hash:'hash',retrievedAt:'',url:'',method:'local-upload',pages:[{page:1,text:'You must provide a dedicated service support telephone number.'}],totalPages:1,warnings:[]});
const r=requirementSchema.parse({id:'support',label:'Your support line',type:'manual',confirmed:true,importance:'mandatory',clause:'Support',citations:[{documentId:doc.id,page:1,quote:doc.pages[0].text}]});
const tender={...tenderSchema.parse({title:'Tender',reference:'T',closesAt:'2099-12-01'}),id:'th-1',currentVersion:'v',createdAt:'',updatedAt:'',checkedAt:''};
const info:LoadedBidInformation={...bidInformationSchema.parse({text:'Our dedicated support number is +91 0000000000.'}),_id:'record',ownerId:'owner',tenderId:tender.id,requirementId:r.id,revision:1,updatedAt:'',fileId:'',fileName:'',fileHash:'',fileText:'',fileAvailable:false};
it('limits additional evidence to the exact requirement and preserves the company profile',()=>{
 const suggestion={requirementId:r.id,suggestion:'supporting evidence' as const,explanation:'Support is recorded.',nextAction:'Include the number in your bid.',evidenceIds:bidEvidence(info).map(e=>e.id),citations:r.citations!};
 expect(mergeEligibility(r,company,'',suggestion,[doc],bidEvidence(info)).outcome).toBe('appears satisfied');
 const other={...r,id:'other'};
 expect(mergeEligibility(other,company,'',{...suggestion,requirementId:other.id},[doc],bidEvidence({...info,requirementId:other.id})).ai).toBeNull();
 expect(companyForBidRequirement(company,r,info)).toBe(company);
});
it('hashes each requirement independently and invalidates changed details, files and source inputs',()=>{
 const key=requirementEligibilityHash(tender,r,company,[doc],info);
 expect(requirementEligibilityHash(tender,r,company,[doc,{...doc,id:'unrelated',hash:'new'}],info)).toBe(key);
 for(const changed of [{...info,text:'Changed support hours'},{...info,fileAvailable:true,fileId:'file',fileHash:'different'}])expect(requirementEligibilityHash(tender,r,company,[doc],changed)).not.toBe(key);
 expect(requirementEligibilityHash(tender,{...r,label:'Changed requirement'},company,[doc],info)).not.toBe(key);
 expect(requirementEligibilityHash(tender,r,company,[{...doc,hash:'changed'}],info)).not.toBe(key);
 expect(informationFingerprint({...info,updatedAt:'later',revision:2})).toBe(informationFingerprint(info));
});
it('uses bid-only financial and certificate facts without modifying shared facts',()=>{
 const financial={...r,type:'turnover' as const,threshold:100,value:'INR',period:'FY26'};
 const additional={...info,amount:120,period:'FY26',fileName:'Bid accounts.pdf',fileAvailable:true};
 const scoped=companyForBidRequirement(company,financial,additional);expect(scoped.turnover).toBe(120);expect(company.turnover).toBe(50);
 expect(mergeEligibility(financial,scoped,'',undefined,[doc]).outcome).toBe('appears satisfied');
 expect(mergeEligibility(financial,companyForBidRequirement(company,financial,{...additional,fileAvailable:false}),'',undefined,[doc]).outcome).toBe('needs review');
 expect(mergeEligibility(financial,companyForBidRequirement(company,financial,{...additional,amount:90}),'',undefined,[doc]).outcome).toBe('not satisfied');
 const certification={...r,type:'certification' as const,value:'ISO 9001'};
 const cert=companyForBidRequirement(company,certification,{...additional,expiresAt:'2099-12-31'});expect(cert.certifications[0].name).toBe('ISO 9001');expect(company.certifications).toEqual([]);
});
it('does not expose unreadable or missing PDF evidence and validates input limits',()=>{
 expect(bidEvidence({...info,fileId:'file',fileName:'proof.pdf',fileText:'A retained PDF excerpt',fileAvailable:false})).toHaveLength(1);
 expect(bidInformationSchema.safeParse({text:'x'.repeat(6001)}).success).toBe(false);
 expect(bidInformationSchema.safeParse({amount:-1}).success).toBe(false);
 expect(bidInformationSchema.safeParse({expiresAt:'not-a-date'}).success).toBe(false);
});

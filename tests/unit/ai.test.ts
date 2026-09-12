import {describe,it,expect,afterEach} from "vitest";
import {chunkPages,groundedExtraction,mergeEligibility,validCitation,cosine,evidenceFor} from "../../src/lib/ai/grounding";
import {sourceDocumentSchema,type EligibilitySuggestion} from "../../src/lib/ai/contracts";
import {requirementSchema,companySchema} from "../../src/lib/schemas";
import {testMode} from "../../src/lib/ai/runtime";
const quote="Minimum annual turnover is INR 100 for FY 2025-26.";
const doc=sourceDocumentSchema.parse({id:"doc",ownerId:"owner",tenderId:"t",version:"v",name:"Notice.pdf",url:"",hash:"hash",retrievedAt:"2026-09-12",method:"local-upload",pages:[{page:1,text:quote},{page:2,text:"Alternative exemptions need individual review."}],totalPages:2,warnings:[]});
const citation={documentId:doc.id,page:1,quote};
const requirement=requirementSchema.parse({id:"r",label:"Minimum annual turnover",type:"turnover",threshold:100,value:"INR",period:"FY 2025-26",clause:"Source",confirmed:true,origin:"ai-assisted",citations:[citation]});
const suggestion:EligibilitySuggestion={requirementId:"r",suggestion:"supporting evidence",explanation:"User declares experience",evidenceIds:["capabilities"],citations:[citation],nextAction:"Inspect original evidence"};
describe("AI grounding and conservative outcomes",()=>{
 it("requires the exact document and ordinal page, allowing whitespace normalization",()=>{expect(validCitation({...citation,quote:"Minimum annual\nturnover is INR 100 for FY 2025-26."},[doc])).toBe(true);expect(validCitation({...citation,page:2},[doc])).toBe(false);expect(validCitation({...citation,documentId:"foreign"},[doc])).toBe(false);expect(validCitation({...citation,quote:"Turnover is INR 1000"},[doc])).toBe(false);});
 it("removes unsupported facts and preserves complex conditions for manual judgment",()=>{const output=groundedExtraction({fields:[{key:"value",value:"100",citations:[citation]},{key:"title",value:"Invented",citations:[{...citation,page:2}]}],requirements:[{label:"Turnover or alternative exemption",type:"turnover",threshold:100,value:"INR",period:"FY 2025-26",complex:true,citations:[citation]}],warnings:[]},[doc]);expect(output.fields).toHaveLength(1);expect(output.requirements[0]).toMatchObject({type:"manual",threshold:null,complex:true});expect(output.warnings.join()).toContain("Unsupported");});
 it("never upgrades absent evidence or a hard numeric failure",()=>{for(const patch of [{turnover:99,turnoverEvidence:"Accounts"},{turnover:200,turnoverEvidence:""}]){const company=companySchema.parse({aiProfile:"Public supplier capabilities",turnoverPeriod:requirement.period,...patch});expect(mergeEligibility(requirement,company,"",suggestion,[doc]).outcome).toBe(patch.turnover===99?"not satisfied":"needs review");}});
 it("rejects unrelated citations and unknown evidence IDs",()=>{const company=companySchema.parse({aiProfile:"Public capabilities"});expect(mergeEligibility(requirement,company,"",{...suggestion,evidenceIds:["invented"]},[doc]).ai).toBeNull();expect(mergeEligibility(requirement,company,"",{...suggestion,citations:[{documentId:"doc",page:2,quote:doc.pages[1].text}]},[doc]).ai).toBeNull();});
 it("only shares explicitly selected capability/project text",()=>{const company=companySchema.parse({name:"Private",turnover:800,turnoverEvidence:"Secret accounts",aiProfile:"Public scope",projects:[{id:"p",title:"Hidden",scope:"Private project",completedAt:"",evidence:"",shareWithAI:false}]});expect(evidenceFor(company)).toEqual([{id:"capabilities",text:"Public scope"}]);});
 it("enforces selected page and chunk bounds",()=>{expect(chunkPages(doc,[1,2]).flat().map(p=>p.page)).toEqual([1,2]);expect(()=>chunkPages(doc,[99])).toThrow();expect(()=>chunkPages({...doc,pages:Array.from({length:31},(_,i)=>({page:i+1,text:"text"}))},Array.from({length:31},(_,i)=>i+1))).toThrow();});
 it("validates vectors instead of returning misleading scores",()=>{expect(cosine([1,0],[1,0])).toBe(1);expect(cosine([0,0],[1,0])).toBe(0);expect(()=>cosine([1],[1,2])).toThrow();expect(()=>cosine([NaN],[1])).toThrow();});
});
describe("stub isolation",()=>{
 const oldStub=process.env.BIDDESK_AI_TEST_STUB,oldDB=process.env.MONGODB_DB;
 afterEach(()=>{if(oldStub===undefined)delete process.env.BIDDESK_AI_TEST_STUB;else process.env.BIDDESK_AI_TEST_STUB=oldStub;if(oldDB===undefined)delete process.env.MONGODB_DB;else process.env.MONGODB_DB=oldDB;});
 it("refuses simulated AI in a demo database",()=>{process.env.BIDDESK_AI_TEST_STUB="1";process.env.MONGODB_DB="biddesk";expect(()=>testMode()).toThrow("isolated");process.env.MONGODB_DB="biddesk_test_0123456789abcdef";expect(testMode()).toBe(true);});
});

describe("provider schema compatibility",()=>{
 it("keeps structural types while local Zod retains all size and numeric limits",async()=>{
  const {z}=await import("zod"),{providerSchema}=await import("../../src/lib/ai/provider-schema");
  const contract=z.object({minItems:z.string().min(8),rows:z.array(z.object({page:z.number().int().positive(),quote:z.string().max(20)})).max(4)});
  const wire=providerSchema(contract) as {properties:Record<string,Record<string,unknown>>};
  expect(wire.properties.minItems.type).toBe("string");expect(wire.properties.rows.maxItems).toBeUndefined();
  expect(contract.safeParse({minItems:"too short",rows:[{page:0,quote:"A source quote that is much too long"}]}).success).toBe(false);
 });
});

describe("PDF worker transport",()=>{
 it("extracts real PDF bytes using the serializable worker envelope",async()=>{
  const {extractPdf}=await import("../../src/lib/ai/documents");
  const stream="BT /F1 12 Tf 40 120 Td (Official document transport regression) Tj ET";
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf="%PDF-1.4\n";const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result=await extractPdf(Buffer.from(pdf));expect(result.totalPages).toBe(1);expect(result.pages[0].text).toContain("Official document transport regression");
 });
 it("rejects empty bytes before launching extraction",async()=>{const {extractPdf}=await import("../../src/lib/ai/documents");await expect(extractPdf(Buffer.alloc(0))).rejects.toThrow("nonempty PDF");});
});

describe("extraction document identity",()=>{
 it("exposes only the canonical ID even when the source has database metadata",async()=>{
  const {extractionInput}=await import("../../src/lib/ai/grounding");
  const input=extractionInput({...doc,_id:"internal-mongo-id",linkKey:"internal-link",ownerId:"private-owner"} as typeof doc,doc.pages);
  expect(input.document).toEqual({id:doc.id,name:doc.name,pages:doc.pages});
  expect(JSON.stringify(input)).not.toMatch(/internal-mongo-id|internal-link|private-owner/);
  expect(input.citationRule).toContain(doc.id);
  expect(validCitation({...citation,documentId:"internal-mongo-id"},[doc])).toBe(false);
 });
});

describe("source fact comparison",()=>{
 it("preserves exact reference identity and deadline precision",async()=>{
  const {compareFindings}=await import("../../src/lib/ai/conflicts"),{tenderSchema}=await import("../../src/lib/schemas");
  const t={...tenderSchema.parse({title:"Software system",reference:"NOTICE-123",closesAt:"2026-09-29T02:00:00+05:30"}),id:"th-123",currentVersion:"v",createdAt:"",updatedAt:"",checkedAt:""};
  const result=compareFindings(t,[{key:"reference",value:"NOTICE-123",citations:[citation]},{key:"closesAt",value:"2026-09-29",citations:[citation]}]);
  expect(result.conflicts).toEqual([]);expect(result.comparisonNotes).toHaveLength(1);expect(t.closesAt).toBe("2026-09-29T02:00:00+05:30");
  for(const value of ["2026-09-30","2026-09-29T14:00:00+05:30"])expect(compareFindings(t,[{key:"closesAt",value,citations:[citation]}]).conflicts).toHaveLength(1);
  expect(compareFindings(t,[{key:"closesAt",value:"2026-09-28T20:30:00Z",citations:[citation]}]).conflicts).toEqual([]);
  for(const value of ["NOTICE-124","OTHER-123"])expect(compareFindings(t,[{key:"reference",value,citations:[citation]}]).conflicts).toHaveLength(1);
 });
});

import {config} from "dotenv";
config({path:".env.local",quiet:true});
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {GoogleGenAI} from "@google/genai";
import {getDb,getClient} from "../src/lib/db";
import {aiConfig,aiIndexes,requireAI} from "../src/lib/ai/runtime";
import {downloadOfficial,extractPdf} from "../src/lib/ai/documents";
import {hash,extractionInput,groundedExtraction,validCitation,cosine} from "../src/lib/ai/grounding";
import {generate,embed} from "../src/lib/ai/provider";
import {extractionSchema,extractionInstruction,eligibilitySchema,explanationSchema,type SourceDocument,type MatchingProfile} from "../src/lib/ai/contracts";
import {tenderSchema,type Tender} from "../src/lib/schemas";
import {z} from "zod";
import {statusOf} from "../src/lib/domain";
type Prepared={tenderId:string;version:string;title:string;document:SourceDocument;reviewedText:string;reviewed:boolean};
const reportPath=".local/ai-catalogue-review.json",owner="catalogue-operator";
async function main(){
 const [command,...args]=process.argv.slice(2);await mkdir(".local",{recursive:true});
 if(command==="check") {requireAI();const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:30000}});for(const model of [aiConfig().generationModel,aiConfig().embeddingModel]){const available=await ai.models.get({model});console.log(`${model}: ${available.name?"accessible":"check returned no model name"}`);}await ai.models.countTokens({model:aiConfig().generationModel,contents:"Public procurement setup check."});console.log("Generation token-count preflight passed.");console.log("Key/model access checked. Free-tier allowance depends on your Gemini project; no generation was requested.");return;}
 if(command==="prepare"){
  const db=await getDb();await aiIndexes();
  if(args.includes("--import-reviewed")){
   const artifact=z.object({records:z.array(z.object({reference:z.string(),snapshotHash:z.string(),sourceUrl:z.string().url(),retrievedAt:z.string(),documentHash:z.string(),page:z.number().int().positive(),text:z.string().min(50).max(6500)})).max(20)}).parse(JSON.parse(await readFile("data/public/isro-matching-scopes.json","utf8")));let count=0;
   for(const r of artifact.records){const t=await db.collection<Tender>("tenders").findOne({ownerId:null,reference:r.reference});if(!t||hash(tenderSchema.parse(t))!==r.snapshotHash||!t.documents.some(d=>d.url===r.sourceUrl)){console.log(`Skipped changed or missing notice: ${r.reference}`);continue;}const profile:MatchingProfile={id:hash([null,t.id]),ownerId:null,tenderId:t.id,version:t.currentVersion,text:r.text,hash:hash(r.text),citations:[{documentId:r.documentHash.slice(0,32),page:r.page,quote:r.text.slice(0,1200)}],documentHashes:[r.documentHash],reviewed:true,createdAt:r.retrievedAt};await db.collection<MatchingProfile>("aiProfiles").updateOne({ownerId:null,tenderId:t.id},{$set:profile},{upsert:true});count++;}console.log(`Imported ${count} dated, reviewed matching scopes. No source refresh performed.`);return;
  }
  if(args.includes("--publish-reviewed")){const rows:Prepared[]=JSON.parse(await readFile(reportPath,"utf8"));let published=0;for(const row of rows.filter(r=>r.reviewed)){const t=await db.collection<Tender>("tenders").findOne({id:row.tenderId,ownerId:null,currentVersion:row.version});if(!t)throw new Error("Catalogue version changed; prepare again.");const source=await db.collection<SourceDocument>("aiCatalogueDocuments").findOne({id:row.document.id,hash:row.document.hash});if(!source)throw new Error("Prepared source unavailable.");const page=source.pages.find(p=>p.text.includes(row.reviewedText));if(!page||row.reviewedText.trim().length<50||row.reviewedText.length>6500)throw new Error("Reviewed text must be one exact source-page excerpt (50–6500 characters).");const profile:MatchingProfile={id:hash([null,t.id]),ownerId:null,tenderId:t.id,version:t.currentVersion,text:row.reviewedText,hash:hash(row.reviewedText),citations:[{documentId:source.id,page:page.page,quote:row.reviewedText.slice(0,1200)}],documentHashes:[source.hash],reviewed:true,createdAt:new Date().toISOString()};await db.collection<MatchingProfile>("aiProfiles").updateOne({ownerId:null,tenderId:t.id},{$set:profile},{upsert:true});published++;}console.log(`Published ${published} operator-reviewed scope excerpts. Shared tender records were not changed.`);return;}
  const limitArg=args.indexOf("--limit"),limit=limitArg>=0?Number(args[limitArg+1]):10;if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error("Limit must be 1–20.");
  const tenders=(await db.collection<Tender>("tenders").find({ownerId:null}).sort({publishedAt:-1}).toArray()).filter(t=>["active","upcoming deadline"].includes(statusOf(t))).slice(0,limit);
  if(args.includes("--dry-run")){console.log(JSON.stringify(tenders.map(t=>({id:t.id,title:t.title,url:t.documents[0]?.url})),null,2));return;}
  let rows:Prepared[]=[];try{rows=JSON.parse(await readFile(reportPath,"utf8"));}catch{}
  for(const t of tenders){if(rows.some(r=>r.tenderId===t.id&&r.version===t.currentVersion))continue;const link=t.documents[0];if(!link)continue;try{const bytes=await downloadOfficial(link.url),parsed=await extractPdf(bytes);const document:SourceDocument={id:hash([t.id,t.currentVersion,bytes.toString("base64")]).slice(0,32),ownerId:null,tenderId:t.id,version:t.currentVersion,name:link.name,url:link.url,hash:hash(bytes.toString("base64")),retrievedAt:new Date().toISOString(),method:"official-link",...parsed};await db.collection<SourceDocument>("aiCatalogueDocuments").updateOne({id:document.id},{$set:document},{upsert:true});rows.push({tenderId:t.id,version:t.currentVersion,title:t.title,document,reviewedText:"",reviewed:false});await writeFile(reportPath,JSON.stringify(rows,null,2));console.log(`Prepared ${t.reference}: ${parsed.totalPages} pages`);}catch(e){console.log(`Skipped ${t.reference}: ${e instanceof Error?e.message:"retrieval failed"}`);}}
  console.log(`Review source pages in ${reportPath}; set reviewedText to an exact scope excerpt and reviewed=true, then rerun with --publish-reviewed. No Gemini calls made.`);return;
 }
 if(command==="live"){
  requireAI();if(process.env.BIDDESK_AI_TEST_STUB)throw new Error("Live evaluation cannot use a stub.");
  const rows:Prepared[]=JSON.parse(await readFile(reportPath,"utf8"));const row=rows.find(r=>r.reviewed);if(!row)throw new Error("Prepare and review a public document first.");const d={...row.document,pages:row.document.pages.slice(0,2)};
  const output=await generate(owner,"extract",extractionInput(d,d.pages),extractionSchema,extractionInstruction),grounded=groundedExtraction(output.value,[d]);
  if(!grounded.fields.length&&!grounded.requirements.length)throw new Error("No grounded facts returned; inspect the public document.");
  const requirements=grounded.requirements.map((r,i)=>({...r,id:`live-${i}`}));const qualitative=await generate(owner,"eligibility",{requirements,task:"Compare the supplied requirement excerpts with the evidence. Return one item per requirement, copy its supplied source citation even for missing evidence, and use only supplied evidence IDs. Missing registration evidence requires review. Do not assert qualification.",evidence:[{id:"capabilities",text:"Public demo profile: instrumentation supply and laboratory system integration. No audited financial or project evidence supplied."}]},eligibilitySchema);
  const capability="Supplier of laboratory instrumentation, radio frequency equipment and scientific measurement systems";
  const query=await embed(owner,capability,"query");
  const labVector=await embed(owner,"Supply laboratory instrumentation and radio frequency measurement systems","document"),civilVector=await embed(owner,"Construction of concrete roads and sewer civil infrastructure","document");
  const ranking={laboratory:cosine(query.value,labVector.value),civil:cosine(query.value,civilVector.value)};
  const reasons=await generate(owner,"explain-matches",{capabilities:capability,candidates:[{id:row.tenderId,text:row.reviewedText}]},explanationSchema);
  const checks={groundedFacts:grounded.fields.length+grounded.requirements.length,citationsValid:[...grounded.fields,...grounded.requirements].every(r=>r.citations.every(c=>validCitation(c,[d]))),semanticOrdering:ranking.laboratory>ranking.civil,eligibilityConservative:requirements.length>0&&qualitative.value.items.length===requirements.length&&qualitative.value.items.every(item=>requirements.some(r=>r.id===item.requirementId)&&item.suggestion!=="supporting evidence"&&item.citations.length>0&&item.citations.every(c=>validCitation(c,[d]))&&item.evidenceIds.every(id=>id==="capabilities")),explanationGrounded:reasons.value.items.length===1&&reasons.value.items.every(r=>r.tenderId===row.tenderId&&row.reviewedText.includes(r.quote))};
  await writeFile(".local/ai-live-report.json",JSON.stringify({at:new Date().toISOString(),models:aiConfig(),checks,ranking,extraction:grounded,qualitative:qualitative.value,explanations:reasons.value},null,2));console.log(JSON.stringify(checks,null,2));if(Object.values(checks).some(v=>v===false))process.exitCode=1;return;
 }
 throw new Error("Use check, prepare [--dry-run|--limit 10|--publish-reviewed], or live.");
}
main().catch(e=>{console.error(e instanceof Error&&e.name!=="MongoServerError"?e.message:"AI setup failed; inspect configuration. Credentials omitted.");process.exitCode=1;}).finally(async()=>{try{await getClient().close();}catch{}});

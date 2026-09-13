import {test,expect,type APIRequestContext} from '@playwright/test';
import {MongoClient} from 'mongodb';
import {evidencePdf} from '../fixtures/evidence-pdf';
async function ai(request:APIRequestContext,data:unknown){const response=await request.post('/api/ai',{data});expect(response.ok(),await response.text()).toBe(true);return response.json();}
const tenderId='th-6732969';
async function state(request:APIRequestContext){return(await request.get('/api/ai?tenderId='+tenderId)).json();}
async function workflow(request:APIRequestContext){return(await request.get('/api/workflow?mode=tender&id='+tenderId)).json();}
async function setup(request:APIRequestContext,email:string,clauses=['Your company must provide a dedicated service-support telephone number.','Your company must provide installation and commissioning services.']){
 const signup=await request.post('/api/auth/sign-up/email',{data:{name:'Bid-only supplier',email,password:'Test-only-password-483!'}});expect(signup.ok(),await signup.text()).toBe(true);const ownerId=(await signup.json()).user.id;
 await request.get('/api/data?mode=tenders');const {tender}=await(await request.get('/api/data?mode=tender&id='+tenderId)).json();
 await request.post('/api/data',{data:{action:'company',company:{aiProfile:'Laboratory instrumentation and measurement services.'}}});
 for(const text of clauses){
  const d=await ai(request,{action:'attach',tenderId,version:tender.currentVersion,document:{name:'Tender clause',pages:[{page:1,text}]}});await ai(request,{action:'extract',documentId:d.id,pages:[1],chunkIndex:0});
 }
 await ai(request,{action:'eligibility',tenderId});return ownerId;
}
test('bid-only details and PDFs recheck one requirement without changing other results or the profile',async({page,browser})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page.request,'bid-information@example.test');
 const initial=await workflow(page.request);const judgment=await page.request.post('/api/workflow',{data:{action:'judgment',tenderId,requirementId:initial.rows[1].requirement.id,inputHash:initial.inputHash,outcome:'needs review',note:'Other requirement has its own assessment.',evidence:'Separate company records'}});expect(judgment.ok()).toBe(true);
 const before=await state(page.request),w=await workflow(page.request),target=w.rows[0],other=w.rows[1],profile=(await(await page.request.get('/api/data')).json()).company;
 await page.goto('/tenders/'+tenderId);await page.getByRole('tab',{name:'eligibility',exact:true}).click();
 const card=page.locator(`[data-requirement-id="${target.requirement.id}"]`);
 await card.getByText('Add missing information',{exact:true}).click();await card.getByRole('textbox',{name:'Details for this requirement',exact:true}).fill('Our dedicated service-support line is +91 0000000000, available on weekdays.');
 await card.getByLabel('Bid-only evidence PDF',{exact:true}).setInputFiles({name:'support-proof.pdf',mimeType:'application/pdf',buffer:evidencePdf()});
 const calls:string[][]=[];await page.route('**/api/ai',async route=>{if(route.request().method()==='POST'){const b=route.request().postDataJSON();if(b.action?.startsWith('eligibility'))calls.push([b.action,b.requirementId]);}await route.continue();});
 await card.getByRole('button',{name:'Save & recheck this requirement',exact:true}).click();await expect(card.getByText('Information saved for this bid. Requirement rechecked.',{exact:true})).toBeVisible();
 expect(calls).toEqual([['eligibility.requirement',target.requirement.id]]);await expect(card.locator('.badge').filter({hasText:'Appears met'})).toHaveCount(1);
 const after=await state(page.request),info=after.bidInformation[0];expect(info.text).toContain('dedicated');expect(info.fileId).toBeTruthy();expect(info.hasReadablePdf).toBe(true);
 const result=after.analysis.items.find((i:{requirementId:string})=>i.requirementId===target.requirement.id);expect(result.ai.evidenceIds).toContain(`bid:${target.requirement.id}:pdf`);
 expect(after.analysis.items.find((i:{requirementId:string})=>i.requirementId===other.requirement.id)).toEqual(before.analysis.items.find((i:{requirementId:string})=>i.requirementId===other.requirement.id));
 expect((await(await page.request.get('/api/data')).json()).company).toEqual(profile);
 const unchanged=(await workflow(page.request)).rows.find((r:{requirement:{id:string}})=>r.requirement.id===other.requirement.id);expect(unchanged).toEqual(other);
 expect((await page.request.get('/api/files?id='+info.fileId)).ok()).toBe(true);
 await page.reload();await page.getByRole('tab',{name:'eligibility',exact:true}).click();await card.getByText('Edit bid-only information',{exact:true}).click();await expect(card.getByRole('textbox',{name:'Details for this requirement',exact:true})).toHaveValue(info.text);
 await page.screenshot({path:'.local/bid-information-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('tab',{name:'eligibility',exact:true}).click();await card.getByText('Edit bid-only information',{exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/bid-information-mobile.png',fullPage:true});
 // A full recheck must continue using the saved bid-only evidence.
 await ai(page.request,{action:'eligibility',tenderId});expect((await state(page.request)).analysis.items.find((i:{requirementId:string})=>i.requirementId===target.requirement.id).ai.evidenceIds).toContain(`bid:${target.requirement.id}:pdf`);
 const payload={action:'eligibility.requirement',tenderId,requirementId:target.requirement.id,requirementHash:target.requirementHash,revision:0,value:{text:'An obsolete edit'}};
 expect((await page.request.post('/api/ai',{data:payload})).status()).toBe(409);
 const foreign=await browser.newContext({baseURL:'http://localhost:3001'});await foreign.request.post('/api/auth/sign-up/email',{data:{name:'Other bidder',email:'bid-info-other@example.test',password:'Test-only-password-483!'}});
 expect((await foreign.request.post('/api/ai',{data:payload})).status()).toBe(404);expect((await state(foreign.request)).bidInformation).toEqual([]);expect((await foreign.request.get('/api/files?id='+info.fileId)).status()).toBe(404);await foreign.close();expect(errors).toEqual([]);
});
test('failed checks preserve details, only stale the edited requirement, and retry from the inline form',async({page})=>{
 const ownerId=await setup(page.request,'bid-info-retry@example.test'),before=await state(page.request),w=await workflow(page.request),target=w.rows[0],other=w.rows[1];
 const name=process.env.BIDDESK_TEST_DB!;if(!/^biddesk_test_[a-f0-9]{16}$/.test(name))throw new Error('Isolated database required');
 const client=new MongoClient(process.env.MONGODB_URI!);await client.connect();try{
  const budget=client.db(name).collection<{_id:string;count:number}>('aiBudget'),id=`${new Date().toISOString().slice(0,10)}:generation:${ownerId}`;
  await budget.updateOne({_id:id},{$set:{count:20}},{upsert:true});
  await page.goto('/tenders/'+tenderId);await page.getByRole('tab',{name:'eligibility',exact:true}).click();const card=page.locator(`[data-requirement-id="${target.requirement.id}"]`);
  await card.getByText('Add missing information',{exact:true}).click();await card.getByRole('textbox',{name:'Details for this requirement',exact:true}).fill('Our bid-only support line is staffed every weekday.');await card.getByRole('button',{name:'Save & recheck this requirement',exact:true}).click();await expect(card.getByText('Information saved for this bid. Retry to complete the check.',{exact:true})).toBeVisible();
  const failed=await state(page.request);expect(failed.bidInformation[0].revision).toBe(1);expect(failed.analysis.items.find((i:{requirementId:string})=>i.requirementId===target.requirement.id).stale).toBe(true);expect(failed.analysis.items.find((i:{requirementId:string})=>i.requirementId===other.requirement.id)).toEqual(before.analysis.items.find((i:{requirementId:string})=>i.requirementId===other.requirement.id));
  await budget.updateOne({_id:id},{$set:{count:3}});await card.getByRole('button',{name:'Save & recheck this requirement',exact:true}).click();await expect(card.getByText('Information saved for this bid. Requirement rechecked.',{exact:true})).toBeVisible();
  const completed=await state(page.request);expect(completed.bidInformation[0].revision).toBe(2);expect(completed.analysis.items.find((i:{requirementId:string})=>i.requirementId===target.requirement.id).stale).toBe(false);
  // File ownership is checked before saving, and changing one record cannot overwrite another.
  const response=await page.request.post('/api/ai',{data:{action:'eligibility.requirement',tenderId,requirementId:target.requirement.id,requirementHash:target.requirementHash,revision:2,value:{text:'Changed',fileId:'00000000-0000-0000-0000-000000000000'}}});expect(response.status()).toBe(404);expect((await state(page.request)).bidInformation[0].revision).toBe(2);
  const competing=await Promise.all(['First updated support details.','Second updated support details.'].map(text=>page.request.post('/api/ai',{data:{action:'eligibility.requirement',tenderId,requirementId:target.requirement.id,requirementHash:target.requirementHash,revision:2,value:{text}}})));expect(competing.map(r=>r.status()).sort()).toEqual([200,409]);expect((await state(page.request)).bidInformation[0].revision).toBe(3);
 }finally{await client.close();}
});

test('bid-only financial facts use attached proof, preserve the profile and recover from an unreadable PDF',async({request})=>{
 await setup(request,'bid-info-financial@example.test',['Your annual turnover must be at least INR 100 for FY26.','Your company must provide installation and commissioning services.']);
 const detail=await(await request.get('/api/data?mode=tender&id='+tenderId)).json();const r={...detail.requirements[0],label:'Your turnover',type:'turnover',threshold:100,value:'INR',period:'FY26',complex:false,importance:'mandatory'};
 expect((await request.post('/api/data',{data:{action:'review',id:tenderId,version:detail.tender.currentVersion,requirements:[r,...detail.requirements.slice(1)],notes:''}})).ok()).toBe(true);
 const company={aiProfile:'Laboratory instruments',turnover:50,turnoverPeriod:'FY26',turnoverEvidence:'Company accounts'};
 expect((await request.post('/api/data',{data:{action:'company',company}})).ok()).toBe(true);
 const w=await workflow(request),target=w.rows.find((row:{requirement:{id:string}})=>row.requirement.id===r.id);
 const upload=async(text:string)=>{const response=await request.post('/api/files?name=accounts.pdf',{headers:{'content-type':'application/pdf'},data:evidencePdf(text)});expect(response.ok(),await response.text()).toBe(true);return response.json();};
 const blank=await upload(''),payload={action:'eligibility.requirement',tenderId,requirementId:r.id,requirementHash:target.requirementHash,revision:0,value:{text:'Our turnover for this bid is INR 120.',amount:120,period:'FY26',fileId:blank.id}};
 const unreadable=await request.post('/api/ai',{data:payload});expect(unreadable.status()).toBe(400);expect((await unreadable.json()).savedRevision).toBe(1);expect((await state(request)).bidInformation[0].hasReadablePdf).toBe(false);
 const file=await upload('Our annual turnover for FY26 is INR 120 according to these accounts.');await ai(request,{...payload,revision:1,value:{...payload.value,fileId:file.id}});
 const resolved=(await workflow(request)).rows.find((row:{requirement:{id:string}})=>row.requirement.id===r.id);expect(resolved.rule.outcome).toBe('appears satisfied');expect(resolved.information.assessmentStale).toBe(false);expect((await(await request.get('/api/data')).json()).company.turnover).toBe(50);
 await ai(request,{...payload,revision:2,value:{...payload.value,fileId:file.id,amount:90}});expect((await workflow(request)).rows.find((row:{requirement:{id:string}})=>row.requirement.id===r.id).rule.outcome).toBe('not satisfied');
 await ai(request,{...payload,revision:3,value:{...payload.value,fileId:'',amount:120}});expect((await workflow(request)).rows.find((row:{requirement:{id:string}})=>row.requirement.id===r.id).rule.outcome).toBe('needs review');
});

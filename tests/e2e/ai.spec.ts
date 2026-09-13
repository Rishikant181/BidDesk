import {test,expect,type APIRequestContext} from "@playwright/test";
async function ai(request:APIRequestContext,data:unknown){const r=await request.post("/api/ai",{data});expect(r.ok(),await r.text()).toBeTruthy();return r.json();}
test("document draft, private eligibility, matching, caching and isolation",async({page,browser})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 const signup=await page.request.post("/api/auth/sign-up/email",{data:{name:"AI verification",email:"ai@example.test",password:"Test-only-password-483!"}});expect(signup.ok()).toBeTruthy();
 await page.request.get("/api/data?mode=tenders");
 const before=await (await page.request.get("/api/data?mode=tender&id=th-6732969")).json();const tender=before.tender;
 const text="Test-only source fixture. Supply laboratory instrumentation and radio frequency measurement systems. Similar completed projects require documentary evidence and individual review.";
 const document=await ai(page.request,{action:"attach",tenderId:tender.id,version:tender.currentVersion,document:{name:"Isolated source fixture",pages:[{page:1,text}]}});
 expect((await page.request.post("/api/ai",{data:{action:"extract",documentId:document.id,pages:[1],chunkIndex:0}})).status()).toBe(200);
 await page.goto(`/tenders/${tender.id}`);await page.getByRole("tab",{name:"Documents & review",exact:true}).click();
 await page.getByLabel("Document to analyze").selectOption(document.id);await page.getByRole("button",{name:"Analyze with Gemini",exact:true}).click();await expect(page.getByRole("heading",{name:"Review AI suggestions"})).toBeVisible();
 await page.getByRole("checkbox",{name:/Scope/}).check();await page.getByRole("checkbox",{name:"Include requirement 1"}).check();await page.getByRole("checkbox",{name:/I checked this requirement/}).check();await page.getByRole("checkbox",{name:/I reviewed the selected suggestions/}).check();await page.getByRole("button",{name:"Save selected private findings"}).click();await expect(page.getByText("Source-backed private findings saved",{exact:true})).toBeVisible();
 const state=await (await page.request.get(`/api/ai?tenderId=${tender.id}`)).json();expect(state.findings.fields).toHaveLength(1);
 const repeat=await ai(page.request,{action:"extract",documentId:document.id,pages:[1],chunkIndex:0});expect(repeat.cached).toBe(true);
 expect((await page.request.post("/api/ai",{data:{action:"apply",draftId:repeat.draft.id,reviewHash:"old",fields:[0],requirements:[]}})).status()).toBe(409);
 const company={name:"AI test supplier",aiProfile:"Supply laboratory instrumentation and radio frequency measurement systems with installation and integration experience."};expect((await page.request.post("/api/data",{data:{action:"company",company}})).ok()).toBe(true);
 await page.getByRole("tab",{name:"eligibility",exact:true}).click();await page.getByRole("button",{name:"Review eligibility with AI"}).click();await expect(page.getByText("Test fixture evidence comparison")).toBeVisible();
 const eligibility=await (await page.request.get(`/api/ai?tenderId=${tender.id}`)).json();expect(eligibility.analysis.stale).toBe(false);expect(eligibility.analysis.items.find((r:{label:string})=>r.label.startsWith("Test fixture")).outcome).toBe("needs review");
 const req=eligibility.analysis.items.find((r:{label:string})=>r.label.startsWith("Test fixture"));
 await page.getByText("Record your evidence judgment",{exact:true}).last().click();await page.getByLabel("Evidence reference",{exact:true}).last().fill("Test project report page 1");await page.getByLabel("Reason for your judgment").last().fill("Test-only human review: inspect project completion certificate.");const judgmentSaved=page.waitForResponse(r=>r.url().endsWith("/api/workflow")&&r.request().postData()?.includes('"action":"judgment"')===true);await page.getByRole("button",{name:"Save human judgment"}).last().click();expect((await judgmentSaved).ok()).toBe(true);await expect(page.locator("p.info-box").filter({hasText:"Test-only human review:"})).toBeVisible();
 expect((await (await page.request.get(`/api/workflow?mode=tender&id=${tender.id}`)).json()).rows.find((r:{requirement:{id:string}})=>r.requirement.id===req.requirementId).judgment.stale).toBe(false);
 const after=await (await page.request.get(`/api/data?mode=tender&id=${tender.id}`)).json();expect(after.tender.currentVersion).toEqual(before.tender.currentVersion);
 await page.goto("/discover?recommended=true");await page.getByRole("button",{name:"Find tenders matching my profile",exact:true}).click();await expect(page.getByText("Matching complete. Relevance is separate from eligibility.")).toBeVisible();await expect(page.locator(".ai-match-card").first()).toBeVisible();
 await page.screenshot({path:".local/ai-recommendations-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.reload();await expect(page.locator(".ai-match-card").first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:".local/ai-recommendations-mobile.png",fullPage:true});
 await page.request.post("/api/data",{data:{action:"company",company:{...company,aiProfile:company.aiProfile+" Updated capabilities."}}});const priorRun=await (await page.request.get("/api/matching")).json();expect((await page.request.post("/api/matching",{data:{action:"page",runId:priorRun._id,offset:0},headers:{origin:"http://localhost:3001"}})).status()).toBe(409);const staleState=await (await page.request.get(`/api/ai?tenderId=${tender.id}`)).json();expect(staleState.analysis.stale).toBe(true);expect((await (await page.request.get(`/api/workflow?mode=tender&id=${tender.id}`)).json()).rows.find((r:{judgment?:unknown})=>r.judgment).judgment.stale).toBe(true);
 const other=await browser.newContext({baseURL:"http://localhost:3001"});await other.request.post("/api/auth/sign-up/email",{data:{name:"AI other",email:"ai-other@example.test",password:"Test-only-password-483!"}});expect((await other.request.post("/api/ai",{data:{action:"extract",documentId:document.id,pages:[1],chunkIndex:0}})).status()).toBe(404);const foreign=await (await other.request.get(`/api/ai?tenderId=${tender.id}`)).json();expect(foreign.drafts).toHaveLength(0);expect(foreign.findings).toBeNull();await other.close();expect(errors).toEqual([]);
});

test("atomic duplicate suppression and application allowance",async({request})=>{
 const {MongoClient}=await import("mongodb"),dbName=process.env.BIDDESK_TEST_DB;
 if(!dbName||!/^biddesk_test_[a-f0-9]{16}$/.test(dbName))throw new Error("Isolated database required");
 const signup=await request.post("/api/auth/sign-up/email",{data:{name:"Budget test",email:"budget@example.test",password:"Test-only-password-483!"}});expect(signup.ok()).toBe(true);const ownerId=(await signup.json()).user.id;
 await request.get("/api/data?mode=tenders");
 const {tender}=await (await request.get("/api/data?mode=tender&id=th-6732969")).json();
 const document=await ai(request,{action:"attach",tenderId:tender.id,version:tender.currentVersion,document:{name:"Test concurrency",pages:[{page:1,text:"Isolated verification fixture: laboratory instruments require individual evidence review."}]}});
 const payload={action:"extract",documentId:document.id,pages:[1],chunkIndex:0};
 const responses=await Promise.all([request.post("/api/ai",{data:payload}),request.post("/api/ai",{data:payload})]);expect(responses.some(r=>r.ok())).toBe(true);expect(responses.every(r=>r.ok()||r.status()===409)).toBe(true);
 const client=new MongoClient(process.env.MONGODB_URI!);try{await client.connect();const db=client.db(dbName),id=`${new Date().toISOString().slice(0,10)}:generation:${ownerId}`;
 const budgets=db.collection<{_id:string;count:number}>("aiBudget");expect((await budgets.findOne({_id:id}))?.count).toBe(1);
 await budgets.updateOne({_id:id},{$set:{count:20}});
 expect((await ai(request,payload)).cached).toBe(true);
 const other=await ai(request,{action:"attach",tenderId:tender.id,version:tender.currentVersion,document:{name:"Test budget",pages:[{page:1,text:"A different isolated fixture: building construction requires verified prior contract completion."}]}});
 expect((await request.post("/api/ai",{data:{...payload,documentId:other.id}})).status()).toBe(429);
 expect((await budgets.findOne({_id:id}))?.count).toBe(20);
 }finally{await client.close();}
});

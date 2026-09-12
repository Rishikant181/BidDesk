import {test,expect} from '@playwright/test';
import {MongoClient} from 'mongodb';
test('cards appear before explanations, ten per scroll, retry and final partial batch',async({page,browser})=>{
 test.setTimeout(180000);
 const dbName=process.env.BIDDESK_TEST_DB;if(!dbName||!/^biddesk_test_[a-f0-9]{16}$/.test(dbName))throw Error('Isolated database required');
 const client=new MongoClient(process.env.MONGODB_URI!);await client.connect();const db=client.db(dbName);
 try{
  const signup=await page.request.post('/api/auth/sign-up/email',{data:{name:'Paged matching',email:'pages@example.test',password:'Test-only-password-483!'}});expect(signup.ok(),await signup.text()).toBe(true);const owner=(await signup.json()).user.id;
  const company={name:'Paged supplier',categories:'paged-match',aiProfile:'paged-match '.repeat(5)};expect((await page.request.post('/api/data',{data:{action:'company',company}})).ok()).toBe(true);
  let releaseFirst!:()=>void;const firstExplanation=new Promise<void>(resolve=>{releaseFirst=resolve;});
  const actions:string[]=[];
  await page.route('**/api/matching',async route=>{const req=route.request();if(req.method()==='POST'){const body=req.postDataJSON();actions.push(body.action);if(body.action==='explain'&&body.offset===0)await firstExplanation;}await route.continue();});
  await page.goto('/discover?recommended=true');await page.getByRole('button',{name:'Find tenders matching my profile',exact:true}).click();
  await expect(page.locator('.ai-match-card')).toHaveCount(10,{timeout:60000});await expect(page.getByText('No AI explanation available. Review the published scope.')).toHaveCount(0);
  await expect(page.locator('.ai-match-card [role=status]')).toHaveCount(10);
  expect(actions).not.toContain('prepare');expect(actions).not.toContain('rank');expect(actions.filter(a=>a==='page')).toHaveLength(0);
  const initial=await(await page.request.get('/api/matching')).json();expect(initial.items).toHaveLength(10);expect(initial.items.every((t:{explanation:unknown})=>!t.explanation)).toBe(true);
  expect((await page.request.post('/api/matching',{data:{action:'explain',runId:initial._id,offset:10}})).status()).toBe(409);
  expect(await db.collection<{_id:string}>('aiBudget').countDocuments({_id:`${new Date().toISOString().slice(0,10)}:embedding:${owner}`})).toBe(0);
  expect(await db.collection<{_id:string}>('aiBudget').countDocuments({_id:`${new Date().toISOString().slice(0,10)}:generation:${owner}`})).toBe(0);
  releaseFirst();
  await expect(page.locator('.ai-match-card [role=status]')).toHaveCount(0);
  await expect(page.locator('.ai-match-card')).toHaveCount(10);
  for(const card of await page.locator('.ai-match-card').all()){await expect(card).toContainText('Why it matches:');await expect(card).toContainText('Still to check:');}
  let run=await(await page.request.get('/api/matching')).json();expect(run.items).toHaveLength(10);expect(run.total).toBe(25);expect(run.shown).toBe(10);expect(run.items.every((t:{explanation:unknown})=>!!t.explanation)).toBe(true);
  const firstIds=run.items.map((t:{id:string})=>t.id),budgetId=`${new Date().toISOString().slice(0,10)}:generation:${owner}`;
  const budgets=db.collection<{_id:string;count:number}>('aiBudget');expect((await budgets.findOne({_id:budgetId}))?.count).toBe(2);
  // Force the second half of the next ten to fail after its first five are cached.
  await budgets.updateOne({_id:budgetId},{$set:{count:19}});
  await page.getByTestId('matching-next-page').scrollIntoViewIfNeeded();await expect(page.locator('.ai-panel [role=alert]')).toContainText("Today's AI allowance is used",{timeout:30000});await expect(page.locator('.ai-match-card')).toHaveCount(20);
  run=await(await page.request.get('/api/matching')).json();expect(run.shown).toBe(20);expect(run.items.slice(0,10).map((t:{id:string})=>t.id)).toEqual(firstIds);expect(run.items.slice(10).every((t:{explanation:unknown})=>!t.explanation)).toBe(true);
  await budgets.updateOne({_id:budgetId},{$set:{count:3}});await page.getByRole('button',{name:'Retry explanations for results 11–20'}).click();await expect(page.locator('.ai-match-card').last()).toContainText('Why it matches:',{timeout:30000});expect((await budgets.findOne({_id:budgetId}))?.count).toBe(4);
  // Repeating a committed page must not append results or spend another model call.
  const replay=await page.request.post('/api/matching',{data:{action:'explain',runId:run._id,offset:10}});expect(replay.ok()).toBe(true);expect((await replay.json()).items).toHaveLength(20);expect((await budgets.findOne({_id:budgetId}))?.count).toBe(4);
  await page.getByTestId('matching-next-page').scrollIntoViewIfNeeded();await expect(page.locator('.ai-match-card')).toHaveCount(25,{timeout:30000});await expect(page.getByText('You’ve reached the end of this shortlist.')).toBeVisible();await expect(page.locator('.ai-match-card').last()).toContainText('Why it matches:');expect((await budgets.findOne({_id:budgetId}))?.count).toBe(5);
  run=await(await page.request.get('/api/matching')).json();expect(run.hasMore).toBe(false);expect(new Set(run.items.map((t:{id:string})=>t.id)).size).toBe(25);expect(run.items.every((t:{explanation:unknown})=>!!t.explanation)).toBe(true);expect(run.items.slice(0,10).map((t:{id:string})=>t.id)).toEqual(firstIds);
  await page.reload();await expect(page.locator('.ai-match-card')).toHaveCount(25);expect((await budgets.findOne({_id:budgetId}))?.count).toBe(5);
  expect((await page.request.post('/api/matching',{data:{action:'page',runId:run._id,offset:9}})).status()).toBe(409);
  const other=await browser.newContext({baseURL:'http://localhost:3001'});await other.request.post('/api/auth/sign-up/email',{data:{name:'Other matcher',email:'pages-other@example.test',password:'Test-only-password-483!'}});expect((await other.request.post('/api/matching',{data:{action:'page',runId:run._id,offset:0}})).status()).toBe(404);await other.close();
  await page.request.post('/api/data',{data:{action:'company',company:{...company,regions:['Karnataka']}}});expect((await(await page.request.get('/api/matching')).json()).stale).toBe(true);expect((await page.request.post('/api/matching',{data:{action:'page',runId:run._id,offset:0}})).status()).toBe(409);
 }finally{await client.close();}
});

test('scrolling loads another ten while earlier explanations are still pending',async({page})=>{
 expect((await page.request.post('/api/auth/sign-up/email',{data:{name:'Overlapping matching',email:'overlapping-pages@example.test',password:'Test-only-password-483!'}})).ok()).toBe(true);
 await page.request.post('/api/data',{data:{action:'company',company:{name:'Overlap supplier',categories:'paged-match',aiProfile:'paged-match '.repeat(5)}}});
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});const offsets:number[]=[];
 await page.route('**/api/matching',async route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();if(body.action==='explain'){offsets.push(body.offset);if(body.offset===0)await gate;}}await route.continue();});
 await page.goto('/discover?recommended=true&start=true');
 await expect(page.locator('.ai-match-card')).toHaveCount(10);
 await expect(page.locator('.ai-match-card [role=status]')).toHaveCount(10);
 await page.getByTestId('matching-next-page').scrollIntoViewIfNeeded();
 await expect(page.locator('.ai-match-card')).toHaveCount(20);
 await expect(page.locator('.ai-match-card').nth(19)).toContainText('Why it matches:');
 await expect(page.locator('.ai-match-card').first().getByRole('status')).toBeVisible();
 expect(offsets).toEqual([0,10]);
 release();
 await expect(page.locator('.ai-match-card [role=status]')).toHaveCount(0);
 await expect(page.locator('.ai-match-card')).toHaveCount(20);
 expect(offsets).toEqual([0,10]);
 const saved=await(await page.request.get('/api/matching')).json();expect(saved.shown).toBe(20);expect(saved.items.every((t:{explanation:unknown})=>t.explanation)).toBe(true);
});

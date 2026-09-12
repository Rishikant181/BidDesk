import {test,expect} from '@playwright/test';
import {MongoClient} from 'mongodb';

function pdfBytes(){
 const content='BT /F1 12 Tf 20 200 Td (Isolated software tender supporting document for review.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [i,obj] of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(pdf);
}

test('provider-only routes, PDF upload, comparison, private preparation and source changes',async({page,browser})=>{
 const name=process.env.BIDDESK_TEST_DB;if(!name||!/^biddesk_test_[a-f0-9]{16}$/.test(name))throw Error('Isolated database required');
 const client=new MongoClient(process.env.MONGODB_URI!);await client.connect();const db=client.db(name);
 try{
  const signup=await page.request.post('/api/auth/sign-up/email',{data:{name:'Provider workspace',email:'workspace@example.test',password:'Test-only-password-483!'}});expect(signup.ok(),await signup.text()).toBe(true);
  for(const path of ['/imports','/results','/tenders/old-notice','/company/extra'])expect((await page.request.get(path)).status()).toBe(404);
  for(const action of ['import','award.import'])expect((await page.request.post('/api/data',{data:{action,records:[{title:'Not allowed',reference:'123'}]}})).status()).toBe(400);
  for(const action of ['retrieve','profile','embed','matches'])expect((await page.request.post('/api/ai',{data:{action,tenderId:'th-6732969'}})).status()).toBe(400);
  expect((await page.request.post('/api/ai',{data:{action:'attach',document:{name:'Unlinked',pages:[{page:1,text:'Not allowed to create an independent notice'}]}}})).status()).toBe(400);
  expect((await page.request.get('/api/data?mode=export')).status()).toBe(400);
  await page.goto('/discover');await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('link',{name:'Import a tender'})).toHaveCount(0);await expect(page.getByRole('link',{name:'Tender results'})).toHaveCount(0);
  const picks=page.getByRole('checkbox',{name:/Compare /});await picks.nth(0).check();await picks.nth(1).check();await page.getByRole('link',{name:/Compare tenders/}).click();await expect(page.locator('.comparison-table thead th')).toHaveCount(3);
  await page.goto('/tenders/th-6732969');await page.getByRole('tab',{name:'Documents & review',exact:true}).click();await expect(page.getByRole('button',{name:'Read document',exact:true})).toHaveCount(0);
  await page.getByLabel('Attach tender PDF for AI').setInputFiles({name:'supporting-notice.pdf',mimeType:'application/pdf',buffer:pdfBytes()});await expect(page.getByLabel('Document to analyze')).toContainText('supporting-notice.pdf');
  const detail=await(await page.request.get('/api/data?mode=tender&cached=true&id=th-6732969')).json();
  const requirement={id:'source-workspace-clause',label:'Check project evidence',type:'manual',clause:'Supporting notice page 1',page:1,confirmed:true};
  expect((await page.request.post('/api/data',{data:{action:'review',id:detail.tender.id,version:detail.tender.currentVersion,requirements:[requirement],notes:'Private source questions'}})).ok()).toBe(true);
  await page.reload();await page.getByRole('button',{name:'Start preparing this bid'}).click();await expect(page).toHaveURL(/\/bids\//);await expect(page.getByLabel('Task 1 title')).toHaveValue(requirement.label);
  await page.getByLabel('Complete task 1').check();await page.getByText(/Edit task 1/).click();await page.getByLabel('Internal deadline').fill('2026-09-20');await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByText('Bid preparation saved',{exact:true})).toBeVisible();
  const bidId=page.url().split('/').pop()!;
  const calendarDate=new Date().toISOString().slice(0,10);const workspace=await(await page.request.get('/api/data')).json();const bid=workspace.bids.find((b:{id:string})=>b.id===bidId);bid.tasks[0].done=false;bid.tasks[0].dueAt=calendarDate;expect((await page.request.post('/api/data',{data:{action:'bid.save',id:bidId,bid}})).ok()).toBe(true);
  await page.goto('/calendar');await expect(page.locator('.agenda')).toContainText(requirement.label);
  const ready=await(await page.request.get('/api/data')).json();const completed=ready.bids.find((b:{id:string})=>b.id===bidId);completed.tasks[0].done=true;completed.tasks[0].notes='Preserve supporting evidence';expect((await page.request.post('/api/data',{data:{action:'bid.save',id:bidId,bid:completed}})).ok()).toBe(true);
  // The source fixture changes its HTML response; the application creates the actual version/event.
  await db.collection('testSourceControl').insertOne({titleSuffix:' Updated scope'});
  await page.goto('/tenders/th-6732969');await expect(page.getByRole('heading',{level:1})).toContainText('Updated scope');await page.getByRole('tab',{name:/changes/}).click();await expect(page.getByText('Title changed',{exact:true})).toBeVisible();
  const changed=await(await page.request.get('/api/data')).json();const updated=changed.bids.find((b:{id:string})=>b.id===bidId);expect(updated.tasks[0].changed).toBe(true);expect(updated.tasks[0].done).toBe(false);expect(updated.tasks[0].notes).toBe(completed.tasks[0].notes);expect(changed.notifications.some((n:{tenderId:string})=>n.tenderId===detail.tender.id)).toBe(true);
  await page.getByRole('button',{name:'Notifications',exact:true}).click();await page.getByRole('button',{name:'Mark all as read'}).click();await expect(page.getByText('Read',{exact:true}).first()).toBeVisible();
  const other=await browser.newContext({baseURL:'http://localhost:3001'});await other.request.post('/api/auth/sign-up/email',{data:{name:'Other workspace',email:'workspace-other@example.test',password:'Test-only-password-483!'}});const foreign=await(await other.request.get('/api/data')).json();expect(foreign.bids).toHaveLength(0);expect((await(await other.request.get('/api/data?mode=tender&cached=true&id=th-6732969')).json()).notes).toBe('');await other.close();
 }finally{await db.collection('testSourceControl').deleteMany({});await client.close();}
});

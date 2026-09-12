import {test,expect} from '@playwright/test';

test('search states, responsive results, document recovery and unsaved form protection',async({page},testInfo)=>{
 const signup=await page.request.post('/api/auth/sign-up/email',{data:{name:'UI review',email:'ui-review@example.test',password:'Test-only-password-483!'}});
 expect(signup.ok(),await signup.text()).toBe(true);
 await page.goto('/discover');await expect(page.locator('tbody tr')).toHaveCount(2);
 let release!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/data?mode=tenders&**',async route=>{if(new URL(route.request().url()).searchParams.get('q')==='software'){await hold;await route.continue();}else await route.continue();});
 await page.getByLabel('Search tenders',{exact:true}).fill('software');await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(page.getByText('Updating results…',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Export this page'})).toBeDisabled();await expect(page.locator('tbody tr')).toHaveCount(0);
 release();await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.getByRole('button',{name:'Export this page'})).toBeEnabled();
 await page.unroute('**/api/data?mode=tenders&**');let fail=true;
 await page.route('**/api/data?mode=tenders&**',route=>fail?route.fulfill({status:503,json:{error:'Search temporarily unavailable.'}}):route.continue());
 await page.getByLabel('Search tenders',{exact:true}).fill('laboratory');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveText('Search temporarily unavailable.');await expect(page.getByRole('button',{name:'Export this page'})).toBeDisabled();
 fail=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1);await page.unroute('**/api/data?mode=tenders&**');
 await page.goto('/discover');await expect(page.locator('tbody tr')).toHaveCount(2);
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const row=page.locator('tbody tr').first();
  for(const selector of ['.tender-title','.deadline-cell','.money','.bookmark-cell']){
   const box=await row.locator(selector).boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
  }
  expect(await page.locator('main').evaluate(main=>[...main.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.textContent?.trim()&&e.children.length===0).every(e=>parseFloat(getComputedStyle(e).fontSize)>=14))).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`discovery-${width}.png`),fullPage:true});
 }
 await page.locator('a.tender-title').first().click();await page.getByRole('tab',{name:'Documents & review',exact:true}).click();await expect(page.getByLabel('Attach tender PDF for AI')).toBeVisible();
 await page.route('**/api/ai?**',route=>route.fulfill({status:503,json:{error:'Document history unavailable.'}}));
 await page.getByRole('tab',{name:'overview',exact:true}).click();await page.getByRole('tab',{name:'Documents & review',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveText('Document history unavailable.');
 await page.unroute('**/api/ai?**');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveCount(0);await expect(page.getByText('Loading documents and previous reviews…')).toHaveCount(0);
 await page.route('**/api/attachments?**',route=>route.fulfill({status:503,json:{error:'Transferred files unavailable.'}}));await page.getByRole('tab',{name:'overview',exact:true}).click();await page.getByRole('tab',{name:'Documents & review',exact:true}).click();await page.getByText('Transfer attachments from the source portal',{exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveText('Transferred files unavailable.');await page.unroute('**/api/attachments?**');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await expect(page.getByRole('button',{name:'Close navigation',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
 await page.goto('/company');await page.getByLabel('Company name',{exact:true}).fill('Readable UI supplier');await expect(page.getByText('Unsaved changes',{exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:900});page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Discover tenders',exact:true}).click();await expect(page).toHaveURL(/\/company$/);
 await page.getByRole('button',{name:'Save company profile',exact:true}).click();await expect(page.getByText('All changes saved',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Discover tenders',exact:true}).click();await expect(page).toHaveURL(/\/discover$/);
 await page.locator('a.tender-title').first().click();await page.getByRole('button',{name:'Start preparing this bid'}).click();await expect(page).toHaveURL(/\/bids\//);
 await page.getByRole('button',{name:'Add task',exact:true}).click();const newTask=page.locator('.task-editor').last();await newTask.getByLabel(/Task \d+ title/).fill('Prepare completion certificate');await expect(newTask.getByLabel(/Task \d+ title/)).toBeVisible();await newTask.getByLabel('Internal deadline').fill('2026-10-15');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('All changes saved',{exact:true})).toBeVisible();await expect(page.getByText('Prepare completion certificate',{exact:true})).toBeVisible();
 await page.goto('/discover');
 // 200% zoom-equivalent viewport: essential content reflows without page overflow.
 await page.setViewportSize({width:720,height:450});await expect(page.locator('tbody tr')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

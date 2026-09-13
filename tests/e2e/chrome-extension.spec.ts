import {test,expect,chromium} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('Chrome extension loads, pairs and transfers through its real service worker',async({page})=>{
 const directory=await mkdtemp(path.join(tmpdir(),'biddesk-chrome-'));
 // Exercise exactly the archive downloaded from the UI, rather than a separate build.
 execFileSync('python3',['-c','import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1]) as z: z.extractall(sys.argv[2])','public/biddesk-attachment-extension.zip',directory]);
 const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${directory}`,`--load-extension=${directory}`]});
 try{
  const signup=await page.request.post('/api/auth/sign-up/email',{headers:{'x-forwarded-for':'192.0.2.220'},data:{name:'Chrome transfer',email:'chrome-transfer@example.test',password:'Test-only-password-483!'}});expect(signup.ok()).toBe(true);
  await page.request.get('/api/data?mode=tenders');await page.goto('/tenders/th-6732969');await page.getByRole('tab',{name:'Documents & review',exact:true}).click();await page.getByText('Transfer attachments from the source portal',{exact:true}).click();await page.getByText('Set up the Chrome extension',{exact:true}).click();await expect(page.getByText('chrome://extensions',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Chrome extension ZIP',exact:true})).toHaveAttribute('href','/biddesk-attachment-extension.zip');
  await page.getByRole('button',{name:'Pair attachment extension',exact:true}).click();const code=await page.getByLabel('Extension pairing code').inputValue();
  const bytes=execFileSync('python3',['-c',"import io,zipfile,sys\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:z.writestr('chrome-transfer.txt','Isolated browser transfer fixture')\nsys.stdout.buffer.write(b.getvalue())"]);
  let refreshCookie='',downloadAuthorization='';
  await context.addCookies([{name:'test-session',value:'browser-only-fixture',domain:'tenderhut.in',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
  await context.route('https://tenderhut.in/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/auth/refresh'){refreshCookie=(await route.request().allHeaders()).cookie||'';await route.fulfill({json:{access_token:'browser-only-access-token'}});}
   else if(url.pathname==='/bids/6732969/documents/zip'){downloadAuthorization=(await route.request().allHeaders()).authorization||'';await route.fulfill({contentType:'application/zip',body:bytes});}
   else await route.fulfill({contentType:'text/html',body:'<html><body>Isolated TenderHut session</body></html>'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
  const portal=await context.newPage();await portal.goto('https://tenderhut.in/app');
  const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.getByLabel('Pairing code').fill('invalid');await popup.getByRole('button',{name:'Check destination',exact:true}).click();await expect(popup.locator('#status')).not.toBeEmpty();await expect(popup.locator('#send')).toBeHidden();
  await popup.getByLabel('Pairing code').fill(code);await popup.getByRole('button',{name:'Check destination',exact:true}).click();await expect(popup.locator('#destination')).toContainText('http://localhost:3001');
  // A real toolbar popup does not become the active tab; reproduce that here.
  await portal.bringToFront();await popup.locator('#send').evaluate((button:HTMLButtonElement)=>button.click());await expect(popup.locator('#status')).toContainText('Transfer complete');
  expect(refreshCookie).toContain('test-session=browser-only-fixture');expect(downloadAuthorization).toBe('Bearer browser-only-access-token');
  await page.getByRole('button',{name:'Review transferred files',exact:true}).click();await expect(page.getByText('chrome-transfer.txt',{exact:true})).toBeVisible();
  // Reusing the consumed grant must reach the server and be rejected.
  await popup.getByLabel('Pairing code').fill(code);await popup.getByRole('button',{name:'Check destination',exact:true}).click();await expect(popup.locator('#send')).toBeVisible();await portal.bringToFront();await popup.locator('#send').evaluate((button:HTMLButtonElement)=>button.click());await expect(popup.locator('#status')).toContainText('expired or already used');
 }finally{await context.close();await rm(directory,{recursive:true,force:true});}
});

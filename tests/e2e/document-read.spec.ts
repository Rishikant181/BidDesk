import {test,expect} from "@playwright/test";
test("reads a linked official PDF through the browser",async({page})=>{
 const signup=await page.request.post("/api/auth/sign-up/email",{data:{name:"PDF read verification",email:"pdf-read@example.test",password:"Test-only-password-483!"}});expect(signup.ok()).toBe(true);
 const workspace=await(await page.request.get("/api/data?mode=tenders&local=true&q=RFSoC")).json();const tender=workspace.tenders.find((t:{reference:string})=>t.reference.includes("PT-18/26-27"));expect(tender).toBeTruthy();
 await page.goto(`/tenders/${tender.id}`);await page.getByRole("button",{name:"Analyze documents",exact:true}).click();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/ai')&&r.request().method()==='POST');await page.getByRole('button',{name:'Read document',exact:true}).first().click();const result=await response;expect(result.ok(),await result.text()).toBe(true);
 await expect(page.getByText(/Read \d+ pages. Select the pages/)).toBeVisible();const data=await result.json();expect(data.method).toBe('official-link');expect(data.pages.some((p:{text:string})=>p.text.includes('RFSoC'))).toBe(true);const again=page.waitForResponse(r=>r.url().endsWith('/api/ai')&&r.request().method()==='POST');await page.getByRole('button',{name:'Read document',exact:true}).first().click();expect((await(await again).json()).id).toBe(data.id);
});

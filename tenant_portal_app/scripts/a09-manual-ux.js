const { chromium } = require('playwright');
const fs=require('fs');
const path=require('path');

const SUBJECT=process.env.A09_SUBJECT;
if(!SUBJECT) throw new Error('A09_SUBJECT required');
const MESSAGE=`A09 attachment message ${Date.now()}`;
const ATTACH_URL='https://example.com/a09-attachment.png';
const PM_USERNAME=process.env.A09_PM_USERNAME || 'morgan_pm';
const PM_PASSWORD=process.env.A09_PM_PASSWORD || 'demo1234';

async function tenantSend(outDir){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({recordVideo:{dir:outDir,size:{width:1280,height:720}},viewport:{width:1280,height:720}});
 const page=await context.newPage();
 await page.goto('http://localhost:3000/login',{waitUntil:'networkidle'});
 await page.getByRole('textbox',{name:/Username/i}).fill('tenant');
 await page.locator('input[type="password"]').first().fill('Tenant123!@#');
 await page.getByRole('button',{name:'Sign in'}).click();
 await page.waitForURL('**/dashboard',{timeout:15000});
 await page.goto('http://localhost:3000/messaging',{waitUntil:'networkidle'});
 await page.locator('aside button', { hasText: SUBJECT }).first().click();
 await page.getByRole('textbox',{name:'Message content'}).fill(MESSAGE);
 await page.getByRole('textbox',{name:'Attachment URLs'}).fill(ATTACH_URL);
 await page.getByRole('button',{name:'Send message'}).click();
 await page.waitForTimeout(1500);
 await page.screenshot({path:path.join(outDir,'a09-01-tenant-sent-with-attachment.png'),fullPage:true});
 const body=(await page.textContent('body'))||'';
 await context.close(); await browser.close();
 return {message:MESSAGE, hasAttachmentLabel: body.includes('Attachment 1')};
}

async function pmVerify(outDir){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({recordVideo:{dir:outDir,size:{width:1280,height:720}},viewport:{width:1280,height:720}});
 const page=await context.newPage();
 await page.goto('http://localhost:3000/login',{waitUntil:'networkidle'});
 await page.getByRole('textbox',{name:/Username/i}).fill(PM_USERNAME);
 await page.locator('input[type="password"]').first().fill(PM_PASSWORD);
 await page.getByRole('button',{name:'Sign in'}).click();
 await page.waitForURL('**/dashboard',{timeout:15000});
 await page.goto('http://localhost:3000/messaging',{waitUntil:'networkidle'});
 await page.waitForTimeout(1200);
 const targetThread = page.locator('aside button', { hasText: SUBJECT }).first();
 const found = await targetThread.isVisible().catch(()=>false);
 if (found) {
   await targetThread.click();
   await page.waitForTimeout(1200);
 }
 await page.screenshot({path:path.join(outDir,'a09-02-pm-thread-with-attachment.png'),fullPage:true});
 const body=(await page.textContent('body'))||'';
 await context.close(); await browser.close();
 return {pmThreadVisible: found, pmSeesMessage: body.includes(MESSAGE), pmSeesAttachment: body.includes('Attachment 1')};
}

(async()=>{
 const outDir=path.resolve(__dirname,'../../../reports/evidence/A-09');
 fs.mkdirSync(outDir,{recursive:true});
 const tenant=await tenantSend(outDir);
 const pm=await pmVerify(outDir);
 console.log(JSON.stringify({subject:SUBJECT,message:tenant.message,tenant,pm},null,2));
})();
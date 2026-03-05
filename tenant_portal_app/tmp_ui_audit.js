const { chromium } = require('playwright');

function b64url(obj){return Buffer.from(JSON.stringify(obj)).toString('base64url')}
function makeToken(role){
  const now=Math.floor(Date.now()/1000);
  return `${b64url({alg:'none',typ:'JWT'})}.${b64url({sub:1,username:role.toLowerCase()+'@test.com',role,exp:now+3600})}.`;
}

async function analyzePage(page, name, path){
  const url = `http://localhost:5173${path}`;
  const consoleErrors=[];
  const onConsole = msg=>{if(msg.type()==='error') consoleErrors.push(msg.text())};
  page.on('console', onConsole);
  await page.goto(url, {waitUntil:'networkidle'}).catch(()=>{});
  await page.waitForTimeout(600);

  const data = await page.evaluate(() => {
    const text = (el)=> (el?.textContent||'').trim();
    const h1s=[...document.querySelectorAll('h1')].map(text).filter(Boolean);
    const h2s=[...document.querySelectorAll('h2')].map(text).filter(Boolean).slice(0,5);
    const nav=[...document.querySelectorAll('nav a, [role="navigation"] a')].map(el=>text(el)).filter(Boolean).slice(0,15);
    const buttons=[...document.querySelectorAll('button,[role="button"]')];
    const badButtons=buttons.filter(b=>!(text(b)||b.getAttribute('aria-label')||b.getAttribute('title'))).length;
    const inputs=[...document.querySelectorAll('input,textarea,select')];
    const unlabeled = inputs.filter(i=>{
      const id=i.id;
      const hasLabel=id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      return !(hasLabel || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.getAttribute('placeholder'));
    }).length;
    const mainText = text(document.querySelector('main'))?.slice(0,240);
    return {title: document.title, h1s, h2s, nav, badButtons, unlabeledInputs: unlabeled, mainText};
  });

  await page.keyboard.press('Tab');
  const focusInfo = await page.evaluate(() => {
    const el=document.activeElement;
    if(!el) return null;
    const cs=getComputedStyle(el);
    return {tag:el.tagName, text:(el.textContent||'').trim().slice(0,40), cls:String(el.className||''), outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor, boxShadow:cs.boxShadow};
  });

  await page.screenshot({path:`/tmp/${name.replace(/[^a-z0-9]/gi,'_')}.png`, fullPage:true}).catch(()=>{});
  page.off('console', onConsole);
  return {name, path, ...data, focusInfo, consoleErrors: [...new Set(consoleErrors)].slice(0,5)};
}

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const results=[];

  results.push(await analyzePage(page,'login','/login'));

  await page.goto('http://localhost:5173/login');
  await page.evaluate((t)=>localStorage.setItem('token',t), makeToken('TENANT'));
  const tenantRoutes=['/dashboard','/maintenance','/payments','/messaging','/my-lease','/tenant/inspections'];
  for (const r of tenantRoutes) results.push(await analyzePage(page,`tenant_${r}`,r));

  await page.goto('http://localhost:5173/login');
  await page.evaluate((t)=>localStorage.setItem('token',t), makeToken('PM'));
  const pmRoutes=['/dashboard','/properties','/lease-management','/inspection-management'];
  for (const r of pmRoutes) results.push(await analyzePage(page,`pm_${r}`,r));

  console.log(JSON.stringify(results,null,2));
  await browser.close();
})();
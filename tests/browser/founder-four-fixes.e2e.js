'use strict';
// Isolated local fixtures. This is not evidence of a signed-in production backup.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),artifact=path.join(root,'.hosting-build/four-items-browser'),evidence=path.join(root,'.hosting-build/four-items-evidence'),origin='http://127.0.0.1:4198';
const Portable=require('../../src/core/portable-backup');
let browser,server;const checks=[];
function check(value,label){assert.ok(value,label);checks.push(label);}
async function run(){
 fs.mkdirSync(evidence,{recursive:true});
 assert.equal(spawnSync(process.execPath,['scripts/build-hosting.js','production','four-items-browser'],{cwd:root,stdio:'inherit'}).status,0);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{const url=new URL(req.url,origin),file=path.resolve(artifact,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(4198,'127.0.0.1',resolve));
 const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
 browser=await chromium.launch({headless:true,executablePath});
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',acceptDownloads:true});
  await context.addInitScript(()=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');});
  await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();const file=/\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)$/.exec(url);if(file)return route.fulfill({path:path.join(root,'node_modules/firebase',file[1]),contentType:'text/javascript'});return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.waitForFunction(()=>typeof openCatSheet==='function'&&typeof TaxMateCompanyState!=='undefined');
  await page.evaluate(()=>{S.businesses=[{id:'test-trade',name:'Local test trade',structure:'sole'}];S.entries=[];S.customCats={'test-trade':{income:[{id:'kept-income',name:'Keep income',e:'💷',custom:true,bizId:'test-trade'}],expense:[{id:'kept-expense',name:'Keep expense',e:'📁',custom:true,bizId:'test-trade'}]}};S.tab='more';save();render();});
  check(await page.getByText('My categories',{exact:true}).count()===0,`${width}: Settings categories list removed`);
  check(await page.evaluate(()=>S.customCats['test-trade'].income[0].id==='kept-income'&&S.customCats['test-trade'].expense[0].id==='kept-expense'),`${width}: existing categories retained`);
  for(const kind of ['income','expense']){
   await page.evaluate(kind=>openEntry(kind),kind);
   await page.locator('[data-tm-click="openCatSheet()"]').click();
   check(await page.locator('#cc-emojis button').count()===31,`${width} ${kind}: 31 selectable icons`);
   check(await page.locator('#cc-emojis button[aria-pressed="true"]').textContent()==='📁',`${width} ${kind}: default folder selected`);
   await page.locator('#cc-name').fill(`Local ${kind} category`);
   if(kind==='expense'){await page.locator('#cc-emojis button').filter({hasText:'🧾'}).click();check(await page.locator('#cc-emoji-input').textContent()==='🧾',`${width}: receipt emoji is selected by clicking`);}
   await page.screenshot({path:path.join(evidence,`emoji-${kind}-${width}.png`),fullPage:true});
   await page.locator('[data-tm-click="saveCat()"]').click();
   check(await page.evaluate(kind=>S.customCats['test-trade'][kind].some(c=>c.name===`Local ${kind} category`&&c.e===(kind==='expense'?'🧾':'📁')),kind),`${width} ${kind}: category created through UI`);
   await page.evaluate(()=>closeSheet('entry'));
  }
  const before=await page.evaluate(()=>JSON.stringify(S));
  const pending=page.waitForEvent('download');await page.evaluate(()=>exportPortableBackup());const download=await pending,zip=path.join(evidence,`local-backup-${width}.zip`);await download.saveAs(zip);
  const inspected=await Portable.inspectArchive(fs.readFileSync(zip));check(inspected.state.customCats['test-trade'].income.length===2,`${width}: downloaded local ZIP preserves categories`);check(await page.evaluate(()=>JSON.stringify(S))===before,`${width}: backup does not change state`);
  await page.evaluate(async()=>{
   const copy=await(await fetch('src/integration/ltd/approved-copy.json')).json(),state=TaxMateCompanyState.migrate(S,Date.now(),'local-four-items-test');
   const driver=new TaxMateCanonicalCompanyDriver.CanonicalCompanyDriver({mode:'fresh',state,copy,now:Date.now,entitlementSnapshot:{paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000,serverVerifiedAt:Date.now()}});
   const facade=new TaxMateLtdUIFacadeModule.TaxMateLtdUIFacade({driver});window.fourItemsFacade=facade;
   const mount=document.getElementById('taxmate-ltd-ui-root');TaxMateLtdProductionBridge.enterLtd();
   TaxMateLtdWorkbenchRenderer.setProductionMode(true);TaxMateLtdWorkbenchRenderer.setLocale('en');facade.subscribe(snapshot=>TaxMateLtdWorkbenchRenderer.render(mount,facade,snapshot));const result=await facade.onAddBusinessCategoryChosen({category:'limited_company'});if(result.status!=='ok')throw new Error(JSON.stringify(result));
  });
  const notYet=page.getByRole('button',{name:'Not yet',exact:true});await notYet.waitFor();
  check(await notYet.evaluate(node=>{const a=node.getBoundingClientRect(),b=node.querySelector('.ct').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<2;}),`${width}: Not yet vertically centered`);
  await notYet.click();check(await notYet.getAttribute('aria-pressed')==='true',`${width}: Not yet selects normally`);
  await page.locator('#taxmate-ltd-ui-root input[type="text"]').fill('LOCAL TEST LTD');
  await page.screenshot({path:path.join(evidence,`ltd-step1-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.waitForFunction(()=>fourItemsFacade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step2');
  check(true,`${width}: Step 1 Continue reaches Step 2 in local fixture`);check(errors.length===0,`${width}: no browser runtime errors`);
  await context.close();
 }
 fs.writeFileSync(path.join(evidence,'browser-result.json'),JSON.stringify({status:'PASS',scope:'ISOLATED_LOCAL_FIXTURES',checks},null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length}));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

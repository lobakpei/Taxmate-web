'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const {createFounderPreviewBackup}=require('../../ui-preview-harness/sanitised-backup-fixture');
const {buildPreviewDataset}=require('../../ui-preview-harness/founder-preview-dataset');

const root=path.resolve(__dirname,'../..');
const evidence=path.resolve(process.env.TAXMATE_BUILD21_UI_EVIDENCE||path.join(root,'evidence','build21','complete-ui'));
const port=Number(process.env.TAXMATE_BUILD21_UI_PORT||41761),origin=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,browser;

function chromePath(){return [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(item=>item&&fs.existsSync(item));}
async function waitForServer(){const start=Date.now();while(Date.now()-start<15000){try{if((await fetch(`${origin}/index.html`)).ok)return;}catch(_){}await sleep(100);}throw new Error('preview server did not start');}
async function shot(page,name,fullPage=true){const target=path.join(evidence,`${name}.png`);await page.screenshot({path:target,fullPage});return path.basename(target);}
async function assertNoOverlap(page,selector,label){
  const result=await page.locator(selector).evaluateAll(nodes=>nodes.filter(node=>{const style=getComputedStyle(node),box=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;}).map(node=>{const box=node.getBoundingClientRect();return{top:box.top,bottom:box.bottom,left:box.left,right:box.right,text:node.textContent.trim().replace(/\s+/g,' ').slice(0,80)};}));
  for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){const a=result[i],b=result[j],x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);assert.ok(!(x>1&&y>1),`${label}: controls overlap: ${a.text} / ${b.text}`);}
  return result;
}
async function modalAudit(page,label){
  const state=await page.evaluate(()=>({htmlLocked:document.documentElement.classList.contains('ltd-sheet-open'),bodyLocked:document.body.classList.contains('ltd-sheet-open'),bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,backgroundInert:!!document.querySelector('#taxmate-ltd-ui-root .tm-col[inert]'),sheetOverflow:getComputedStyle(document.querySelector('.tm-sbody')).overflowY,scrollY}));
  assert.deepEqual({...state,scrollY:undefined},{htmlLocked:true,bodyLocked:true,bodyOverflow:'hidden',htmlOverflow:'hidden',backgroundInert:true,sheetOverflow:'auto',scrollY:undefined},`${label}: modal owns scrolling and locks the page`);
  await page.mouse.move(4,4);await page.mouse.wheel(0,700);await sleep(150);assert.equal(await page.evaluate(()=>scrollY),state.scrollY,`${label}: wheel on the scrim cannot move the background`);
  return state;
}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  server=spawn(process.execPath,['scripts/preview-server.js'],{cwd:root,env:{...process.env,TAXMATE_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  await waitForServer();browser=await chromium.launch({headless:true,executablePath:chromePath()});
  const fixtureBytes=Buffer.from(`${JSON.stringify(createFounderPreviewBackup(),null,2)}\n`),fixturePath=path.join(evidence,'sanitised-ui-fixture.json');fs.writeFileSync(fixturePath,fixtureBytes);
  const state=buildPreviewDataset({mode:'existing',backupPath:fixturePath,expectedSha256:crypto.createHash('sha256').update(fixtureBytes).digest('hex')}).state;
  state.settings={...state.settings,lang:'zh',theme:'dark'};state.tab='home';
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark'});
  await context.addInitScript(json=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');localStorage.setItem('taxmateuk_account_v1:local:canonical',json);sessionStorage.setItem('tmCarouselDismissed','["pwa"]');},JSON.stringify(state));
  const page=await context.newPage(),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`${origin}/index.html`,{waitUntil:'networkidle'});await page.locator('#nav button').first().waitFor();
  const screenshots=[];
  for(const tab of ['home','income','expenses','receipts','tax','more']){await page.evaluate(name=>go(name),tab);await sleep(80);screenshots.push(await shot(page,`personal-${tab}-zh-dark`));}
  for(const kind of ['income','expense']){await page.evaluate(value=>openEntry(value),kind);await page.locator('#sb-entry.open').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('sheet-open')&&document.body.classList.contains('sheet-open')),true,`${kind} sheet locks html and body`);await assertNoOverlap(page,'#sb-entry.open .catgrid>.catbtn',`${kind} categories`);await assertNoOverlap(page,'#sb-entry.open .sact>.btn',`${kind} footer`);screenshots.push(await shot(page,`personal-add-${kind}-zh-dark`,false));await page.evaluate(()=>closeSheet('entry'));}
  const personalSheets=[
    ['business',()=>page.evaluate(()=>openBiz(null,'sole'))],
    ['tax-adjustment',()=>page.evaluate(()=>openAdj())],
    ['category',()=>page.evaluate(()=>openCatSheet())],
    ['folder',()=>page.evaluate(()=>openFolderSheet())],
    ['partner-code',()=>page.evaluate(()=>openSheet('partner'))],
    ['assistant',()=>page.evaluate(()=>assistantOpen())],
    ['notice',()=>page.evaluate(()=>showNotice('驗收提示','呢個係完整 UI 驗收用嘅安全示範。'))],
    ['confirmation',()=>page.evaluate(()=>confirmAction('確認操作','驗收示範，唔會更改任何資料。',()=>{}))],
    ['android-install',()=>page.evaluate(()=>openSheet('andinstall'))],
    ['ios-install',()=>page.evaluate(()=>openSheet('iosinstall'))]
  ];
  for(const [name,open] of personalSheets){await open();const openSheet=page.locator('.sb.open');await openSheet.waitFor();await assertNoOverlap(page,'.sb.open .sact>.btn',`${name} actions`);screenshots.push(await shot(page,`personal-sheet-${name}-zh-dark`,false));await page.evaluate(()=>closeAllSheets());}
  await page.evaluate(()=>openPromotionSheet());await page.locator('#ob-root.active').waitFor();screenshots.push(await shot(page,'personal-promotion-code-zh-dark',false));await page.evaluate(()=>obClose());

  await page.evaluate(()=>{ENTITLEMENT.snapshot={paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000,serverVerifiedAt:Date.now()};return openLtdCompany();});
  await page.waitForFunction(()=>document.body.classList.contains('ltd-active')&&!document.getElementById('taxmate-ltd-ui-root').hidden);await page.locator('.tm-workspace-shell').waitFor();
  screenshots.push(await shot(page,'ltd-overview-zh-dark'));
  await page.evaluate(async()=>{await TaxMateLtdUIFacade.onSetWorkspaceArea({area:'money'});});await page.locator('.tm-workspace-shell button[data-area="money"][aria-current="page"]').waitFor();
  assert.equal(await page.locator('.tm-review-summary .tm-metric').first().evaluate(node=>getComputedStyle(node).borderTopWidth),'0px','company income has no orphan divider above the first row');
  screenshots.push(await shot(page,'ltd-company-money-zh-dark'));
  await page.locator('.tm-pair .tm-btn').first().click();await page.locator('.tm-scrim').waitFor();const incomeLock=await modalAudit(page,'LTD Add income');await assertNoOverlap(page,'.tm-choices>.tm-choice','LTD income category choices');await assertNoOverlap(page,'.tm-sfoot>.tm-btn','LTD income footer');screenshots.push(await shot(page,'ltd-add-income-zh-dark',false));await page.evaluate(()=>TaxMateLtdWorkbenchRenderer.handleBack());
  await page.evaluate(async()=>{await TaxMateLtdUIFacade.onSetWorkspaceArea({area:'overview'});});await page.locator('[data-action="open-bank"]').click();
  if(!(await page.locator('.tm-scrim').count())){await page.locator('[data-action="bank-statement"]').click();}
  await page.locator('.tm-scrim').waitFor();const bankLock=await modalAudit(page,'LTD bank reconciliation');await assertNoOverlap(page,'.tm-bankline,.tm-sbody>[data-action="bank-add-line"]','LTD bank statement rows and Add row');await assertNoOverlap(page,'.tm-sfoot>.tm-btn','LTD bank footer');
  const affixes=await page.locator('.tm-bankline .tm-inwrap.money').evaluateAll(nodes=>nodes.map(node=>{const affix=node.querySelector('.tm-affix.pre').getBoundingClientRect(),input=node.querySelector('input').getBoundingClientRect();return{affixRight:affix.right,inputLeft:input.left,gap:input.left-affix.right};}));assert.ok(affixes.every(item=>item.gap>=0),`bank currency affixes do not cover the values: ${JSON.stringify(affixes)}`);
  screenshots.push(await shot(page,'ltd-bank-reconciliation-zh-dark',false));
  const receipt={status:'PASS',generatedAt:new Date().toISOString(),viewport:{width:390,height:844},locale:'zh-HK',theme:'dark',screenshots,incomeLock,bankLock,pageErrors};fs.writeFileSync(path.join(evidence,'acceptance.json'),`${JSON.stringify(receipt,null,2)}\n`);assert.deepEqual(pageErrors,[],'no browser page errors');
  console.log(`BUILD21_UI_REGRESSION PASS screenshots=${screenshots.length}`);
  await context.close();
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close().catch(()=>{});if(server)server.kill();});

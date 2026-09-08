'use strict';
// Local regression only: old-version saved fixture, real app rendering and error exits.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),origin='http://127.0.0.1:41862',key='taxmateuk_account_v1:local:canonical';
const saved=fs.readFileSync(path.join(root,'tests/fixtures/upgrade-2.1.20-saved-state.json'),'utf8');
const server=spawn(process.execPath,['scripts/preview-server.js'],{cwd:root,env:{...process.env,TAXMATE_PREVIEW_PORT:'41862'},stdio:'ignore',windowsHide:true});
let browser;
(async()=>{
  for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  const executablePath=[process.env.TAXMATE_CHROME_PATH,chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(candidate=>candidate&&fs.existsSync(candidate));
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/help.html');
  await page.evaluate(({key,saved})=>{localStorage.setItem(key,saved);localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');}, {key,saved});
  await page.goto(origin+'/index.html');await page.locator('[data-home-business-row]').first().waitFor();
  assert.equal(await page.locator('[data-state-load-error]').count(),0);
  assert.ok((await page.locator('#page').innerText()).includes('Saved business'));
  const read=await page.evaluate(key=>({current:JSON.parse(localStorage.getItem(key)),rollback:localStorage.getItem('taxmateuk_account_v1:local:pre-ltd-rollback')}),key);
  assert.deepEqual(read.current.entries,JSON.parse(saved).entries);assert.equal(read.rollback,saved);
  await page.reload();await page.locator('[data-home-business-row]').first().waitFor();
  assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).entries,key),JSON.parse(saved).entries);
  console.log('PASS: old-version business and income load and survive reload; original snapshot retained');
  const bad='{"v":';await page.evaluate(({key,bad})=>localStorage.setItem(key,bad),{key,bad});await page.reload();
  await page.locator('[data-state-load-error]').waitFor();
  await page.locator('#nav button').last().click();assert.equal(await page.locator('[data-state-load-error]').count(),1);
  await Promise.all([page.waitForEvent('load'),page.locator('[data-tm-click="reloadTaxMate()"]').click()]);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),bad);
  await page.locator('[data-state-load-error] a[href="help.html"]').click();await page.waitForURL('**/help.html');
  await page.goto(origin+'/index.html');await page.locator('[data-state-load-error]').waitFor();await page.goBack();assert.ok(page.url().endsWith('/help.html'));
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),bad);
  console.log('PASS: error reload, navigation, Help and Back work without overwriting stored bytes');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});

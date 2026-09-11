'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const artifact=path.join(root,'.hosting-build','webview-compat-browser');
const chromeCandidates=[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe')
].filter(Boolean);

function mime(file){return({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}[path.extname(file)]||'application/octet-stream');}

(async()=>{
  const build=spawnSync(process.execPath,['scripts/build-hosting.js','production','webview-compat-browser'],{cwd:root,stdio:'inherit'});
  assert.equal(build.status,0,'candidate Hosting build failed');

  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://127.0.0.1'),relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).replace(/^\/+/,''),target=path.resolve(artifact,relative);
    if(!target.startsWith(path.resolve(artifact)+path.sep)||!fs.existsSync(target)){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'content-type':mime(target),'cache-control':'no-store'});fs.createReadStream(target).pipe(response);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const executablePath=chromeCandidates.find(candidate=>fs.existsSync(candidate));
  const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    await context.addInitScript(()=>{
      Object.defineProperty(Array.prototype,'at',{value:undefined,writable:true,configurable:true});
      Object.defineProperty(String.prototype,'at',{value:undefined,writable:true,configurable:true});
    });
    await context.route('**/*',async route=>{
      const url=route.request().url();
      if(/^https?:\/\//.test(url)&&!url.startsWith(origin)){await route.abort('blockedbyclient');return;}
      await route.continue();
    });
    const errors=[],page=await context.newPage();
    page.on('pageerror',error=>errors.push(String(error&&error.stack||error)));
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('#ob-root.active').waitFor();
    assert.deepEqual(await page.evaluate(()=>({arrayAt:typeof Array.prototype.at,stringAt:typeof String.prototype.at})),{arrayAt:'undefined',stringAt:'undefined'});

    await page.locator('[data-tm-click="obToggleLang()"]:visible').click();
    await page.locator('[data-tm-click="obSetLang(\'zh\')"]:visible').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'zh');
    await page.locator('[data-tm-click="obToggleLang()"]:visible').click();
    await page.locator('.ob-sheet[role="dialog"]').waitFor();
    await page.locator('.ob-sheet-back').click({position:{x:8,y:8}});
    await page.locator('[data-tm-click="obNoLogin()"]:visible').click();
    await page.locator('[data-tm-click="obStartPartnerSync()"]:visible').waitFor();

    await page.locator('[data-tm-click="obExplore()"]:visible').click();
    assert.equal(await page.evaluate(()=>S.tab),'home');
    await page.evaluate(()=>go('more'));
    await page.locator('details[data-settings-section="preferences"] summary').click();
    await page.locator('[data-getting-started="full-tour"]').waitFor();
    const before=await page.evaluate(()=>({canonical:localStorage.getItem(STORE_KEY),done:localStorage.getItem(accountSlotKey('onboarding-done'))}));
    await page.locator('[data-tm-click="obRestartFullTour()"]:visible').click();
    assert.equal(await page.locator('#ob-root').getAttribute('data-onboarding-mode'),'full-tour');
    await page.locator('[data-tm-click="obExitReplay()"]:visible').click();
    const after=await page.evaluate(()=>({canonical:localStorage.getItem(STORE_KEY),done:localStorage.getItem(accountSlotKey('onboarding-done')),tab:S.tab,open:document.getElementById('ob-root').classList.contains('active')}));
    assert.deepEqual(after,{...before,tab:'home',open:false});

    await page.locator('[data-tm-click="openAddBusinessFlow()"]:visible').click();
    await page.waitForFunction(()=>document.body.classList.contains('ltd-active')&&TaxMateLtdUIFacade.getSnapshot().navigation.routes.slice(-1)[0]?.screenId==='business.category-choice');
    assert.equal(await page.evaluate(()=>accountLtdUiFacts().route),'business.category-choice');
    await page.evaluate(()=>TaxMateLtdUIFacade.onOpenHome());
    await page.waitForFunction(()=>!document.body.classList.contains('ltd-active')&&S.tab==='home');
    assert.equal(await page.evaluate(()=>accountHomeUiFacts().ready),true);

    await page.locator('[data-tm-click="openAddBusinessFlow()"]:visible').click();
    await page.waitForFunction(()=>accountLtdUiFacts().ready&&accountLtdUiFacts().route==='business.category-choice');
    await page.evaluate(()=>TaxMateLtdUIFacade.onOpenHome());
    await page.waitForFunction(()=>accountHomeUiFacts().ready);
    assert.deepEqual(errors,[]);
    await context.close();
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
  process.stdout.write('PASS Android WebView compatibility journey\n');
})().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';

const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const firebasePackage=path.dirname(require.resolve('firebase/package.json'));
const evidence=process.env.TAXMATE_UI_EVIDENCE||path.join(root,'.hosting-build','founder-ui-regression',Date.now().toString(36));
const origin='http://127.0.0.1:41915';
const results={status:'RUNNING',startedAt:new Date().toISOString(),assertions:[],screenshots:[],pageErrors:[]};
const check=(value,label)=>{assert.ok(value,label);results.assertions.push(label);};
let server,browser,page;

function serve(){
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
  server=http.createServer((req,res)=>{try{
    let rel=decodeURIComponent(new URL(req.url,origin).pathname).replace(/^\//,'')||'index.html';
    if(rel.includes('..'))throw Error('outside local scope');
    let bytes;
    if(rel.startsWith('vendor/firebase/'))bytes=fs.readFileSync(path.join(firebasePackage,path.basename(rel)));
    else bytes=fs.readFileSync(path.join(root,rel));
    if(rel==='index.html')bytes=Buffer.from(bytes.toString().replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^"']+\/(firebase-[^"']+\.js)/g,'vendor/firebase/$1').replace(/<script[^>]+https:\/\/cdnjs\.cloudflare\.com[\s\S]*?<\/script>\s*/gi,'').replace(/<link[^>]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi,''));
    res.writeHead(200,{'content-type':mime[path.extname(rel)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch(error){res.writeHead(404).end(String(error));}});
  return new Promise(resolve=>server.listen(41915,'127.0.0.1',resolve));
}

async function visibleBrandCount(){return page.locator('.brand-lockup').evaluateAll(nodes=>nodes.filter(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;}).length);}
async function shot(name){const file=name+'.png';await page.screenshot({path:path.join(evidence,file),fullPage:!await page.locator('.sb.open,#ob-root.active').count()});results.screenshots.push(file);}
async function present(width,theme){await page.setViewportSize({width,height:width>1000?900:844});await page.evaluate(theme=>{S.settings.theme=theme;applyTheme();},theme);}
async function welcome(){await page.evaluate(()=>{
  if(document.getElementById('ob-root')?.classList.contains('active'))obClose();
  S.businesses=[];S.entries=[];S.domain.companyProfiles=[];S.domain.entities=[];S.tab='home';
  ENTITLEMENT.snapshot={paidTier:'free',subscriptionStatus:'none',serverVerifiedAt:Date.now()};ENTITLEMENT.loaded=true;
  sessionStorage.removeItem('tmProBannerHidden');render();
});}
async function renderBilling(billingView){await page.evaluate(({billingView})=>{
  S.tab='more';BILLING_VIEW=true;BILLING_UI={uid:'fixture',generation:1,view:billingView,loading:false,busy:false,error:null,payments:[],cases:[],subscriptions:[],changes:[],claims:{},hasMore:false,cursor:null,staffCases:[],staffHasMore:false,staffCase:billingView==='staff-case'?{case:{id:'case_fixture',state:'declined',currency:'gbp',customerNote:'',publicReason:'',reason:null},context:null,events:[]}:null};
  document.body.dataset.directionPage='more';document.getElementById('page').innerHTML=pageBilling();
},{billingView});}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});await serve();
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>/^https?:/.test(route.request().url())&&!route.request().url().startsWith(origin)?route.abort():route.continue());
  page=await context.newPage();page.on('pageerror',error=>results.pageErrors.push(error.message));
  await page.goto(origin,{waitUntil:'networkidle'});await page.waitForFunction(()=>typeof render==='function'&&typeof pageBilling==='function');

  for(const width of [360,390,1440])for(const theme of ['light','dark']){
    await present(width,theme);await welcome();
    const layout=await page.evaluate(()=>{const top=document.querySelector('.top').getBoundingClientRect(),hero=document.querySelector('#page>.hero').getBoundingClientRect(),banner=document.querySelector('.welcome-plan-banner').getBoundingClientRect();return{join:Math.abs(top.bottom-hero.top),bannerInside:!!document.querySelector('#page>.hero>.welcome-plan-banner'),bannerBottom:banner.bottom,heroBottom:hero.bottom,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
    if(width<1024)check(layout.join<=1,`Welcome navy header joins hero at ${width}px ${theme}`);
    else check(layout.join>1,`Welcome desktop keeps the rail and hero as distinct regions at ${width}px ${theme}`);
    check(layout.bannerInside&&layout.bannerBottom<=layout.heroBottom+1,`Welcome plan entry stays inside hero at ${width}px ${theme}`);
    check(layout.overflow<=1,`Welcome has no horizontal overflow at ${width}px ${theme}`);
    check(await visibleBrandCount()===1,`Welcome has one visible TaxMate brand at ${width}px ${theme}`);
    await shot(`welcome-${width}-${theme}`);
  }

  for(const width of [360,390,1440])for(const theme of ['light','dark'])for(const view of ['overview','history','cases','plans','staff','staff-case']){
    await present(width,theme);await renderBilling(view);
    check(await visibleBrandCount()===1,`Billing ${view} has one visible TaxMate brand at ${width}px ${theme}`);
    const gaps=await page.locator('[data-billing-page] .billing-card-actions,[data-billing-page] .billing-page-actions').evaluateAll(groups=>groups.every(group=>{const rows=[...group.querySelectorAll(':scope > .billing-action')].filter(n=>n.getClientRects().length);return rows.every((row,index)=>index===0||row.getBoundingClientRect().top-rows[index-1].getBoundingClientRect().bottom>=9);}));
    check(gaps,`Billing ${view} adjacent actions have an explicit gap at ${width}px ${theme}`);
    if(view==='overview'){
      const currentAudit=await page.evaluate(()=>({count:document.querySelectorAll('.review01-billing-current').length,view:BILLING_UI.view,tab:S.tab,billing:BILLING_VIEW,html:document.getElementById('page').innerHTML.slice(0,240)}));
      check(currentAudit.count===1,`Billing current plan renders once at ${width}px ${theme}`);
      check(await page.locator('.review01-billing-current').evaluate(node=>{const style=getComputedStyle(node);return style.display==='grid'&&node.scrollWidth<=node.clientWidth+1;}),`Billing current plan uses a balanced grid at ${width}px ${theme}`);
    }
    await shot(`billing-${view}-${width}-${theme}`);
  }
  await page.evaluate(()=>billingSheet('Billing detail','<button class="btn billing-action">First</button><button class="btn billing-action">Second</button>'));
  check(await visibleBrandCount()===1,'Billing sheet does not inject a second onboarding brand');
  const sheetGap=await page.locator('#sb-billing .billing-sheet-content').evaluate(group=>{const rows=[...group.querySelectorAll(':scope > .billing-action')];return rows[1].getBoundingClientRect().top-rows[0].getBoundingClientRect().bottom>=9;});
  check(sheetGap,'Billing sheet adjacent actions have an explicit gap');await shot('billing-sheet-390-light');await page.evaluate(()=>closeSheet('billing'));

  for(const width of [360,390,1440])for(const theme of ['light','dark']){
    await present(width,theme);await page.evaluate(()=>openLegal('terms'));
    const legal=await page.locator('#legal-content .content-accordion summary').evaluateAll(rows=>rows.every(row=>{const style=getComputedStyle(row);return style.display==='grid'&&style.gridTemplateColumns.split(' ').length===2&&row.getBoundingClientRect().right<=innerWidth;}));
    check(legal,`Legal accordions reserve a right control column at ${width}px ${theme}`);await shot(`legal-${width}-${theme}`);await page.evaluate(()=>closeSheet('legal'));
  }

  await present(390,'light');let accordionCount=0;
  for(const kind of ['help','privacy','terms']){await page.evaluate(kind=>openLegal(kind),kind);const count=await page.locator('#legal-content .content-accordion').count();check(count>0,`${kind} renders App accordions`);accordionCount+=count;await shot(`legal-${kind}-390-light`);await page.evaluate(()=>closeSheet('legal'));}
  check(accordionCount===64,`Shared App accordion rule covers all 64 items (found ${accordionCount})`);

  for(const width of [360,390,1440])for(const theme of ['light','dark']){
    await present(width,theme);await page.evaluate(()=>openAdj());
    const amountAudit=await page.locator('#sb-adj .amount-input').evaluateAll(rows=>rows.map(row=>{const prefix=row.querySelector('.cur').getBoundingClientRect(),input=row.querySelector('input').getBoundingClientRect();return{delta:Math.abs((prefix.top+prefix.height/2)-(input.top+input.height/2)),open:!!row.closest('.fg').querySelector('.field-info[open]')};}));
    check(amountAudit.length===4&&amountAudit.every(row=>row.delta<=1&&!row.open),`Four HMRC prefixes are centred and help starts collapsed at ${width}px ${theme}`);
    check(await page.locator('#sb-adj .field-info').count()===4,`Four HMRC information controls render at ${width}px ${theme}`);await page.locator('#sb-adj .field-info').first().click();await shot(`hmrc-position-${width}-${theme}`);await page.evaluate(()=>closeSheet('adj'));await page.waitForTimeout(300);
  }

  for(const width of [360,390,1440])for(const theme of ['light','dark']){
    await present(width,theme);await page.evaluate(()=>{const root=TaxMateOnboardingRoot.open(document);OB={screen:'pro-gate',billingCadence:'yearly',data:{},monthsAll:[],pendingIntent:{source:'ltd',returnScreen:'entry'}};root.dataset.obScreen='pro-gate';root.innerHTML=obScrProGate();});await page.waitForTimeout(350);
    check(await visibleBrandCount()===1,`Pro required has one visible TaxMate brand at ${width}px ${theme}`);
    const gate=await page.evaluate(()=>{const gap=(a,b)=>Math.round(b.getBoundingClientRect().top-a.getBoundingClientRect().bottom);const cadence=document.querySelector('.ob-gate-cadence'),first=document.querySelector('.ob-gate-plans .plan-card'),actions=[...document.querySelectorAll('.ob-gate-actions .ob-btn')],note=document.querySelector('.ob-gate-status').innerText;return{planGap:gap(cadence,first),actionGap:gap(actions[0],actions[1]),note,openSheets:[...document.querySelectorAll('.sb.open')].map(node=>node.id),rootOpacity:getComputedStyle(document.getElementById('ob-root')).opacity,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
    check(gate.openSheets.length===0,`Pro required opens without a sheet overlay at ${width}px ${theme} (${gate.openSheets.join(',')})`);
    check(gate.planGap>=14,`Pro cadence and Free card are separated at ${width}px ${theme}`);
    check(gate.actionGap>=9,`Redeem and paid-access actions are separated at ${width}px ${theme}`);
    check(!/still work\.$/.test(gate.note)||gate.note.includes('still\u00a0work.'),'Critical promotion copy keeps “still work” together');
    check(gate.overflow<=1,`Pro required has no horizontal overflow at ${width}px ${theme}`);await shot(`pro-required-${width}-${theme}`);
    if(width===390){await page.locator('#ob-root').evaluate(root=>{root.scrollTop=root.scrollHeight;});await page.waitForTimeout(100);await shot(`pro-required-actions-${theme}`);}
    await page.evaluate(()=>{TaxMateOnboardingRoot.close(document);OB=null;});
  }

  check(results.pageErrors.length===0,'No browser page errors');results.status='PASS';
  results.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(results,null,2));
  console.log(`FOUNDER_UI_REGRESSION PASS assertions=${results.assertions.length} screenshots=${results.screenshots.length} evidence=${evidence}`);
  await context.close();
}

main().catch(async error=>{results.status='FAIL';results.error=error.stack;results.finishedAt=new Date().toISOString();fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(results,null,2));console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

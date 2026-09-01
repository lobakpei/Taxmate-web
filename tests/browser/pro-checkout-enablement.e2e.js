'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const {make}=require('../test-fixture');

const root=path.resolve(__dirname,'../..');
const artifact=path.join(root,'.hosting-build','pro-checkout-enablement-browser');
const evidence=path.join(root,'.hosting-build','pro-checkout-enablement-evidence');
const officialOrigin='https://www.taxmate.uk';
const externalRequests=[];
const sentryRequests=[];
const assertions=[];
let assertionCount=0;

function check(value,message){assert.ok(value,message);assertionCount++;assertions.push(message);}
function equal(actual,expected,message){assert.deepEqual(actual,expected,message);assertionCount++;assertions.push(message);}
function chromePath(){for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'])if(candidate&&fs.existsSync(candidate))return candidate;throw new Error('Installed Chrome not found');}
function mime(file){return({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain; charset=utf-8'})[path.extname(file).toLowerCase()]||'application/octet-stream';}

function prepareArtifact(){
  const result=spawnSync(process.execPath,['scripts/build-hosting.js','production','pro-checkout-enablement-browser'],{cwd:root,stdio:'inherit'});
  if(result.status!==0)throw new Error('Hosting artifact build failed');
  const firebaseFiles=['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js','firebase-storage-compat.js','firebase-app-check-compat.js'];
  const vendor=path.join(artifact,'vendor','firebase');fs.mkdirSync(vendor,{recursive:true});
  for(const file of firebaseFiles)fs.copyFileSync(path.join(root,'node_modules','firebase',file),path.join(vendor,file));
  const htmlPath=path.join(artifact,'index.html');let html=fs.readFileSync(htmlPath,'utf8');
  for(const file of firebaseFiles)html=html.replace(new RegExp(`https://www\\.gstatic\\.com/firebasejs/[^"']+/${file}`,'g'),`/vendor/firebase/${file}`);
  html=html.replace(/<script[^>]+https:\/\/cdnjs\.cloudflare\.com[\s\S]*?<\/script>\s*/gi,'').replace(/<link[^>]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi,'').replace(/<noscript><link[^>]+https:\/\/fonts\.googleapis\.com[^>]*><\/noscript>\s*/gi,'');
  fs.writeFileSync(htmlPath,html);
  fs.writeFileSync(path.join(artifact,'firebase-environment.js'),`'use strict';\nwindow.TAXMATE_FIREBASE_ENVIRONMENT=Object.freeze({firebaseConfig:Object.freeze({}),hosts:Object.freeze(['taxmate.uk','www.taxmate.uk','taxmate-uk-2.web.app','taxmate-uk-2.firebaseapp.com']),sentry:Object.freeze({enabled:false,environment:'browser_acceptance'})});\n`);
  fs.writeFileSync(path.join(artifact,'src','app','sentry-bootstrap.js'),`'use strict';\nwindow.__TAXMATE_SENTRY_STATE__=Object.freeze({enabled:false,reason:'automated_browser_acceptance',sdkRequested:false});\n`);
}

async function installRoutes(context){
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname!=='www.taxmate.uk'){
      externalRequests.push(request.url());
      if(/sentry/i.test(request.url()))sentryRequests.push(request.url());
      return route.abort('blockedbyclient');
    }
    if(url.pathname==='/__checkout')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><title>Checkout handoff captured</title><h1>Checkout handoff captured</h1>'});
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(artifact,relative);
    if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,contentType:'text/html; charset=utf-8',body:'not found'});
    return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});
  });
}

function browserState(){const state=JSON.parse(JSON.stringify(make('existing').driver.state));state.tab='more';state.settings={...(state.settings||{}),lang:'en',theme:'light'};return state;}
async function launch({query='',draft=null}={}){
  const context=await chromium.launchPersistentContext(path.join(os.tmpdir(),`tm-pro-checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`),{headless:true,executablePath:chromePath(),viewport:{width:390,height:844},serviceWorkers:'block'});
  await installRoutes(context);
  await context.addInitScript(({state,draft})=>{if(!sessionStorage.getItem('__proCheckoutAcceptanceInitialised')){localStorage.clear();sessionStorage.clear();sessionStorage.setItem('__proCheckoutAcceptanceInitialised','1');localStorage.setItem('taxmateuk_v1',JSON.stringify(state));localStorage.setItem('tmOnboardDone','1');localStorage.setItem('taxmateuk_analytics_consent','denied');if(draft)localStorage.setItem('taxmateuk_onboarding_draft_v1',JSON.stringify(draft));}},{state:browserState(),draft});
  const page=context.pages()[0]||await context.newPage();
  await page.goto(officialOrigin+'/'+query,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof startProPurchase==='function'&&typeof proBillingAvailability==='function');
  return{context,page};
}

async function installCheckoutDouble(page,delay=180){
  await page.evaluate(delay=>{
    window.__checkoutCalls=[];
    cloudUser=()=>({uid:'browser-acceptance-user',getIdToken:async()=>{throw new Error('must not use real network');}});
    callSecureFunction=async(name,data)=>{window.__checkoutCalls.push({name,data});await new Promise(resolve=>setTimeout(resolve,delay));sessionStorage.setItem('__checkoutCalls',JSON.stringify(window.__checkoutCalls));return{url:'/__checkout'};};
    ENTITLEMENT.snapshot={subscriptionStatus:'inactive',paidTier:'free',serverVerifiedAt:Date.now()};ENTITLEMENT.loaded=true;S.tab='more';render();
  },delay);
}

async function checkoutCadence(cadence){
  const app=await launch();try{
    await installCheckoutDouble(app.page);
    equal(await app.page.evaluate(()=>proBillingAvailability()),{mode:'production',purchaseEnabled:true},`${cadence} runs in official production mode`);
    const button=app.page.locator('[data-plan-card="pro"] button');equal(await button.textContent(),'Choose Pro',`${cadence} uses production purchase copy`);equal(await button.isEnabled(),true,`${cadence} production CTA is enabled`);
    if(cadence==='yearly')await app.page.getByRole('button',{name:'Yearly',exact:true}).click();
    await button.click();await button.click();
    await app.page.waitForFunction(()=>window.__checkoutCalls&&window.__checkoutCalls.length===1);
    await app.page.waitForURL('**/__checkout');
    const calls=JSON.parse(await app.page.evaluate(()=>sessionStorage.getItem('__checkoutCalls')));
    equal(calls,[{name:'createCheckoutSession',data:{tier:'pro',cadence}}],`${cadence} double click creates exactly one canonical checkout request`);
  }finally{await app.context.close();}
}

async function signedOutFailClosed(){
  const app=await launch();try{
    await app.page.evaluate(()=>{window.__checkoutCalls=[];cloudUser=()=>null;callSecureFunction=async(name,data)=>{window.__checkoutCalls.push({name,data});return{url:'/__checkout'};};ENTITLEMENT.snapshot={subscriptionStatus:'inactive',paidTier:'free'};ENTITLEMENT.loaded=true;S.tab='more';render();});
    await app.page.locator('[data-plan-card="pro"] button').click();
    equal(await app.page.evaluate(()=>window.__checkoutCalls.length),0,'signed-out production CTA makes zero checkout requests');
    equal(await app.page.locator('#sb-confirm.open').count(),1,'signed-out production CTA uses the existing sign-in gate');
  }finally{await app.context.close();}
}

function pendingDraft(){return{screen:'pro-gate',loggedIn:true,bizName:'',structure:'sole',share:50,partnerCode:'',connectCode:'CONNECT8',promoCode:'',pendingIntent:{source:'partner_sync',partnerCode:'CONNECT8',returnScreen:'partner-code',formState:{partnerCode:'CONNECT8'}},cats:[],monthsAll:[{m:4,year:2026}],startIdx:0,cursor:0,data:{}};}
async function billingReturnIntent(){
  let app=await launch({query:'?billing=cancelled',draft:pendingDraft()});try{
    equal(await app.page.evaluate(()=>eval('OB.screen')),'pro-gate','cancelled checkout returns to the Pro gate');
    equal(await app.page.evaluate(()=>eval('OB.pendingIntent.partnerCode')),'CONNECT8','cancelled checkout preserves the exact Partner Sync intent');
    equal(new URL(app.page.url()).searchParams.has('billing'),false,'cancelled checkout marker is consumed once');
  }finally{await app.context.close();}
  app=await launch({query:'?billing=success',draft:pendingDraft()});try{
    equal(await app.page.evaluate(()=>eval('OB.screen')),'intent-loading','successful checkout waits for real entitlement hydration');
    equal(await app.page.evaluate(()=>eval('OB.pendingIntent.partnerCode')),'CONNECT8','successful checkout preserves the exact Partner Sync intent');
    await app.page.evaluate(()=>{ENTITLEMENT.snapshot={subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:Date.now()+86400000,serverVerifiedAt:Date.now()};ENTITLEMENT.loaded=true;applyHydratedAccountResult({state:'converged',existingCloudAccount:true});});
    equal(await app.page.evaluate(()=>eval('OB.screen')),'partner-confirm','real Pro hydration resumes the original Partner Sync route');
    equal(await app.page.evaluate(()=>eval('OB.pendingIntent.partnerCode')),'CONNECT8','resumed flow retains the same code');
  }finally{await app.context.close();}
}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});prepareArtifact();
  await checkoutCadence('monthly');await checkoutCadence('yearly');await signedOutFailClosed();await billingReturnIntent();
  equal(externalRequests.length,0,'browser acceptance made zero external production requests');
  equal(sentryRequests.length,0,'browser acceptance made zero Sentry requests');
  const result={status:'PASS',assertions:assertionCount,version:'2.1.12',build:'2026-09-01.full-backup-founder-alias-production.1',cache:'taxmate-v2-full-backup-founder-alias-production-1',externalRequests,sentryRequests,checks:assertions};
  fs.writeFileSync(path.join(evidence,'pro-checkout-enablement-browser-result.json'),JSON.stringify(result,null,2)+'\n');
  process.stdout.write(`Pro checkout enablement browser PASS (${assertionCount} assertions)\n`);
}

main().catch(error=>{process.stderr.write((error&&error.stack||String(error))+'\n');process.exitCode=1;});

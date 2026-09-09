'use strict';
// Production-built UI with isolated local records and a local lookup fixture.
// No production account, authentication, network provider or user data is used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),artifact=path.join(root,'.hosting-build/ltd-step2-browser'),evidence=path.join(root,'.hosting-build/ltd-step2-evidence'),origin='http://127.0.0.1:4199';
const red=process.argv.includes('--red'),removedSlot=process.argv.includes('--removed-slot'),reopenedSlot=process.argv.includes('--reopened-slot'),directContinue=process.argv.includes('--direct-continue'),label=(removedSlot?'removed-slot-':reopenedSlot?'reopened-slot-':directContinue?'direct-continue-':'')+(red?'red':'green');let browser,server,page;
async function run(){
 fs.mkdirSync(evidence,{recursive:true});
 assert.equal(spawnSync(process.execPath,['scripts/build-hosting.js','production','ltd-step2-browser'],{cwd:root,stdio:'inherit'}).status,0);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
 server=http.createServer((req,res)=>{const url=new URL(req.url,origin),file=path.resolve(artifact,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(4199,'127.0.0.1',resolve));
 const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
 browser=await chromium.launch({headless:true,executablePath});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();const file=/\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)$/.exec(url);if(file)return route.fulfill({path:path.join(root,'node_modules/firebase',file[1]),contentType:'text/javascript'});return route.abort();});
 page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);await page.waitForFunction(()=>typeof TaxMateCompanyState!=='undefined');
 await page.evaluate(async({removedSlot,reopenedSlot})=>{
  const copy=await(await fetch('src/integration/ltd/approved-copy.json')).json();
  const state=TaxMateCompanyState.migrate(S,Date.now(),'isolated-step2-fixture');
  window.step2Trace=[];window.step2Exceptions=[];
  for(const [name,api,method] of [['identity',TaxMateCompanyIdentity,'planFirstPeriods'],['profile',TaxMateCompanyProfile,'answer'],['state',TaxMateCompanyState,'validateState']]){
   const original=api[method];api[method]=function(...args){try{return original.apply(this,args);}catch(error){step2Exceptions.push({name,method,message:error.message,stack:error.stack});throw error;}};
  }
  const provider={isNetworkProvider:false,acceptsAlias:value=>String(value).toLowerCase()==='lobakpe1',lookup:async()=>({status:'found',company:{number:null,name:'LOBAKPE FOUNDER PREVIEW LTD',incorporationDate:'2025-12-15',status:null,type:null,registryUrl:null},verificationStatus:'manual_unverified',reasonCodes:['companies_house_verification_not_completed'],founderShortcut:true,retryable:false})};
  let currentState=state,driver,facade;const remote=[];
  if(removedSlot||reopenedSlot){
   const oldId='company:removed-local-fixture',stamp=Date.now()-86400000;
   const profile={...TaxMateCompanyProfile.createDraft({entityId:oldId,now:stamp,deviceId:'local-removed-fixture'}),deletedAt:stamp};
   const entity={id:oldId,name:'REMOVED LOCAL LTD',type:'limited_company',currency:'GBP',createdAt:stamp,updatedAt:stamp,deletedAt:stamp,deviceId:'local-removed-fixture'};
   currentState.domain.companyProfiles.push(profile);currentState.domain.entities.push(entity);
   remote.push(TaxMateLtdSync.envelope('companyProfiles',profile,oldId),TaxMateLtdSync.envelope('entities',entity,oldId));
  }
  const removedBefore=JSON.stringify(currentState.domain.companyProfiles.filter(p=>p.deletedAt!=null));
  window.step2FixtureFacts=()=>({removedUnchanged:removedBefore===JSON.stringify(currentState.domain.companyProfiles.filter(p=>p.deletedAt!=null)),activeCompanyCount:currentState.domain.companyProfiles.filter(p=>p.deletedAt==null).length,usesRemovedIdentity:currentState.domain.companyProfiles.some(p=>p.deletedAt==null&&p.entityId==='company:removed-local-fixture')});
  const repository=TaxMateCompanyStateRepository.externalRepository({load:()=>currentState,replace:next=>{
   try{
   currentState=TaxMateCompanyState.migrate(next,Date.now(),'isolated-step2-fixture');
   if(removedSlot||reopenedSlot){const changes=TaxMateLtdSync.reconcile(currentState,remote,'local-fixture');currentState=TaxMateLtdSync.applyDownloads(currentState,changes.downloads);}
   if(driver&&facade){driver.reload();facade.emit();}return currentState;
   }catch(error){step2Exceptions.push({name:'local-repository',message:error.message,stack:error.stack});throw error;}
  }});
  driver=new TaxMateCanonicalCompanyDriver.CanonicalCompanyDriver({mode:'fresh',repository,copy,now:Date.now,companiesHouseProvider:provider,trustedActiveCompanyId:removedSlot?'company:removed-local-fixture':null,entitlementSnapshot:{paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:Date.now()+86400000,serverVerifiedAt:Date.now()}});
  facade=new TaxMateLtdUIFacadeModule.TaxMateLtdUIFacade({driver});window.step2Facade=facade;
  for(const name of ['onLookupCompaniesHouse','onPlanCompanyPeriods','onContinueStep','onDraftChanged']){const original=facade[name].bind(facade);facade[name]=async input=>{const result=await original(input);step2Trace.push({name,input,result:{status:result.status,fieldErrors:result.fieldErrors,reviewReasons:result.reviewReasons,nextRoute:result.nextRoute}});return result;};}
  const mount=document.getElementById('taxmate-ltd-ui-root');TaxMateLtdProductionBridge.enterLtd();
  TaxMateLtdWorkbenchRenderer.setProductionMode(true);TaxMateLtdWorkbenchRenderer.setLocale('en');facade.subscribe(snapshot=>TaxMateLtdWorkbenchRenderer.render(mount,facade,snapshot));
  await facade.onAddBusinessCategoryChosen({category:'limited_company'});
 },{removedSlot,reopenedSlot});
 const rootUI=page.locator('#taxmate-ltd-ui-root');
 if(removedSlot&&!red){
  assert.match(await rootUI.innerText(),/still linked to a company you removed/);
  assert.equal(await rootUI.getByRole('button',{name:/Open existing company/}).count(),0);
  assert.deepEqual(await page.evaluate(()=>step2FixtureFacts()),{removedUnchanged:true,activeCompanyCount:0,usesRemovedIdentity:false});
  await page.screenshot({path:path.join(evidence,'removed-slot-guard.png'),fullPage:true});
  // A tab already left at Step 2 must explain the same blocker without losing answers.
  await page.evaluate(async()=>{for(const [id,value]of Object.entries({tradingStatus:'trading',tradingStartDate:'2026-04-06',corporationTaxStatus:'not_registered'}))await step2Facade.onDraftChanged({screenId:'ltd.onboarding.step2',field:{id,type:id==='tradingStartDate'?'date':'select-one',value}});step2Facade.route('ltd.onboarding.step2');});
  await rootUI.getByRole('button',{name:'Continue',exact:true}).click();
  await page.waitForFunction(()=>!step2Facade.getSnapshot().busy.active);
  const stale=await page.evaluate(()=>({result:step2Facade.lastResult,draft:step2Facade.drafts.get('ltd.onboarding.step2'),facts:step2FixtureFacts()}));
  assert.equal(stale.result.fieldErrors[0].reasonCode,'company_slot_retained_after_removal');assert.equal(stale.result.fieldErrors[0].copyKey,'error.company_slot_retained');
  assert.ok(stale.draft.fields.some(field=>field.id==='tradingStartDate'&&field.value==='2026-04-06'));assert.equal(stale.facts.removedUnchanged,true);
  await page.screenshot({path:path.join(evidence,'removed-slot-stale-step2.png'),fullPage:true});
  fs.writeFileSync(path.join(evidence,label+'-result.json'),JSON.stringify({status:'PASS',scope:'ISOLATED_LOCAL_GUARD_ONLY',errors,...stale},null,2));console.log(JSON.stringify({status:'PASS',scope:'REMOVED_SLOT_GUARD_AND_SAVED_STEP2',errors}));return;
 }
 await rootUI.getByRole('button',{name:'Yes',exact:true}).click();
 await rootUI.locator('input[data-field="companyNumber"]').pressSequentially('lobakpe1');
 await rootUI.getByRole('button',{name:/Check.*Companies House/}).click();
 await rootUI.locator('input[data-field="legalName"]').waitFor();
 await page.waitForFunction(()=>document.querySelector('input[data-field="legalName"]')?.value==='LOBAKPE FOUNDER PREVIEW LTD');
 await rootUI.getByRole('button',{name:'Continue',exact:true}).click();
 await page.waitForFunction(()=>step2Facade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step2'||step2Trace.some(row=>row.name==='onContinueStep'&&row.result.status==='field_error'));
 assert.equal(await page.evaluate(()=>step2Facade.getSnapshot().navigation.routes.at(-1).screenId),'ltd.onboarding.step2');
 await rootUI.getByRole('button',{name:'Yes',exact:true}).first().click();
 if(directContinue)await rootUI.getByRole('button',{name:'Not yet',exact:true}).last().click();
 await rootUI.locator('input[data-field="tradingStartDate"]').pressSequentially('06/04/2026',{delay:40});
 if(!directContinue)await rootUI.getByRole('button',{name:'Not yet',exact:true}).last().click();
 if(red&&await rootUI.getByRole('button',{name:'Not yet',exact:true}).last().getAttribute('aria-pressed')!=='true'){
  await page.waitForFunction(()=>!step2Facade.getSnapshot().busy.active);
  await rootUI.getByRole('button',{name:'Not yet',exact:true}).last().click();
 }
 await page.screenshot({path:path.join(evidence,'step2-before-'+label+'.png'),fullPage:true});
 await rootUI.getByRole('button',{name:'Continue',exact:true}).click();
 await page.waitForFunction(()=>!step2Facade.getSnapshot().busy.active);
 await page.screenshot({path:path.join(evidence,'step2-after-'+label+'.png'),fullPage:true});
 const result=await page.evaluate(()=>({route:step2Facade.getSnapshot().navigation.routes.at(-1).screenId,periodPlan:step2Facade.getSnapshot().company?.periodPlan,profile:step2Facade.getSnapshot().company?.profile,trace:step2Trace,exceptions:step2Exceptions,text:document.getElementById('taxmate-ltd-ui-root').innerText}));
 fs.writeFileSync(path.join(evidence,label+'-result.json'),JSON.stringify({scope:'ISOLATED_LOCAL_MOBILE_UI',errors,...result},null,2));
 console.log(JSON.stringify({route:result.route,errors,exceptions:result.exceptions,callbacks:result.trace.filter(row=>row.name!=='onDraftChanged')}));
 if(!red){
  assert.equal(result.route,'ltd.onboarding.step3');
  await rootUI.locator('input[data-field="founderName"]').fill('Synthetic Director');
  for(let i=0;i<2;i++)await rootUI.locator('.tm-choices').nth(i).getByRole('button',{name:'Yes',exact:true}).click();
  await rootUI.getByRole('button',{name:'Continue',exact:true}).click();
  await page.waitForFunction(()=>step2Facade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step4');
  for(let i=0;i<6;i++){await rootUI.getByRole('button',{name:i===5?'Yes':'No',exact:true}).click();await rootUI.locator('button.tm-btn.p').last().click();}
  await page.waitForFunction(()=>step2Facade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step5');
  await page.screenshot({path:path.join(evidence,'step5-'+label+'.png'),fullPage:true});
  await rootUI.locator('.tm-step5-confirm button').click();await rootUI.locator('button.tm-btn.p').last().click();
  await page.waitForFunction(()=>step2Facade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.workspace.overview');
  const completed=await page.evaluate(()=>({route:step2Facade.getSnapshot().navigation.routes.at(-1).screenId,profile:step2Facade.getSnapshot().company.profile,facts:step2FixtureFacts(),trace:step2Trace,exceptions:step2Exceptions}));
  assert.equal(completed.profile.tradingStartDate,'2026-04-06');assert.equal(completed.profile.corporationTaxStatus,'not_registered');assert.equal(completed.profile.lifecycleStatus,'confirmed');assert.equal(completed.facts.activeCompanyCount,1);assert.equal(completed.facts.usesRemovedIdentity,false);assert.equal(completed.facts.removedUnchanged,true);assert.deepEqual(errors,[]);assert.deepEqual(completed.exceptions,[]);
  await page.screenshot({path:path.join(evidence,'overview-'+label+'.png'),fullPage:true});
  fs.writeFileSync(path.join(evidence,label+'-result.json'),JSON.stringify({status:'PASS',scope:'ISOLATED_LOCAL_MOBILE_UI_STEPS_1_TO_5',errors,...completed},null,2));console.log(JSON.stringify({status:'PASS',route:completed.route,facts:completed.facts}));
 }
}
run().catch(async error=>{console.error(error);if(page){await page.screenshot({path:path.join(evidence,'unexpected-failure.png'),fullPage:true}).catch(()=>{});const detail=await page.evaluate(()=>({trace:window.step2Trace,exceptions:window.step2Exceptions,text:document.body.innerText,lastResult:window.step2Facade?.lastResult})).catch(()=>null);fs.writeFileSync(path.join(evidence,'unexpected-failure.json'),JSON.stringify(detail,null,2));console.log(JSON.stringify(detail));}process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

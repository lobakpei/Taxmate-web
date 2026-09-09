'use strict';
// Local synthetic records, real projection/renderer/facade. No real account or provider.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{chromium}=require('playwright'),{make,PRO_ENTITLEMENT}=require('../test-fixture');
const {DEFAULT_NOW}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const root=path.resolve(__dirname,'../..'),artifact=path.join(root,'.hosting-build/ltd-status-browser'),evidence=path.join(root,'.hosting-build/ltd-status-evidence'),origin='http://127.0.0.1:4199';
const clone=value=>JSON.parse(JSON.stringify(value));let browser,server,page;
const facts={ukResidentConfirmed:true,ringFenceProfits:false,closeInvestmentHoldingCompany:false,associatedCompaniesConfirmedNone:true,qualifyingDistributionsMinor:0,accountsCompleteConfirmed:true,sameTradeContinues:true};
function calculate(driver,ctFacts=facts){return driver.runCtEstimate({reviewTopics:{records:'yes',periods:'yes',losses:'yes'},ctFacts});}
function income(driver){const result=driver.transaction({type:'company_income',date:'2026-06-15',amountMinor:2000000,description:'Synthetic later income',invoicePartyId:driver.activeProfile().entityId,companyIncomeCategory:'trading',evidenceRefs:['invoice:synthetic-income']});assert.equal(result.status,'ok');}
async function run(){
 fs.mkdirSync(evidence,{recursive:true});assert.equal(spawnSync(process.execPath,['scripts/build-hosting.js','production','ltd-status-browser'],{cwd:root,stdio:'inherit'}).status,0);
 const zero=make('existing').driver,unknown=make('existing').driver,stale=make('existing').driver,review=make('existing').driver,positive=make('existing').driver;
 unknown.state.domain.companyTaxPeriods=[];unknown.state.domain.companyLossRecords=[];income(stale);income(positive);assert.equal(calculate(positive).status,'ok');assert.equal(calculate(review,{...facts,ukResidentConfirmed:false}).status,'review_required');
 const cases={zero:zero.state,unknown:unknown.state,stale:stale.state,review:review.state,positive:positive.state},before=JSON.stringify(cases);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
 server=http.createServer((req,res)=>{const url=new URL(req.url,origin),file=path.resolve(artifact,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(4199,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,executablePath:['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');});
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();const file=/\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)$/.exec(url);return file?route.fulfill({path:path.join(root,'node_modules/firebase',file[1]),contentType:'text/javascript'}):route.abort();});
 page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));const results=[];
 async function mount(name,area='pay',locale='en'){
  await page.goto(origin);await page.waitForFunction(()=>typeof TaxMateCanonicalCompanyDriver!=='undefined');
  await page.evaluate(async({state,now,entitlement,area,locale})=>{
   const copy=await(await fetch('src/integration/ltd/approved-copy.json')).json(),driver=new TaxMateCanonicalCompanyDriver.CanonicalCompanyDriver({state,copy,now:()=>now,entitlementSnapshot:entitlement});
   const facade=new TaxMateLtdUIFacadeModule.TaxMateLtdUIFacade({driver});window.statusFixture={driver,facade,before:JSON.stringify(driver.state)};
   const mount=document.getElementById('taxmate-ltd-ui-root');TaxMateLtdProductionBridge.enterLtd();TaxMateLtdWorkbenchRenderer.setProductionMode(true);TaxMateLtdWorkbenchRenderer.setLocale(locale);facade.subscribe(snapshot=>TaxMateLtdWorkbenchRenderer.render(mount,facade,snapshot));
   await facade.onSetWorkspaceArea(area==='pay'?{area:'tax',view:'pay'}:{area});
  },{state:clone(cases[name]),now:DEFAULT_NOW,entitlement:PRO_ENTITLEMENT,area,locale});
 }
 const ui=()=>page.locator('#taxmate-ltd-ui-root');
 async function capture(name){await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>JSON.stringify(statusFixture.driver.state)===statusFixture.before),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);results.push({case:name,status:'PASS',recordsUnchanged:true});}
 await mount('zero');assert.match(await ui().innerText(),/currently no profit available/);assert.equal(await ui().locator('[data-dividend-state="no_profit"] .tm-notice.warn').count(),0);assert.equal(await ui().getByRole('button',{name:'Record a dividend declaration',exact:true}).count(),0);await capture('pay-zero-profit');
 await mount('unknown');assert.match(await ui().innerText(),/dividend amount has not been established/);assert.match(await ui().innerText(),/Not calculated yet/);assert.doesNotMatch(await ui().innerText(),/currently no profit/);assert.equal(await ui().locator('[data-todo="bank"]').count(),0,'Unrelated year-end matching is not a dividend calculation prerequisite');await capture('pay-unknown');await ui().locator('[data-action="dividend-tax-next"]').click();assert.equal(await page.getByRole('dialog').count(),1);await capture('unknown-to-tax-calculation');
 await mount('stale');assert.equal(await ui().locator('[data-dividend-state="out_of_date"]').count(),1);assert.doesNotMatch(await ui().innerText(),/Not calculated yet/);await capture('pay-stale-tax');
 await mount('review');assert.match(await ui().innerText(),/Needs review:.*resident/is);assert.doesNotMatch(await ui().innerText(),/Please check/);await ui().locator('[data-todo="tax-fact:uk_company_residence_confirmation_required"]').click();assert.equal(await page.getByRole('dialog').count(),1);await capture('tax-missing-fact-next');
 await mount('positive');assert.equal(await ui().locator('[data-dividend-state]').count(),0);assert.ok(await ui().getByRole('button',{name:/Record.*dividend.*declaration/i}).count());await capture('pay-positive-eligible');
 await mount('unknown','overview');assert.equal(await ui().locator('[data-tax-state="not_calculated"]').count(),1);assert.doesNotMatch(await ui().innerText(),/Please check/);await capture('overview-not-calculated');await ui().locator('[data-metric="corporationTax"]').click();assert.equal(await page.getByRole('dialog').count(),1);
 await mount('zero','overview');assert.equal(await ui().locator('[data-todo="bank"]').count(),1);assert.equal(await ui().locator('[data-todo="director"]').count(),0);assert.doesNotMatch(await ui().innerText(),/Please check/);await capture('overview-concrete-tasks');await ui().locator('[data-todo="bank"]').click();assert.equal(await page.getByRole('dialog').count(),1);await capture('bank-task-destination');
 // Renderer contract: an empty current reason set must not inherit old action results.
 await mount('zero','overview');await page.evaluate(()=>{const f=statusFixture.facade,base=f.driver.readSnapshot.bind(f.driver);f.driver.readSnapshot=()=>{const s=base();s.workspace.companyYearFigures.reasonCodes=[];s.workspace.projection.reviewItems=[];s.statutory.checklist.blockingItemIds=[];return s;};f.lastResult={reviewReasons:['year_end_bank_statement_not_reconciled'],data:{figures:{}}};f.emit();});assert.equal(await ui().locator('[data-todo]').count(),0);assert.equal(await ui().locator('.tm-notice.warn').count(),0);await capture('overview-no-current-tasks');
 await mount('zero','pay','zh-HK');assert.match(await ui().innerText(),/目前未有可分派利潤/);await capture('pay-zero-profit-zh');
 assert.deepEqual(errors,[]);assert.equal(JSON.stringify(cases),before);fs.writeFileSync(path.join(evidence,'ui-results.json'),JSON.stringify({status:'PASS',scope:'LOCAL_SYNTHETIC_MOBILE_UI',results,errors,realDevice:'NOT_RUN'},null,2));console.log(JSON.stringify({status:'PASS',scenarios:results.length,recordsUnchanged:true,errors}));
}
run().catch(async error=>{console.error(error);if(page){await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});console.log((await page.locator('#taxmate-ltd-ui-root').innerText().catch(()=>'' )).slice(0,2500));}process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});

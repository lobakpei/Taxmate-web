'use strict';
// Focused local synthetic presentation checks. No production account or provider access.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),artifact=path.join(root,'.hosting-build/expense-basis-row-emoji-browser'),evidence=path.join(root,'.hosting-build/ltd-status-evidence/expense-basis-row-emoji');
const checks=[],screenshots=[],errors=[],geometry=[];let server,browser,page,origin,blocked=0;
function check(value,label){assert.ok(value,label);checks.push(label);}
async function capture(name){
 const pointer=()=>({touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches}),before=await page.evaluate(pointer);
 const session=await page.context().newCDPSession(page),shot=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await session.detach();
 const file=path.join(evidence,name+'.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));screenshots.push(file);assert.deepEqual(await page.evaluate(pointer),before);
}
async function mount(mobile){
 const context=await browser.newContext({viewport:{width:mobile?390:1280,height:1000},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');});
 await context.route('**/*',route=>{const url=route.request().url();if(new URL(url).origin===origin)return route.continue();blocked++;const sdk=/\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)$/.exec(url);return sdk?route.fulfill({path:path.join(root,'node_modules/firebase',sdk[1]),contentType:'text/javascript'}):route.abort();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>typeof openEntry==='function');
 await page.evaluate(()=>{
  S=freshState();S.year='2026-27';S.settings={...S.settings,lang:'en',theme:'light',categoryEmojis:{sales:'🧲',vehicle:'🛠️'}};
  S.businesses=[{id:'half',name:'Studio partnership',structure:'partnership',share:50,partnershipAmountBasis:'whole_partnership'},{id:'quarter',name:'Workshop partnership',structure:'partnership',share:25,partnershipAmountBasis:'whole_partnership'},{id:'personal',name:'Personal-share records',structure:'partnership',share:40,partnershipAmountBasis:'user_share'},{id:'legacy',name:'Unconfirmed records',structure:'partnership',share:60,partnershipAmountBasis:'legacy_unconfirmed'},{id:'sole',name:'Sole trade',structure:'sole',share:100}];
  for(const b of S.businesses){S.customCats[b.id]={income:[],expense:[]};S.activeCats[b.id]={income:['sales'],expense:['vehicle']};}
  S.customCats.half.income=[{id:'custom-income',name:'Creative sessions',e:'🐚',custom:true,bizId:'half'}];S.customCats.half.expense=[{id:'custom-expense',name:'Tools & learning',e:'🧠',custom:true,bizId:'half'}];S.catRenames={sales:'Retained sales name'};
  S.entries=[];
  for(const kind of ['income','expense'])for(const custom of [false,true])for(const note of [false,true]){
   const id=[kind,custom?'custom':'builtin',note?'noted':'plain'].join('-'),cat=custom?'custom-'+kind:kind==='income'?'sales':'vehicle';
   const amount=kind==='income'?1000:custom?(note?400:100):(note?1000:200),pct=kind==='expense'?(custom?(note?50:75):(note?25:100)):100;
   S.entries.push({id,bizId:'half',kind,cat,amount,pct,date:'2026-09-10',desc:note?(custom?'Synthetic software & materials':'Synthetic client note'):''});
  }
  S.tombstones=[{id:'kept-deletion',bizId:'half',kind:'expense',date:'2026-08-01',amount:9,cat:'vehicle',deletedAt:1,recordType:'entry'}];save();render();
 });
 await page.reload();await page.waitForFunction(()=>typeof expenseListHint==='function'&&S.businesses.length===5);
 check(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)===mobile,'Actual fixture pointer mode');return context;
}
async function snapshot(){return page.evaluate(()=>JSON.stringify({businesses:S.businesses,entries:S.entries,tombstones:S.tombstones,customCats:S.customCats,catRenames:S.catRenames,icons:S.settings.categoryEmojis}));}
async function main(){
 fs.mkdirSync(evidence,{recursive:true});const buildRoot=path.join(root,'.hosting-build');assert.ok(artifact.startsWith(buildRoot+path.sep));for(const dir of [buildRoot,artifact])if(fs.existsSync(dir)){assert.ok(!fs.lstatSync(dir).isSymbolicLink());assert.equal(fs.realpathSync(dir).toLowerCase(),dir.toLowerCase());}
 assert.equal(spawnSync(process.execPath,['scripts/build-hosting.js','production','expense-basis-row-emoji-browser'],{cwd:root,stdio:'inherit'}).status,0);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(artifact,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)});
 for(const mobile of [true,false]){
  const mode=mobile?'phone':'desktop',context=await mount(mobile),before=await snapshot();
  for(const kind of ['income','expense']){
   await page.evaluate(kind=>{go(kind==='income'?'income':'expenses');setFilter(kind==='income'?'incFilter':'expFilter','half');},kind);
   const rows=await page.evaluate(kind=>S.entries.filter(e=>e.kind===kind).map(e=>{
    const row=[...document.querySelectorAll('#page .entry')].find(node=>node.getAttribute('data-tm-click').includes("'"+e.id+"'")),c=catById(e.cat),title=row.querySelector('.t'),subtitle=row.querySelector('.s'),icon=catEmoji(c);
    return{id:e.id,icon,title:title.textContent,expectedTitle:icon+' '+(e.desc||catName(e.cat)),titleIcons:[...title.querySelectorAll('.category-emoji')].map(n=>n.textContent),subtitle:subtitle.textContent,subtitleIcons:subtitle.querySelectorAll('.category-emoji').length,categoryName:catName(e.cat),noted:!!e.desc,business:bizById(e.bizId).name,amount:e.amount,pct:e.pct};
   }),kind);
   for(const row of rows){check(row.title===row.expectedTitle&&row.titleIcons.length===1&&row.titleIcons[0]===row.icon,mode+' '+row.id+' primary title has saved emoji and correct note/name');check(row.subtitleIcons===0&&row.subtitle.includes(row.business)&&row.subtitle.includes('Sept')&&(!row.noted||row.subtitle.includes(row.categoryName)),mode+' '+row.id+' subtitle keeps date/category/business without repeated emoji');}
   check(await page.locator('#page .h1 .category-emoji').count()===0,mode+' '+kind+' heading unchanged');await capture(mode+'-'+kind+'-rows');
  }
  check(await page.evaluate(()=>effExact(S.entries.find(e=>e.id==='expense-builtin-noted')))===250,mode+' receipt 1000 at 25 percent business use remains 250');
  check(await page.evaluate(()=>TaxMatePartnership.personalAmount(bizById('half'),effExact(S.entries.find(e=>e.id==='expense-builtin-noted'))).amount)===125,mode+' ownership 50 percent yields personal 125, not 62.50');
  check((await page.locator('#page .h1').textContent()).includes('725')&&(await page.locator('#page .month').textContent()).includes('725'),mode+' expense header and monthly total retain business-use 725');
  for(const [id,expected] of [['half','Whole-business expenses before ownership share'],['quarter','Whole-business expenses before ownership share'],['sole','Whole-business expenses before ownership share'],['personal','already recorded as your share'],['legacy','needs confirmation'],['all','some businesses record your share or need confirmation']]){
   await page.evaluate(id=>setFilter('expFilter',id),id);const hint=await page.locator('[data-expense-total-hint]').textContent();check(hint.includes(expected)&&hint.includes('Business-use percentages are already applied')&&!hint.includes('100%'),mode+' '+id+' expense total basis is accurate');
  }
  await capture(mode+'-expenses-mixed-all');
  await page.evaluate(()=>{window.expenseOriginalBusinesses=S.businesses;S.businesses=S.businesses.filter(b=>['half','quarter','sole'].includes(b.id));render();});
  check((await page.locator('[data-expense-total-hint]').textContent()).includes('Combined whole-business expenses before ownership shares'),mode+' all whole-business totals describe separate ownership shares');
  await page.evaluate(()=>{S.businesses=expenseOriginalBusinesses;render();});
  for(const edit of [false,true]){
   await page.evaluate(edit=>openEntry('expense',edit?'expense-builtin-noted':undefined),edit);const stored=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
   for(const [id,ownership,expected] of [['half',50,'full expense amount'],['quarter',25,'full expense amount'],['sole',null,'full expense amount'],['personal',null,'without applying your ownership share again'],['legacy',null,'Confirm this business']]){
    await page.locator('#en-biz').selectOption(id);
    for(const pct of [25,50,100]){
     await page.evaluate(pct=>setPct(pct),pct);const hint=await page.locator('#en-amount-hint').textContent();check(hint.includes(expected)&&hint.includes('Business use for this entry: '+pct+'%')&&(ownership===null?!hint.includes('Ownership share:'):hint.includes('Ownership share: '+ownership+'%')),mode+' '+(edit?'Edit':'Add')+' '+id+' business use '+pct+' and ownership are distinct');
    }
   }
   await page.locator('#en-biz').selectOption('half');await page.evaluate(()=>setPct(25));
   check(await page.locator('#en-amount').inputValue()===(edit?'1000':''),mode+' '+(edit?'Edit':'Add')+' field keeps raw amount');
   if(edit){await page.waitForTimeout(80);await page.locator('#en-amount').focus();const boxes=await page.evaluate(()=>{const c=document.querySelector('.entry-amount .cur').getBoundingClientRect(),n=document.getElementById('en-amount').getBoundingClientRect();return{currencyRight:c.right,inputLeft:n.left,inputRight:n.right,viewport:innerWidth};});geometry.push({mode,...boxes});check(boxes.currencyRight<boxes.inputLeft&&boxes.inputRight<=boxes.viewport,mode+' amount spacing remains intact');await capture(mode+'-edit-expense-basis');}
   await page.evaluate(()=>closeSheet('entry'));check(await page.evaluate(()=>localStorage.getItem(STORE_KEY))===stored,mode+' '+(edit?'Edit':'Add')+' view/switch/percentage/cancel does not save data');
  }
  for(const lang of ['en','zh','pl','ro','es','ur']){
   await page.evaluate(lang=>{S.settings.lang=lang;applyStaticI18n();S.expFilter='half';render();openEntry('expense','expense-builtin-noted');},lang);
   const hint=await page.locator('#en-amount-hint').textContent(),total=await page.locator('[data-expense-total-hint]').textContent();check(hint.includes('25')&&hint.includes('50')&&!/expense\./.test(hint+total),mode+' '+lang+' expense reminders translated');await page.evaluate(()=>closeSheet('entry'));
  }
  await page.evaluate(()=>{S.settings.lang='en';applyStaticI18n();openEntry('expense','expense-builtin-noted');openCatSheet();});
  check(await page.locator('#cc-emoji-input').evaluate((el,mobile)=>el.readOnly===!mobile,mobile),mode+' native input/desktop selection unchanged');check(await page.locator('#cc-emojis').isVisible()===!mobile,mode+' desktop-only picker scope unchanged');await page.evaluate(()=>{closeSheet('cat');closeSheet('entry');});
  check(await snapshot()===before,mode+' all presentation checks preserve records, amounts, proportions, saved icons, names and tombstones');
  await page.reload();await page.waitForFunction(()=>typeof entryRow==='function'&&S.entries.length===8);check(await snapshot()===before,mode+' reload keeps all synthetic data intact');
  await context.close();
 }
 check(errors.length===0,'Zero uncaught browser errors');
 const result={status:'PASS',checkedAt:new Date().toISOString(),identity:require('../../src/core/versions').VERSIONS,scope:'LOCAL_SYNTHETIC_EXPENSE_BASIS_AND_ENTRY_TITLE',checks,screenshots,geometry,blockedRequests:blocked,externalTransport:'All intercepted; Firebase SDK served locally; all other external requests blocked',errors,realPhoneAcceptance:'NOT_RUN',productionProviderAcceptance:'NOT_RUN',productionAccountChanges:'NONE'};
 fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,screenshots:screenshots.length,geometry:geometry.length}));
}
main().catch(error=>{fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'FAIL',checks,screenshots,geometry,errors,error:error.stack},null,2));console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});

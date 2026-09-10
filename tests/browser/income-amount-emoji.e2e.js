'use strict';
// Real local app and persistence with synthetic records; every external request is intercepted.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),artifact=path.join(root,'.hosting-build/income-amount-emoji-browser'),evidence=path.join(root,'.hosting-build/ltd-status-evidence/income-amount-emoji');
let server,browser,origin,page;const checks=[],screenshots=[],geometry=[],errors=[],blocked=[];
const check=(value,name)=>{assert.ok(value,name);checks.push(name);};
async function image(name){
 const file=path.join(evidence,name+'.png'),before=await page.evaluate(()=>({touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches}));
 // Native viewport capture avoids the installed screenshot wrapper resetting touch emulation.
 const session=await page.context().newCDPSession(page),shot=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await session.detach();
 fs.writeFileSync(file,Buffer.from(shot.data,'base64'));screenshots.push(file);
 assert.deepEqual(await page.evaluate(()=>({touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches})),before,'Screenshot preserves pointer emulation');
}
async function mount(mobile,width=mobile?390:1280){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');localStorage.setItem('taxmateuk_analytics_consent','denied');});
 await context.route('**/*',route=>{const url=route.request().url();if(new URL(url).origin===origin)return route.continue();blocked.push(url);const sdk=/\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)$/.exec(url);return sdk?route.fulfill({path:path.join(root,'node_modules/firebase',sdk[1]),contentType:'text/javascript'}):route.abort();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>typeof openEntry==='function');
 await page.evaluate(()=>{
  S=freshState();S.year='2026-27';S.settings={...S.settings,lang:'en',theme:'light'};
  S.businesses=[{id:'half',name:'Studio partnership',structure:'partnership',share:50,partnershipAmountBasis:'whole_partnership'},{id:'quarter',name:'Workshop partnership',structure:'partnership',share:25,partnershipAmountBasis:'whole_partnership'},{id:'sole',name:'Sole trade',structure:'sole',share:100}];
  for(const b of S.businesses){S.activeCats[b.id]={income:['sales','tips'],expense:['vehicle','phone']};S.customCats[b.id]={income:[],expense:[]};}
  S.customCats.half.income=[{id:'moon-income',name:'Moon sessions',e:'🌙',dot:'#0AA968',custom:true,bizId:'half'}];
  S.customCats.half.expense=[{id:'hedgehog-expense',name:'Special materials',e:'🦔',dot:'#85994B',custom:true,bizId:'half'}];
  S.catRenames={sales:'Existing sales name'};
  S.entries=[{id:'half-income',bizId:'half',kind:'income',cat:'sales',amount:1000,date:'2026-09-01',desc:'Client receipt'},{id:'quarter-income',bizId:'quarter',kind:'income',cat:'sales',amount:2000,date:'2026-09-01',desc:'Workshop receipt'},{id:'sole-income',bizId:'sole',kind:'income',cat:'tips',amount:300,date:'2026-09-01',desc:'Trade receipt'},{id:'moon-zero',bizId:'half',kind:'income',cat:'moon-income',amount:0,date:'2026-09-02',desc:''},{id:'hedgehog-zero',bizId:'half',kind:'expense',cat:'hedgehog-expense',amount:0,date:'2026-09-02',desc:''},{id:'fuel-zero',bizId:'half',kind:'expense',cat:'vehicle',amount:0,date:'2026-09-02',desc:'Fuel'}];
  S.tombstones=[{id:'deleted-entry',bizId:'half',kind:'income',date:'2026-08-01',amount:13,cat:'sales',deletedAt:1,recordType:'entry'}];save();render();
 });
 await page.reload();await page.waitForFunction(()=>typeof openEntry==='function'&&S.businesses.some(b=>b.id==='half'));
 check(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)===mobile,'Fixture has the requested pointer mode');
 return context;
}
async function financial(){return page.evaluate(()=>JSON.stringify({businesses:S.businesses,entries:S.entries,tombstones:S.tombstones,folders:S.folders,catRenames:S.catRenames}));}
async function amountBox(label){
 await page.waitForTimeout(80); // Wait for the existing sheet's 50 ms initial-focus callback.
 await page.locator('#en-amount').scrollIntoViewIfNeeded();await page.locator('#en-amount').focus();
 const box=await page.evaluate(()=>{const c=document.querySelector('.entry-amount .cur').getBoundingClientRect(),input=document.getElementById('en-amount'),b=input.getBoundingClientRect();return{currency:{left:c.left,right:c.right,top:c.top,bottom:c.bottom},input:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},value:input.value,fontSize:getComputedStyle(input).fontSize,focused:document.activeElement===input,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth};});
 geometry.push({label,...box});check(box.currency.right<box.input.left&&box.focused&&box.input.right<=box.viewport&&box.overflow<=1,label+' currency and input bounds stay separate, focused and within viewport');
}
async function main(){
 fs.mkdirSync(evidence,{recursive:true});const buildRoot=path.resolve(root,'.hosting-build');assert.ok(artifact.startsWith(buildRoot+path.sep));for(const dir of [buildRoot,artifact])if(fs.existsSync(dir)){assert.ok(!fs.lstatSync(dir).isSymbolicLink());assert.equal(fs.realpathSync(dir).toLowerCase(),dir.toLowerCase());}
 assert.equal(spawnSync(process.execPath,['scripts/build-hosting.js','production','income-amount-emoji-browser'],{cwd:root,stdio:'inherit'}).status,0);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(artifact,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)});
 for(const mobile of [true,false]){
  const mode=mobile?'mobile':'desktop',context=await mount(mobile),before=await financial();
  await page.evaluate(()=>go('income'));
  check((await page.locator('[data-income-total-hint]').textContent()).includes('Combined full income from all businesses'),mode+' All filter describes combined full receipts');
  check(!(await page.locator('[data-income-total-hint]').textContent()).includes('50%'),mode+' All filter does not imply one common share');
  check((await page.locator('#page .h1').textContent()).includes('3,300'),mode+' income total retains full 3300');
  await image(mode+'-income-all');
  await page.evaluate(()=>setFilter('incFilter','half'));
  check((await page.locator('[data-income-total-hint]').textContent()).includes('Full business income (100%)'),mode+' one-business filter explains full income');
  check(await page.locator('#page .chips .category-emoji').allTextContents().then(a=>a.includes('💷')&&a.includes('🌙')),mode+' built-in and saved custom income filter emoji visible');
  check(await page.locator('#page .entry .category-emoji').allTextContents().then(a=>a.includes('💷')&&a.includes('🌙')),mode+' entry rows show original category emoji');
  const storedBefore=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
  for(const id of [null,'half-income']){
   await page.evaluate(id=>openEntry('income',id),id);
   check((await page.locator('#en-amount-hint').textContent()).includes('Enter the full amount received by this business'),mode+' '+(id?'Edit':'Add')+' full amount reminder');
   check((await page.locator('#en-amount-hint').textContent()).includes('50%'),mode+' '+(id?'Edit':'Add')+' actual configured 50%');
   if(id)check(await page.locator('#en-amount').inputValue()==='1000',mode+' edit keeps stored full 1000');
   await page.locator('#en-biz').selectOption('quarter');check((await page.locator('#en-amount-hint').textContent()).includes('25%'),mode+' business switch refreshes configured share');
   await page.locator('#en-biz').selectOption('sole');check(!(await page.locator('#en-amount-hint').textContent()).includes('partnership share'),mode+' sole trader has no misleading partnership percentage');
   await page.evaluate(()=>closeSheet('entry'));
  }
  check(await page.evaluate(()=>localStorage.getItem(STORE_KEY))===storedBefore,mode+' opening, editing controls and cancelling do not save data');
  await page.evaluate(()=>openEntry('income','half-income'));await amountBox(mode+' income edit');await image(mode+'-edit-income');
  await page.locator('#en-amount').fill('9999999.99');await amountBox(mode+' long income');
  await page.evaluate(()=>document.querySelector('.entry-amount').style.fontSize='200%');await amountBox(mode+' 200 percent text');check(parseFloat(geometry.at(-1).fontSize)>=2*parseFloat(geometry.at(-2).fontSize),mode+' text scaling really doubles editable number size');await image(mode+'-amount-200-text');
  await page.evaluate(()=>document.querySelector('.entry-amount').style.fontSize='');
  await page.evaluate(()=>{closeSheet('entry');go('expenses');});
  check(await page.locator('#page .chips .category-emoji').allTextContents().then(a=>a.includes('🦔')&&a.includes('⛽')),mode+' expense filter emoji preserved');
  await page.evaluate(()=>openEntry('expense','hedgehog-zero'));check((await page.locator('#en-amount-hint').textContent()).includes('full expense amount'),mode+' expense form gets its own amount-basis reminder');await page.locator('#en-amount').fill('1234567.89');await amountBox(mode+' shared expense amount');
  check(await page.locator('#en-cats .category-emoji').allTextContents().then(a=>a.includes('🦔')&&a.includes('⛽')),mode+' expense category picker restores saved and original emoji');
  await image(mode+'-expense-emoji');await page.evaluate(()=>closeSheet('entry'));
  check(await financial()===before,mode+' copy, layout and view/cancel preserve financial records, allocations, names and deletion markers');
  check(await page.evaluate(()=>calcTax(S.year).perBiz.find(p=>p.biz.id==='half').personal.incomeMinor)===50000,mode+' stored 1000 at 50 percent remains personal 500, never 250');
  for(const kind of ['income','expense'])for(const selected of [false,true]){
   await page.evaluate(kind=>{openEntry(kind);document.getElementById('en-biz').value='half';paintEntry();openCatSheet();},kind);
   check(await page.locator('#cc-emoji-input').evaluate(el=>el.tagName==='INPUT'&&el.type==='text'&&el.readOnly===!matchMedia('(pointer:coarse)').matches),mode+' native text input remains editable on touch devices');
   const gridState=await page.locator('#cc-emojis').evaluate(el=>({display:getComputedStyle(el).display,style:el.getAttribute('style'),desktop:matchMedia('(hover: hover) and (pointer: fine)').matches,coarse:matchMedia('(pointer:coarse)').matches}));
   check((await page.locator('#cc-emojis').isVisible())===!mobile,mode+' desktop-only grid scope '+JSON.stringify(gridState));
   const expected=selected?(kind==='income'?'🎨':'🧾'):'📁',name=mode+' '+kind+' '+(selected?'chosen':'default');
   await page.locator('#cc-name').fill(name);
   if(selected){if(mobile){await page.locator('#cc-emoji-input').fill('🌙'+expected);check(await page.locator('#cc-emoji-input').inputValue()===expected,mode+' native input retains newest complete emoji');}else{check(await page.locator('#cc-emojis button').count()===31,'desktop retains 31 choices');await page.locator('#cc-emojis button').filter({hasText:expected}).click();}}
   if(kind==='income'&&selected)await image(mode+'-category-input');
   await page.locator('[data-tm-click="saveCat()"]').click();
   check(await page.evaluate(({kind,name,expected})=>S.customCats.half[kind].some(c=>c.name===name&&c.e===expected&&c.bizId==='half'),{kind,name,expected}),mode+' '+kind+' '+(selected?'selected':'default')+' folder icon saved through UI');
   await page.evaluate(()=>closeSheet('entry'));
  }
  await page.evaluate(()=>{openEntry('income','half-income');window.emojiOldMeta=JSON.parse(JSON.stringify(cloudMetaFromState()));});
  const beforeCancel=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
  await page.locator('#en-cats [data-tm-click="setCat(\'sales\')"]').dispatchEvent('contextmenu');await page.locator('[data-tm-click="catStartRename()"]').click();await page.locator('#cat-rename-emoji').fill('🦉');await page.locator('[data-tm-click="catCancelRename()"]').click();await page.evaluate(()=>closeSheet('catact'));
  check(await page.evaluate(()=>localStorage.getItem(STORE_KEY))===beforeCancel,mode+' cancel built-in emoji edit leaves storage unchanged');
  for(const [id,emoji] of [['sales','🦉'],['moon-income','🪁'],['vehicle','🚜'],['hedgehog-expense','🧵']]){
   await page.evaluate(id=>{catLongPress(id);catStartRename();},id);await page.locator('#cat-rename-emoji').fill(emoji);await page.locator('[data-tm-click="catConfirmRename()"]').click();
   check(await page.evaluate(({id,emoji})=>catEmoji(catById(id))===emoji,{id,emoji}),mode+' saves selected emoji for '+id);
  }
  check(await financial()===before,mode+' emoji edits keep financial data, names and category associations');
  await page.evaluate(()=>applyCloudMeta(emojiOldMeta));
  check(await page.evaluate(()=>catEmoji(catById('sales'))==='🦉'&&catEmoji(catById('moon-income'))==='🪁'),mode+' stale metadata cannot overwrite newer icon edits');
  await page.reload();await page.waitForFunction(()=>typeof catEmoji==='function'&&S.businesses.length===3);
  check(await page.evaluate(()=>catEmoji(catById('sales'))==='🦉'&&catEmoji(catById('moon-income'))==='🪁'&&catEmoji(catById('vehicle'))==='🚜'&&catEmoji(catById('hedgehog-expense'))==='🧵'),mode+' built-in and custom selected emoji survive reload');
  check(await page.evaluate(mode=>['income','expense'].every(kind=>S.customCats.half[kind].some(c=>c.name===mode+' '+kind+' default'&&c.e==='📁')&&S.customCats.half[kind].some(c=>c.name===mode+' '+kind+' chosen'&&c.e===(kind==='income'?'🎨':'🧾'))),mode),mode+' selected and default new folders survive reload');
  check(await page.evaluate(()=>CATS.income.find(c=>c.id==='sales').e==='💷'&&CATS.expense.find(c=>c.id==='vehicle').e==='⛽'),mode+' original built-in records are intact');
  await page.evaluate(()=>{go('income');openEntry('income','half-income');});await image(mode+'-saved-emoji');
  await page.evaluate(()=>{window.emojiSyncedMeta=JSON.parse(JSON.stringify(cloudMetaFromState()));window.emojiState=JSON.parse(JSON.stringify(S));S=freshState();applyCloudMeta(emojiSyncedMeta);persistRemoteState();});
  check(await page.evaluate(()=>catEmoji(catById('sales'))==='🦉'&&catEmoji(catById('moon-income'))==='🪁'),mode+' existing metadata merge transports built-in and custom emoji to an empty synthetic device');
  await page.evaluate(()=>{S=emojiState;META_SYNC_SHADOW=metaSyncSnapshot(S);save();closeSheet('entry');});
  for(const lang of ['en','zh','pl','ro','es','ur']){
   await page.evaluate(lang=>{S.settings.lang=lang;applyStaticI18n();openEntry('income','half-income');},lang);
   check((await page.locator('#en-amount-hint').textContent()).includes('50')&&!/income\./.test(await page.locator('#en-amount-hint').textContent()),mode+' '+lang+' share reminder translated');
   await amountBox(mode+' '+lang+' amount direction');
  }
  await page.evaluate(()=>{S.settings.lang='en';applyStaticI18n();S.businesses.find(b=>b.id==='half').partnershipAmountBasis='user_share';paintEntry();});
  check((await page.locator('#en-amount-hint').textContent()).includes('will not apply the share again'),mode+' legacy already-share basis gets accurate reminder');
  await page.evaluate(()=>{closeSheet('entry');render();});check(!(await page.locator('[data-income-total-hint]').textContent()).includes('Full business income'),mode+' legacy-basis total is not falsely described as 100 percent');
  await page.evaluate(()=>{S.businesses.find(b=>b.id==='half').partnershipAmountBasis='legacy_unconfirmed';openEntry('income','half-income');});check((await page.locator('#en-amount-hint').textContent()).includes('awaiting confirmation'),mode+' unconfirmed basis is not assigned an invented share');
  await context.close();
 }
 const narrow=await mount(true,320);await page.evaluate(()=>{openEntry('income','half-income');document.querySelector('.entry-amount').style.fontSize='200%';});await page.locator('#en-amount').fill('9999999.99');await amountBox('mobile narrow 320 with 200 percent text');await image('mobile-amount-narrow-200-text');await narrow.close();
 check(errors.length===0,'No uncaught browser errors');
 const result={status:'PASS',createdAt:new Date().toISOString(),scope:'LOCAL_SYNTHETIC_BROWSER_AND_METADATA_CONTRACT',identity:require('../../src/core/versions').VERSIONS,checks,geometry,screenshots,externalRequests:'All intercepted; SDK files supplied locally, all other external requests blocked',blockedRequestCount:blocked.length,errors,realPhoneAcceptance:'NOT_RUN',productionProviderAcceptance:'NOT_RUN',productionAccountMutation:'NONE'};
 fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,screenshots:screenshots.length,geometry:geometry.length}));
}
main().catch(error=>{fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'FAIL',checks,geometry,screenshots,errors,error:error.stack},null,2));console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});

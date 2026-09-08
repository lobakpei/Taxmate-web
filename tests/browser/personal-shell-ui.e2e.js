'use strict';

// TaxMate personal shell (index.html) — visual and language checks the earlier suites
// could not make: money colours by role from computed style in light and dark, bottom
// navigation centring, reminder palette, and six-language screens with no hard-coded
// English. Runs the real app from the production static server with a sanitised local
// state; no Firebase, no account, no external request.

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const {createFounderPreviewBackup}=require('../../ui-preview-harness/sanitised-backup-fixture');
const {I18N}=require('../../scripts/i18n-audit');

const root=path.resolve(__dirname,'../..');
const evidence=path.resolve(process.env.TAXMATE_PERSONAL_SHELL_EVIDENCE||path.join(root,'.personal-shell-ui-evidence'));
const port=Number(process.env.TAXMATE_PERSONAL_SHELL_PORT||41752),origin=`http://127.0.0.1:${port}`;
const assertions=[],externalRequests=[],consoleErrors=[],screenshots=[];
let server,browser,lastPage=null;
const check=(value,message)=>{assert.ok(value,message);assertions.push(message);};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions.push(message);};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const chromePath=()=>{for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','/opt/pw-browsers/chromium/chrome','/usr/bin/google-chrome','/usr/bin/chromium'])if(candidate&&fs.existsSync(candidate))return candidate;return null;};
const waitForServer=async()=>{const started=Date.now();while(Date.now()-started<15000){try{const response=await fetch(`${origin}/index.html`);if(response.ok)return;}catch(_){}await sleep(100);}throw new Error('preview server did not start');};
const rgb=value=>String(value||'').replace(/\s/g,'');
// Approved money-semantic values. The shipped shell runs Direction A, so direction-a.css
// supplies the tokens; index.html keeps the legacy pair for the non-Direction-A path.
const MONEY={light:{in:'rgb(22,122,67)',out:'rgb(189,48,55)'},dark:{in:'rgb(95,216,145)',out:'rgb(255,138,143)'}};
const HERO={in:'rgb(95,216,145)',out:'rgb(255,138,143)'};
async function colourOf(locator){return rgb(await locator.evaluate(node=>getComputedStyle(node).color));}
async function shot(page,name,fullPage=true){const file=path.join(evidence,name+'.png');await page.screenshot({path:file,fullPage});screenshots.push(name+'.png');}

async function shell(viewport,lang,theme){
  const state=createFounderPreviewBackup().data;
  state.settings={lang,theme};state.tab='home';
  const context=await browser.newContext({viewport,colorScheme:theme==='dark'?'dark':'light'});
  await context.route('**/*',async route=>{const url=route.request().url();
    if(/^https?:\/\//i.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(url)){externalRequests.push(url);await route.abort('blockedbyclient');return;}
    await route.continue();});
  await context.addInitScript(json=>{
    localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');
    localStorage.setItem('taxmateuk_analytics_consent','denied');
    localStorage.setItem('taxmateuk_account_v1:local:canonical',json);
    sessionStorage.setItem('tmCarouselDismissed','["pwa"]');
  },JSON.stringify(state));
  const page=await context.newPage();lastPage=page;
  page.on('pageerror',error=>consoleErrors.push('pageerror '+error.message));
  page.on('console',message=>{if(message.type()==='error'&&!/ERR_BLOCKED_BY_CLIENT|favicon/.test(message.text()))consoleErrors.push(message.text());});
  await page.goto(`${origin}/index.html`,{waitUntil:'networkidle'});
  await page.locator('#nav button').first().waitFor();
  await sleep(600);
  return {context,page};
}
async function go(page,tab){await page.evaluate(name=>go(name),tab);await sleep(400);}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  server=spawn(process.execPath,['scripts/preview-server.js'],{cwd:root,env:{...process.env,TAXMATE_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let serverError='';server.stderr.on('data',chunk=>{serverError+=String(chunk);});
  await waitForServer();
  const executablePath=chromePath();
  browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true});

  // ---- Money semantics, light theme ---------------------------------------
  const light=await shell({width:390,height:844},'en','light'),page=light.page;
  equal(await colourOf(page.locator('[data-personal-income-minor]')),HERO.in,'home hero: money in uses the income colour on navy');
  equal(await colourOf(page.locator('[data-personal-expenses-minor]')),HERO.out,'home hero: money out uses the expense colour on navy');
  equal(await colourOf(page.locator('[data-home-ledger-profit]')),HERO.in,'home hero: a positive profit uses the income colour');
  equal(await colourOf(page.locator('.hero-owe .ho-val')),HERO.out,'home hero: estimated tax to pay reads as money out');
  const bizAmounts=page.locator('[data-home-business-row] .v');
  equal(await colourOf(bizAmounts.first()),MONEY.light.in,'home business rows: a positive share is the income colour');
  // Recent activity mixes income and expenses: each row carries its own direction.
  const recent=await page.locator('.elist .entry').evaluateAll(rows=>rows.map(row=>{
    return {kind:row.dataset.entryKind,decorativeIcon:!!row.querySelector('.edot'),amount:getComputedStyle(row.querySelector('.v')).color.replace(/\s/g,'')};
  }));
  check(recent.length>0,'the home recent-activity list rendered');
  for(const row of recent){
    const income=row.kind==='income';
    equal(row.decorativeIcon,false,`a recent ${row.kind} row follows the approved name, date and amount module without a decorative icon`);
    equal(row.amount,income?MONEY.light.in:MONEY.light.out,`a recent ${row.kind} row uses the matching money colour for its amount`);
  }
  await shot(page,'personal-home-en-light-390');

  await go(page,'income');
  equal(await colourOf(page.locator('.elist .entry .v').first()),MONEY.light.in,'income list: entry amounts use the income colour');
  equal(await colourOf(page.locator('.month .num').first()),MONEY.light.in,'income list: month totals use the income colour');
  equal(await colourOf(page.locator('.h1 .num')),HERO.in,'income list: navy page header uses the high-contrast income colour');
  await shot(page,'personal-income-en-light-390');

  await go(page,'expenses');
  equal(await colourOf(page.locator('.elist .entry .v').first()),MONEY.light.out,'expense list: entry amounts use the expense colour');
  equal(await colourOf(page.locator('.month .num').first()),MONEY.light.out,'expense list: month totals use the expense colour');
  equal(await colourOf(page.locator('.h1 .num')),HERO.out,'expense list: navy page header uses the high-contrast expense colour');
  await shot(page,'personal-expenses-en-light-390');

  await go(page,'tax');
  const taxRows=page.locator('[data-tax-business-row] .fv');
  equal(await colourOf(taxRows.first()),MONEY.light.in,'tax page: an attributable profit uses the income colour');
  const liability=page.locator('.frow.total').filter({hasText:/Total bill/}).locator('.fv');
  equal(await colourOf(liability),MONEY.light.out,'tax page: the total bill reads as money out');
  const class4=page.locator('.frow').filter({hasText:/Class 4/}).first().locator('.fv');
  equal(await colourOf(class4),MONEY.light.out,'tax page: National Insurance reads as money out even at zero');
  const balancing=await page.locator('[data-balancing-payment]').innerText();
  equal(await colourOf(page.locator('[data-balancing-payment]')),balancing.includes('−')||balancing.includes('-')?MONEY.light.in:MONEY.light.out,'balancing tax is red including zero; a refund is green');
  await shot(page,'personal-tax-en-light-390');

  // ---- Bottom navigation: one centred content group, no shift when selected --
  await go(page,'home');
  equal(await page.locator('.hero .big').evaluate(n=>getComputedStyle(n).fontSize),'44px','390px home preserves the approved 44px primary number');
  const primary=page.locator('.home-add-income'),states=[];
  const inspectPrimary=async state=>states.push({state,...await primary.evaluate(n=>{const s=getComputedStyle(n);return{ink:s.color,background:s.backgroundColor,opacity:s.opacity,height:n.getBoundingClientRect().height};})});
  await inspectPrimary('normal');await primary.hover();await inspectPrimary('hover');await primary.focus();await inspectPrimary('focus');
  await page.mouse.down();await inspectPrimary('pressed');await page.mouse.move(0,0);await page.mouse.up();
  await primary.evaluate(n=>n.disabled=true);await inspectPrimary('disabled');await primary.evaluate(n=>n.disabled=false);
  for(const item of states){equal(rgb(item.ink),'rgb(15,22,32)',`primary ${item.state} retains readable navy ink`);equal(rgb(item.background),'rgb(255,190,10)',`primary ${item.state} retains approved yellow`);check(item.height>=50,`primary ${item.state} has a 50px touch target`);}
  const nav=await page.locator('#nav button').evaluateAll(buttons=>buttons.map(button=>{
    const box=button.getBoundingClientRect();
    const icon=button.querySelector('svg').getBoundingClientRect();
    const label=button.querySelector('span').getBoundingClientRect();
    return {on:button.classList.contains('on'),top:Math.round(icon.top-box.top),bottom:Math.round(box.bottom-label.bottom),iconTop:Math.round(icon.top),labelBottom:Math.round(label.bottom),justify:getComputedStyle(button).justifyContent};
  }));
  for(const button of nav)equal(button.justify,'center','navigation buttons centre their content group');
  for(const button of nav)check(Math.abs(button.top-button.bottom)<=2,`navigation padding is even (top ${button.top}px / bottom ${button.bottom}px)`);
  const selected=nav.find(b=>b.on),unselected=nav.find(b=>!b.on);
  check(Math.abs(selected.iconTop-unselected.iconTop)<=1&&Math.abs(selected.labelBottom-unselected.labelBottom)<=1,'the selected tab does not shift its icon or label');
  await shot(page,'personal-nav-en-light-390',false);

  // ---- Reminders never use the income green -------------------------------
  const palette=await page.evaluate(()=>{
    const probe=document.createElement('div');probe.className='notice green';probe.textContent='probe';
    document.body.appendChild(probe);const style=getComputedStyle(probe);
    const amber=document.createElement('div');amber.className='notice amber';document.body.appendChild(amber);
    const amberStyle=getComputedStyle(amber);
    const result={green:style.backgroundColor,amber:amberStyle.backgroundColor};
    probe.remove();amber.remove();return result;});
  equal(rgb(palette.green),rgb(palette.amber),'a "green" notice renders in the approved reminder palette, not income green');
  check(!/rgb\(230,247,239\)/.test(rgb(palette.green)),'the reminder background is not the income-green tint');
  await light.context.close();

  // ---- Money semantics, dark theme ----------------------------------------
  const dark=await shell({width:390,height:844},'en','dark');
  equal(await colourOf(dark.page.locator('[data-home-business-row] .v').first()),MONEY.dark.in,'dark mode: a positive share uses the dark income colour');
  await go(dark.page,'expenses');
  equal(await colourOf(dark.page.locator('.elist .entry .v').first()),MONEY.dark.out,'dark mode: expense entries use the dark expense colour');
  await shot(dark.page,'personal-expenses-en-dark-390');
  await go(dark.page,'home');
  await shot(dark.page,'personal-home-en-dark-390');
  await dark.context.close();

  // ---- Six languages: real translations on every main screen ---------------
  const screens=['home','income','expenses','tax','more'];
  for(const lang of ['en','zh','pl','ro','es','ur']){
    const ctx=await shell({width:390,height:844},lang,lang==='ur'?'light':'light');
    equal(await ctx.page.evaluate(()=>document.documentElement.lang),lang,`${lang}: the document language follows the setting`);
    if(lang==='ur')equal(await ctx.page.evaluate(()=>document.documentElement.dir),'rtl',`${lang}: the shell renders right to left`);
    for(const tab of screens){
      await go(ctx.page,tab);
      const text=await ctx.page.locator('#page').innerText();
      check(text.length>0,`${lang}/${tab}: the screen rendered`);
      if(lang!=='en'){
        // Nothing on the screen may be an untranslated English label from the shell.
        const english=[I18N.en['nav.home'],I18N.en['home.biz'],I18N.en['tax.how'],I18N.en['m.title'],'Limited company','Setup pending','Read-only','Optional analytics','App information','Restoring your account'];
        for(const phrase of english){
          if(!phrase)continue;
          const translated=Object.entries(I18N.en).find(([,value])=>value===phrase);
          if(translated&&I18N[lang][translated[0]]===phrase)continue;   // identical by design (proper nouns)
          check(!new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\s|$)`).test(text),`${lang}/${tab}: "${phrase}" is not shown untranslated`);
        }
      }
      await shot(ctx.page,`personal-${tab}-${lang}-light-390`);
    }
    await go(ctx.page,'more');
    await ctx.page.getByRole('button',{name:I18N[lang]['review01.billing'],exact:true}).click();
    equal(await ctx.page.locator('[data-billing-overview] button').count(),0,lang+': account billing is not exposed before sign-in');
    check(await ctx.page.locator('#cf-msg').innerText().then(text=>text===I18N[lang]['ac.needSignInBody']),lang+': billing asks for sign-in in the selected language');
    await shot(ctx.page,`personal-billing-${lang}-light-390`);
    await ctx.page.keyboard.press('Escape');
    equal(await ctx.page.locator('#sb-refund.open').count(),0,lang+': no refund form or payment state is fabricated without an account');
    await ctx.context.close();
  }

  // ---- Widths: no horizontal overflow on any main screen -------------------
  for(const width of [360,412,1440]){
    const ctx=await shell({width,height:width>1000?900:844},'en','light');
    for(const tab of screens){
      await go(ctx.page,tab);
      const overflow=await ctx.page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
      check(!overflow,`no horizontal overflow on ${tab} at ${width}px`);
    }
    await go(ctx.page,'home');
    await shot(ctx.page,`personal-home-en-light-${width}`);
    await ctx.context.close();
  }

  // The shell's only external dependencies are the pinned jsPDF pair and the Firebase
  // compat SDKs; both are blocked here, so nothing left this machine during the run.
  const unexpected=[...new Set(externalRequests)].filter(url=>!/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf(-autotable)?\//.test(url)&&!/^https:\/\/www\.gstatic\.com\/firebasejs\//.test(url)&&!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url));
  equal(unexpected,[],'no unexpected external network request was made');
  equal(consoleErrors,[],'no page or console errors');
  const result={status:'PASS',assertions:assertions.length,assertionList:assertions,screenshots,blockedCdnScripts:[...new Set(externalRequests)],serverError:serverError.trim()||null,generatedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,'personal-shell-ui-result.json'),JSON.stringify(result,null,2));
  console.log(`PERSONAL_SHELL_UI PASS assertions=${assertions.length} screenshots=${screenshots.length} evidence=${evidence}`);
}

main().then(()=>cleanup(0)).catch(async error=>{console.error(error);fs.mkdirSync(evidence,{recursive:true});try{if(lastPage)await lastPage.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});}catch(_){}fs.writeFileSync(path.join(evidence,'personal-shell-ui-result.json'),JSON.stringify({status:'FAIL',error:String(error&&error.stack||error),assertions:assertions.length,assertionList:assertions,consoleErrors,externalRequests},null,2));cleanup(1);});
async function cleanup(code){try{if(browser)await browser.close();}catch(_){}try{if(server)server.kill();}catch(_){}process.exit(code);}

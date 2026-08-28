'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const evidence=path.resolve(process.env.TAXMATE_LTD_PREVIEW_EVIDENCE||path.join(root,'.ltd-founder-preview-evidence'));
const port=41746,origin=`http://127.0.0.1:${port}`;
const assertions=[],externalRequests=[],consoleErrors=[];
let server,browser;
const check=(value,message)=>{assert.ok(value,message);assertions.push(message);};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);assertions.push(message);};
const chromePath=()=>{for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'])if(candidate&&fs.existsSync(candidate))return candidate;throw new Error('Installed Chrome not found');};
const waitForServer=async()=>{const started=Date.now();while(Date.now()-started<15000){try{const response=await fetch(`${origin}/?mode=existing&tier=pro`);if(response.ok)return;}catch(_){}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Founder Preview server did not start');};
async function pageFor(viewport){const context=await browser.newContext({viewport});await context.route('**/*',async route=>{const url=route.request().url();if(/^https?:\/\//i.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(url)){externalRequests.push(url);await route.abort('blockedbyclient');return;}await route.continue();});const page=await context.newPage();page.on('pageerror',error=>consoleErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/ERR_BLOCKED_BY_CLIENT/.test(message.text()))consoleErrors.push(message.text());});return{context,page};}
async function goto(page,pathName){await page.goto(`${origin}${pathName}`,{waitUntil:'networkidle'});await page.locator('.tm-app').waitFor();}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  server=spawn(process.execPath,['ui-preview-harness/server.js',`--port=${port}`],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let serverError='';server.stderr.on('data',chunk=>{serverError+=String(chunk);});
  await waitForServer();
  browser=await chromium.launch({headless:true,executablePath:chromePath()});

  const mobile=await pageFor({width:390,height:844}),page=mobile.page;
  await goto(page,'/?mode=existing&tier=pro&reset=1');
  equal(await page.locator('.tm-row').count(),5,'Existing Home renders four legacy businesses plus one Ltd');
  check(await page.getByRole('button',{name:/ToodaLoop Ltd/}).isEnabled(),'Pro can open the existing Ltd row');
  await page.screenshot({path:path.join(evidence,'existing-home-390x844-light-en.png'),fullPage:true});
  await page.getByRole('button',{name:/ToodaLoop Ltd/}).click();
  await page.getByRole('tab',{name:'Overview'}).waitFor();
  for(const area of ['Overview','Money','Tax','Records'])check(await page.getByRole('tab',{name:area}).count()===1,`${area} workspace tab renders`);
  await page.getByRole('tab',{name:'Records'}).click();
  await page.getByRole('button',{name:/Download company working pack/}).waitFor();check(true,'Working pack action renders');
  await page.screenshot({path:path.join(evidence,'existing-records-390x844-light-en.png'),fullPage:true});
  await page.getByLabel('Theme').selectOption('dark');
  for(const locale of ['en','zh-HK','pl','ro','es','ur']){await page.getByLabel('Locale').selectOption(locale);const semantics=await page.locator('.tm-app').evaluate(node=>({lang:node.lang,dir:node.dir}));equal(semantics.lang,locale,`${locale} locale is explicit on the app root`);equal(semantics.dir,locale==='ur'?'rtl':'ltr',`${locale} direction is correct`);}
  await page.screenshot({path:path.join(evidence,'existing-records-390x844-dark-ur-rtl.png'),fullPage:true});
  await mobile.context.close();

  const desktop=await pageFor({width:1440,height:1000}),desktopPage=desktop.page;
  for(const tier of ['plus','free']){await goto(desktopPage,`/?mode=existing&tier=${tier}&reset=1`);const row=desktopPage.getByRole('button',{name:/ToodaLoop Ltd/});check(await row.isDisabled(),`${tier} cannot open the existing Ltd workspace`);check((await row.innerText()).includes('Launch price £9.99/month'),`${tier} sees the approved launch-price wording`);await desktopPage.getByRole('button',{name:'+ Add a business'}).click();await desktopPage.getByRole('button',{name:/Limited company/}).click();await desktopPage.getByText('Limited company tools are available on Pro.').waitFor();check(true,`${tier} create path returns the Pro gate without activating Ltd`);}

  await goto(desktopPage,'/?mode=fresh&tier=pro&reset=1');
  await desktopPage.getByRole('button',{name:'+ Add a business'}).click();
  await desktopPage.getByRole('button',{name:/Self-employed business/}).waitFor();check(true,'Add Business stage one retains self-employed choice');
  await desktopPage.getByRole('button',{name:/Limited company/}).click();
  await desktopPage.getByRole('button',{name:'Yes',exact:true}).click();
  const number=desktopPage.getByRole('textbox',{name:'Company number'}),name=desktopPage.getByRole('textbox',{name:'Registered company name'}),date=desktopPage.getByRole('textbox',{name:'Incorporation date'});
  await number.fill('22222222');await name.fill('Preview Review Ltd');await date.fill('15/12/2025');
  await desktopPage.getByRole('button',{name:'Learn more'}).nth(1).click();await desktopPage.getByRole('button',{name:'Got it'}).click();
  equal(await number.inputValue(),'22222222','Info overlay preserves the unsaved company number');equal(await name.inputValue(),'Preview Review Ltd','Info overlay preserves the unsaved company name');equal(await date.inputValue(),'15/12/2025','Info overlay preserves the unsaved incorporation date');
  await desktopPage.getByRole('button',{name:'Check Companies House'}).click();await desktopPage.getByText("We couldn't find a company with that number.").waitFor();check(true,'Companies House not-found remains a manual-continuation state');
  await number.fill('33333333');await desktopPage.getByRole('button',{name:'Check Companies House'}).click();await desktopPage.getByText('TaxMate could not load the record just now. You can still enter the registered details yourself.').first().waitFor();check(true,'Companies House unavailable remains a retryable manual-continuation state');
  await number.fill('11111111');await desktopPage.getByRole('button',{name:'Check Companies House'}).click();await desktopPage.getByText('PREVIEW COMPANY LTD').first().waitFor();check(true,'Companies House found state fills verified public facts');
  await desktopPage.getByRole('button',{name:'Continue'}).click();await desktopPage.getByText('Has the company started doing business yet?').waitFor();await desktopPage.getByRole('button',{name:'Yes',exact:true}).first().click();await desktopPage.getByRole('textbox',{name:'When did it start doing business?'}).fill('20/12/2025');await desktopPage.getByRole('button',{name:'My official dates are different'}).click();await desktopPage.getByText('Your first company periods').waitFor();
  const step2=await desktopPage.locator('body').innerText(),period=step2.indexOf('Your first company periods'),override=step2.indexOf('My official dates are different'),ct=step2.indexOf('Have you added Corporation Tax');check(period>=0&&period<override&&override<ct,'Step 2 renders period card before official-date override before CT question');
  await desktopPage.screenshot({path:path.join(evidence,'fresh-step2-1440x1000-light-en.png'),fullPage:true});
  await desktop.context.close();

  equal(externalRequests.length,0,'Founder Preview makes no external network request');if(consoleErrors.length)throw new Error(`Founder Preview browser/page errors: ${JSON.stringify(consoleErrors.slice(0,8))}`);assertions.push('Founder Preview has no browser/page errors');
  const result={status:'PASS',assertionCount:assertions.length,assertions,externalRequests,consoleErrors,viewports:['390x844','1440x1000'],tiers:['pro','plus','free'],locales:['en','zh-HK','pl','ro','es','ur'],runtime:{localhostOnly:true,productionProviders:false}};
  fs.writeFileSync(path.join(evidence,'ltd-founder-preview-browser-result.json'),JSON.stringify(result,null,2)+'\n');
  process.stdout.write(`LTD_FOUNDER_PREVIEW_BROWSER_PASS assertions=${assertions.length}\n`);
}

main().catch(error=>{process.stderr.write(`${error.stack||error}\n`);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close().catch(()=>{});if(server&&!server.killed)server.kill();});

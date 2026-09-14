'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const port=Number(process.env.TAXMATE_PERSONAL_NOTICE_PORT||42791);
const origin=`http://127.0.0.1:${port}`;
let server,browser;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const chromePath=()=>{
  for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','/opt/pw-browsers/chromium/chrome','/usr/bin/google-chrome','/usr/bin/chromium']){
    if(candidate&&fs.existsSync(candidate))return candidate;
  }
  return null;
};
async function waitForServer(){
  const started=Date.now();
  while(Date.now()-started<15000){
    try{if((await fetch(`${origin}/index.html`)).ok)return;}catch(_){}
    await sleep(100);
  }
  throw new Error('preview server did not start');
}

async function main(){
  server=spawn(process.execPath,['scripts/preview-server.js'],{cwd:root,env:{...process.env,TAXMATE_PREVIEW_PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  await waitForServer();
  const executablePath=chromePath();
  browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true});
  const context=await browser.newContext({viewport:{width:360,height:800},colorScheme:'dark'});
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(/^https?:\/\//i.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(url)){await route.abort('blockedbyclient');return;}
    await route.continue();
  });
  await context.addInitScript(()=>{
    localStorage.setItem('taxmateuk_account_v1:local:onboarding-done','1');
    localStorage.setItem('taxmateuk_analytics_consent','denied');
    localStorage.setItem('taxmateuk_settings_v1',JSON.stringify({lang:'en',theme:'dark'}));
  });
  const page=await context.newPage();
  await page.goto(`${origin}/index.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof showNotice==='function'&&typeof openSheet==='function');

  await page.evaluate(()=>{
    const opener=document.createElement('button');
    opener.id='notice-test-opener';
    opener.textContent='Open information';
    document.body.appendChild(opener);
    opener.focus();
    showNotice('Account information','Your account remains protected.');
  });
  await page.locator('#sb-notice.open').waitFor();
  await page.waitForTimeout(80);
  const result=await page.locator('#sb-notice').evaluate(overlay=>{
    const sheet=overlay.querySelector('.sheet'),footer=overlay.querySelector('.notice-dialog-footer');
    const os=getComputedStyle(overlay),ss=getComputedStyle(sheet),rect=sheet.getBoundingClientRect();
    const visibleButtons=Array.from(overlay.querySelectorAll('button')).filter(node=>node.getClientRects().length);
    return {
      viewport:{width:innerWidth,height:innerHeight},
      overlay:{alignItems:os.alignItems,padding:os.padding,background:os.backgroundColor},
      sheet:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,borderTopLeftRadius:ss.borderTopLeftRadius,borderTopRightRadius:ss.borderTopRightRadius,borderBottomRightRadius:ss.borderBottomRightRadius,borderBottomLeftRadius:ss.borderBottomLeftRadius},
      grabCount:overlay.querySelectorAll('.grab').length,
      visibleButtons:visibleButtons.map(node=>node.textContent.trim()),
      footerButtons:footer.querySelectorAll('button').length,
      role:overlay.getAttribute('role'),
      modal:overlay.getAttribute('aria-modal'),
      labelledBy:overlay.getAttribute('aria-labelledby'),
      describedBy:overlay.getAttribute('aria-describedby')
    };
  });
  assert.equal(result.overlay.alignItems,'center');
  assert.equal(result.overlay.padding,'16px');
  assert.equal(result.overlay.background,'rgba(15, 22, 32, 0.32)');
  assert.ok(result.sheet.left>=15&&result.sheet.right<=result.viewport.width-15,'dialog keeps 16px mobile side space');
  assert.ok(Math.abs((result.sheet.top+result.sheet.bottom)/2-result.viewport.height/2)<=1,'dialog is vertically centred');
  assert.deepEqual([result.sheet.borderTopLeftRadius,result.sheet.borderTopRightRadius,result.sheet.borderBottomRightRadius,result.sheet.borderBottomLeftRadius],['20px','20px','20px','20px']);
  assert.equal(result.grabCount,0);
  assert.deepEqual(result.visibleButtons,['OK']);
  assert.equal(result.footerButtons,1);
  assert.equal(result.role,'dialog');
  assert.equal(result.modal,'true');
  assert.equal(result.labelledBy,'notice-title');
  assert.equal(result.describedBy,'notice-message');

  await page.locator('#sb-notice [data-notice-primary]').click();
  assert.equal(await page.locator('#sb-notice.open').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement&&document.activeElement.id),'notice-test-opener');

  await page.evaluate(()=>showNotice('Copy details','Keep this reference.','REF-123'));
  await page.locator('#sb-notice.open').waitFor();
  assert.equal(await page.locator('#sb-notice .notice-dialog-footer button').count(),1,'copy notice still has one footer action');
  assert.equal(await page.locator('#notice-copy-wrap .notice-copy-action').isVisible(),true,'copy stays a contextual content action');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#sb-notice.open').count(),0,'Escape preserves dialog dismissal');

  await page.evaluate(()=>openSheet('promo'));
  await page.locator('#sb-promo.open').waitFor();
  const ordinary=await page.locator('#sb-promo').evaluate(overlay=>{
    const sheet=overlay.querySelector('.sheet'),style=getComputedStyle(sheet);
    return {alignItems:getComputedStyle(overlay).alignItems,grabVisible:!!overlay.querySelector('.grab')?.getClientRects().length,bottomLeft:style.borderBottomLeftRadius,bottomRight:style.borderBottomRightRadius};
  });
  assert.deepEqual(ordinary,{alignItems:'flex-end',grabVisible:true,bottomLeft:'0px',bottomRight:'0px'},'non-informational mobile sheets remain unchanged');

  await context.close();
  console.log('PERSONAL_INFO_DIALOG PASS viewport=360x800 assertions=21');
}

async function cleanup(code){
  try{if(browser)await browser.close();}catch(_){}
  try{if(server)server.kill();}catch(_){}
  process.exit(code);
}

main().then(()=>cleanup(0)).catch(error=>{console.error(error);cleanup(1);});

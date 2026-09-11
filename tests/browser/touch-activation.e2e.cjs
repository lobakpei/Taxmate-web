const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const old=execFileSync('git',['show','ad6b8b05e29b146079e6d3993c369c2503e42ccd:src/app/app.js'],{encoding:'utf8',maxBuffer:4e6});
 const legacy=old.slice(old.indexOf('let lastTap=0'),old.indexOf('// ── PWA: register',old.indexOf('let lastTap=0')));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 try{for(const mode of ['baseline','candidate']){
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:412,height:860}}),page=await context.newPage();
 await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html{touch-action:manipulation}button{position:fixed;left:30px;top:40px;width:300px;height:90px}</style><button>Continue</button>');
 await page.evaluate(()=>{window.trace=[];window.activations=0;document.addEventListener('touchend',e=>{const row={at:performance.now(),prevented:false,trusted:e.isTrusted};trace.push(row);setTimeout(()=>row.prevented=e.defaultPrevented,0);},true);document.addEventListener('click',()=>{activations++;document.querySelector('button').textContent='Next step '+activations;});});
 if(mode==='baseline')await page.addScriptTag({content:legacy});
 await page.touchscreen.tap(150,80);await page.touchscreen.tap(150,80);
 const result=await page.evaluate(()=>({activations,trace}));results.push({mode,...result});
 assert.equal(result.trace.length,2);assert.ok(result.trace[1].at-result.trace[0].at<300,'test must exercise a genuine quick second tap');assert.equal(result.activations,mode==='baseline'?1:2);
 await context.close();
 }fs.writeFileSync('.hosting-build/touch-activation.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

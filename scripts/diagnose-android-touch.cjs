// Inspect an explicitly started local debug WebView; tap via Android InputManager.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const adb='C:/Users/tamtam/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const dir=path.resolve(process.env.TAXMATE_TOUCH_EVIDENCE||'../mobile-integration-20260910/.local-evidence/build7-baseline');fs.mkdirSync(dir,{recursive:true});
const command=process.argv[2]||'inspect';
function device(...args){return execFileSync(adb,['-s','emulator-5580',...args],{windowsHide:true});}
(async()=>{const targets=await fetch('http://127.0.0.1:9227/json/list').then(r=>r.json()),target=targets.find(p=>p.url.includes('localhost'));
 if(!target)throw Error('Local TaxMate WebView unavailable');
 const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let seq=0;const calls=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(calls.has(m.id)){calls.get(m.id)(m);calls.delete(m.id);}};
 const page={waitForTimeout:ms=>new Promise(r=>setTimeout(r,ms)),evaluate:async (fn,arg)=>{const id=++seq,p=new Promise(r=>calls.set(id,r));socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:'('+fn.toString()+')('+JSON.stringify(arg??null)+')',returnByValue:true,awaitPromise:true}}));const r=await p;if(r.error||r.result.exceptionDetails)throw Error(JSON.stringify(r));return r.result.result.value;}};
 await page.evaluate(()=>{if(window.__touchTrace)return;window.__touchTrace=[];for(const type of ['pointerdown','touchstart','touchend','mousedown','mouseup','click'])document.addEventListener(type,e=>{const row={type,target:e.target.closest?.('[data-tm-click]')?.getAttribute('data-tm-click'),tag:e.target.tagName,trusted:e.isTrusted,x:e.changedTouches?.[0]?.clientX||e.clientX,y:e.changedTouches?.[0]?.clientY||e.clientY,screen:OB?.screen};window.__touchTrace.push(row);queueMicrotask(()=>row.prevented=e.defaultPrevented);},true);});
 if(command==='tap'){const x=Number(process.argv[3]),y=Number(process.argv[4]);device('shell','input','tap',String(x),String(y));await page.waitForTimeout(450);}
 if(command==='back'){device('shell','input','keyevent','4');await page.waitForTimeout(450);}
 if(command==='journey'){
  device('shell','uiautomator','dump','/sdcard/taxmate-test-ui.xml');
  const xml=device('shell','cat','/sdcard/taxmate-test-ui.xml').toString(),webview=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]/);
  if(!webview)throw Error('Cannot establish native WebView origin');const offset={x:+webview[1],y:+webview[2]},checks=[];
  const snapshot=()=>page.evaluate(()=>({screen:OB?.screen,lang:S.settings.lang,busy:OB?._signingInFlow,error:document.querySelector('#ob-root [role=alert]')?.textContent||'',calls:window.__signInCalls||0,tier:currentTier(),user:!!cloudUser(),ltd:!!document.querySelector('#ob-root [data-tm-click="obGo(\'ltd-choice\')"]'),partner:!!document.querySelector('#ob-root [data-tm-click="obStartPartnerSync()"]'),openSheets:[...document.querySelectorAll('.sb.open')].map(n=>({id:n.id,z:getComputedStyle(n).zIndex})),obZ:getComputedStyle(document.getElementById('ob-root')).zIndex}));
  async function tap(action,expected){const b=await page.evaluate(action=>{const n=[...document.querySelectorAll('#ob-root [data-tm-click],.sb.open [data-tm-click]')].find(n=>n.getAttribute('data-tm-click')===action&&n.getClientRects().length);if(!n)throw Error('Missing '+action);n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,dpr:devicePixelRatio};},action);const before=await snapshot();const x=Math.round(offset.x+b.x*b.dpr),y=Math.round(offset.y+b.y*b.dpr);device('shell','input','tap',String(x),String(y));await page.waitForTimeout(400);const after=await snapshot();const click=await page.evaluate(()=>window.__touchTrace.slice(-6));checks.push({action,point:{x,y},before,after,expected,pass:(!expected||after.screen===expected)&&click.some(e=>e.type==='click'&&e.target===action),events:click});console.log(JSON.stringify(checks[checks.length-1]));}
  // Only fixture initialization uses JS. All transitions under test use adb tap.
  await page.evaluate(()=>{window.__signInCalls=0;window.cloudUser=()=>null;OB=obDefaultState(false);OB_DRAFT_KEY=null;TaxMateOnboardingRoot.open(document);obRender();});
  await tap('obToggleLang()','login');await tap("obSetLang('zh')",'login');await tap('obToggleLang()','login');await tap("obSetLang('en')",'login');
  await page.evaluate(()=>{window.fbConfigured=()=>true;window.ensureFB=async()=>null;});
  await tap('obSignIn()','login');
  fs.writeFileSync(path.join(dir,'signin-initialization-failure.png'),device('exec-out','screencap','-p'));
  await page.evaluate(()=>{document.querySelectorAll('.sb.open').forEach(n=>n.classList.remove('open'));document.body.classList.remove('sheet-open');window.fbConfigured=()=>false;});
  await tap('obNoLogin()','entry');await tap("obGo('biz')",'biz');await tap("obGo('entry')",'entry');await tap('obExplore()');
  // Signed-in fixtures exercise actual gating/render/actions; no provider acceptance is claimed.
  for(const tier of ['free','pro']){
   await page.evaluate(tier=>{window.cloudUser=()=>({uid:'local-touch-fixture',isAnonymous:false});window.currentTier=()=>tier;OB=obDefaultState(true);OB.screen='entry';TaxMateOnboardingRoot.open(document);obRender();},tier);
   await tap("obGo('ltd-choice')",'ltd-choice');await tap("obGo('entry')",'entry');await tap('obStartPartnerSync()','partner-code');await tap("obGo('entry')",'entry');
  }
  fs.writeFileSync(path.join(dir,'journey.json'),JSON.stringify({environment:'Android 36 / WebView 133 / offline; auth and entitlement fixtures are local stubs',offset,checks},null,2));
 }
 const state=await page.evaluate(()=>({url:location.href,platform:TaxMatePlatform.kind,screen:OB?.screen,lang:S.settings.lang,busy:OB?._signingInFlow,authReady:FB.ready,user:!!cloudUser(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},insets:{css:getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')},buttons:[...document.querySelectorAll('button,[data-tm-click]')].filter(n=>n.getClientRects().length).map(n=>{const b=n.getBoundingClientRect();return{text:n.innerText.slice(0,90),action:n.getAttribute('data-tm-click'),disabled:n.disabled,rect:{x:b.x,y:b.y,width:b.width,height:b.height}}}),trace:window.__touchTrace}));
 const stamp=Date.now();fs.writeFileSync(path.join(dir,stamp+'-'+command+'.json'),JSON.stringify(state,null,2));fs.writeFileSync(path.join(dir,stamp+'-'+command+'.png'),device('exec-out','screencap','-p'));
 console.log(JSON.stringify(state,null,2));socket.close();
})().catch(e=>{console.error(e);process.exit(1);});

// Local, isolated browser reproduction. Never connects to production services.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.argv[2]||'../mobile-integration-20260910/www');
const out=path.resolve(process.argv[3]||'.local-evidence/build7-touch');fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json'};
(async()=>{
 const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}try{const file=fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:412,height:860},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await context.addInitScript(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false});window.Capacitor={getPlatform:()=> 'android',isNativePlatform:()=>true,Plugins:{}};window.__touchTrace=[];for(const type of ['pointerdown','touchstart','touchend','mousedown','mouseup','click'])document.addEventListener(type,e=>{const target=e.target.closest?.('[data-tm-click]');const row={type,target:target?.getAttribute('data-tm-click'),tag:e.target.tagName,trusted:e.isTrusted,x:e.changedTouches?.[0]?.clientX||e.clientX,y:e.changedTouches?.[0]?.clientY||e.clientY};window.__touchTrace.push(row);setTimeout(()=>row.prevented=e.defaultPrevented,0);},true);});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
 await page.goto(origin);await page.waitForTimeout(3500);
 console.log('initial',await page.evaluate(()=>({screen:typeof OB!=='undefined'&&OB?.screen,buttons:[...document.querySelectorAll('#ob-root button')].map(x=>({text:x.innerText,action:x.getAttribute('data-tm-click')}))})),errors);
 const results=[];
 async function tap(action){const el=page.locator(`[data-tm-click="${action}"]`).first();await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();if(!b)throw Error('missing '+action);const before=await page.evaluate(()=>({screen:OB?.screen,lang:S.settings.lang}));await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(350);const after=await page.evaluate(()=>({screen:OB?.screen,lang:S.settings.lang,busy:OB?._signingInFlow,dialog:document.querySelector('.sb.open')?.id}));results.push({action,before,after,point:[b.x+b.width/2,b.y+b.height/2]});console.log(results[results.length-1]);}
 await tap('obToggleLang()');await tap("obSetLang('zh')");await tap('obToggleLang()');await tap("obSetLang('en')");
 await page.evaluate(()=>{window.__signInCalls=0;window.fbConfigured=()=>true;window.signIn=async()=>{window.__signInCalls++;return null;};});
 await tap('obSignIn()');await tap('obNoLogin()');await tap("obGo('biz')");
 await page.screenshot({path:path.join(out,'baseline.png')});
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({root,errors,results,trace:await page.evaluate(()=>window.__touchTrace)},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

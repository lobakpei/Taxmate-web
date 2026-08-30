'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const artifact=path.join(root,'.hosting-build','sync-runtime-browser');
const evidence=path.resolve(process.env.TAXMATE_SYNC_RUNTIME_EVIDENCE||path.join(root,'.sync-runtime-browser-evidence'));
const resultPath=path.join(evidence,'sync-runtime-browser-result.json');
const currentCache=require('../../src/core/versions').VERSIONS.PWA_CACHE_VERSION;
const oldCache='taxmate-test-old-shell';
const pendingRaw=' {"version":1,"items":[{"kind":"partnership-entry","key":"partnership-entry:owner:biz:pending-1","ownerUid":"owner","code":"TESTBIZ1","record":{"id":"pending-1","updatedAt":1},"status":"waiting"}],"lastSuccessAt":0}\r\n';
const cases=[],externalRequests=[],sentryRequests=[],contexts=new Set(),servers=new Set(),profiles=new Set();
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
function equal(actual,expected,message){assert.equal(actual,expected,message);assertions++;}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitFor(fn,message,timeout=15000){const started=Date.now();let last;while(Date.now()-started<timeout){try{last=await fn();if(last)return last;}catch(error){last=error.message;}await sleep(150);}throw new Error(`${message}; last=${String(last)}`);}
function chromePath(){for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'])if(candidate&&fs.existsSync(candidate))return candidate;throw new Error('Installed Chrome not found');}

function prepareArtifact(){
  const build=spawnSync(process.execPath,['scripts/build-hosting.js','production','sync-runtime-browser'],{cwd:root,encoding:'utf8'});
  if(build.status!==0)throw new Error(`Hosting artifact build failed: ${build.stdout||''}${build.stderr||''}`);
  const htmlPath=path.join(artifact,'index.html');let html=fs.readFileSync(htmlPath,'utf8');
  html=html.replace(/<script[^>]+https:\/\/[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<link[^>]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi,'');
  html=html.replace(/<noscript><link[^>]+https:\/\/fonts\.googleapis\.com[^>]*><\/noscript>\s*/gi,'');
  fs.writeFileSync(htmlPath,html);
  fs.writeFileSync(path.join(artifact,'firebase-environment.js'),"'use strict';\nwindow.TAXMATE_FIREBASE_ENVIRONMENT=Object.freeze({firebaseConfig:Object.freeze({}),hosts:Object.freeze([]),appCheckKey:''});\n");
  fs.writeFileSync(path.join(artifact,'src','app','sentry-bootstrap.js'),"'use strict';\nwindow.__TAXMATE_SENTRY_STATE__=Object.freeze({enabled:false,reason:'automated_browser',sdkRequested:false});\n");
}

function oldWorkerSource(){return `'use strict';\nself.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));\nself.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));\nself.addEventListener('message',event=>{if(event.data==='identity'&&event.ports[0])event.ports[0].postMessage('old-worker');});\n`;}

function startServer(port,initialMode='normal'){
  let mode=initialMode;
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8'};
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/__mode'){
      mode=url.searchParams.get('value')||'normal';res.writeHead(204,{'cache-control':'no-store'}).end();return;
    }
    if(url.pathname==='/sw.js'&&mode==='old-worker'){
      res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-cache'}).end(oldWorkerSource());return;
    }
    if(url.pathname==='/src/core/sync.js'&&mode==='mixed'){
      const source=fs.readFileSync(path.join(artifact,'src/core/sync.js'),'utf8')+"\n;delete TaxMateSync.API_VERSION;delete TaxMateSync.normalizeOutbox;delete TaxMateSync.emptyOutbox;\n";
      res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}).end(source);return;
    }
    if(url.pathname==='/src/core/sync.js'&&(mode==='missing'||mode==='partial')){
      res.writeHead(404,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}).end('missing');return;
    }
    if(url.pathname==='/src/core/sync.js'&&mode==='html-sync'){
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(fs.readFileSync(path.join(artifact,'index.html')));return;
    }
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).replace(/^\/+/,''),target=path.resolve(artifact,relative);
    if(!target.startsWith(path.resolve(artifact)+path.sep)||!fs.existsSync(target)){res.writeHead(404,{'content-type':'text/plain'}).end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':relative==='sw.js'?'no-cache':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:"});fs.createReadStream(target).pipe(res);
  });
  servers.add(server);
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve({server,setMode:async value=>{await fetch(`http://127.0.0.1:${port}/__mode?value=${encodeURIComponent(value)}`);mode=value;}}));});
}

async function launch(port,options={}){
  const profile=options.profile||path.join(os.tmpdir(),`tm-sync-${port}-${Date.now().toString(36)}`),raw=Object.prototype.hasOwnProperty.call(options,'raw')?options.raw:pendingRaw;
  profiles.add(profile);
  const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:chromePath(),viewport:{width:390,height:844},serviceWorkers:'allow'});contexts.add(context);context.on('close',()=>contexts.delete(context));
  if(options.seed!==false)await context.addInitScript(value=>{localStorage.setItem('taxmateuk_sync_outbox_v1',value);localStorage.setItem('tmOnboardDone','1');localStorage.setItem('taxmateuk_analytics_consent','denied');},raw);
  if(options.offline)await context.setOffline(true);
  context.on('request',request=>{const url=request.url();if(/^https:\/\/[^/]*(?:sentry|ingest)/i.test(url)||/\.ingest\.[^/]*sentry\.io/i.test(url))sentryRequests.push(url);if(/^https?:\/\//.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(url))externalRequests.push(url);});
  await context.route('**/*',async route=>{const url=route.request().url();if(/^https?:\/\//.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(url)){await route.abort('blockedbyclient');return;}await route.continue();});
  const page=context.pages()[0]||await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`console:${message.text()}`);});await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});try{await page.waitForFunction(()=>typeof window.loadSyncOutbox==='function',null,{timeout:15000});}catch(error){throw new Error(`app runtime did not load on ${port}: ${JSON.stringify(errors)}; ${error.message}`);}return{context,page,errors,profile};
}

async function runtimeCase(name,port,mode,raw,expectedReason){
  process.stdout.write(`START ${name}\n`);
  const control=await startServer(port,mode),browser=await launch(port,{raw}),diagnostic=await browser.page.evaluate(()=>eval("({runtime:{...SYNC_RUNTIME},status:syncStatus(),raw:localStorage.getItem(SYNC_OUTBOX_KEY),outbox:SYNC_OUTBOX})"));
  equal(diagnostic.runtime.blocked,true,`${name}: runtime is fail-closed`);equal(diagnostic.runtime.reason,expectedReason,`${name}: stable reason`);equal(diagnostic.status.state,'update-required',`${name}: never reports Synced`);equal(diagnostic.raw,raw,`${name}: original outbox bytes preserved`);equal(diagnostic.outbox,null,`${name}: no in-memory empty outbox substitution`);cases.push({name,status:'PASS',diagnostic:{runtime:diagnostic.runtime,status:diagnostic.status,rawSha256:sha(diagnostic.raw),rawBytes:Buffer.byteLength(diagnostic.raw)}});await browser.context.close();await new Promise(resolve=>control.server.close(resolve));servers.delete(control.server);process.stdout.write(`PASS ${name}\n`);
}

async function controllerIdentity(page){return page.evaluate(()=>new Promise(resolve=>{if(!navigator.serviceWorker.controller){resolve(null);return;}const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),500);channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data);};navigator.serviceWorker.controller.postMessage('identity',[channel.port2]);}));}

async function serviceWorkerLifecycle(){
  process.stdout.write('START service-worker-atomic-offline\n');
  let port=4285,control=await startServer(port,'old-worker'),browser=await launch(port),page=browser.page;
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('old-worker-ready-timeout')),10000))]);});await page.evaluate(async cacheName=>{const cache=await caches.open(cacheName);await cache.put('/old-sentinel',new Response('old-worker'));},oldCache);process.stdout.write('  old worker ready\n');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:10000});
  equal(await controllerIdentity(page),'old-worker','legacy worker controls the installed PWA before update');
  check((await page.evaluate(()=>caches.keys())).includes(oldCache),'legacy cache exists before update');
  await control.setMode('partial');
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});await sleep(1800);process.stdout.write('  partial update attempted\n');
  equal(await controllerIdentity(page),'old-worker','partial essential precache cannot replace the active worker');
  const failedKeys=await page.evaluate(()=>caches.keys());check(failedKeys.includes(oldCache),'failed install retains prior coherent cache');equal(failedKeys.includes(currentCache),false,'failed install deletes incomplete new cache');
  await browser.context.close();await new Promise(resolve=>control.server.close(resolve));servers.delete(control.server);

  port=4286;control=await startServer(port,'normal');browser=await launch(port);page=browser.page;
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('candidate-worker-ready-timeout')),15000))]);});process.stdout.write('  coherent update installed\n');
  const installedKeys=await waitFor(async()=>{const keys=await page.evaluate(()=>caches.keys());return keys.includes(currentCache)?keys:null;},'coherent worker did not finish cache activation');check(installedKeys.includes(currentCache),'complete candidate cache activates');equal(installedKeys.includes(oldCache),false,'fresh coherent origin contains no stale cache');
  const productContentCached=await page.evaluate(async cacheName=>!!(await (await caches.open(cacheName)).match('/src/core/product-content.js')) ,currentCache);check(productContentCached,'TaxMateLegal product-content runtime is in the installed atomic cache');
  const coldProfile=browser.profile;await browser.context.close();browser=await launch(port,{profile:coldProfile,seed:false,offline:true});page=browser.page;
  const offline=await page.evaluate(()=>eval("({runtime:{...SYNC_RUNTIME},raw:localStorage.getItem(SYNC_OUTBOX_KEY),status:syncStatus(),controller:!!navigator.serviceWorker.controller,legal:typeof TaxMateLegal==='object'&&typeof TaxMateLegal.helpHtml==='string'})"));equal(offline.runtime.blocked,false,'cold offline reopen uses coherent app and sync runtime');equal(offline.raw,pendingRaw,'cold offline reopen preserves exact pending outbox bytes');check(offline.controller,'cold offline reopen is service-worker controlled without an online controlled reload');check(offline.legal,'cold offline reopen has the TaxMateLegal product-content runtime');
  const assetFallback=await page.evaluate(async()=>{try{const response=await fetch('/missing-runtime.json');return{resolved:true,status:response.status,type:response.headers.get('content-type'),text:(await response.text()).slice(0,30)};}catch(error){return{resolved:false,name:error.name};}});check(!assetFallback.resolved||(!/text\/html/i.test(String(assetFallback.type||''))&&!/^\s*<!doctype html/i.test(String(assetFallback.text||''))),'offline JSON request never receives index HTML');
  await browser.context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));equal(await page.evaluate(()=>localStorage.getItem('taxmateuk_sync_outbox_v1')),pendingRaw,'reconnect alone cannot discard or rewrite a pending outbox');
  const acknowledged=await page.evaluate(()=>eval("(()=>{const operation=SYNC_OUTBOX.items[0];SYNC_OUTBOX=TaxMateSync.acknowledge(SYNC_OUTBOX,operation.key,Date.now(),operation);const persisted=persistSyncOutbox();return{persisted,items:SYNC_OUTBOX.items.length,stored:JSON.parse(localStorage.getItem(SYNC_OUTBOX_KEY))};})()"));check(acknowledged.persisted,'ACK persists through the production outbox writer');equal(acknowledged.items,0,'ACK removes only the acknowledged pending operation');equal(acknowledged.stored.items.length,0,'stored outbox reflects the acknowledged operation');check(acknowledged.stored.lastSuccessAt>0,'ACK records a successful sync timestamp');
  cases.push({name:'service-worker-atomic-offline',status:'PASS',failedKeys,installedKeys,productContentCached,offline,assetFallback,rawSha256:sha(pendingRaw),acknowledged:{persisted:acknowledged.persisted,items:acknowledged.items,lastSuccessAt:acknowledged.stored.lastSuccessAt}});await browser.context.close();await new Promise(resolve=>control.server.close(resolve));servers.delete(control.server);process.stdout.write('PASS service-worker-atomic-offline\n');
}

(async()=>{
  fs.mkdirSync(evidence,{recursive:true});prepareArtifact();
  await runtimeCase('mixed-version-cache',4280,'mixed',pendingRaw,'dependency-mismatch');
  await runtimeCase('missing-sync-js',4281,'missing',pendingRaw,'dependency-mismatch');
  await runtimeCase('html-returned-as-sync-js',4282,'html-sync',pendingRaw,'dependency-mismatch');
  await runtimeCase('corrupt-outbox',4283,'normal','{not-json','outbox-format');
  await runtimeCase('legacy-outbox',4284,'normal','[{"kind":"legacy","id":"preserve"}]','outbox-format');
  await serviceWorkerLifecycle();
  equal(externalRequests.length,0,'browser acceptance emitted zero production requests');equal(sentryRequests.length,0,'browser acceptance emitted zero Sentry requests');
  const sourceSha256={app:sha(fs.readFileSync(path.join(root,'src/app/app.js'))),sync:sha(fs.readFileSync(path.join(root,'src/core/sync.js'))),sw:sha(fs.readFileSync(path.join(root,'sw.js')))},hostingSha256={app:sha(fs.readFileSync(path.join(artifact,'src/app/app.js'))),sync:sha(fs.readFileSync(path.join(artifact,'src/core/sync.js'))),sw:sha(fs.readFileSync(path.join(artifact,'sw.js')))};equal(sourceSha256.app,hostingSha256.app,'app.js source hash equals final Hosting artifact');equal(sourceSha256.sync,hostingSha256.sync,'sync.js source hash equals final Hosting artifact');equal(sourceSha256.sw,hostingSha256.sw,'sw.js source hash equals final Hosting artifact');
  const result={status:'PASS',generatedAt:new Date().toISOString(),assertions,cases,externalRequests,sentryRequests,identity:require('../../src/core/versions').VERSIONS,sourceSha256,hostingSha256};fs.writeFileSync(resultPath,JSON.stringify(result,null,2));process.stdout.write(`SYNC_RUNTIME_BROWSER_PASS assertions=${assertions}\n`);
})().catch(error=>{fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(resultPath,JSON.stringify({status:'FAIL',generatedAt:new Date().toISOString(),assertions,cases,externalRequests,sentryRequests,error:error.stack||String(error)},null,2));console.error(error.stack||error);process.exitCode=1;}).finally(async()=>{for(const context of [...contexts])try{await context.close();}catch(_){}for(const server of [...servers])await new Promise(resolve=>server.close(resolve));for(const profile of profiles)try{fs.rmSync(profile,{recursive:true,force:true});}catch(_){};});

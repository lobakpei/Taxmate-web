'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Sync=require('../../src/core/sync');

const app=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../../sw.js'),'utf8');
const start=app.indexOf('let SYNC_OUTBOX_KEY=null;');
const end=app.indexOf('let CLOUD =',start);
if(start<0||end<0)throw new Error('Unable to locate production outbox loader');
const loaderSource=app.slice(start,end);

function executeLoader(options={}){
  const runtime=Object.prototype.hasOwnProperty.call(options,'runtime')?options.runtime:Sync;
  const raw=Object.prototype.hasOwnProperty.call(options,'raw')?options.raw:null;
  let writes=0,stored=raw;
  const key='taxmateuk_account_v1:local:sync-outbox';
  const context=vm.createContext({
    TaxMateSync:runtime,
    Blob,
    localStorage:{
      getItem:value=>value===key?stored:null,
      setItem:(key,value)=>{writes++;stored=String(value);}
    }
  });
  vm.runInContext(`${loaderSource}\nSYNC_OUTBOX_KEY=${JSON.stringify(key)};SYNC_OUTBOX=loadSyncOutbox();`,context,{filename:'src/app/app.js'});
  const snapshot=vm.runInContext('({runtime:{...SYNC_RUNTIME},outbox:SYNC_OUTBOX})',context);
  return{...snapshot,writes,stored};
}

test('mixed-version TaxMateSync fails closed instead of throwing TypeError',()=>{
  const pending='{"version":1,"items":[{"key":"partnership-entry:owner:biz:record","kind":"partnership-entry","status":"pending"}],"lastSuccessAt":0}';
  const legacy={...Sync};delete legacy.API_VERSION;delete legacy.normalizeOutbox;delete legacy.emptyOutbox;
  const result=executeLoader({runtime:legacy,raw:pending});
  assert.equal(result.runtime.blocked,true);
  assert.equal(result.runtime.reason,'dependency-mismatch');
  assert.equal(result.outbox,null);
  assert.equal(result.stored,pending);
  assert.equal(result.writes,0);
});

test('missing TaxMateSync is handled as update-required and preserves pending bytes',()=>{
  const pending=' {"version":1,"items":[],"lastSuccessAt":0}\r\n';
  const result=executeLoader({runtime:undefined,raw:pending});
  assert.equal(result.runtime.reason,'dependency-mismatch');
  assert.equal(result.runtime.storedOutboxBytes,Buffer.byteLength(pending));
  assert.equal(result.stored,pending);
  assert.equal(result.writes,0);
});

test('corrupt and legacy outbox formats remain byte-exact and cannot become an empty outbox',()=>{
  for(const raw of ['{broken-json','[{"kind":"legacy","id":"keep"}]','null','{"version":1,"items":[{"unexpected":"record"}],"lastSuccessAt":0}']){
    const result=executeLoader({raw});
    assert.equal(result.runtime.blocked,true,raw);
    assert.equal(result.runtime.reason,'outbox-format',raw);
    assert.equal(result.outbox,null,raw);
    assert.equal(result.stored,raw,raw);
    assert.equal(result.writes,0,raw);
  }
});

test('valid pending outbox remains available without changing its stored representation',()=>{
  const pending='{"version":1,"items":[{"kind":"personal-state","key":"personal-state:uid","uid":"uid","status":"waiting"}],"lastSuccessAt":0}';
  const result=executeLoader({raw:pending});
  assert.equal(result.runtime.blocked,false);
  assert.equal(result.outbox.items.length,1);
  assert.equal(result.stored,pending);
  assert.equal(result.writes,0);
});

test('app guards every outbox write and convergence path behind the runtime lock',()=>{
  assert.match(app,/if\(SYNC_RUNTIME\.blocked\|\|!SYNC_OUTBOX\)\{renderSyncStatus\(\);return false;\}/);
  assert.match(app,/state:'update-required'[\s\S]{0,160}Local data is safe/);
  assert.match(app,/function flushSyncOutbox\(reason\)\{\s*if\(ACCOUNT_TRANSITION_PENDING\|\|CLOUD\.deletionBlocked\|\|CLOUD\.controlsCached\|\|CLOUD\.firstSyncBlocked\)[\s\S]{0,240}if\(SYNC_RUNTIME\.blocked\)/);
  assert.doesNotMatch(app,/CLOUD\.boundaryBlocked|ownership-quarantine|accountBoundaryIndex/);
  assert.match(app,/await user\.getIdToken\(\);\s*if\(typeof navigator!==['"]undefined['"]&&navigator\.onLine===false\)\{renderSyncStatus\(\);break;\}\s*await sendSyncOperation\(operation\)/);
  assert.match(app,/catch\(error\)\{\s*if\(typeof navigator!==['"]undefined['"]&&navigator\.onLine===false\)\{renderSyncStatus\(\);break;\}\s*SYNC_OUTBOX=TaxMateSync\.markAttempt/);
  assert.match(app,/function startUserSync\(u,options=\{\}\)\{\s*if\(ACCOUNT_TRANSITION_PENDING\|\|CLOUD\.deletionBlocked\|\|CLOUD\.controlsCached\)[\s\S]{0,260}if\(SYNC_RUNTIME\.blocked\)/);
  assert.match(app,/if\(CLOUD\.controlsCached\)\{refreshCachedAccountControls\(\);return;\}scheduleOutboxFlush\(0,'online'\)/);
  assert.doesNotMatch(app,/catch\(_\)\{return TaxMateSync\.emptyOutbox\(\);\}/);
});

test('service worker enforces coherent atomic shell, safe online repair and navigation-only HTML fallback',()=>{
  assert.match(sw,/await c\.addAll\(requests\)/);
  assert.match(sw,/await caches\.delete\(CACHE\);\s*throw error/);
  assert.match(sw,/invalid-essential-runtime-response/);
  assert.match(sw,/const isNavigation = e\.request\.mode === 'navigate'/);
  assert.match(sw,/if \(isNavigation\)/);
  assert.match(sw,/if \(essentialPath\)[\s\S]{0,180}if \(cached\) return cached/);
  assert.match(sw,/if \(essentialPath\)[\s\S]{0,520}const res = await fetch\(e\.request\)[\s\S]{0,260}type\.includes\('text\/html'\)[\s\S]{0,180}await c\.put\(url\.pathname, res\.clone\(\)\)/);
  assert.match(sw,/if \(essentialPath\)[\s\S]{0,900}catch \(error\) \{\s*return Response\.error\(\)/);
  assert.doesNotMatch(sw,/cached \|\| caches\.match\(['"]\.\/index\.html/);
  assert.doesNotMatch(sw,/SHELL\.map\([\s\S]{0,180}catch \(err\) \{ \/\* ignore individual failures \*\//);
});

test('every local index script is part of the atomic service-worker shell',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
  const shellMatch=sw.match(/const SHELL = (\[[\s\S]*?\]);/);
  assert.ok(shellMatch,'service-worker shell must be statically inspectable');
  const shell=new Set(vm.runInNewContext(shellMatch[1]));
  const localScripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map(match=>match[1])
    .filter(src=>!/^https?:\/\//i.test(src)&&!/^\/\//.test(src))
    .map(src=>new URL(src,'https://www.taxmate.uk/').pathname);
  assert.ok(localScripts.length>0,'index must expose local runtime scripts');
  for(const script of localScripts)assert.ok(shell.has(script),`${script} must be atomically precached`);
  assert.ok(shell.has('/src/core/product-content.js'),'TaxMateLegal runtime must be atomically precached');
});

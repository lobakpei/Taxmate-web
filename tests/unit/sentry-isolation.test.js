'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {VERSIONS}=require('../../src/core/versions');

const source=fs.readFileSync('src/app/sentry-bootstrap.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const productionEnvironment={firebaseConfig:{projectId:'production-project'},hosts:['www.taxmate.uk'],sentry:{enabled:true,environment:'production',loaderUrl:'https://js-de.sentry-cdn.com/95145fe82ff528333c69e34ee61f6d86.min.js'}};

function runtime({host='www.taxmate.uk',webdriver=false,environment=productionEnvironment}={}){
  const appended=[],initialised=[];
  const window={location:{hostname:host},navigator:{webdriver},TAXMATE_FIREBASE_ENVIRONMENT:environment,TaxMateCore:{VERSIONS},TaxMateTelemetry:{scrubSentryEvent:event=>event},Sentry:{init:options=>initialised.push(options)},document:{readyState:'complete',createElement:tag=>({tag}),head:{appendChild:node=>appended.push(node)},addEventListener(){throw new Error('unexpected listener');}},queueMicrotask:callback=>callback()};
  vm.runInNewContext(source,{window,Set,Object,String});
  return{window,appended,initialised};
}

test('actual app loads revision sync before every canonical Ltd module that depends on it',()=>{
  const revision=html.indexOf('src/core/revision-sync.js');assert.ok(revision>0);
  for(const file of ['company-ledger.js','company-remuneration.js','company-scenario.js','company-tax.js','company-workspace.js'])assert.ok(revision<html.indexOf(`src/core/${file}`),file);
});

test('loopback, emulator and automated browser runtimes never request the production Sentry loader',()=>{
  for(const options of [{host:'127.0.0.1'},{host:'localhost'},{environment:{...productionEnvironment,functionsOrigin:'http://127.0.0.1:5001'}},{webdriver:true}]){
    const result=runtime(options);assert.equal(result.appended.length,0,JSON.stringify(options));assert.equal(result.initialised.length,0,JSON.stringify(options));assert.equal(result.window.__TAXMATE_SENTRY_STATE__.enabled,false);
  }
});

test('production runtime requests and initialises Sentry with immutable release identity and privacy scrubber',()=>{
  const result=runtime();assert.equal(result.appended.length,1);assert.match(result.appended[0].src,/^https:\/\/js-de\.sentry-cdn\.com\//);assert.equal(result.appended[0].crossOrigin,'anonymous');assert.equal(typeof result.window.sentryOnLoad,'function');result.window.sentryOnLoad();assert.equal(result.initialised.length,1);
  const options=result.initialised[0];assert.equal(options.environment,'production');assert.equal(options.release,`taxmate-web@${VERSIONS.APP_VERSION}`);assert.equal(options.dist,VERSIONS.BUILD_ID);assert.deepEqual({...options.initialScope.tags},{app_version:VERSIONS.APP_VERSION,build_id:VERSIONS.BUILD_ID,pwa_cache:VERSIONS.PWA_CACHE_VERSION});assert.equal(options.sendDefaultPii,false);assert.equal(options.maxBreadcrumbs,0);assert.equal(options.beforeSend,result.window.TaxMateTelemetry.scrubSentryEvent);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/app/app.js','utf8');
function section(from,to){return app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));}
test('signed-out onboarding offers local setup and sign-in; authenticated Free/Pro retain account entry choices',()=>{
 for(const loggedIn of [false,true]){const c={cloudUser:()=>loggedIn?{uid:'fixture'}:null,OB:{},t:x=>x};vm.createContext(c);vm.runInContext(section('function obScrEntry()','function obIntentCopy'),c);const html=c.obScrEntry();assert.equal(html.includes("obGo('ltd-choice')"),loggedIn);assert.equal(html.includes('obStartPartnerSync()'),loggedIn);assert.equal(html.includes("obGo('login')"),!loggedIn);assert.ok(html.includes("obGo('biz')"));}
});
function signInHarness(configured,signIn){const c={OB:{screen:'login',loggedIn:false},fbConfigured:()=>configured,signIn,t:x=>x,obRender:()=>{},TaxMateOnboardingRoot:{open:()=>{}},obGo:s=>{c.OB.screen=s;}};vm.createContext(c);vm.runInContext(section('async function obSignIn()','function obNoLogin'),c);return c;}
test('missing Firebase SDK never counts as successful onboarding sign-in',async()=>{
 const c=signInHarness(false,async()=>{throw Error('must not run');});await c.obSignIn();assert.equal(c.OB.screen,'login');assert.equal(c.OB.loggedIn,false);assert.equal(c.OB._signingInFlow,false);assert.equal(c.OB._signInError,'ac.needNet');
});
test('initialization failure is visible inside onboarding and unlocks first-tap retry',async()=>{
 let calls=0;const c=signInHarness(true,async options=>{calls++;options.onError('Connection unavailable');return null;});await c.obSignIn();assert.equal(c.OB._signInError,'Connection unavailable');assert.equal(c.OB._signingInFlow,false);await c.obSignIn();assert.equal(calls,2);assert.equal(c.OB.screen,'login');
});
test('cancelled provider sign-in restores an operable login without a false error',async()=>{
 const c=signInHarness(true,async()=>null);await c.obSignIn();assert.equal(c.OB._signInError,'');assert.equal(c.OB._signingInFlow,false);assert.equal(c.OB.loggedIn,false);
});
test('canonical sign-in routes initialization errors to caller without opening a covered global sheet',async()=>{
 let notice=0,message='';const c={ensureFB:async()=>null,fbConfigured:()=>true,t:x=>x,showNotice:()=>notice++};vm.createContext(c);vm.runInContext(section('async function signIn(options={})','function restoreLocalViewAfterSignInCancel'),c);await c.signIn({onError:value=>message=value});assert.equal(message,'ac.needNet');assert.equal(notice,0);await c.signIn();assert.equal(notice,1);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/app/app.js','utf8');
function section(from,to){return app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));}
test('signed-out and authenticated users retain all three entry choices',()=>{
 for(const loggedIn of [false,true]){const c={cloudUser:()=>loggedIn?{uid:'fixture'}:null,OB:{},t:x=>x,obShell:(_,body)=>body,obProgress:()=>''};vm.createContext(c);vm.runInContext(section('function obScrEntry()','function obIntentCopy'),c);const html=c.obScrEntry();assert.ok(html.includes('obStartLtd()'));assert.ok(html.includes('obStartPartnerSync()'));assert.ok(html.includes("obGo('biz')"));}
});
function signInHarness(configured,signIn){const c={OB:{screen:'login',loggedIn:false},fbConfigured:()=>configured,signIn,t:x=>x,flowText:x=>x,obRender:()=>{},TaxMateOnboardingRoot:{open:()=>{}},obGo:s=>{c.OB.screen=s;}};vm.createContext(c);vm.runInContext(section('async function obSignIn()','function obNoLogin'),c);return c;}
test('missing Firebase SDK never counts as successful onboarding sign-in',async()=>{
 const c=signInHarness(false,async()=>{throw Error('must not run');});await c.obSignIn();assert.equal(c.OB.screen,'login');assert.equal(c.OB.loggedIn,false);assert.equal(c.OB._signingInFlow,false);assert.equal(c.OB._signInError,'ac.needNet');
});
test('initialization failure is visible inside onboarding and unlocks first-tap retry',async()=>{
 let calls=0;const c=signInHarness(true,async options=>{calls++;options.onError('Connection unavailable');return null;});await c.obSignIn();assert.equal(c.OB._signInError,'Connection unavailable');assert.equal(c.OB._signingInFlow,false);await c.obSignIn();assert.equal(calls,2);assert.equal(c.OB.screen,'login');
});
test('cancelled provider sign-in restores an operable login and explains cancellation',async()=>{
 const c=signInHarness(true,async()=>null);await c.obSignIn();assert.equal(c.OB._signInError,'signInCancelled');assert.equal(c.OB._signingInFlow,false);assert.equal(c.OB.loggedIn,false);
});
test('required sign-in failure stays on the screen containing its error and Back remains available',async()=>{
 const c=signInHarness(true,async options=>{options.onError('Connection unavailable');return null;});c.OB._authReturnScreen='entry';await c.obSignIn();assert.equal(c.OB.screen,'entry');assert.equal(c.OB._authReturnScreen,'entry');assert.equal(c.OB._intentError,'Connection unavailable');
});
test('canonical sign-in routes initialization errors to caller without opening a covered global sheet',async()=>{
 let notice=0,message='';const c={ensureFB:async()=>null,fbConfigured:()=>true,t:x=>x,showNotice:()=>notice++};vm.createContext(c);vm.runInContext(section('async function signIn(options={})','function restoreLocalViewAfterSignInCancel'),c);await c.signIn({onError:value=>message=value});assert.equal(message,'ac.needNet');assert.equal(notice,0);await c.signIn();assert.equal(notice,1);
});

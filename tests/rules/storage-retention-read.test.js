'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc}=require('firebase/firestore');
const {ref,uploadBytes,getDownloadURL,listAll}=require('firebase/storage');
const ready=!!process.env.FIRESTORE_EMULATOR_HOST&&!!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const run=ready?test:test.skip,root=path.join(__dirname,'../..');
let env;
if(ready)test.before(async()=>{
  for(const host of [process.env.FIRESTORE_EMULATOR_HOST,process.env.FIREBASE_STORAGE_EMULATOR_HOST])assert.match(host,/^127\.0\.0\.1:\d+$/);
  const projectId=process.env.GCLOUD_PROJECT||'demo-taxmate';assert.match(projectId,/^demo-/);
  env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync(path.join(root,'firestore.rules'),'utf8')},storage:{rules:fs.readFileSync(process.env.TAXMATE_STORAGE_RULES_BASELINE||path.join(root,'storage.rules'),'utf8')}});
});
test.after(async()=>{if(env)await env.cleanup();});
const promo={promotionAccess:{plusPermanent:true,proPermanent:true,plusExpiresAt:0,proExpiresAt:0}};
const due={deleteAfterAt:1};
const cases=[
  {id:'legacy-free',get:true,list:true},
  {id:'legacy-promo',ent:promo,get:true,list:true},
  {id:'legacy-paid',ent:{paidAccess:{plusExpiresAt:4102444800000}},get:true,list:true},
  {id:'running',ret:{status:'running',epochString:'2'},epoch:'2',get:false,list:false},
  {id:'failed',ret:{status:'failed',epochString:'2'},epoch:'2',get:false,list:false},
  {id:'complete-missing',ret:{status:'complete',epochString:'2'},get:false,list:true},
  {id:'complete-stale',ret:{status:'complete',epochString:'2'},epoch:'1',get:false,list:true},
  {id:'complete-current',ret:{status:'complete',epochString:'2'},epoch:'2',get:true,list:true},
  {id:'warning-current',ret:{status:'complete_with_warnings',epochString:'2'},epoch:'2',get:true,list:true},
  {id:'warning-stale',ret:{status:'complete_with_warnings',epochString:'2'},epoch:'1',get:false,list:true},
  {id:'purge-required',ent:{...promo,accountRetention:{purgeRequired:true}},get:false,list:false},
  {id:'expired-free',ent:{paidAccess:{},accountRetention:due},get:false,list:false},
  {id:'expired-renewed',ent:{paidAccess:{plusExpiresAt:4102444800000},accountRetention:due},get:true,list:true},
  {id:'expired-promo',ent:{...promo,paidAccess:{},accountRetention:due},get:true,list:true},
  {id:'expired-grace',ent:{paidAccess:{},lastPaidTier:'plus',graceUntil:4102444800000,accountRetention:due},get:true,list:true},
  {id:'cutoff-complete',ent:{paidAccess:{},accountRetention:{...due,lastDeletionCutoffDate:'2026-04-05',scheduledDeletionDate:'2026-04-05'}},get:true,list:true}
];
for(const row of cases)run('receipt read fence: '+row.id,async()=>{
  const uid='storage-read-'+row.id;
  await env.withSecurityRulesDisabled(async context=>{
    if(row.ent)await setDoc(doc(context.firestore(),`users/${uid}/entitlements/current`),row.ent);
    if(row.ret)await setDoc(doc(context.firestore(),`users/${uid}/retention/current`),row.ret);
    await uploadBytes(ref(context.storage(),`receipts/${uid}/receipt.jpg`),new Uint8Array([255,216,255,217]),{contentType:'image/jpeg',...(row.epoch?{customMetadata:{retentionEpoch:row.epoch}}:{})});
  });
  const owner=env.authenticatedContext(uid).storage();
  await (row.list?assertSucceeds:assertFails)(listAll(ref(owner,`receipts/${uid}`)));
  await (row.get?assertSucceeds:assertFails)(getDownloadURL(ref(owner,`receipts/${uid}/receipt.jpg`)));
  if(row.get)for(const context of [env.authenticatedContext('different-owner'),env.unauthenticatedContext()]){
    await assertFails(listAll(ref(context.storage(),`receipts/${uid}`)));
    await assertFails(getDownloadURL(ref(context.storage(),`receipts/${uid}/receipt.jpg`)));
  }
});

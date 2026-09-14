'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc}=require('firebase/firestore');
const {ref,uploadBytes,getDownloadURL,listAll,deleteObject}=require('firebase/storage');
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
  {id:'missing-control',get:false,list:false,noEnt:true},
  {id:'unmigrated-entitlement',ent:promo,get:false,list:false,omitStorageControl:true},
  {id:'existing-object-missing-epochs',ent:promo,get:false,list:true,omitObjectControl:true},
  {id:'legacy-promo',ent:promo,get:true,list:true},
  {id:'legacy-paid',ent:{paidAccess:{plusExpiresAt:4102444800000}},get:true,list:true},
  {id:'reset-deleting',resetStatus:'deleting',get:false,list:false},
  {id:'reset-quarantined',resetStatus:'billing_quarantined',get:false,list:false},
  {id:'reset-failed',resetStatus:'failed',get:false,list:false},
  {id:'reset-stale',resetEpoch:2,objectResetEpoch:1,get:false,list:true},
  {id:'reset-current',resetEpoch:2,objectResetEpoch:2,get:true,list:true},
  {id:'running',controlStatus:'purging',controlEpoch:2,objectRetentionEpoch:2,get:false,list:false},
  {id:'failed',controlStatus:'failed',controlEpoch:2,objectRetentionEpoch:2,get:false,list:false},
  {id:'complete-stale',controlStatus:'complete',controlEpoch:2,objectRetentionEpoch:1,get:false,list:true},
  {id:'complete-current',controlStatus:'complete',controlEpoch:2,objectRetentionEpoch:2,get:true,list:true},
  {id:'warning-current',controlStatus:'complete_with_warnings',controlEpoch:2,objectRetentionEpoch:2,get:true,list:true},
  {id:'warning-stale',controlStatus:'complete_with_warnings',controlEpoch:2,objectRetentionEpoch:1,get:false,list:true},
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
    const resetEpoch=Number(row.resetEpoch||0),retentionEpoch=Number(row.controlEpoch||0),accountRetention={controlStatus:row.controlStatus||'complete',lastRetentionEpoch:retentionEpoch,lastRetentionEpochString:String(retentionEpoch),...(row.ent&&row.ent.accountRetention||{})};
    if(!row.noEnt)await setDoc(doc(context.firestore(),`users/${uid}/entitlements/current`),row.omitStorageControl?{...(row.ent||{})}:{...(row.ent||{}),accountResetStatus:row.resetStatus||'complete',accountResetEpoch:resetEpoch,accountResetEpochString:String(resetEpoch),accountRetention});
    await uploadBytes(ref(context.storage(),`receipts/${uid}/receipt.jpg`),new Uint8Array([255,216,255,217]),row.omitObjectControl?{contentType:'image/jpeg'}:{contentType:'image/jpeg',customMetadata:{retentionEpoch:String(row.objectRetentionEpoch??retentionEpoch),accountResetEpoch:String(row.objectResetEpoch??resetEpoch)}});
  });
  const owner=env.authenticatedContext(uid).storage();
  await (row.list?assertSucceeds:assertFails)(listAll(ref(owner,`receipts/${uid}`)));
  await (row.get?assertSucceeds:assertFails)(getDownloadURL(ref(owner,`receipts/${uid}/receipt.jpg`)));
  if(row.get)for(const context of [env.authenticatedContext('different-owner'),env.unauthenticatedContext()]){
    await assertFails(listAll(ref(context.storage(),`receipts/${uid}`)));
    await assertFails(getDownloadURL(ref(context.storage(),`receipts/${uid}/receipt.jpg`)));
  }
});
run('missing and server-deleted receipt paths are physically absent while client reads fail closed',async()=>{
  const uid='storage-read-missing-object',deletedPath=`receipts/${uid}/deleted.jpg`,neverPath=`receipts/${uid}/never-created.jpg`;
  await env.withSecurityRulesDisabled(async context=>{
    await setDoc(doc(context.firestore(),`users/${uid}/entitlements/current`),{...promo,accountResetStatus:'complete',accountResetEpoch:0,accountResetEpochString:'0',accountRetention:{controlStatus:'complete',lastRetentionEpoch:0,lastRetentionEpochString:'0'}});
    const object=ref(context.storage(),deletedPath);
    await uploadBytes(object,new Uint8Array([255,216,255,217]),{contentType:'image/jpeg',customMetadata:{retentionEpoch:'0',accountResetEpoch:'0'}});
    await deleteObject(object);
    for(const objectPath of [deletedPath,neverPath])await assert.rejects(getDownloadURL(ref(context.storage(),objectPath)),error=>error&&error.code==='storage/object-not-found');
  });
  const owner=env.authenticatedContext(uid).storage(),other=env.authenticatedContext('different-owner').storage();
  for(const objectPath of [deletedPath,neverPath]){
    await assert.rejects(getDownloadURL(ref(owner,objectPath)),error=>error&&error.code==='storage/unauthorized');
    await assert.rejects(getDownloadURL(ref(other,objectPath)),error=>error&&error.code==='storage/unauthorized');
  }
});

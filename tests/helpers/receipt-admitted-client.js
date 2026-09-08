'use strict';
// Test adapter for the real two-step protocol. Only admission uses Admin SDK;
// the payload + consumption batch is sent by the authenticated Rules client.
const assert=require('node:assert/strict');
const Rules=require('@firebase/rules-unit-testing'),Client=require('firebase/firestore');
const adminRequire=require('node:module').createRequire(require('node:path').join(__dirname,'../../functions/package.json'));
const {initializeApp,deleteApp}=adminRequire('firebase-admin/app'),{getFirestore}=adminRequire('firebase-admin/firestore');
const Admission=require('../../functions/receipt-admission');
const contexts=new WeakMap();let sequence=0;
async function initializeTestEnvironment(options){
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^(127\.0\.0\.1|localhost):\d+$/);
  assert.match(options.projectId,/^demo-/);
  const env=await Rules.initializeTestEnvironment(options),app=initializeApp({projectId:options.projectId},'admission-test-'+process.pid+'-'+(++sequence)),admin=getFirestore(app);
  const original=env.authenticatedContext.bind(env),cleanup=env.cleanup.bind(env);
  env.authenticatedContext=(uid,claims)=>{const context=original(uid,claims),firestore=context.firestore.bind(context);context.firestore=(...args)=>{const db=firestore(...args);contexts.set(db,{uid,admin});if(db._delegate)contexts.set(db._delegate,{uid,admin});return db;};return context;};
  env.cleanup=async()=>{await cleanup();await deleteApp(app);};return env;
}
async function setDoc(ref,payload,options){
  const context=contexts.get(ref.firestore);
  if(!context||!Admission.permittedTarget(context.uid,ref.path))return Client.setDoc(ref,payload,options);
  assert.equal(options,undefined,'Receipt admission binds a full replacement payload');
  let permit;try{permit=await Admission.prepareWrite({db:context.admin,uid:context.uid,target:ref.path,payload});}catch(error){error.code=error.message==='receipt_reference_unavailable'?'failed-precondition':'permission-denied';throw error;}
  const batch=Client.writeBatch(ref.firestore);batch.set(ref,payload);batch.delete(Client.doc(ref.firestore,permit.path));return batch.commit();
}
module.exports={initializeTestEnvironment,setDoc,rawSetDoc:Client.setDoc};

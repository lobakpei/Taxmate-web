'use strict';
const assert=require('node:assert/strict'),{initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getStorage}=require('firebase-admin/storage');
const Cleanup=require('../../functions/receipt-cleanup');
const [path,phase]=process.argv.slice(2),projectId='demo-taxmate';
for(const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'])assert.match(process.env[key]||'',/^127\.0\.0\.1:\d+$/);
initializeApp({projectId,storageBucket:projectId+'.appspot.com'});
// Abrupt exit, deliberately no SDK/lease/job cleanup. IPC keeps the paused
// worker alive until the parent has finished B's independent operations.
process.on('message',message=>{if(message.command==='crash')process.exit(77);});
Cleanup.cleanupReceipt({db:getFirestore(),bucket:getStorage().bucket(),path,queued:true,hooks:{[phase]:async()=>{process.send({phase,path});await new Promise(()=>{});}}}).catch(error=>{console.error(error);process.exit(1);});

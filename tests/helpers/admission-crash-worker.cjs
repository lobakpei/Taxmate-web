'use strict';
const assert=require('node:assert/strict'),{initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),Admission=require('../../functions/receipt-admission');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);
const [uid,target,photo]=process.argv.slice(2);initializeApp({projectId:'demo-taxmate'});
Admission.prepareWrite({db:getFirestore(),uid,target,payload:{id:'r4-draft',date:'2026-09-01',amount:12,createdAt:1,updatedAt:1,deviceId:'crashed',schemaVersion:5,receiptPath:photo}}).then(()=>process.exit(77)).catch(error=>{console.error(error);process.exit(1);});

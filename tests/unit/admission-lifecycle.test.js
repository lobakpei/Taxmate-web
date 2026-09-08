'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Life=require('../../functions/receipt-admission-lifecycle');
test('R4 cleanup identity only recognises original ordinary/meta/shared/LTD admission locations',()=>{
 for(const path of ['users/a/entries/e/receiptAdmissions/a','users/a/app/meta/receiptAdmissions/a','partnerships/p/entries/e/receiptAdmissions/a','users/a/receiptLtdAdmissions/current'])assert.equal(Life.identity(path,{uid:'a'}).uid,'a');
 for(const path of ['users/b/entries/e/receiptAdmissions/a','users/a/entitlements/current/receiptAdmissions/a','users/a/receiptLtdAdmissions/other','users/a/entries/e','receiptObjects/a/files/x'])assert.equal(Life.identity(path,{uid:'a'}),null);
});
test('R4 pending paid-write permissions follow Pro and promotion expiry, never convert Plus historical access into Pro writes',()=>{
 const at=1000;assert.equal(Life.pro({paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:1001},at),true);
 for(const ent of [{paidTier:'plus',subscriptionStatus:'active',currentPeriodEnd:2000},{paidTier:'pro',subscriptionStatus:'active',currentPeriodEnd:1000},{lastPaidTier:'pro',graceUntil:2000},{}])assert.equal(!!Life.pro(ent,at),false);
 assert.equal(Life.pro({promotionAccess:{proPermanent:true}},at),true);assert.equal(Life.pro({promotion:{tier:'pro',status:'active',expiresAt:null}},at),true);assert.equal(!!Life.pro({promotion:{tier:'pro',status:'active',expiresAt:1000}},at),false);
});
test('R4 UID cleanup queries ship explicit collection-group index definitions',()=>{
 const indexes=require('../../firestore.indexes.json');for(const group of ['receiptAdmissions','receiptLtdAdmissions','admissionPins'])assert.ok(indexes.fieldOverrides.some(v=>v.collectionGroup===group&&v.fieldPath==='uid'&&v.indexes.some(i=>i.queryScope==='COLLECTION_GROUP'&&i.order==='ASCENDING')));
});

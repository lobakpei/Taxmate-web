'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Access=require('../../src/core/company-access');

const endedAt=Date.UTC(2026,1,14,12);
const formerPro={subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:endedAt,serverVerifiedAt:endedAt};

test('UK tax-year retention ends after 5 April, not after a rolling number of months',()=>{
  assert.deepEqual(Access.taxYearRetentionBoundary(endedAt),{retainThroughDate:'2026-04-05',deleteOnDate:'2026-04-06',retainUntil:Date.UTC(2026,3,6)});
  const fifth=Access.decide({action:'read',snapshot:formerPro,now:Date.UTC(2026,3,5,12),hasExistingLtdData:true});
  assert.equal(fifth.allowed,true);
  assert.equal(fifth.mode,'retained_read_export');
  assert.equal(fifth.retention.retainThroughDate,'2026-04-05');
  const sixth=Access.decide({action:'read',snapshot:formerPro,now:Date.UTC(2026,3,6,0),hasExistingLtdData:true});
  assert.equal(sixth.allowed,false);
  assert.equal(sixth.reason,'tax_year_retention_ended');
});

test('access ending in 2026/27 remains readable through 5 April 2027',()=>{
  const end=Date.UTC(2026,8,5,12),snapshot={...formerPro,currentPeriodEnd:end,serverVerifiedAt:end};
  assert.equal(Access.retention(snapshot,Date.UTC(2027,3,5,12),true).state,'retained_read_only');
  assert.equal(Access.retention(snapshot,Date.UTC(2027,3,5,12),true).retainThroughDate,'2027-04-05');
  assert.equal(Access.retention(snapshot,Date.UTC(2027,3,6,12),true).state,'retention_ended');
});

test('old 24-month deleteAfter metadata cannot extend the new tax-year rule',()=>{
  const snapshot={...formerPro,ltdArchive:{startedAt:endedAt,deleteAfter:Date.UTC(2028,1,14,12)}};
  const decision=Access.decide({action:'full_backup',snapshot,now:Date.UTC(2026,3,6,12),hasExistingLtdData:true});
  assert.equal(decision.allowed,false);
  assert.equal(decision.retention.deleteOnDate,'2026-04-06');
});

test('missing access-end evidence fails closed instead of moving the deadline forward',()=>{
  const decision=Access.decide({action:'cloud_hydrate',snapshot:{subscriptionStatus:'inactive',paidTier:'free'},now:Date.UTC(2026,8,5,12),hasExistingLtdData:true});
  assert.equal(decision.allowed,false);
  assert.equal(decision.reason,'tax_year_retention_date_required');
});

test('active Pro remains fully available without a retention deadline',()=>{
  const now=Date.UTC(2026,8,5,12),snapshot={subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:now+86400000,serverVerifiedAt:now};
  const decision=Access.decide({action:'full_backup',snapshot,now,hasExistingLtdData:true});
  assert.equal(decision.allowed,true);
  assert.equal(decision.retention,undefined);
});

test('a later paid Plus expiry overrides the old Pro archive date, including legacy promotions',()=>{
  const at=Date.UTC(2026,8,5),snapshot={...formerPro,currentPeriodEnd:Date.UTC(2026,7,1),ltdArchive:{startedAt:endedAt}};
  assert.equal(Access.retention(snapshot,at,true).deleteOnDate,'2027-04-06');
  snapshot.currentPeriodEnd=endedAt;snapshot.promotion={status:'active',tier:'plus',expiresAt:Date.UTC(2026,7,1)};
  assert.equal(Access.retention(snapshot,at,true).deleteOnDate,'2027-04-06');
});

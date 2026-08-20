'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const Admin=require('../../scripts/manage-founder-promo');

test('Founder promo admin is locked to production and pending names have no invented values',()=>{
  assert.equal(Admin.PROJECT_ID,'taxmate-uk-2');
  assert.deepEqual(Admin.PENDING_CODES,['HKGER','EVRI','WORCESTER']);
});

test('Founder promo CREATE validates tier, duration and maximum without source edits',()=>{
  const config=Admin.createConfiguration(Admin.argumentsMap(['create','--code','HKGER','--tier','pro','--duration-days','90','--max-redemptions','20']),1000);
  assert.deepEqual(config,{code:'HKGER',tier:'pro',maxRedemptions:20,redemptionCount:0,active:true,durationDays:90});
  assert.throws(()=>Admin.createConfiguration(Admin.argumentsMap(['create','--code','EVRI','--tier','gold','--duration-days','30','--max-redemptions','1']),1000),/plus or pro/);
});

test('Firestore REST encoding uses timestamps for audit fields and integers for limits',()=>{
  const fields=Admin.encodeFields({createdAt:'2026-08-20T00:00:00.000Z',active:false,maxRedemptions:20});
  assert.equal(fields.createdAt.timestampValue,'2026-08-20T00:00:00.000Z');
  assert.equal(fields.active.booleanValue,false);
  assert.equal(fields.maxRedemptions.integerValue,'20');
});

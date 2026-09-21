'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const Admin=require('../../scripts/manage-founder-promo');

test('Founder promo admin is locked to production and pending names have no invented values',()=>{
  assert.equal(Admin.PROJECT_ID,'taxmate-uk-2');
  assert.deepEqual(Admin.PENDING_CODES,['HKGER','EVRI','WORCESTER']);
});

test('Founder promo CREATE validates tier, duration and maximum without source edits',()=>{
  const config=Admin.createConfiguration(Admin.argumentsMap(['create','--code','HKGER','--tier','pro','--starts-at','1970-01-01T00:00:00.000Z','--duration-days','90','--max-redemptions','20']),1000);
  assert.deepEqual(config,{code:'HKGER',tier:'pro',maxRedemptions:20,redemptionCount:0,active:true,startsAt:0,durationDays:90});
  const permanent=Admin.createConfiguration(Admin.argumentsMap(['create','--code','PERMANENT','--tier','pro','--starts-at','1970-01-01T00:00:00.000Z','--permanent','true','--max-redemptions','3']),1000);
  assert.equal(permanent.permanent,true);assert.equal(permanent.maxRedemptions,3);
  assert.throws(()=>Admin.createConfiguration(Admin.argumentsMap(['create','--code','EVRI','--tier','gold','--starts-at','1970-01-01T00:00:00.000Z','--duration-days','30','--max-redemptions','1']),1000),/plus or pro/);
});

test('Firestore REST encoding uses timestamps for audit fields and integers for limits',()=>{
  const fields=Admin.encodeFields({createdAt:'2026-08-20T00:00:00.000Z',active:false,maxRedemptions:20});
  assert.equal(fields.createdAt.timestampValue,'2026-08-20T00:00:00.000Z');
  assert.equal(fields.active.booleanValue,false);
  assert.equal(fields.maxRedemptions.integerValue,'20');
});

test('Founder promo unused fixed campaigns can be safely amended before launch',()=>{
  const current={code:'OLDPLUS',tier:'plus',startsAt:1788217200000,expiresAt:1798761600000,maxRedemptions:500,redemptionCount:0,active:true,configurationState:'configured'};
  const next=Admin.unusedFixedExpiryConfiguration(current,{'expires-at':'2027-02-01T00:00:00Z','max-redemptions':'200'},1788217200000);
  assert.equal(next.expiresAt,Date.parse('2027-02-01T00:00:00Z'));
  assert.equal(next.maxRedemptions,200);
  assert.throws(()=>Admin.unusedFixedExpiryConfiguration({...current,redemptionCount:1},{'expires-at':'2027-02-01T00:00:00Z'},1788217200000),/not an active unused/);
});

test('Founder admin exposes safe zero-redemption reschedule and the other lifecycle controls',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../scripts/manage-founder-promo.js'),'utf8');
  for(const command of ['listPromotions','promotionStatus','createPromotion','migratePending','amendUnusedPromotion','renameUnusedPromotion','reschedulePromotion','disablePromotion','revokeRedemption'])assert.match(source,new RegExp(command));
  assert.match(source,/delete:source\.name,currentDocument:\{updateTime:source\.updateTime\}/);
  assert.match(source,/currentDocument:\{updateTime:redemption\.updateTime\}/);
  assert.match(source,/Number\(current\.redemptionCount\)!==0/);
  assert.match(source,/patchPromotion\(code,\{startsAt,updatedAt:new Date\(now\)\.toISOString\(\)\},token,existing\.updateTime\)/);
});

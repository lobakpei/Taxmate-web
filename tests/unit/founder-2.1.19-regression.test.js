'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const History=require('../../src/core/company-profile-history');
const CompanyState=require('../../src/integration/ltd/company-state');
const Repository=require('../../src/integration/ltd/company-state-repository');
const LtdSync=require('../../src/core/ltd-sync');
const {CanonicalCompanyDriver}=require('../../src/integration/ltd/CanonicalCompanyDriver');
const {make,PRO_ENTITLEMENT}=require('../test-fixture');

const clone=value=>JSON.parse(JSON.stringify(value));
const beforeDate=Date.UTC(2026,8,3,12),effectiveDate=Date.UTC(2026,8,16,12);
function soleState(){
  const state=clone(make('existing').driver.state),profile=state.domain.companyProfiles[0],founder=profile.shareholders.find(item=>item.isAccountHolder);
  profile.shareholders=[{...founder,shares:100,ownershipBasisPoints:10000}];delete profile.profileRevisionHistory;delete profile.ownershipHistory;
  state.domain.companyProfiles[0]=History.ensureHistory(profile);CompanyState.validateState(state);return state;
}
function driverFor(state,now=beforeDate,onWrite){
  let persisted=clone(state);const repository=Repository.externalRepository({kind:'2.1.19-regression',load:()=>persisted,replace:next=>{persisted=clone(next);if(onWrite)onWrite(persisted);return persisted;}});
  return new CanonicalCompanyDriver({mode:'existing',repository,now:()=>now,entitlementSnapshot:PRO_ENTITLEMENT,deviceId:'2.1.19-regression'});
}
function futureChange(driver){const founder=driver.activeProfile().shareholders.find(item=>item.isAccountHolder);return driver.changeOwnership({effectiveDate:'2026-09-16',shareholders:[{...founder,shares:51},{id:'shareholder:gsd',name:'Gsd',shareClassId:'ordinary',shares:49,isAccountHolder:false}],reason:'Sold',evidenceRefs:['R45']});}
function envelopes(state){const ids=new Set(state.domain.entities.filter(item=>item.type==='limited_company').map(item=>item.id)),out=[];for(const [collection,records] of Object.entries(LtdSync.recordsForSync(state)))for(const record of records)out.push(LtdSync.envelope(collection,record,LtdSync.companyIdForRecord(collection,record,ids)));return out;}

test('Founder 100 to future 51/49 validates first, commits once, and remains 100 until 16 September',()=>{
  let writes=0;const driver=driverFor(soleState(),beforeDate,()=>writes++),before=JSON.stringify(driver.state);
  const rejected=driver.changeOwnership({effectiveDate:'2026-09-16',shareholders:[],reason:'Sold',evidenceRefs:['R45']});
  assert.equal(rejected.status,'field_error');assert.equal(writes,0);assert.equal(JSON.stringify(driver.state),before);
  const saved=futureChange(driver);assert.equal(saved.status,'ok');assert.equal(writes,1);
  const raw=driver.activeProfile(),history=raw.ownershipHistory,current=History.ownershipAtDate(raw,'2026-09-03'),scheduled=history.find(item=>item.effectiveFrom==='2026-09-16');
  assert.deepEqual(raw.shareholders.map(item=>item.ownershipBasisPoints),[5100,4900]);assert.deepEqual(current.shareholders.map(item=>item.ownershipBasisPoints),[10000]);assert.deepEqual(scheduled.shareholders.map(item=>item.ownershipBasisPoints),[5100,4900]);
  assert.equal(history.length,2);assert.equal(history[0].effectiveTo,'2026-09-16');assert.equal(history[1].effectiveTo,null);assert.equal(raw.profileRevisionHistory.length,1);assert.equal(raw.profileRevisionHistory[0].reason,'Sold');assert.deepEqual(raw.profileRevisionHistory[0].evidenceRefs,['R45']);
  assert.equal(driver.businessList().find(item=>item.businessType==='limited_company').share.percent,100);
  const live=driverFor(driver.state,effectiveDate);assert.equal(live.businessList().find(item=>item.businessType==='limited_company').share.percent,51);
});

test('second session restore, reload and re-login keep current, scheduled, open and history consistent',()=>{
  const first=driverFor(soleState());assert.equal(futureChange(first).status,'ok');const clean=make('fresh').driver.state,download=LtdSync.reconcile(clean,envelopes(first.state),'owner').downloads;
  const restored=CompanyState.migrate(LtdSync.applyDownloads(clean,download),beforeDate,'second-session');CompanyState.validateState(restored);
  for(const label of ['second session','reload','re-login']){const session=driverFor(restored,beforeDate),profile=session.activeProfile();assert.equal(session.businessList().find(item=>item.businessType==='limited_company').share.percent,100,label);assert.deepEqual(History.ownershipAtDate(profile,'2026-09-03').shareholders.map(item=>item.ownershipBasisPoints),[10000],label);assert.deepEqual(profile.ownershipHistory.at(-1).shareholders.map(item=>item.ownershipBasisPoints),[5100,4900],label);assert.equal(profile.profileRevisionHistory.length,1,label);}
});

test('2.1.18 partial ownership state repairs deterministically without losing facts or duplicating revisions',()=>{
  const driver=driverFor(soleState());assert.equal(futureChange(driver).status,'ok');const corrupt=clone(driver.state),profile=corrupt.domain.companyProfiles[0],revision=clone(profile.profileRevisionHistory[0]);profile.ownershipHistory=[{...profile.ownershipHistory[0],effectiveTo:null}];
  assert.throws(()=>CompanyState.validateState(corrupt),/Current ownership must match the open ownership version/);
  const repaired=CompanyState.migrate(corrupt,beforeDate,'upgrade-2.1.19');CompanyState.validateState(repaired);const fixed=repaired.domain.companyProfiles[0],again=CompanyState.migrate(repaired,beforeDate,'upgrade-2.1.19');
  assert.equal(fixed.profileRevisionHistory.length,1);assert.deepEqual(fixed.profileRevisionHistory[0],revision);assert.equal(fixed.ownershipHistory.length,2);assert.equal(fixed.ownershipHistory[1].sourceRevisionId,revision.id);assert.deepEqual(fixed.ownershipHistory[1].evidenceRefs,['R45']);assert.deepEqual(fixed.shareholders.map(item=>item.ownershipBasisPoints),[5100,4900]);assert.deepEqual(again.domain.companyProfiles[0].ownershipHistory,fixed.ownershipHistory);assert.equal(again.domain.companyProfiles[0].profileRevisionHistory.length,1);
});

test('2.1.18 split cloud profile plus revision and ownership collections recover as one validated snapshot',()=>{
  const before=soleState(),driver=driverFor(before);assert.equal(futureChange(driver).status,'ok');const partial=clone(driver.state),profile=partial.domain.companyProfiles[0],oldProfile=before.domain.companyProfiles[0];
  profile.shareholders=clone(oldProfile.shareholders);profile.updatedAt=oldProfile.updatedAt;profile.deviceId=oldProfile.deviceId;
  assert.throws(()=>CompanyState.validateState(partial),/Current ownership must match the open ownership version/);
  const repaired=CompanyState.migrate(partial,beforeDate,'upgrade-2.1.20'),fixed=repaired.domain.companyProfiles[0],again=CompanyState.migrate(repaired,beforeDate,'upgrade-2.1.20');CompanyState.validateState(repaired);
  assert.deepEqual(fixed.shareholders.map(item=>item.ownershipBasisPoints),[5100,4900]);assert.deepEqual(History.ownershipAtDate(fixed,'2026-09-03').shareholders.map(item=>item.ownershipBasisPoints),[10000]);assert.equal(fixed.ownershipHistory.length,2);assert.equal(fixed.profileRevisionHistory.length,1);assert.equal(fixed.profileRevisionHistory[0].reason,'Sold');assert.deepEqual(fixed.profileRevisionHistory[0].evidenceRefs,['R45']);assert.deepEqual(again.domain.companyProfiles[0],fixed);
});

test('production sync applies only a validated candidate, batches ownership writes and bounds deterministic errors',()=>{
  const app=fs.readFileSync('src/app/app.js','utf8'),reconcile=app.slice(app.indexOf('function reconcileLtdState'),app.indexOf('async function readLtdCloud'));
  assert.ok(reconcile.indexOf('TaxMateState.validateState(candidate)')<reconcile.indexOf('S=candidate'));
  assert.match(app,/function pendingLtdRecoveryEnvelopes\(uid\)/);assert.match(reconcile,/envelopes\.concat\(pending\)/);assert.match(app,/async function writeLtdRecordsAtomically\(operations\)/);assert.match(app,/companyProfiles','companyProfileRevisions','companyOwnershipVersions/);assert.match(app,/scheduleLtdSnapshotRefresh\(uid\)/);assert.match(app,/CLOUD\.hydrationFailureCount<3/);assert.match(app,/if\(CLOUD\.reportedSyncErrors\[key\]\)return/);assert.doesNotMatch(app,/console\.warn\('user sync failed',error\)/);
});

test('Home renders Hero before install promotion and never injects Assistant advice above it',()=>{
  const app=fs.readFileSync('src/app/app.js','utf8'),home=app.slice(app.indexOf('function pageHome()'),app.indexOf('function entryRow(')),carousel=app.slice(app.indexOf('function carouselCards()'),app.indexOf('function cxrOnScroll('));
  assert.ok(home.indexOf('${hasPersonal?personalHero')<home.indexOf('${homeCarousel()}'));assert.doesNotMatch(carousel,/topContextTip|id:'tip'|tip\.(?:phone|home)_/);assert.match(app,/function tipsCard\(\)/);
});

test('ownership UI resolves the effective version and has no raw/open fallback that can show a future share as current',()=>{
  const renderer=fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8'),summary=renderer.slice(renderer.indexOf('function ownershipSummaryCard()'),renderer.indexOf('function areaRecords()')),screen=renderer.slice(renderer.indexOf('function screenOwnership()'),renderer.indexOf('function screenWorkingPack()'));
  assert.match(summary,/effectiveFrom<=today/);assert.doesNotMatch(summary,/effectiveTo==null;\}\)\[0\]\|\|hist\[0\]/);assert.match(screen,/effectiveFrom<=today/);assert.doesNotMatch(screen,/\|\|hist\[0\]/);
});

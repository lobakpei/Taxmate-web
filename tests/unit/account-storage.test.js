'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Accounts=require('../../src/core/account-storage');

function memory(initial={}){const values=new Map(Object.entries(initial));return{get length(){return values.size;},key(index){return [...values.keys()][index]??null;},getItem(key){return values.has(key)?values.get(key):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));},snapshot(){return Object.fromEntries(values);}};}

test('Firebase and local-only account slots are disjoint',()=>{
  const storage=memory(),founder=Accounts.firebaseScope('founder-uid'),tammy=Accounts.firebaseScope('tammy-uid'),local=Accounts.localScope();
  Accounts.write(storage,founder,'canonical','founder');Accounts.write(storage,tammy,'canonical','tammy');Accounts.write(storage,local,'canonical','local');
  assert.equal(Accounts.read(storage,founder,'canonical'),'founder');assert.equal(Accounts.read(storage,tammy,'canonical'),'tammy');assert.equal(Accounts.read(storage,local,'canonical'),'local');
  assert.equal(new Set([Accounts.key(founder,'canonical'),Accounts.key(tammy,'canonical'),Accounts.key(local,'canonical')]).size,3);
});

test('unknown-owner legacy storage is byte-preserved in quarantine and removed from active legacy keys',()=>{
  const original='{"businesses":[{"name":"private"}]}',outbox='{"items":[{"kind":"personal-state"}]}',storage=memory({taxmateuk_v1:original,taxmateuk_sync_outbox_v1:outbox,tmOnboardDone:'1',taxmateuk_analytics_consent:'granted'});
  const result=Accounts.quarantineLegacy(storage,{now:100,nonce:'test'}),record=JSON.parse(storage.getItem(result.recordKey));
  assert.equal(result.status,'quarantined');assert.equal(result.count,3);assert.deepEqual(Object.fromEntries(record.entries.map(item=>[item.key,item.value])),{taxmateuk_sync_outbox_v1:outbox,taxmateuk_v1:original,tmOnboardDone:'1'});
  assert.equal(storage.getItem('taxmateuk_v1'),null);assert.equal(storage.getItem('taxmateuk_sync_outbox_v1'),null);assert.equal(storage.getItem('taxmateuk_analytics_consent'),'granted');
  assert.equal(Accounts.quarantineLegacy(storage,{now:101,nonce:'again'}).status,'already-quarantined');
});

test('explicit local-only sign-in association copies once, preserves a recovery backup and never copies outbox or entitlement',()=>{
  const storage=memory(),local=Accounts.localScope(),target=Accounts.firebaseScope('new-account');
  Accounts.write(storage,local,'canonical','local-state');Accounts.write(storage,local,'onboarding-done','1');Accounts.write(storage,local,'sync-outbox','foreign-risk');Accounts.write(storage,local,'entitlement-cache','foreign-risk');Accounts.prepareLocalAssociation(storage,{now:200});
  const result=Accounts.associateLocal(storage,target,{now:201});
  assert.equal(result.status,'associated');assert.equal(Accounts.read(storage,target,'canonical'),'local-state');assert.equal(Accounts.read(storage,target,'onboarding-done'),'1');assert.equal(Accounts.read(storage,target,'sync-outbox'),null);assert.equal(Accounts.read(storage,target,'entitlement-cache'),null);
  assert.equal(Accounts.read(storage,local,'canonical'),null);assert.equal(Accounts.read(storage,local,'sync-outbox'),'foreign-risk');assert.equal(JSON.parse(storage.getItem(result.backupKey)).entries.find(item=>item.slot==='canonical').value,'local-state');
  assert.equal(Accounts.associateLocal(storage,target,{now:202}).status,'not-pending');
});

test('existing Firebase namespace blocks local association',()=>{
  const storage=memory(),local=Accounts.localScope(),target=Accounts.firebaseScope('existing-account');
  Accounts.write(storage,local,'canonical','local-state');Accounts.write(storage,target,'canonical','owned-state');Accounts.prepareLocalAssociation(storage);
  assert.equal(Accounts.associateLocal(storage,target).status,'target-exists');assert.equal(Accounts.read(storage,target,'canonical'),'owned-state');assert.equal(Accounts.read(storage,local,'canonical'),'local-state');
});

test('onboarding-only local session can associate before canonical data exists',()=>{
  const storage=memory(),local=Accounts.localScope(),target=Accounts.firebaseScope('onboarding-account');
  Accounts.write(storage,local,'onboarding-draft','{"screen":"login"}');Accounts.prepareLocalAssociation(storage,{now:300});
  const result=Accounts.associateLocal(storage,target,{now:301});assert.equal(result.status,'associated');assert.equal(result.canonical,null);assert.equal(Accounts.read(storage,target,'onboarding-draft'),'{"screen":"login"}');assert.equal(Accounts.read(storage,local,'onboarding-draft'),null);
});

test('receipt paths are owned only by the exact active UID',()=>{
  assert.equal(Accounts.receiptPathOwner('receipts/founder-uid/e1.jpg'),'founder-uid');assert.equal(Accounts.ownsReceiptPath('receipts/founder-uid/e1.jpg','founder-uid'),true);assert.equal(Accounts.ownsReceiptPath('receipts/founder-uid/e1.jpg','tammy-uid'),false);assert.equal(Accounts.ownsReceiptPath('https://example.test/receipt','founder-uid'),false);
});

test('first-sync classification persists only a target UID and known empty/existing state',()=>{
  const storage=memory(),target=Accounts.firebaseScope('account-a'),other=Accounts.firebaseScope('account-b');Accounts.prepareLocalAssociation(storage,{now:400});
  const marker=Accounts.classifyLocalAssociation(storage,target,'empty',{now:401});assert.equal(marker.status,'confirmation');assert.equal(marker.targetUid,'account-a');assert.equal(marker.cloudState,'empty');assert.equal(Accounts.localAssociationTargets(storage,target),true);assert.equal(Accounts.localAssociationTargets(storage,other),false);
  assert.equal(Accounts.associateLocal(storage,other,{now:402}).status,'target-mismatch');assert.equal(Accounts.localAssociationPending(storage),true);
  const reset=Accounts.prepareLocalAssociation(storage,{now:403,resetTarget:true});assert.equal(reset.status,'pending');assert.equal('targetUid' in reset,false);
});

test('opening an existing cloud account records a per-account decision without moving local bytes',()=>{
  const storage=memory(),local=Accounts.localScope(),accountA=Accounts.firebaseScope('account-a'),accountB=Accounts.firebaseScope('account-b');Accounts.write(storage,local,'canonical','local-state');Accounts.prepareLocalAssociation(storage,{now:500});Accounts.classifyLocalAssociation(storage,accountA,'existing',{now:501});
  Accounts.recordLocalAssociationDecision(storage,accountA,'open-cloud',{now:502});Accounts.clearLocalAssociation(storage);
  assert.equal(Accounts.read(storage,local,'canonical'),'local-state');assert.equal(Accounts.read(storage,accountA,'canonical'),null);assert.equal(Accounts.localAssociationDecision(storage,accountA).decision,'open-cloud');assert.equal(Accounts.localAssociationDecision(storage,accountB),null);
});

test('server reset epoch clears only the exact Firebase account local and session scopes',()=>{
  const storage=memory(),session=memory(),tammy=Accounts.firebaseScope('tammy-uid'),founder=Accounts.firebaseScope('founder-uid');
  Accounts.write(storage,tammy,'canonical','tammy');Accounts.write(storage,tammy,'sync-outbox','pending');Accounts.write(storage,founder,'canonical','founder');session.setItem(Accounts.sessionKey(tammy,'ltd-transient'),'tammy-transient');session.setItem(Accounts.sessionKey(founder,'ltd-transient'),'founder-transient');
  const reset=Accounts.applyServerReset(storage,session,tammy,200);assert.equal(reset.status,'reset');assert.equal(reset.localRemoved,2);assert.equal(reset.sessionRemoved,1);assert.equal(Accounts.read(storage,tammy,'canonical'),null);assert.equal(Accounts.read(storage,founder,'canonical'),'founder');assert.equal(session.getItem(Accounts.sessionKey(founder,'ltd-transient')),'founder-transient');
  assert.equal(Accounts.applyServerReset(storage,session,tammy,200).status,'current');assert.equal(storage.getItem(Accounts.key(tammy,'reset-epoch')),'200');
});

test('meaningful state includes legacy and Ltd-domain records but not empty defaults',()=>{
  assert.equal(Accounts.stateHasAccountData({businesses:[],entries:[],domain:{entities:[]}}),false);assert.equal(Accounts.stateHasAccountData({businesses:[],entries:[],domain:{persons:[{id:'person:account-holder'}],entities:[]}}),false);assert.equal(Accounts.stateHasAccountData({businesses:[{id:'b1'}]}),true);assert.equal(Accounts.stateHasAccountData({businesses:[],entries:[],domain:{entities:[{id:'e1'}]}}),true);
});

test('account hydration preserves exact local scope while controls are offline and never creates empty cloud truth',()=>{
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../src/app/app.js'),'utf8');
  assert.match(source,/if\(metaDoc\.exists\|\|remote\.length\|\|ACCOUNT_SCOPE_HAD_CANONICAL\)persistRemoteState\(\)/);
  assert.match(source,/if\(account\.established\|\|TaxMateAccountStorage\.stateHasAccountData\(S\)\)result\.syncState=await pushUserState/);
  assert.match(source,/if\(!established&&!TaxMateAccountStorage\.stateHasAccountData\(S\)\)return null/);
  assert.match(source,/if\(associationPending\)[\s\S]*setFirstSyncConfirmation\(u,cloudState/);
  assert.match(source,/if\(CLOUD\.firstSyncBlocked\)return null/);
  assert.doesNotMatch(source,/boundaryBlocked|foreignIndex|ownership-quarantine|TaxMateAccountBoundary/);
  assert.match(source,/if\(SYNC_RUNTIME\.blocked\|\|ACCOUNT_TRANSITION_PENDING\|\|CLOUD\.deletionBlocked\|\|CLOUD\.firstSyncBlocked\)/);
  assert.match(source,/function firstSyncUseAccount\(\)[\s\S]*readAccountPresence\(user\.uid\)[\s\S]*associateLocal\(localStorage,scope/);
  assert.match(source,/function firstSyncOpenExisting\(\)[\s\S]*recordLocalAssociationDecision\(localStorage,scope,'open-cloud'/);
  assert.match(source,/if\(fbConfigured\(\)&&!ACTIVE_ACCOUNT_SCOPE\)[\s\S]{0,300}data-auth-initialising[\s\S]{0,200}Restoring your account/);
  assert.match(source,/function beginAccountTransition\(correlation,options=\{\}\)[\s\S]{0,700}if\(options\.targetScope\)activateAccountScope\(options\.targetScope/);
  const transition=source.slice(source.indexOf('function beginAccountTransition('),source.indexOf('function accountReadWithTimeout('));assert.doesNotMatch(transition,/S=freshState\(\)/);
  assert.match(source,/CLOUD\.controlsCached=true;CLOUD\.firstSyncBlocked=TaxMateAccountStorage\.localAssociationPending\(localStorage\);CLOUD\.hydrationState='failed'[\s\S]{0,500}state:'retained-local'[\s\S]{0,500}render\(\);return/);
  assert.doesNotMatch(source,/renderAccountControlRetry|retryAccountSafetyCheck/);
  assert.match(source,/if\(OB&&OB\.pendingIntent\)\{AUTH_PENDING_INTENT=obIntentCopy\(OB\.pendingIntent\);return;\}[\s\S]*ACTIVE_ACCOUNT_SCOPE&&ACTIVE_ACCOUNT_SCOPE\.kind==='firebase'/);
  assert.match(source,/localNavigation=ACTIVE_ACCOUNT_SCOPE&&ACTIVE_ACCOUNT_SCOPE\.kind==='local'&&scope\.kind==='firebase'/);
  assert.match(source,/if\(!ACCOUNT_SCOPE_HAD_CANONICAL&&localNavigation\)S\.tab=localNavigation/);
});

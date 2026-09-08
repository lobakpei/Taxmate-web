'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8');
function fn(start,end){return app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));}
test('LTD download acceptance rejects old and missing epochs and locks while purge is pending',()=>{
 const context=vm.createContext({CLOUD:{retentionControl:{epoch:2},retentionBlocked:false},activeAccountUid:()=> 'demo-owner',explicitOwner:x=>x&&x.accountOwnerUid,console});vm.runInContext(fn('function ltdCloudForAccount(','function pendingLtdRecoveryEnvelopes('),context);
 const result=context.ltdCloudForAccount(null,[{retentionEpoch:1},{},{retentionEpoch:2}], 'test');assert.equal(result.envelopes.length,1);assert.equal(result.envelopes[0].retentionEpoch,2);
 context.CLOUD.retentionBlocked=true;assert.throws(()=>context.ltdCloudForAccount(null,[],'test'),e=>e.code==='retention_stale_hydration');
});
test('an LTD read started before epoch or account generation changes cannot mutate canonical state',async()=>{
 for(const changed of ['epoch','generation','pending']){
  let release,writes=0;const pending=new Promise(resolve=>{release=resolve;}),context=vm.createContext({CLOUD:{generation:1,retentionControl:{epoch:1},retentionBlocked:false},ltdAccessDecision:()=>({allowed:true}),userRoot:()=>({collection:()=>({doc:()=>({get:async()=>({exists:false})})})}),TaxMateLtdSync:{COLLECTIONS:['companyProfiles'],validateEnvelope:()=>{}},ltdCollectionRef:()=>({}),retentionQuery:()=>({get:async()=>{await pending;return{forEach:()=>{}};}}),syncGenerationCurrent:(_uid,g)=>context.CLOUD.generation===g,ltdCloudForAccount:()=>({envelopes:[],anchor:null}),validateLtdAnchorConsistency:()=>{},setLtdRemote:()=>{writes++;},reconcileLtdState:()=>{writes++;return{};}});
  vm.runInContext(fn('async function readLtdCloud(','async function readAccountPresence('),context);const read=context.readLtdCloud('demo-owner');await Promise.resolve();
  if(changed==='epoch')context.CLOUD.retentionControl.epoch=2;if(changed==='generation')context.CLOUD.generation=2;if(changed==='pending')context.CLOUD.retentionBlocked=true;release();
  await assert.rejects(read,e=>e.code==='retention_stale_hydration');assert.equal(writes,0);
 }
});

test('offline control-read failure pauses the outbox without rejecting or modifying queued records',async()=>{
 let retried=0,queueReads=0;const context=vm.createContext({ACCOUNT_TRANSITION_PENDING:false,SYNC_RUNTIME:{blocked:false},CLOUD:{generation:1},navigator:{onLine:true},ensureFB:async()=>({}),cloudUser:()=>({uid:'demo-owner'}),readAccountControls:async()=>{throw Object.assign(new Error('Failed to get document because the client is offline.'),{code:'unavailable'});},syncGenerationCurrent:()=>true,TaxMateSync:{classifyError:e=>e.code},reportSyncErrorOnce:()=>{},scheduleOutboxFlush:()=>{retried++;},renderSyncStatus:()=>{},loadSyncOutbox:()=>{queueReads++;throw Error('Must not touch outbox before server controls are verified');}});
 vm.runInContext(fn('async function flushSyncOutbox(','function handleSyncListenerError('),context);
 const result=await context.flushSyncOutbox('test');assert.equal(result.state,'waiting');assert.equal(retried,1);assert.equal(queueReads,0);assert.equal(context.CLOUD.ackState,'waiting');assert.equal(context.CLOUD.flushPromise,null);
});

test('outbox preflight response from a superseded account generation cannot start writes',async()=>{
 let queueReads=0;const context=vm.createContext({ACCOUNT_TRANSITION_PENDING:false,SYNC_RUNTIME:{blocked:false},CLOUD:{generation:1},navigator:{onLine:true},ensureFB:async()=>({}),cloudUser:()=>({uid:'demo-owner'}),readAccountControls:async()=>({retention:null}),syncGenerationCurrent:()=>false,renderSyncStatus:()=>{},loadSyncOutbox:()=>{queueReads++;throw Error('Stale preflight must not read the queue');}});
 vm.runInContext(fn('async function flushSyncOutbox(','function handleSyncListenerError('),context);
 const result=await context.flushSyncOutbox('test');assert.equal(result.state,'cancelled');assert.equal(queueReads,0);assert.equal(context.CLOUD.flushPromise,null);
});

test('auth transition rechecks the account after asynchronous receipt-reset cleanup',async()=>{
 let callback,release,started=false,activated=0;const pause=new Promise(resolve=>{release=resolve;}),auth={currentUser:{uid:'owner-a'},onAuthStateChanged:fn=>{callback=fn;}};
 const context=vm.createContext({AUTH_TRANSITION_GENERATION:0,ACTIVE_ACCOUNT_SCOPE:{kind:'local'},S:{tab:'home'},firebase:{auth:()=>auth},TaxMateAccountStorage:{firebaseScope:uid=>({kind:'firebase',uid})},beginAccountTransition:()=>{},readAccountControls:async()=>({reset:{status:'complete',resetEpoch:2},retention:null}),applyServerResetWithReceipts:async()=>{started=true;await pause;},activateAccountScope:()=>{activated++;throw Error('Old account must not be activated');},safeActionTrace:()=>{}});
 vm.runInContext(fn('function watchAuth(){','async function signIn('),context);context.watchAuth();const running=callback({uid:'owner-a'});
 for(let n=0;n<10&&!started;n++)await Promise.resolve();assert.equal(started,true);auth.currentUser={uid:'owner-b'};context.AUTH_TRANSITION_GENERATION=2;release();await running;assert.equal(activated,0);
});

test('superseded control refresh cannot reactivate the old account or clear the new account refresh promise',async()=>{
 for(const rejectCleanup of [false,true]){
  let release,started=false,activated=0;const pause=new Promise(resolve=>{release=resolve;}),auth={currentUser:{uid:'owner-a'}};
  const context=vm.createContext({AUTH_TRANSITION_GENERATION:1,CLOUD:{controlsCached:true,controlsRefreshPromise:null},S:{tab:'home'},cloudUser:()=>auth.currentUser,cachedAccountControls:()=>null,TaxMateAccountStorage:{firebaseScope:uid=>({kind:'firebase',uid})},beginAccountTransition:()=>{},readAccountControls:async()=>({reset:{status:'complete',resetEpoch:2},retention:null}),applyServerResetWithReceipts:async()=>{started=true;await pause;if(rejectCleanup)throw Error('old cleanup failed after account switch');},activateAccountScope:()=>{activated++;throw Error('Old account must not be activated');}});
  vm.runInContext(fn('async function refreshCachedAccountControls(){','function onboardingDoneFlag('),context);const running=context.refreshCachedAccountControls();for(let n=0;n<10&&!started;n++)await Promise.resolve();assert.equal(started,true);
  auth.currentUser={uid:'owner-b'};context.AUTH_TRANSITION_GENERATION=2;const nextRefresh=Promise.resolve('new-account');context.CLOUD.controlsRefreshPromise=nextRefresh;context.CLOUD.hydrationState='new-account';release();assert.equal(await running,false);assert.equal(activated,0);assert.equal(context.CLOUD.hydrationState,'new-account');assert.equal(context.CLOUD.controlsRefreshPromise,nextRefresh);
 }
});

test('leaving a partnership updates the current canonical business after asynchronous cloud replacement',async()=>{
 for(const changedAccount of [false,true]){
  let release,saved=0;const pause=new Promise(resolve=>{release=resolve;}),old={id:'biz',syncCode:'SHARED88'},state={business:old},auth={uid:'owner-a'};
  const context=vm.createContext({AUTH_TRANSITION_GENERATION:1,DEVICE_ID:'device-a',FB:{subs:{SHARED88:[]}},bizById:()=>state.business,cloudUser:()=>auth,callSecureFunction:async()=>pause,TaxMateSync:{touch:b=>({...b,updatedAt:123,deviceId:'device-a'})},save:()=>{saved++;},paintSync:()=>{},render:()=>{}});
  vm.runInContext(fn('async function leaveSync(','let PARTNER_SHARE_IN_FLIGHT='),context);const running=context.leaveSync('biz');state.business={...old,name:'Fresh canonical revision'};
  if(changedAccount){auth.uid='owner-b';context.AUTH_TRANSITION_GENERATION=2;}release();await running;
  assert.equal(state.business.syncCode,changedAccount?'SHARED88':undefined);assert.equal(saved,changedAccount?0:1);assert.equal(old.syncCode,'SHARED88');
 }
});

test('an offline control read that completes after reconnect resumes server verification without waiting for another online event',async()=>{
 for(const online of [false,true]){
  let callback,refreshed=0;const auth={currentUser:{uid:'owner-a'},onAuthStateChanged:fn=>{callback=fn;}};
  const context=vm.createContext({AUTH_TRANSITION_GENERATION:0,ACTIVE_ACCOUNT_SCOPE:{kind:'local'},ACCOUNT_SCOPE_NORMALIZATION_PENDING:false,S:{tab:'home'},CLOUD:{},navigator:{onLine:online},firebase:{auth:()=>auth},TaxMateAccountStorage:{firebaseScope:uid=>({kind:'firebase',uid}),localAssociationPending:()=>false,localAssociationState:()=>null},localStorage:{setItem:()=>{}},beginAccountTransition:()=>{},readAccountControls:async()=>{throw Object.assign(Error('offline read completed after reconnect'),{code:'unavailable'});},cachedAccountControls:()=>({reset:null,retention:null}),accountControlConnectivityFailure:()=>true,activateAccountScope:()=>{},applyRetentionControlLocally:()=>{},installRetentionWatcher:()=>{},safeActionTrace:()=>{},render:()=>{},renderSyncStatus:()=>{},refreshCachedAccountControls:async()=>{refreshed++;},handleSyncListenerError:()=>{}});
  vm.runInContext(fn('function watchAuth(){','async function signIn('),context);context.watchAuth();await callback({uid:'owner-a'});assert.equal(refreshed,online?1:0);
 }
});

test('transient account-control verification retries remain scoped and never start offline or after account switch',async()=>{
 for(const scenario of ['online','offline','switched','resolved']){
  let retry,refreshed=0;const user={uid:'owner-a'},context=vm.createContext({AUTH_TRANSITION_GENERATION:1,CLOUD:{controlsCached:true},navigator:{onLine:true},cloudUser:()=>user,clearTimeout:()=>{},setTimeout:(fn,ms)=>{assert.equal(ms,5000);retry=fn;return 1;},refreshCachedAccountControls:async()=>{refreshed++;},handleSyncListenerError:()=>{}});
  vm.runInContext(fn('function scheduleAccountControlRetry(','async function refreshCachedAccountControls('),context);context.scheduleAccountControlRetry('owner-a',1);
  if(scenario==='offline')context.navigator.onLine=false;if(scenario==='switched'){user.uid='owner-b';context.AUTH_TRANSITION_GENERATION=2;}if(scenario==='resolved')context.CLOUD.controlsCached=false;retry();await Promise.resolve();assert.equal(refreshed,scenario==='online'?1:0);
 }
});

test('network failure during control refresh restores the pending zero-write account confirmation',async()=>{
 let confirmations=0;const user={uid:'owner-a'},context=vm.createContext({AUTH_TRANSITION_GENERATION:1,CLOUD:{controlsCached:true,controlsRefreshPromise:null},S:{tab:'home',businesses:[]},localStorage:{},cloudUser:()=>user,cachedAccountControls:()=>({reset:null,retention:null}),TaxMateAccountStorage:{firebaseScope:uid=>({kind:'firebase',uid}),localAssociationPending:()=>true,localAssociationState:()=>({status:'confirmation',cloudState:'empty'}),localAssociationTargets:()=>true},beginAccountTransition:()=>{},readAccountControls:async()=>{throw Object.assign(Error('offline'),{code:'unavailable'});},activeLtdProfile:()=>null,accountControlConnectivityFailure:()=>true,reportSyncErrorOnce:()=>{},scheduleAccountControlRetry:()=>{},safeActionTrace:()=>{},render:()=>{},setFirstSyncConfirmation:(_user,state,_correlation,error)=>{assert.equal(state,'empty');assert.equal(error,true);confirmations++;}});
 vm.runInContext(fn('async function refreshCachedAccountControls(){','function onboardingDoneFlag('),context);assert.equal(await context.refreshCachedAccountControls(),false);assert.equal(confirmations,1);assert.equal(context.CLOUD.controlsCached,true);assert.equal(context.CLOUD.firstSyncBlocked,true);
});

test('first-sync presence checks require fresh server results rather than cached empty-account snapshots',async()=>{
 let reads=0;const ref={doc:()=>ref,collection:()=>ref,limit:()=>ref,get:async options=>{assert.equal(options.source,'server');reads++;return{exists:false,empty:true};}},context=vm.createContext({assertActiveAccountUid:()=>{},userRoot:()=>ref,retentionQuery:x=>x,ltdAccessDecision:()=>({allowed:true}),TaxMateLtdSync:{COLLECTIONS:['companyProfiles']},ltdCollectionRef:()=>ref});
 vm.runInContext(fn('async function readAccountPresence(','async function restartSyncAfterFirstConfirmation('),context);const result=await context.readAccountPresence('owner-a');assert.equal(result.established,false);assert.equal(reads,4);
});

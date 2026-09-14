'use strict';

const AccountWriteFence=require('./account-write-fence');

const READY_RETENTION_STATUSES=new Set(['complete','complete_with_warnings']);

class AccountStorageBootstrapError extends Error{
  constructor(reason){super(reason);this.name='AccountStorageBootstrapError';this.reason=reason;}
}

function fail(reason){throw new AccountStorageBootstrapError(reason);}
function value(snapshot){return snapshot&&snapshot.exists===true?snapshot.data()||{}:{};}
function safeEpoch(input,reason){const epoch=Number(input);if(!Number.isSafeInteger(epoch)||epoch<0)fail(reason);return epoch;}

function readyProjection(resetSnapshot,retentionSnapshot,entitlement={}){
  const current=entitlement&&typeof entitlement==='object'?entitlement:{},priorRetention=current.accountRetention&&typeof current.accountRetention==='object'?current.accountRetention:{};
  let resetEpoch;
  try{resetEpoch=AccountWriteFence.readyEpoch(resetSnapshot);}catch(error){if(error instanceof AccountWriteFence.AccountWriteFenceError)fail('account_reset_processing');throw error;}
  if(resetSnapshot?.exists!==true){
    const mirrorStatus=String(current.accountResetStatus||'complete'),mirrorEpoch=safeEpoch(current.accountResetEpoch??0,'account_reset_state_invalid');
    if(mirrorStatus!=='complete'||mirrorEpoch!==0)fail('account_reset_state_invalid');
  }else if(current.accountResetEpoch!=null&&safeEpoch(current.accountResetEpoch,'account_reset_state_invalid')!==resetEpoch)fail('account_reset_state_invalid');

  if(retentionSnapshot?.exists===true){
    const control=value(retentionSnapshot),status=String(control.status||''),epoch=safeEpoch(control.epoch,'retention_state_invalid'),priorEpoch=safeEpoch(priorRetention.lastRetentionEpoch??0,'retention_state_invalid');
    if(!READY_RETENTION_STATUSES.has(status))fail('retention_processing');
    if(priorEpoch>epoch)fail('retention_state_invalid');
  }else{
    const status=String(priorRetention.controlStatus||'complete'),epoch=safeEpoch(priorRetention.lastRetentionEpoch??0,'retention_state_invalid');
    if(!READY_RETENTION_STATUSES.has(status))fail('retention_processing');
    if(epoch!==0)fail('retention_state_invalid');
  }

  let projection;
  try{projection=AccountWriteFence.storageProjection(resetSnapshot,priorRetention,retentionSnapshot);}catch(error){if(error instanceof AccountWriteFence.AccountWriteFenceError)fail('account_storage_state_invalid');throw error;}
  if(projection.accountResetStatus!=='complete'||!READY_RETENTION_STATUSES.has(projection.accountRetention.controlStatus))fail('account_storage_state_invalid');
  return projection;
}

async function bootstrap({db,uid}){
  if(!db||typeof db.runTransaction!=='function'||typeof uid!=='string'||!uid)throw new TypeError('Valid account storage bootstrap dependencies are required');
  const resetRef=db.doc(`accountResets/${uid}`),retentionRef=db.doc(`users/${uid}/retention/current`),entitlementRef=db.doc(`users/${uid}/entitlements/current`);
  return db.runTransaction(async tx=>{
    // Reading every lifecycle document in the same transaction makes a reset or
    // retention transition retry this decision before any Storage gate is opened.
    const [resetSnapshot,retentionSnapshot,entitlementSnapshot]=await Promise.all([tx.get(resetRef),tx.get(retentionRef),tx.get(entitlementRef)]),existing=value(entitlementSnapshot),projection=readyProjection(resetSnapshot,retentionSnapshot,existing),created=entitlementSnapshot.exists!==true;
    const update=created?{paidTier:'free',subscriptionStatus:'inactive',currentPeriodEnd:0,...projection}:projection;
    tx.set(entitlementRef,update,{merge:true});
    return{status:'ready',created,accountResetEpoch:projection.accountResetEpoch,retentionEpoch:projection.accountRetention.lastRetentionEpoch};
  });
}

module.exports={AccountStorageBootstrapError,READY_RETENTION_STATUSES,readyProjection,bootstrap};

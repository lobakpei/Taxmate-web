'use strict';

class AccountWriteFenceError extends Error{
  constructor(){super('account_reset_processing');this.name='AccountWriteFenceError';this.reason='account_reset_processing';}
}

function readyEpoch(snapshot){
  if(!snapshot||snapshot.exists!==true)return 0;
  const data=snapshot.data()||{},epoch=data.resetEpoch==null?0:Number(data.resetEpoch);
  if(String(data.status||'')!=='complete'||!Number.isSafeInteger(epoch)||epoch<0)throw new AccountWriteFenceError();
  return epoch;
}

function expectedReadyEpoch(snapshot,expectedEpoch){
  const epoch=readyEpoch(snapshot),expected=expectedEpoch==null?0:Number(expectedEpoch);
  if(!Number.isSafeInteger(expected)||expected<0||expected!==epoch)throw new AccountWriteFenceError();
  return epoch;
}

async function readInTransaction({tx,db,uid,expectedEpoch}){
  return expectedReadyEpoch(await tx.get(db.doc(`accountResets/${uid}`)),expectedEpoch);
}

function storageProjection(snapshot,accountRetention={},retentionSnapshot=null){
  const data=snapshot&&snapshot.exists===true?snapshot.data()||{}:{},status=snapshot&&snapshot.exists===true?String(data.status||''):'complete',epoch=data.resetEpoch==null?0:Number(data.resetEpoch);
  if(!['complete','billing_quarantined','deleting','failed'].includes(status)||!Number.isSafeInteger(epoch)||epoch<0)throw new AccountWriteFenceError();
  const retention=accountRetention&&typeof accountRetention==='object'?accountRetention:{},control=retentionSnapshot&&retentionSnapshot.exists===true?retentionSnapshot.data()||{}:null,controlStatus=control?String(control.status||''):String(retention.controlStatus||'complete'),controlEpoch=control?Number(control.epoch):Number(retention.activeRetentionEpoch??retention.lastRetentionEpoch??0),priorEpoch=Number(retention.lastRetentionEpoch||0);
  if(!['purging','complete','complete_with_warnings','failed'].includes(controlStatus)||!Number.isSafeInteger(controlEpoch)||controlEpoch<0||!Number.isSafeInteger(priorEpoch)||priorEpoch<0)throw new AccountWriteFenceError();
  const completed=['complete','complete_with_warnings'].includes(controlStatus),lastRetentionEpoch=completed?Math.max(priorEpoch,controlEpoch):priorEpoch;
  return{accountResetStatus:status,accountResetEpoch:epoch,accountResetEpochString:String(epoch),accountRetention:{...retention,controlStatus,lastRetentionEpoch,lastRetentionEpochString:String(lastRetentionEpoch),activeRetentionEpoch:completed?null:controlEpoch}};
}

module.exports={AccountWriteFenceError,readyEpoch,expectedReadyEpoch,readInTransaction,storageProjection};

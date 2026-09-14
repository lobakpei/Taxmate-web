'use strict';

const Safety=require('./billing-deletion-safety');

async function customerFor({db,FieldValue,user,client,assertResetReady,accountResetError}){
  if(!db||!FieldValue||!user||!user.uid||!client||!client.customers||typeof client.customers.create!=='function')throw new TypeError('Stripe customer binding dependencies are required');
  const fail=()=>{throw accountResetError();},ref=db.doc(`billingCustomers/${user.uid}`),resetRef=db.doc(`accountResets/${user.uid}`),reset=await assertResetReady(user.uid),snap=await ref.get(),prior=snap.exists?snap.data()||{}:{},oldEpoch=Number(prior.resetEpoch||0),rotation=snap.exists&&prior.accountDeleted===true&&prior.rebindAllowedAfterEpoch===true&&oldEpoch<reset.resetEpoch;
  if(snap.exists&&!rotation){if(prior.accountDeleted===true||prior.resetEpoch!=null&&Number(prior.resetEpoch)!==reset.resetEpoch||reset.resetEpoch>0&&prior.resetEpoch==null)fail();return prior.stripeCustomerId;}
  const created=await client.customers.create({email:user.token&&user.token.email,metadata:{firebaseUid:user.uid}},{idempotencyKey:`taxmate-customer-${user.uid}-${reset.resetEpoch}`});let customerId=created.id;
  const archiveRef=rotation?db.doc(`billingProviderTombstones/${Safety.tombstoneId('stripe',user.uid,oldEpoch,String(prior.stripeCustomerId||''))}`):null;
  await db.runTransaction(async tx=>{
    const refs=[resetRef,ref,...(archiveRef?[archiveRef]:[])],[latestReset,latestMapping,archive]=await Promise.all(refs.map(item=>tx.get(item))),state=latestReset.exists?latestReset.data()||{}:{},epoch=state.resetEpoch==null?0:Number(state.resetEpoch);
    if(epoch!==reset.resetEpoch||['deleting','failed','billing_quarantined'].includes(String(state.status||'')))fail();
    if(latestMapping.exists){const mapping=latestMapping.data()||{},current=mapping.accountDeleted!==true&&Number(mapping.resetEpoch??0)===epoch;if(current){customerId=mapping.stripeCustomerId;return;}const canRotate=rotation&&mapping.accountDeleted===true&&mapping.rebindAllowedAfterEpoch===true&&Number(mapping.resetEpoch||0)===oldEpoch&&oldEpoch<epoch&&archive&&archive.exists;if(!canRotate)fail();}
    tx.set(ref,{schemaVersion:1,uid:user.uid,stripeCustomerId:created.id,resetEpoch:epoch,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  });
  return customerId;
}

module.exports={customerFor};

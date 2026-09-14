'use strict';

const crypto=require('node:crypto');

function normalize(value){
  if(value==null||typeof value!=='object')return value;
  if(typeof value.toMillis==='function')return value.toMillis();
  if(Array.isArray(value))return value.map(normalize);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]));
}
function data(snapshot){return snapshot&&snapshot.exists===true?snapshot.data()||{}:null;}
function capture({reset,entitlement,stripe,googlePlay,appStore}){
  const resetData=data(reset),epoch=resetData&&resetData.resetEpoch!=null?Number(resetData.resetEpoch):0;
  return crypto.createHash('sha256').update(JSON.stringify(normalize({
    reset:resetData&&{status:resetData.status||null,resetEpoch:epoch},
    entitlement:data(entitlement),
    stripe:data(stripe),
    googlePlay:data(googlePlay),
    appStore:data(appStore)
  }))).digest('hex');
}

function purchaseControls({moneyOperationsEnabled=false,consumerDisclosuresEnabled=false,supplierDisclosureVerified=false,demo=false}={}){
  const moneyReady=moneyOperationsEnabled===true,consumerDisclosuresReady=consumerDisclosuresEnabled===true&&(supplierDisclosureVerified===true||demo===true);
  return Object.freeze({
    moneyOperationsEnabled:moneyReady,
    consumerDisclosuresReady,
    purchaseEnabled:moneyReady&&consumerDisclosuresReady,
    reason:!moneyReady?'money_operations_not_enabled':!consumerDisclosuresReady?'consumer_disclosures_not_verified':null
  });
}

module.exports={capture,normalize,purchaseControls};

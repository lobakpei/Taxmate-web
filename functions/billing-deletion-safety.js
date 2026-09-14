'use strict';

const crypto=require('node:crypto');

function text(value){return typeof value==='string'?value:'';}

function tombstoneId(provider,uid,resetEpoch,identity){
  const epoch=Number(resetEpoch);
  if(!['stripe','google_play','app_store'].includes(provider)||!text(uid)||!Number.isSafeInteger(epoch)||epoch<0||!text(identity))throw new TypeError('Invalid billing tombstone identity');
  return crypto.createHash('sha256').update(`${provider}\n${uid}\n${epoch}\n${identity}`,'utf8').digest('hex');
}

async function listAllStripe(list,params={},options={}){
  if(typeof list!=='function')throw new TypeError('Stripe list function required');
  const maxPages=Math.max(1,Math.min(1000,Number(options.maxPages)||100)),rows=[];let startingAfter=null;
  for(let page=0;page<maxPages;page++){
    const response=await list({...params,limit:100,...(startingAfter?{starting_after:startingAfter}:{})}),data=Array.isArray(response&&response.data)?response.data:[];
    rows.push(...data);
    if(!response||response.has_more!==true)return rows;
    const cursor=text(data.at(-1)&&data.at(-1).id);if(!cursor||cursor===startingAfter)throw new Error('stripe_billing_pagination_invalid');
    startingAfter=cursor;
  }
  throw new Error('stripe_billing_pagination_did_not_converge');
}

const APP_STORE_HASH=/^[a-f0-9]{64}$/;

function rowValue(row){
  if(!row||typeof row!=='object')return{};
  return row.value&&typeof row.value==='object'?row.value:row;
}

function appStoreRowState(row,uid,resetEpoch){
  const value=rowValue(row),epoch=Number(value.resetEpoch??0);
  if(!Number.isSafeInteger(epoch)||epoch<0)return'unknown';
  if(value.accountDeleted===true&&epoch<resetEpoch)return'historical';
  if(value.accountDeleted!==true&&epoch===resetEpoch&&value.uid===uid)return'current';
  return'unknown';
}

function appStoreDeletionEvidence({uid,resetEpoch,account=null,tokens=[],transactions=[],notifications=[],entitlement={}}={}){
  const epoch=Number(resetEpoch),safeUid=text(uid),groups={tokens:Array.isArray(tokens)?tokens:[],transactions:Array.isArray(transactions)?transactions:[],notifications:Array.isArray(notifications)?notifications:[]};
  if(!safeUid||!Number.isSafeInteger(epoch)||epoch<0)return{safe:false,reason:'identity'};
  const access=entitlement&&typeof entitlement==='object'?entitlement.appStoreAccess:null,subscriptions=entitlement&&typeof entitlement.appStoreSubscriptions==='object'&&entitlement.appStoreSubscriptions?entitlement.appStoreSubscriptions:{},conflict=entitlement&&entitlement.billingConflict;
  if(access&&typeof access==='object'&&Object.keys(access).length||Object.keys(subscriptions).length||conflict&&conflict.provider==='app_store')return{safe:false,reason:'history'};
  const states=Object.fromEntries(Object.entries(groups).map(([name,rows])=>[name,rows.map(row=>appStoreRowState(row,safeUid,epoch))]));
  if(Object.values(states).some(values=>values.includes('unknown')))return{safe:false,reason:'unknown'};
  if(states.transactions.includes('current')||states.notifications.includes('current'))return{safe:false,reason:'history'};
  const currentTokens=groups.tokens.filter((row,index)=>states.tokens[index]==='current');
  if(account==null){
    if(currentTokens.length)return{safe:false,reason:'unknown'};
    return{safe:true,state:'absent'};
  }
  if(!account||typeof account!=='object')return{safe:false,reason:'unknown'};
  const accountState=appStoreRowState(account,safeUid,epoch);
  if(accountState==='historical'){
    if(currentTokens.length)return{safe:false,reason:'unknown'};
    return{safe:true,state:'historical_tombstone'};
  }
  const hash=text(account.appAccountTokenHash);
  if(accountState!=='current'||account.transactionHistoryState!=='empty'||text(account.lastVerifiedTransactionHash)||!APP_STORE_HASH.test(hash)||currentTokens.length!==1)return{safe:false,reason:account.transactionHistoryState==='verified'||text(account.lastVerifiedTransactionHash)?'history':'unknown'};
  const token=currentTokens[0],tokenValue=rowValue(token),tokenId=text(token.id);
  if(tokenValue.appAccountTokenHash!==hash||tokenId&&tokenId!==hash)return{safe:false,reason:'unknown'};
  return{safe:true,state:'verified_empty'};
}

module.exports={tombstoneId,listAllStripe,appStoreDeletionEvidence};

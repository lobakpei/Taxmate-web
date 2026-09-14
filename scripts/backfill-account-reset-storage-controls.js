'use strict';

const crypto=require('node:crypto');
const firebaseCliAuth=require('firebase-tools/lib/auth');

const PROJECT_ID='taxmate-uk-2';
const BUCKET='taxmate-uk-2.firebasestorage.app';
const DATABASE_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;
const DOCUMENT_ROOT=`${DATABASE_ROOT}/documents`;
const APPLY_CONFIRMATION='taxmate-uk-2/account-reset-storage-controls-v1';
const FIRESTORE_BATCH_SIZE=400;

function sha256(value){return crypto.createHash('sha256').update(value).digest('hex');}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
}
function digest(value){return sha256(JSON.stringify(stable(value)));}
function safeInteger(value){const number=Number(value);return Number.isSafeInteger(number)&&number>=0?number:null;}
function documentUid(path,group){const match=String(path||'').match(new RegExp(`^users/([^/]+)/${group}/current$`));return match&&match[1]||null;}
function receiptIdentity(name){const match=String(name||'').match(/^receipts\/([^/]+)\/([^/]+)$/);return match?{uid:match[1],fileName:match[2]}:null;}

function resetControl(value){
  if(!value)return{status:'complete',epoch:0};
  const status=String(value.status||''),epoch=safeInteger(value.resetEpoch);
  if(status!=='complete'||epoch===null)return null;
  return{status,epoch};
}
function retentionControl(value){
  if(!value)return{status:'complete',epoch:0};
  const status=String(value.status||''),epoch=safeInteger(value.epoch);
  if(!['complete','complete_with_warnings'].includes(status)||epoch===null)return null;
  return{status,epoch};
}
function sameControl(current,desired){
  const retention=current&&typeof current.accountRetention==='object'&&current.accountRetention||{};
  return current?.accountResetStatus===desired.accountResetStatus
    && current?.accountResetEpoch===desired.accountResetEpoch
    && current?.accountResetEpochString===desired.accountResetEpochString
    && retention.controlStatus===desired.accountRetention.controlStatus
    && retention.lastRetentionEpoch===desired.accountRetention.lastRetentionEpoch
    && retention.lastRetentionEpochString===desired.accountRetention.lastRetentionEpochString;
}
function desiredEntitlement(current,reset,retention){
  return{
    accountResetStatus:'complete',
    accountResetEpoch:reset.epoch,
    accountResetEpochString:String(reset.epoch),
    accountRetention:{
      ...(current&&typeof current.accountRetention==='object'?current.accountRetention:{}),
      controlStatus:retention.status,
      lastRetentionEpoch:retention.epoch,
      lastRetentionEpochString:String(retention.epoch),
      activeRetentionEpoch:null
    }
  };
}
function operationDigestRows(plan){
  return[
    ...plan.firestore.map(row=>({kind:'firestore',path:row.path,precondition:row.create?{exists:false}:{updateTime:row.updateTime},fields:row.fields})),
    ...plan.storage.map(row=>({kind:'storage',name:row.name,metageneration:row.metageneration,metadata:row.metadata}))
  ];
}
function buildPlan({entitlements=[],resets=[],retentions=[],objects=[],authUids=[]}){
  const entitlementByUid=new Map(),resetByUid=new Map(),retentionByUid=new Map(),blockers={};
  const verifiedAuthUids=new Set(authUids.map(String));
  const block=reason=>{blockers[reason]=(blockers[reason]||0)+1;};
  for(const row of entitlements){const uid=documentUid(row.path,'entitlements');if(uid)entitlementByUid.set(uid,row);else block('unsupported_entitlement_path');}
  for(const row of resets){const match=String(row.path||'').match(/^accountResets\/([^/]+)$/);if(match)resetByUid.set(match[1],row.data||{});else block('unsupported_reset_path');}
  for(const row of retentions){const uid=documentUid(row.path,'retention');if(uid)retentionByUid.set(uid,row.data||{});else block('unsupported_retention_path');}

  const firestore=[],storage=[];let readyEntitlements=0,readyReceipts=0;
  for(const [uid,row] of entitlementByUid){
    const reset=resetControl(resetByUid.get(uid)),retention=retentionControl(retentionByUid.get(uid));
    if(!reset){block('account_reset_not_ready');continue;}
    if(!retention){block('retention_not_ready');continue;}
    const fields=desiredEntitlement(row.data||{},reset,retention);
    if(sameControl(row.data||{},fields))readyEntitlements++;
    else if(!row.updateTime)block('entitlement_precondition_missing');
    else firestore.push({path:row.path,updateTime:row.updateTime,fields});
  }
  const missingReceiptOwners=new Set(objects.flatMap(row=>{const found=receiptIdentity(row.name);return found&&!entitlementByUid.has(found.uid)?[found.uid]:[];}));
  for(const uid of missingReceiptOwners){
    if(!verifiedAuthUids.has(uid))continue;
    const reset=resetControl(resetByUid.get(uid)),retention=retentionControl(retentionByUid.get(uid));
    if(!reset||!retention)continue;
    const fields={paidTier:'free',subscriptionStatus:'inactive',currentPeriodEnd:0,...desiredEntitlement({},reset,retention)};
    firestore.push({path:`users/${uid}/entitlements/current`,create:true,fields});
    entitlementByUid.set(uid,{path:`users/${uid}/entitlements/current`,data:fields,create:true});
  }
  for(const row of objects){
    const identity=receiptIdentity(row.name);
    if(!identity){block('unsupported_receipt_path');continue;}
    const entitlement=entitlementByUid.get(identity.uid),reset=resetControl(resetByUid.get(identity.uid)),retention=retentionControl(retentionByUid.get(identity.uid));
    if(!entitlement){
      if(!verifiedAuthUids.has(identity.uid))block('receipt_owner_auth_missing');
      else if(!reset)block('receipt_owner_reset_not_ready');
      else if(!retention)block('receipt_owner_retention_not_ready');
      else block('receipt_owner_entitlement_missing');
      continue;
    }
    if(!reset){block('receipt_owner_reset_not_ready');continue;}
    if(!retention){block('receipt_owner_retention_not_ready');continue;}
    const metadata={...(row.metadata||{}),accountResetEpoch:String(reset.epoch),retentionEpoch:String(retention.epoch)};
    if(row.metadata?.accountResetEpoch===metadata.accountResetEpoch&&row.metadata?.retentionEpoch===metadata.retentionEpoch)readyReceipts++;
    else if(!/^\d+$/.test(String(row.metageneration||'')))block('receipt_precondition_missing');
    else storage.push({name:row.name,metageneration:String(row.metageneration),metadata});
  }
  const counts={
    entitlementsScanned:entitlements.length,
    receiptsScanned:objects.length,
    entitlementUpdates:firestore.length,
    receiptMetadataUpdates:storage.length,
    readyEntitlements,
    readyReceipts,
    blockers:Object.values(blockers).reduce((sum,value)=>sum+value,0),
    blockerReasons:Object.fromEntries(Object.entries(blockers).sort(([a],[b])=>a.localeCompare(b)))
  };
  const plan={firestore,storage,counts};
  return{...plan,planDigest:digest(operationDigestRows(plan))};
}

function decodeValue(value){
  if(!value||typeof value!=='object')return null;
  if('nullValue'in value)return null;
  if('booleanValue'in value)return value.booleanValue;
  if('integerValue'in value)return Number(value.integerValue);
  if('doubleValue'in value)return Number(value.doubleValue);
  if('stringValue'in value)return value.stringValue;
  if('timestampValue'in value)return value.timestampValue;
  if('arrayValue'in value)return(value.arrayValue.values||[]).map(decodeValue);
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decodeValue(item)]));
  return null;
}
function decodeDocument(document){
  const prefix=`projects/${PROJECT_ID}/databases/(default)/documents/`,name=String(document?.name||'');
  if(!name.startsWith(prefix))throw new Error('firestore_project_mismatch');
  return{path:name.slice(prefix.length),updateTime:document.updateTime||null,data:Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decodeValue(value)]))};
}
function encodeValue(value){
  if(value===null||value===undefined)return{nullValue:null};
  if(typeof value==='boolean')return{booleanValue:value};
  if(typeof value==='string')return{stringValue:value};
  if(typeof value==='number'&&Number.isFinite(value))return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(Array.isArray(value))return{arrayValue:{values:value.map(encodeValue)}};
  if(typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encodeValue(item)]))}};
  throw new Error('unsupported_firestore_value');
}
function documentName(path){return`projects/${PROJECT_ID}/databases/(default)/documents/${path}`;}
async function accessToken(){
  const account=firebaseCliAuth.getGlobalDefaultAccount();
  if(!account?.tokens?.refresh_token)throw new Error('firebase_cli_login_required');
  const refreshed=await firebaseCliAuth.getAccessToken(account.tokens.refresh_token,[]);
  if(!refreshed?.access_token)throw new Error('firebase_cli_access_token_unavailable');
  return refreshed.access_token;
}
async function requestJson(url,token,options={}){
  const response=await fetch(url,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}}),bodyText=await response.text();
  let body=null;try{body=bodyText?JSON.parse(bodyText):null;}catch{}
  if(!response.ok){const error=new Error(`provider_request_failed_${response.status}`);error.status=response.status;throw error;}
  return body;
}
async function queryCollectionGroup(collectionId,token){
  const rows=await requestJson(`${DOCUMENT_ROOT}:runQuery`,token,{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId,allDescendants:true}]}})});
  return rows.filter(row=>row.document).map(row=>decodeDocument(row.document));
}
async function listRootCollection(collectionId,token){
  const result=[];let pageToken='';
  do{
    const url=new URL(`${DOCUMENT_ROOT}/${encodeURIComponent(collectionId)}`);url.searchParams.set('pageSize','300');if(pageToken)url.searchParams.set('pageToken',pageToken);
    const body=await requestJson(url.toString(),token);result.push(...(body.documents||[]).map(decodeDocument));pageToken=String(body.nextPageToken||'');
  }while(pageToken);
  return result;
}
async function listReceiptObjects(token){
  const result=[];let pageToken='';
  do{
    const url=new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o`);url.searchParams.set('prefix','receipts/');url.searchParams.set('maxResults','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);
    const body=await requestJson(url.toString(),token);result.push(...(body.items||[]).map(item=>({name:item.name,metageneration:String(item.metageneration||''),metadata:item.metadata||{}})));pageToken=String(body.nextPageToken||'');
  }while(pageToken);
  return result;
}
async function inventory(token){
  const [entitlements,resets,retentions,objects]=await Promise.all([
    queryCollectionGroup('entitlements',token),
    listRootCollection('accountResets',token),
    queryCollectionGroup('retention',token),
    listReceiptObjects(token)
  ]);
  const currentEntitlements=entitlements.filter(row=>/^users\/[^/]+\/entitlements\/current$/.test(row.path));
  const entitlementUids=new Set(currentEntitlements.map(row=>documentUid(row.path,'entitlements'))),receiptUids=new Set(objects.flatMap(row=>{const found=receiptIdentity(row.name);return found?[found.uid]:[];}));
  const missingUids=[...receiptUids].filter(uid=>!entitlementUids.has(uid)),authUids=[];
  for(let offset=0;offset<missingUids.length;offset+=100){
    const body=await requestJson(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,token,{method:'POST',body:JSON.stringify({localId:missingUids.slice(offset,offset+100)})});
    authUids.push(...(body.users||[]).map(user=>String(user.localId||'')).filter(Boolean));
  }
  return{entitlements:currentEntitlements,resets,retentions:retentions.filter(row=>/^users\/[^/]+\/retention\/current$/.test(row.path)),objects,authUids};
}
async function applyFirestore(rows,token){
  for(let offset=0;offset<rows.length;offset+=FIRESTORE_BATCH_SIZE){
    const writes=rows.slice(offset,offset+FIRESTORE_BATCH_SIZE).map(row=>({
      update:{name:documentName(row.path),fields:Object.fromEntries(Object.entries(row.fields).map(([key,value])=>[key,encodeValue(value)]))},
      updateMask:{fieldPaths:Object.keys(row.fields).sort()},
      currentDocument:row.create?{exists:false}:{updateTime:row.updateTime}
    }));
    await requestJson(`${DATABASE_ROOT}/documents:commit`,token,{method:'POST',body:JSON.stringify({writes})});
  }
}
async function applyStorage(rows,token){
  for(const row of rows){
    const url=new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(row.name)}`);url.searchParams.set('ifMetagenerationMatch',row.metageneration);
    await requestJson(url.toString(),token,{method:'PATCH',body:JSON.stringify({metadata:row.metadata})});
  }
}
function numberArgument(args,name){const raw=args.find(item=>item.startsWith(`${name}=`));if(!raw)return null;const value=Number(raw.slice(name.length+1));return Number.isSafeInteger(value)&&value>=0?value:null;}
function stringArgument(args,name){const raw=args.find(item=>item.startsWith(`${name}=`));return raw?raw.slice(name.length+1):'';}
function publicReport(status,plan){return{status,projectId:PROJECT_ID,bucket:BUCKET,counts:plan.counts,planDigest:plan.planDigest,customerDataIncluded:false};}
function validateTarget(){
  for(const name of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT'])if(process.env[name]&&process.env[name]!==PROJECT_ID)throw new Error('project_identity_mismatch');
  if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_STORAGE_EMULATOR_HOST)throw new Error('emulator_environment_not_allowed');
}
async function main(args=process.argv.slice(2)){
  validateTarget();const apply=args.includes('--apply');
  if(args.some(value=>!value.startsWith('--')))throw new Error('usage_invalid');
  const token=await accessToken(),plan=buildPlan(await inventory(token));
  if(!apply){process.stdout.write(`${JSON.stringify(publicReport(plan.counts.blockers?'DRY_RUN_BLOCKED':'DRY_RUN_READY',plan),null,2)}\n`);if(plan.counts.blockers)process.exitCode=2;return;}
  const expectedDigest=stringArgument(args,'--expected-plan-digest'),expectedEntitlements=numberArgument(args,'--expected-entitlement-updates'),expectedReceipts=numberArgument(args,'--expected-receipt-updates');
  if(process.env.TAXMATE_BACKFILL_CONFIRM!==APPLY_CONFIRMATION)throw new Error('apply_confirmation_missing');
  if(!/^[a-f0-9]{64}$/.test(expectedDigest)||expectedDigest!==plan.planDigest||expectedEntitlements!==plan.counts.entitlementUpdates||expectedReceipts!==plan.counts.receiptMetadataUpdates)throw new Error('dry_run_plan_mismatch');
  if(plan.counts.blockers)throw new Error('dry_run_blockers_present');
  await applyFirestore(plan.firestore,token);await applyStorage(plan.storage,token);
  const verified=buildPlan(await inventory(token));
  if(verified.counts.blockers||verified.counts.entitlementUpdates||verified.counts.receiptMetadataUpdates)throw new Error('post_apply_verification_failed');
  process.stdout.write(`${JSON.stringify(publicReport('APPLIED_VERIFIED',verified),null,2)}\n`);
}

if(require.main===module)main().catch(error=>{process.stderr.write(`${String(error.message||'backfill_failed').replace(/[^a-z0-9_-]/gi,'_').slice(0,100)}\n`);process.exitCode=1;});

module.exports={PROJECT_ID,BUCKET,APPLY_CONFIRMATION,buildPlan,desiredEntitlement,receiptIdentity,digest,publicReport};

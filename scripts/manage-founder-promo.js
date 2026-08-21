'use strict';

const auth=require('firebase-tools/lib/auth');
const Promotions=require('../functions/founder-promotions');

const PROJECT_ID='taxmate-uk-2';
const PENDING_CODES=['HKGER','EVRI','WORCESTER'];
const DOCUMENT_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/founderPromotions`;
const REDEMPTION_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/promotionRedemptions`;
const DATABASE_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;

function argumentsMap(argv){
  const [command,...rest]=argv,values={command};
  for(let index=0;index<rest.length;index+=2){
    const key=rest[index];if(!key||!key.startsWith('--')||rest[index+1]===undefined)throw new Error(`Invalid argument near ${key||'end of command'}`);
    values[key.slice(2)]=rest[index+1];
  }
  return values;
}

function integer(value,label){const parsed=Number(value);if(!Number.isInteger(parsed))throw new Error(`${label} must be an integer`);return parsed;}
function timestampMillis(value,label){const parsed=Date.parse(value);if(!Number.isFinite(parsed))throw new Error(`${label} must be an ISO date/time`);return parsed;}

function createConfiguration(values,now=Date.now()){
  const code=Promotions.normalizeCode(values.code);if(!code)throw new Error('A valid --code is required');
  const tier=String(values.tier||'').toLowerCase();if(!Promotions.TIER_WEIGHT[tier])throw new Error('--tier must be plus or pro');
  const hasDuration=values['duration-days']!==undefined,hasExpiry=values['expires-at']!==undefined,permanent=values.permanent==='true';
  if([hasDuration,hasExpiry,permanent].filter(Boolean).length!==1)throw new Error('Provide exactly one of --duration-days, --expires-at or --permanent true');
  const maxRedemptions=integer(values['max-redemptions'],'--max-redemptions');
  const startsAt=timestampMillis(values['starts-at'],'--starts-at');
  const configuration={code,tier,maxRedemptions,redemptionCount:0,active:true,startsAt};
  if(hasDuration)configuration.durationDays=integer(values['duration-days'],'--duration-days');
  else if(hasExpiry)configuration.expiresAt=timestampMillis(values['expires-at'],'--expires-at');
  else configuration.permanent=true;
  const validated=Promotions.validateConfiguration(configuration,Math.max(now,startsAt));if(!validated.ok)throw new Error(`Invalid promotion configuration: ${validated.reason}`);
  return configuration;
}

function encodeValue(value){
  if(value===null)return{nullValue:null};
  if(typeof value==='boolean')return{booleanValue:value};
  if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  if(Array.isArray(value))return{arrayValue:{values:value.map(encodeValue)}};
  if(value&&typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encodeValue(item)]))}};
  return{stringValue:String(value)};
}
function encodeFields(values){return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,['createdAt','updatedAt','disabledAt'].includes(key)?{timestampValue:value}:encodeValue(value)]));}
function decodeValue(value){
  if('stringValue'in value)return value.stringValue;if('integerValue'in value)return Number(value.integerValue);
  if('doubleValue'in value)return Number(value.doubleValue);if('booleanValue'in value)return value.booleanValue;
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decodeValue(item)]));
  if('arrayValue'in value)return(value.arrayValue.values||[]).map(decodeValue);
  if('timestampValue'in value)return value.timestampValue;if('nullValue'in value)return null;return undefined;
}
function decodeDocument(document){return Object.fromEntries(Object.entries(document.fields||{}).map(([key,value])=>[key,decodeValue(value)]));}

async function accessToken(){
  const account=auth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw new Error('Firebase CLI login is required');
  const refreshed=await auth.getAccessToken(account.tokens.refresh_token,[]);return refreshed.access_token;
}
async function request(url,token,options={}){
  const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,'content-type':'application/json',...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null;}catch{body=null;}
  if(!response.ok){const error=new Error(body?.error?.message||`${response.status} ${response.statusText}`);error.status=response.status;throw error;}return body;
}
async function getPromotion(code,token){try{return await request(`${DOCUMENT_ROOT}/${encodeURIComponent(code)}`,token);}catch(error){if(error.status===404)return null;throw error;}}
async function getRedemption(id,token){try{return await request(`${REDEMPTION_ROOT}/${encodeURIComponent(id)}`,token);}catch(error){if(error.status===404)return null;throw error;}}
async function patchPromotion(code,fields,token,precondition){
  const mask=Object.keys(fields).map(field=>`updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  const condition=precondition===false?'currentDocument.exists=false':`currentDocument.updateTime=${encodeURIComponent(precondition)}`;
  return request(`${DOCUMENT_ROOT}/${encodeURIComponent(code)}?${mask}&${condition}`,token,{method:'PATCH',body:JSON.stringify({fields:encodeFields(fields)})});
}

async function initializePending(token,now=new Date().toISOString()){
  const results=[];
  for(const code of PENDING_CODES){
    const existing=await getPromotion(code,token);
    if(existing){results.push({code,status:'UNCHANGED'});continue;}
    await patchPromotion(code,{code,active:false,configurationState:'pending-founder-values',redemptionCount:0,createdAt:now,updatedAt:now},token,false);
    results.push({code,status:'INACTIVE_PENDING_FOUNDER_VALUES'});
  }
  return results;
}

async function createPromotion(values,token,now=Date.now()){
  const configuration=createConfiguration(values,now),existing=await getPromotion(configuration.code,token),iso=new Date(now).toISOString();
  if(existing){
    const current=decodeDocument(existing);
    if(current.configurationState!=='pending-founder-values'||current.active!==false||Number(current.redemptionCount)!==0)throw new Error('Promotion already exists and is not an unused pending Founder code');
  }
  const fields={...configuration,configurationState:'configured',createdAt:existing?decodeDocument(existing).createdAt||iso:iso,updatedAt:iso};
  await patchPromotion(configuration.code,fields,token,existing?existing.updateTime:false);
  return{code:configuration.code,status:'ACTIVE',tier:configuration.tier,startsAt:configuration.startsAt,durationDays:configuration.durationDays||null,expiresAt:configuration.expiresAt||null,permanent:configuration.permanent===true,maxRedemptions:configuration.maxRedemptions,redemptionCount:0};
}

async function migratePending(values,token,now=Date.now()){
  const from=Promotions.normalizeCode(values.from);if(!from)throw new Error('A valid --from placeholder is required');
  const configuration=createConfiguration(values,now),source=await getPromotion(from,token),target=await getPromotion(configuration.code,token);
  if(!source)throw new Error('Pending placeholder not found');if(target)throw new Error('Target promotion already exists');
  const pending=decodeDocument(source);if(pending.configurationState!=='pending-founder-values'||pending.active!==false||Number(pending.redemptionCount)!==0)throw new Error('Source is not an unused pending Founder code');
  const iso=new Date(now).toISOString(),fields={...configuration,configurationState:'configured',createdAt:pending.createdAt||iso,updatedAt:iso};
  const targetName=`projects/${PROJECT_ID}/databases/(default)/documents/founderPromotions/${configuration.code}`;
  await request(`${DATABASE_ROOT}/documents:commit`,token,{method:'POST',body:JSON.stringify({writes:[
    {update:{name:targetName,fields:encodeFields(fields)},currentDocument:{exists:false}},
    {delete:source.name,currentDocument:{updateTime:source.updateTime}}
  ]})});
  return{code:configuration.code,migratedFrom:from,status:'ACTIVE',tier:configuration.tier,startsAt:configuration.startsAt,expiresAt:configuration.expiresAt||null,permanent:configuration.permanent===true,maxRedemptions:configuration.maxRedemptions,redemptionCount:0};
}

async function disablePromotion(codeValue,token,now=Date.now()){
  const code=Promotions.normalizeCode(codeValue);if(!code)throw new Error('A valid --code is required');
  const existing=await getPromotion(code,token);if(!existing)throw new Error('Promotion not found');
  await patchPromotion(code,{active:false,disabledAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()},token,existing.updateTime);
  return{code,status:'DISABLED'};
}

async function reschedulePromotion(values,token,now=Date.now()){
  const code=Promotions.normalizeCode(values.code);if(!code)throw new Error('A valid --code is required');
  const startsAt=timestampMillis(values['starts-at'],'--starts-at'),existing=await getPromotion(code,token);
  if(!existing)throw new Error('Promotion not found');
  const current=decodeDocument(existing);
  if(Number(current.redemptionCount)!==0)throw new Error('Promotion already has redemptions and cannot be rescheduled');
  const configuration={...current,code,startsAt};
  const validated=Promotions.validateConfiguration(configuration,Math.max(now,startsAt));
  if(!validated.ok)throw new Error(`Invalid promotion configuration: ${validated.reason}`);
  await patchPromotion(code,{startsAt,updatedAt:new Date(now).toISOString()},token,existing.updateTime);
  return{code,status:'ACTIVE',tier:current.tier,startsAt,expiresAt:current.expiresAt||null,permanent:current.permanent===true,maxRedemptions:current.maxRedemptions,redemptionCount:0};
}

async function promotionStatus(codeValue,token){
  const code=Promotions.normalizeCode(codeValue);if(!code)throw new Error('A valid --code is required');
  const existing=await getPromotion(code,token);if(!existing)return{code,status:'NOT_FOUND'};
  const value=decodeDocument(existing);return{code,status:value.active?'ACTIVE':value.configurationState==='pending-founder-values'?'INACTIVE_PENDING_FOUNDER_VALUES':'DISABLED',tier:value.tier||null,startsAt:value.startsAt||null,durationDays:value.durationDays||null,expiresAt:value.expiresAt||null,permanent:value.permanent===true,maxRedemptions:value.maxRedemptions||null,redemptionCount:Number(value.redemptionCount)||0,remainingCapacity:value.maxRedemptions?Math.max(0,Number(value.maxRedemptions)-Number(value.redemptionCount||0)):null};
}

async function listPromotions(token){
  const body=await request(`${DOCUMENT_ROOT}?pageSize=1000`,token);return(body.documents||[]).map(document=>{const value=decodeDocument(document),code=document.name.split('/').pop();return{code,status:value.active?'ACTIVE':value.configurationState==='pending-founder-values'?'INACTIVE_PENDING_FOUNDER_VALUES':'DISABLED',tier:value.tier||null,maxRedemptions:value.maxRedemptions||null,redemptionCount:Number(value.redemptionCount)||0,remainingCapacity:value.maxRedemptions?Math.max(0,Number(value.maxRedemptions)-Number(value.redemptionCount||0)):null};});
}

async function revokeRedemption(values,token,now=Date.now()){
  const code=Promotions.normalizeCode(values.code),uid=String(values.uid||'').trim();if(!code||!uid)throw new Error('Valid --code and --uid are required');
  const id=Promotions.redemptionId(code,uid),redemption=await getRedemption(id,token);if(!redemption)throw new Error('Redemption not found');
  const redemptionValue=decodeDocument(redemption);if(redemptionValue.uid!==uid||redemptionValue.promoCode!==code)throw new Error('Redemption identity mismatch');
  const entitlementUrl=`${DATABASE_ROOT}/documents/users/${encodeURIComponent(uid)}/entitlements/current`,entitlement=await request(entitlementUrl,token),entitlementValue=decodeDocument(entitlement);
  const promotions={...(entitlementValue.promotions||{})};if(!promotions[code])throw new Error('Promo entitlement not found');delete promotions[code];
  const effective=Promotions.selectEffective(promotions,now),promotionAccess=Promotions.accessProjection(promotions,now),iso=new Date(now).toISOString();
  const writes=[
    {update:{name:redemption.name,fields:encodeFields({status:'revoked',revokedAt:iso})},updateMask:{fieldPaths:['status','revokedAt']},currentDocument:{updateTime:redemption.updateTime}},
    {update:{name:entitlement.name,fields:encodeFields({promotions,promotionAccess,promotion:effective?{status:'active',tier:effective.tier,startsAt:effective.startsAt||0,expiresAt:effective.expiresAt??null,permanent:effective.permanent===true,promoCode:effective.code}:null,serverVerifiedAt:now,updatedAt:iso})},updateMask:{fieldPaths:['promotions','promotionAccess','promotion','serverVerifiedAt','updatedAt']},currentDocument:{updateTime:entitlement.updateTime}}
  ];
  await request(`${DATABASE_ROOT}/documents:commit`,token,{method:'POST',body:JSON.stringify({writes})});return{code,uid,status:'REVOKED'};
}

async function main(argv=process.argv.slice(2)){
  const values=argumentsMap(argv),token=await accessToken();let result;
  if(values.command==='init-pending')result=await initializePending(token);
  else if(values.command==='create')result=await createPromotion(values,token);
  else if(values.command==='migrate')result=await migratePending(values,token);
  else if(values.command==='reschedule')result=await reschedulePromotion(values,token);
  else if(values.command==='disable')result=await disablePromotion(values.code,token);
  else if(values.command==='status'||values.command==='view')result=await promotionStatus(values.code,token);
  else if(values.command==='list')result=await listPromotions(token);
  else if(values.command==='revoke')result=await revokeRedemption(values,token);
  else throw new Error('Usage: promo:admin <init-pending|create|migrate|reschedule|disable|status|view|list|revoke> [--from PLACEHOLDER --code CODE --tier plus|pro --starts-at ISO --duration-days N|--expires-at ISO|--permanent true --max-redemptions N --uid UID]');
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}

if(require.main===module)main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
module.exports={PROJECT_ID,PENDING_CODES,argumentsMap,createConfiguration,encodeFields,decodeDocument,initializePending,createPromotion,migratePending,reschedulePromotion,disablePromotion,promotionStatus,listPromotions,revokeRedemption};

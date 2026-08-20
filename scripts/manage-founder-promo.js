'use strict';

const auth=require('firebase-tools/lib/auth');
const Promotions=require('../functions/founder-promotions');

const PROJECT_ID='taxmate-uk-2';
const PENDING_CODES=['HKGER','EVRI','WORCESTER'];
const DOCUMENT_ROOT=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/founderPromotions`;

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
  const hasDuration=values['duration-days']!==undefined,hasExpiry=values['expires-at']!==undefined;
  if(hasDuration===hasExpiry)throw new Error('Provide exactly one of --duration-days or --expires-at');
  const maxRedemptions=integer(values['max-redemptions'],'--max-redemptions');
  const configuration={code,tier,maxRedemptions,redemptionCount:0,active:true};
  if(hasDuration)configuration.durationDays=integer(values['duration-days'],'--duration-days');
  else configuration.expiresAt=timestampMillis(values['expires-at'],'--expires-at');
  const validated=Promotions.validateConfiguration(configuration,now);if(!validated.ok)throw new Error(`Invalid promotion configuration: ${validated.reason}`);
  return configuration;
}

function encodeValue(value){
  if(value===null)return{nullValue:null};
  if(typeof value==='boolean')return{booleanValue:value};
  if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};
  return{stringValue:String(value)};
}
function encodeFields(values){return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,['createdAt','updatedAt','disabledAt'].includes(key)?{timestampValue:value}:encodeValue(value)]));}
function decodeValue(value){
  if('stringValue'in value)return value.stringValue;if('integerValue'in value)return Number(value.integerValue);
  if('doubleValue'in value)return Number(value.doubleValue);if('booleanValue'in value)return value.booleanValue;
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
  return{code:configuration.code,status:'ACTIVE',tier:configuration.tier,durationDays:configuration.durationDays||null,expiresAt:configuration.expiresAt||null,maxRedemptions:configuration.maxRedemptions,redemptionCount:0};
}

async function disablePromotion(codeValue,token,now=Date.now()){
  const code=Promotions.normalizeCode(codeValue);if(!code)throw new Error('A valid --code is required');
  const existing=await getPromotion(code,token);if(!existing)throw new Error('Promotion not found');
  await patchPromotion(code,{active:false,disabledAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()},token,existing.updateTime);
  return{code,status:'DISABLED'};
}

async function promotionStatus(codeValue,token){
  const code=Promotions.normalizeCode(codeValue);if(!code)throw new Error('A valid --code is required');
  const existing=await getPromotion(code,token);if(!existing)return{code,status:'NOT_FOUND'};
  const value=decodeDocument(existing);return{code,status:value.active?'ACTIVE':value.configurationState==='pending-founder-values'?'INACTIVE_PENDING_FOUNDER_VALUES':'DISABLED',tier:value.tier||null,durationDays:value.durationDays||null,expiresAt:value.expiresAt||null,maxRedemptions:value.maxRedemptions||null,redemptionCount:Number(value.redemptionCount)||0};
}

async function main(argv=process.argv.slice(2)){
  const values=argumentsMap(argv),token=await accessToken();let result;
  if(values.command==='init-pending')result=await initializePending(token);
  else if(values.command==='create')result=await createPromotion(values,token);
  else if(values.command==='disable')result=await disablePromotion(values.code,token);
  else if(values.command==='status')result=await promotionStatus(values.code,token);
  else throw new Error('Usage: promo:admin <init-pending|create|disable|status> [--code CODE --tier plus|pro --duration-days N|--expires-at ISO --max-redemptions N]');
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}

if(require.main===module)main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
module.exports={PROJECT_ID,PENDING_CODES,argumentsMap,createConfiguration,encodeFields,decodeDocument,initializePending,createPromotion,disablePromotion,promotionStatus};

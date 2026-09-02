'use strict';

const crypto=require('node:crypto');

const FOUNDER_ALIAS='lobakpe1';
const FOUNDER_UID_SHA256='61cee3549f9c0b6dc5608ccbaf6ee20504bb7d52a9133f5a23e09c0023220032';
const FOUNDER_EMAIL_SHA256='2d672b1e8274cef707c7e2e6caa6bb6903b3b21b472c264026287fba74c6f0cf';
const FOUNDER_CLIENT_VERSION='2.1.14';
const FOUNDER_COMPANY=Object.freeze({number:'00000000',name:'LOBAKPE FOUNDER PREVIEW LTD',incorporationDate:'2025-12-15',status:'active',type:'ltd',registryUrl:null});

const sha256=value=>crypto.createHash('sha256').update(String(value||''),'utf8').digest('hex');
const safeEqual=(actual,expected)=>/^[a-f0-9]{64}$/.test(actual)&&/^[a-f0-9]{64}$/.test(expected)&&crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
function founderIdentityGate(user,expected={}){
  const token=user&&user.token||{},uid=String(user&&user.uid||''),email=String(token.email||'').trim().toLowerCase(),provider=String(token.firebase&&token.firebase.sign_in_provider||''),uidHash=String(expected.uidSha256||FOUNDER_UID_SHA256).toLowerCase(),emailHash=String(expected.emailSha256||FOUNDER_EMAIL_SHA256).toLowerCase();
  if(!uid)return{allowed:false,reason:'auth_missing'};if(!safeEqual(sha256(uid),uidHash))return{allowed:false,reason:'uid_mismatch'};if(!email||!safeEqual(sha256(email),emailHash))return{allowed:false,reason:'email_mismatch'};if(token.email_verified!==true)return{allowed:false,reason:'email_verification'};if(provider!=='google.com')return{allowed:false,reason:'provider'};return{allowed:true,reason:null};
}

function isFounderIdentity(user,expected={}){return founderIdentityGate(user,expected).allowed;}

function createHandler({HttpsError,authenticate,requireTier,apiKey,fetchImpl=globalThis.fetch,expectedFounderUidSha256=FOUNDER_UID_SHA256,expectedFounderEmailSha256=FOUNDER_EMAIL_SHA256,requiredFounderClientVersion=FOUNDER_CLIENT_VERSION,diagnosticLog=console.warn}){
  if(typeof HttpsError!=='function'||typeof authenticate!=='function'||typeof requireTier!=='function'||typeof apiKey!=='function'||typeof fetchImpl!=='function')throw new TypeError('Companies House handler dependencies are required');
  const invalidCompanyNumber=()=>new HttpsError('invalid-argument','Invalid company number',{reason:'company_number_format'});
  return async req=>{
    const raw=String(req&&req.data&&req.data.companyNumber||'').trim(),isAlias=raw.toLowerCase()===FOUNDER_ALIAS;
    if(isAlias){
      const founder=req&&req.auth,clientVersion=String(req&&req.data&&req.data.clientVersion||''),log=(reason,stage)=>{try{diagnosticLog('founder-alias-gate',{category:'founder_alias_gate',safeCode:`FOUNDER_ALIAS_${String(reason).toUpperCase()}`,stage});}catch(_){}};
      if(clientVersion!==requiredFounderClientVersion){log('client_version','client');throw invalidCompanyNumber();}
      const gate=founderIdentityGate(founder,{uidSha256:expectedFounderUidSha256,emailSha256:expectedFounderEmailSha256});if(!gate.allowed){log(gate.reason,'identity');throw invalidCompanyNumber();}
      try{await requireTier(founder.uid,'pro');}catch(error){log('tier','entitlement');throw error;}
      return{status:'found',company:{...FOUNDER_COMPANY},verificationStatus:'verified',reasonCodes:['founder_preview_test_data'],previewFixture:true,previewAlias:FOUNDER_ALIAS,retryable:false};
    }
    const user=authenticate(req),companyNumber=raw.toUpperCase();
    if(!/^[A-Z0-9]{8}$/.test(companyNumber))throw invalidCompanyNumber();
    await requireTier(user.uid,'pro');
    const key=String(apiKey()||'');
    if(!key)throw new HttpsError('failed-precondition','Companies House lookup is unavailable',{reason:'companies_house_provider_not_configured'});
    let response;
    try{
      response=await fetchImpl(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`,{headers:{accept:'application/json',authorization:`Basic ${Buffer.from(`${key}:`,'utf8').toString('base64')}`},signal:AbortSignal.timeout(8000)});
    }catch(error){
      throw new HttpsError('unavailable','Companies House lookup is temporarily unavailable',{reason:error&&error.name==='TimeoutError'?'companies_house_timeout':'companies_house_network_failed',retryable:true});
    }
    if(response.status===404)return{status:'not_found',companyNumber,reasonCode:'company_not_found',retryable:false};
    if(response.status===429||response.status>=500)throw new HttpsError('unavailable','Companies House lookup is temporarily unavailable',{reason:response.status===429?'companies_house_rate_limited':'companies_house_temporarily_unavailable',retryable:true});
    if(!response.ok)throw new HttpsError('internal','Companies House lookup failed',{reason:'companies_house_lookup_failed'});
    const body=await response.json(),name=String(body.company_name||'').trim(),incorporationDate=String(body.date_of_creation||'');
    if(!name||!(/^(\d{4})-(\d{2})-(\d{2})$/).test(incorporationDate))throw new HttpsError('data-loss','Companies House returned an invalid identity',{reason:'companies_house_response_invalid'});
    const company={number:companyNumber,name,incorporationDate,status:body.company_status||null,type:body.type||null,registryUrl:`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`},reasonCodes=[];
    if(company.status!=='active')reasonCodes.push('companies_house_status_needs_checking');
    if(company.type!=='ltd')reasonCodes.push('companies_house_company_type_not_supported');
    return{status:'found',company,verificationStatus:reasonCodes.length?'needs_checking':'verified',reasonCodes,retryable:false};
  };
}

module.exports={FOUNDER_ALIAS,FOUNDER_UID_SHA256,FOUNDER_EMAIL_SHA256,FOUNDER_CLIENT_VERSION,FOUNDER_COMPANY,founderIdentityGate,isFounderIdentity,createHandler};

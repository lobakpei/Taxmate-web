'use strict';

const crypto=require('node:crypto');

const FOUNDER_ALIAS='lobakpe1';
const FOUNDER_IDENTITY_SHA256='bf8b804e0393a21fb123a03f497df20247526969807ea403c458e5220a88f8df';
const FOUNDER_COMPANY=Object.freeze({number:'00000000',name:'LOBAKPE FOUNDER PREVIEW LTD',incorporationDate:'2025-12-15',status:'active',type:'ltd',registryUrl:null});

function identitySha256(user){
  const token=user&&user.token||{},uid=String(user&&user.uid||''),email=String(token.email||'').trim().toLowerCase(),provider=String(token.firebase&&token.firebase.sign_in_provider||'');
  if(!uid||!email||token.email_verified!==true||provider!=='google.com')return null;
  return crypto.createHash('sha256').update(`${uid}\n${email}`,'utf8').digest('hex');
}

function isFounderIdentity(user,expectedSha256=FOUNDER_IDENTITY_SHA256){
  const actual=identitySha256(user),expected=String(expectedSha256||'').toLowerCase();
  if(!actual||!/^[a-f0-9]{64}$/.test(expected))return false;
  return crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
}

function createHandler({HttpsError,authenticate,requireTier,apiKey,fetchImpl=globalThis.fetch,expectedFounderIdentitySha256=FOUNDER_IDENTITY_SHA256}){
  if(typeof HttpsError!=='function'||typeof authenticate!=='function'||typeof requireTier!=='function'||typeof apiKey!=='function'||typeof fetchImpl!=='function')throw new TypeError('Companies House handler dependencies are required');
  const invalidCompanyNumber=()=>new HttpsError('invalid-argument','Invalid company number',{reason:'company_number_format'});
  return async req=>{
    const raw=String(req&&req.data&&req.data.companyNumber||'').trim(),isAlias=raw.toLowerCase()===FOUNDER_ALIAS;
    if(isAlias){
      const founder=req&&req.auth;
      if(!isFounderIdentity(founder,expectedFounderIdentitySha256))throw invalidCompanyNumber();
      await requireTier(founder.uid,'pro');
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

module.exports={FOUNDER_ALIAS,FOUNDER_IDENTITY_SHA256,FOUNDER_COMPANY,identitySha256,isFounderIdentity,createHandler};

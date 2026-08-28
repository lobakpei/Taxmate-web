'use strict';

const CompanyIdentity=require('../../core/company-identity');

const DEFAULT_BASE_URL='https://api.company-information.service.gov.uk';
const PUBLIC_BASE_URL='https://find-and-update.company-information.service.gov.uk/company';
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

function unavailableProvider(reasonCode='companies_house_provider_not_configured'){
  return Object.freeze({isNetworkProvider:false,async lookup(){return{status:'unavailable',retryable:false,reasonCode};}});
}

function createCompaniesHouseProvider(options={}){
  const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=String(options.apiKey||''),baseUrl=String(options.baseUrl||DEFAULT_BASE_URL).replace(/\/$/,'');
  if(typeof fetchImpl!=='function'||!apiKey)return unavailableProvider();
  const timeoutMs=Number.isInteger(options.timeoutMs)?options.timeoutMs:8000;
  return Object.freeze({
    isNetworkProvider:true,
    async lookup(rawNumber){
      const validation=CompanyIdentity.validateCompanyNumber(rawNumber);
      if(!validation.valid)return{status:'field_error',retryable:false,reasonCode:validation.reason};
      const number=validation.normalized,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const basic=Buffer.from(`${apiKey}:`,'utf8').toString('base64');
        const response=await fetchImpl(`${baseUrl}/company/${encodeURIComponent(number)}`,{method:'GET',headers:{accept:'application/json',authorization:`Basic ${basic}`},signal:controller.signal});
        if(response.status===404)return{status:'not_found',retryable:false,reasonCode:'company_not_found',companyNumber:number};
        if(response.status===401||response.status===403)return{status:'unavailable',retryable:false,reasonCode:'companies_house_provider_auth_failed'};
        if(response.status===429||response.status>=500)return{status:'unavailable',retryable:true,reasonCode:response.status===429?'companies_house_rate_limited':'companies_house_temporarily_unavailable'};
        if(!response.ok)return{status:'unavailable',retryable:false,reasonCode:'companies_house_lookup_failed'};
        const body=await response.json(),name=typeof body.company_name==='string'?body.company_name.trim():'',incorporationDate=body.date_of_creation;
        if(!name||!CompanyIdentity.validateCompanyName(name,{requirePrivateEnding:true}).valid||!/^\d{4}-\d{2}-\d{2}$/.test(String(incorporationDate||'')))return{status:'unavailable',retryable:false,reasonCode:'companies_house_response_invalid'};
        return{status:'found',retryable:false,company:{number,name,incorporationDate,status:body.company_status||null,type:body.type||null,registryUrl:`${PUBLIC_BASE_URL}/${encodeURIComponent(number)}`},rawIdentity:{etag:body.etag||null}};
      }catch(error){return{status:'unavailable',retryable:error&&error.name==='AbortError',reasonCode:error&&error.name==='AbortError'?'companies_house_timeout':'companies_house_network_failed'};}
      finally{clearTimeout(timer);}
    }
  });
}

module.exports={DEFAULT_BASE_URL,PUBLIC_BASE_URL,unavailableProvider,createCompaniesHouseProvider};

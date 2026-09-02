(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('../../core/company-identity'):root.TaxMateCompanyIdentity);
  if(node)module.exports=api;
  root.TaxMateCompaniesHouseProvider=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(CompanyIdentity){
'use strict';

const PUBLIC_BASE_URL='https://find-and-update.company-information.service.gov.uk/company';
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const SUPPORTED_TYPES=Object.freeze(['ltd']);
const SUPPORTED_STATUSES=Object.freeze(['active']);
const FOUNDER_SHORTCUT_ALIAS='lobakpe1';
const FOUNDER_SHORTCUT_MODE='ltd-founder-preview';
const FOUNDER_SHORTCUT_COMPANY=Object.freeze({number:null,name:'LOBAKPE FOUNDER PREVIEW LTD',incorporationDate:'2025-12-15',status:null,type:null,registryUrl:null});
function assessRegistryCompany(company){const reasons=[];if(!company||!SUPPORTED_STATUSES.includes(company.status))reasons.push('companies_house_status_needs_checking');if(!company||!SUPPORTED_TYPES.includes(company.type))reasons.push('companies_house_company_type_not_supported');return{verificationStatus:reasons.length?'needs_checking':'verified',reasonCodes:reasons};}
function alias(value){return String(value||'').trim().toLowerCase()===FOUNDER_SHORTCUT_ALIAS;}
function founderShortcutAllowed(context={}){return['localhost','127.0.0.1','::1','[::1]'].includes(String(context.hostname||'').toLowerCase())&&context.firebaseProjectId==='demo-taxmate'&&context.firebaseEmulators===true&&context.previewMode===FOUNDER_SHORTCUT_MODE;}

function unavailableProvider(reasonCode='companies_house_provider_not_configured'){
  return Object.freeze({isNetworkProvider:false,async lookup(){return{status:'unavailable',retryable:false,reasonCode};}});
}
function createCallableProvider(callable){
  if(typeof callable!=='function')return unavailableProvider('companies_house_callable_not_configured');return Object.freeze({isNetworkProvider:true,acceptsAlias:alias,async lookup(companyNumber){try{const response=await callable({companyNumber}),result=response&&response.data||response;if(!result||!['found','not_found'].includes(result.status))return{status:'unavailable',retryable:true,reasonCode:'companies_house_callable_invalid_response'};return clone(result);}catch(error){const details=error&&error.details||{},reasonCode=details.reason||'companies_house_callable_failed';if(reasonCode==='company_number_format')return{status:'field_error',retryable:false,reasonCode};return{status:'unavailable',retryable:details.retryable!==false,reasonCode};}}});
}
function createFounderShortcutProvider(provider,context={}){
  const fallback=provider&&typeof provider.lookup==='function'?provider:unavailableProvider(),enabled=founderShortcutAllowed(context);
  return Object.freeze({
    isNetworkProvider:fallback.isNetworkProvider===true,
    founderShortcutMode:enabled,
    acceptsAlias:value=>alias(value)&&(enabled||typeof fallback.acceptsAlias==='function'&&fallback.acceptsAlias(value)),
    async lookup(value){
      if(alias(value)){
        if(enabled)return{status:'found',verificationStatus:'manual_unverified',retryable:false,reasonCodes:['companies_house_verification_not_completed'],founderShortcut:true,company:clone(FOUNDER_SHORTCUT_COMPANY)};
        if(typeof fallback.acceptsAlias!=='function'||!fallback.acceptsAlias(value))return{status:'field_error',retryable:false,reasonCode:'company_number_format'};
      }
      return fallback.lookup(value);
    }
  });
}

return{PUBLIC_BASE_URL,SUPPORTED_TYPES,SUPPORTED_STATUSES,FOUNDER_SHORTCUT_ALIAS,FOUNDER_SHORTCUT_MODE,FOUNDER_SHORTCUT_COMPANY,assessRegistryCompany,founderShortcutAllowed,unavailableProvider,createCallableProvider,createFounderShortcutProvider};
});

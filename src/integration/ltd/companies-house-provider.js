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
function assessRegistryCompany(company){const reasons=[];if(!company||!SUPPORTED_STATUSES.includes(company.status))reasons.push('companies_house_status_needs_checking');if(!company||!SUPPORTED_TYPES.includes(company.type))reasons.push('companies_house_company_type_not_supported');return{verificationStatus:reasons.length?'needs_checking':'verified',reasonCodes:reasons};}

function unavailableProvider(reasonCode='companies_house_provider_not_configured'){
  return Object.freeze({isNetworkProvider:false,async lookup(){return{status:'unavailable',retryable:false,reasonCode};}});
}
function createCallableProvider(callable){
  if(typeof callable!=='function')return unavailableProvider('companies_house_callable_not_configured');return Object.freeze({isNetworkProvider:true,async lookup(companyNumber){try{const response=await callable({companyNumber}),result=response&&response.data||response;if(!result||!['found','not_found'].includes(result.status))return{status:'unavailable',retryable:true,reasonCode:'companies_house_callable_invalid_response'};return clone(result);}catch(error){const details=error&&error.details||{};return{status:'unavailable',retryable:details.retryable!==false,reasonCode:details.reason||'companies_house_callable_failed'};}}});
}

return{PUBLIC_BASE_URL,SUPPORTED_TYPES,SUPPORTED_STATUSES,assessRegistryCompany,unavailableProvider,createCallableProvider};
});

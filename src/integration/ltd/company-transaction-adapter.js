'use strict';

const Money=require('../../core/money');

const EXPENSE_CATEGORIES=Object.freeze(['day_to_day','formation','equipment','software_dev','stock','other']);
const INCOME_CATEGORIES=Object.freeze(['trading','non_trading','asset_disposal','other']);
const PRIVATE_USE_ID='private-use';
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

function expenseCategory(input={}){
  const category=input.companyExpenseCategory,taxFacts=input.taxFacts||{};
  if(!EXPENSE_CATEGORIES.includes(category)||taxFacts.unsureTreatment===true)return'unknown';
  if(category==='formation')return'formation';
  if(category==='equipment')return'capital';
  if(category==='software_dev')return'software_development';
  if(category==='stock')return'stock';
  if(category!=='day_to_day'||taxFacts.capitalUseOverOneYear!=='no')return taxFacts.capitalUseOverOneYear==='yes'?'capital':'unknown';
  return'ordinary_running';
}

function deriveExpenseTreatment(input={}){
  const category=expenseCategory(input),taxFacts=input.taxFacts||{};
  const shared=input.sharedExpense||null,scope=shared?'shared':taxFacts.companyUseScope==='only_company'?'only_company':taxFacts.companyUseScope==='not_only_company'?'not_only_company':'unknown';
  const provenance={schemaVersion:1,companyUseScope:scope,sourceQuestion:'money.only_company',answer:taxFacts.companyUseScope||'unknown',allocationDerived:!!shared,companyAllocationMinor:shared&&shared.companyAmountMinor||null,grossAmountMinor:shared&&shared.grossAmountMinor||input.amountMinor||null,derivedAtAction:'company_expense_capture'};
  if(category!=='ordinary_running')return{canonicalCategory:category,treatmentBasis:`${category}_review_required`,confirmations:{},provenance};
  const confirmations={revenueExpenseConfirmed:true,whollyAndExclusivelyBusiness:scope==='only_company',capitalExpense:false};
  if(taxFacts.specialCost==='no')confirmations.specificallyDisallowed=false;
  for(const field of ['wouldBeDeductibleAfterTrading','reliefClaimedElsewhere','advancePaymentOrStock'])if(typeof taxFacts[field]==='boolean')confirmations[field]=taxFacts[field];
  return{canonicalCategory:category,treatmentBasis:scope==='only_company'?'ordinary_running_expense_confirmed':'ordinary_running_expense_review_required',confirmations,provenance};
}

function deriveIncomeTreatment(input={}){
  const category=INCOME_CATEGORIES.includes(input.companyIncomeCategory)?input.companyIncomeCategory:'other';
  if(category==='trading')return{canonicalCategory:'sales',treatmentBasis:'ordinary_trading_income_confirmed',confirmations:{ordinaryTradingIncomeConfirmed:true,nonTradingIncome:false,chargeableGain:false}};
  if(category==='non_trading')return{canonicalCategory:'non_trading_income',treatmentBasis:'non_trading_income_review_required',confirmations:{ordinaryTradingIncomeConfirmed:false,nonTradingIncome:true,chargeableGain:false}};
  if(category==='asset_disposal')return{canonicalCategory:'asset_disposal',treatmentBasis:'chargeable_gain_review_required',confirmations:{ordinaryTradingIncomeConfirmed:false,nonTradingIncome:false,chargeableGain:true}};
  return{canonicalCategory:'unknown_income',treatmentBasis:'income_treatment_review_required',confirmations:{}};
}

function deriveSharedAllocation(input={}){
  const gross=input.grossAmountMinor,companyEntityId=input.companyEntityId,allocations=clone(input.allocations||[]),entitiesByBusinessId=input.entitiesByBusinessId||{};
  Money.assertMinor(gross,'Shared expense gross',{nonNegative:true});
  if(gross<=0||typeof companyEntityId!=='string'||!companyEntityId)return{status:'field_error',reasonCode:'shared_allocation_invalid'};
  if(!Array.isArray(allocations)||!allocations.length)return{status:'field_error',reasonCode:'allocation_exact_sum_required'};
  const ids=new Set();let total=0,companyAmountMinor=0,privateUseAmountMinor=0;
  const canonical=[];
  for(const item of allocations){
    if(!item||typeof item.id!=='string'||ids.has(item.id)||!Number.isSafeInteger(item.amountMinor)||item.amountMinor<=0)return{status:'field_error',reasonCode:'shared_allocation_invalid'};
    ids.add(item.id);total=Money.sumMinor([total,item.amountMinor],'Shared allocation total');
    if(item.id===companyEntityId){companyAmountMinor=Money.sumMinor([companyAmountMinor,item.amountMinor],'Company allocation');canonical.push({id:item.id,entityId:companyEntityId,scope:'business',amountMinor:item.amountMinor,sourceBusinessId:null});continue;}
    if(item.id===PRIVATE_USE_ID){privateUseAmountMinor=Money.sumMinor([privateUseAmountMinor,item.amountMinor],'Private allocation');canonical.push({id:item.id,entityId:companyEntityId,scope:'private',amountMinor:item.amountMinor,sourceBusinessId:null});continue;}
    const entityId=entitiesByBusinessId[item.id];if(!entityId)return{status:'field_error',reasonCode:'shared_allocation_business_not_found'};
    canonical.push({id:item.id,entityId,scope:'business',amountMinor:item.amountMinor,sourceBusinessId:item.id});
  }
  if(total!==gross)return{status:'field_error',reasonCode:'allocation_exact_sum_required'};
  if(companyAmountMinor<=0)return{status:'field_error',reasonCode:'company_allocation_required'};
  const nonCompanyAmountMinor=gross-companyAmountMinor;
  return{status:'ok',data:{grossAmountMinor:gross,companyAmountMinor,nonCompanyAmountMinor,personalAmountMinor:nonCompanyAmountMinor,privateUseAmountMinor,businessUseBasisPoints:Math.max(1,Math.min(10000,Math.round(companyAmountMinor*10000/gross))),allocations:canonical}};
}

module.exports={EXPENSE_CATEGORIES,INCOME_CATEGORIES,PRIVATE_USE_ID,expenseCategory,deriveExpenseTreatment,deriveIncomeTreatment,deriveSharedAllocation};

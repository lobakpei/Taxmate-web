(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./domain-schema'):root.TaxMateDomain,node?require('./company-profile'):root.TaxMateCompanyProfile,node?require('./company-tax-rules'):root.TaxMateCompanyTaxRules);
  if(node)module.exports=api;root.TaxMateCompanyDeadlines=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Domain,CompanyProfile,CompanyTaxRules){
  'use strict';
  if(!Domain||!CompanyProfile||!CompanyTaxRules)throw new Error('TaxMate company-deadline dependencies are required');

  const RULESET_VERSION='uk-company-deadlines.2026-08-22.1',VERIFIED_AT='2026-08-22',REVIEW_BY='2027-08-22';
  const SOURCES=Object.freeze([
    Object.freeze({id:'GOVUK-COMPANY-ACCOUNTS-AND-RETURNS',url:'https://www.gov.uk/prepare-file-annual-accounts-for-limited-company',title:'Accounts and tax returns for private limited companies'}),
    Object.freeze({id:'GOVUK-PAY-CORPORATION-TAX',url:'https://www.gov.uk/pay-corporation-tax',title:'Pay your Corporation Tax bill'}),
    Object.freeze({id:'GOVUK-COMPANIES-HOUSE-ACCOUNTS',url:'https://www.gov.uk/government/publications/life-of-a-company-annual-requirements/life-of-a-company-part-1-accounts',title:'Preparing and filing Companies House accounts'})
  ]);
  const RULESET=Object.freeze({
    schemaVersion:1,rulesetVersion:RULESET_VERSION,jurisdiction:'UK',verifiedAt:VERIFIED_AT,reviewBy:REVIEW_BY,
    supportedProfile:'private_limited_by_shares',currency:'GBP',normalCorporationTaxPaymentProfitLimitMinor:150000000,
    firstAccountsMonthsFromIncorporation:21,firstLongAccountsMonthsFromReferenceDate:3,annualAccountsMonthsFromPeriodEnd:9,
    corporationTaxPaymentMonthsFromPeriodEnd:9,corporationTaxPaymentExtraDays:1,companyTaxReturnMonthsFromPeriodEnd:12,
    officialSources:SOURCES
  });
  const clone=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const unique=values=>Array.from(new Set(values));

  function validateRuleset(value){
    const errors=[];
    if(!plain(value)||value.schemaVersion!==1||value.rulesetVersion!==RULESET_VERSION||value.jurisdiction!=='UK'||value.verifiedAt!==VERIFIED_AT||value.reviewBy!==REVIEW_BY||value.supportedProfile!=='private_limited_by_shares'||value.currency!=='GBP')errors.push('company deadline identity is invalid');
    if(!value||value.normalCorporationTaxPaymentProfitLimitMinor!==150000000||value.firstAccountsMonthsFromIncorporation!==21||value.firstLongAccountsMonthsFromReferenceDate!==3||value.annualAccountsMonthsFromPeriodEnd!==9||value.corporationTaxPaymentMonthsFromPeriodEnd!==9||value.corporationTaxPaymentExtraDays!==1||value.companyTaxReturnMonthsFromPeriodEnd!==12)errors.push('company deadline values changed');
    if(!value||!Array.isArray(value.officialSources)||value.officialSources.length!==3||value.officialSources.some(source=>!plain(source)||!/^GOVUK-/.test(source.id||'')||!/^https:\/\/www\.gov\.uk\//.test(source.url||'')||typeof source.title!=='string'||!source.title))errors.push('company deadline sources are invalid');
    return{valid:errors.length===0,errors};
  }
  function approvedRuleset(){const result=validateRuleset(RULESET);if(!result.valid)throw new Error('Invalid approved company deadline ruleset: '+result.errors.join('; '));return RULESET;}
  function dateParts(date){if(!Domain.isoDate(date))throw new Error('Invalid company deadline date');const [year,month,day]=date.split('-').map(Number);return{year,month,day};}
  function iso(year,month,day){return new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);}
  function addCalendarMonths(date,months){
    const parts=dateParts(date);if(!Number.isSafeInteger(months)||months<0)throw new Error('Invalid company deadline month interval');
    const absolute=parts.year*12+(parts.month-1)+months,year=Math.floor(absolute/12),month=absolute%12+1,lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();return iso(year,month,Math.min(parts.day,lastDay));
  }
  function addDays(date,days){dateParts(date);if(!Number.isSafeInteger(days))throw new Error('Invalid company deadline day interval');const value=new Date(date+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
  function lastDayOfTwelveMonths(date){
    const parts=dateParts(date),targetYear=parts.year+1,lastDay=new Date(Date.UTC(targetYear,parts.month,0)).getUTCDate(),targetDay=parts.day>lastDay?lastDay:parts.day;
    return parts.day<=lastDay?addDays(iso(targetYear,parts.month,targetDay),-1):iso(targetYear,parts.month,targetDay);
  }
  function deadlineStatus(dueDate,asOfDate){return asOfDate>dueDate?'overdue_unconfirmed':asOfDate===dueDate?'due_today_unconfirmed':'upcoming_unconfirmed';}
  function deadline(kind,dueDate,asOfDate,sourceIds,extra={}){return Object.assign({kind,dueDate,status:deadlineStatus(dueDate,asOfDate),completionStatus:'unconfirmed',rulesetVersion:RULESET_VERSION,sourceIds:clone(sourceIds)},extra);}
  function reviewDeadline(kind,reasons,sourceIds,extra={}){return Object.assign({kind,dueDate:null,status:'review_required',completionStatus:'unconfirmed',reasonCodes:unique(reasons),rulesetVersion:RULESET_VERSION,sourceIds:clone(sourceIds)},extra);}
  function accountsDeadline(profile,asOfDate){
    const period=profile.accountingPeriod,first=period.startDate===profile.incorporationDate,sourceIds=['GOVUK-COMPANY-ACCOUNTS-AND-RETURNS','GOVUK-COMPANIES-HOUSE-ACCOUNTS'];
    let dueDate,basis;
    if(first&&period.endDate>lastDayOfTwelveMonths(period.startDate)){
      const fromIncorporation=addCalendarMonths(profile.incorporationDate,RULESET.firstAccountsMonthsFromIncorporation),fromReferenceDate=addCalendarMonths(period.endDate,RULESET.firstLongAccountsMonthsFromReferenceDate);
      dueDate=fromIncorporation>fromReferenceDate?fromIncorporation:fromReferenceDate;basis='first_accounts_over_12_months_later_of_21_or_3_months';
    }else if(first){dueDate=addCalendarMonths(period.endDate,RULESET.annualAccountsMonthsFromPeriodEnd);basis='first_accounts_up_to_12_months_normal_9_month_deadline';}
    else{dueDate=addCalendarMonths(period.endDate,RULESET.annualAccountsMonthsFromPeriodEnd);basis='annual_private_company_accounts_9_months_from_period_end';}
    return deadline('companies_house_accounts',dueDate,asOfDate,sourceIds,{periodStartDate:period.startDate,periodEndDate:period.endDate,basis});
  }
  function corporationTaxDeadlines(period,asOfDate){
    Domain.validateCompanyTaxPeriod(period);const sourceIds=['GOVUK-COMPANY-ACCOUNTS-AND-RETURNS','GOVUK-PAY-CORPORATION-TAX'],common={periodId:period.id,periodRevisionId:period.id+':'+period.revision,periodStartDate:period.startDate,periodEndDate:period.endDate};
    const payment=period.taxableProfitMinor!=null&&period.taxableProfitMinor>RULESET.normalCorporationTaxPaymentProfitLimitMinor
      ?reviewDeadline('corporation_tax_payment',['corporation_tax_instalment_payment_profile_not_supported'],sourceIds,common)
      :deadline('corporation_tax_payment',addDays(addCalendarMonths(period.endDate,RULESET.corporationTaxPaymentMonthsFromPeriodEnd),RULESET.corporationTaxPaymentExtraDays),asOfDate,sourceIds,Object.assign({basis:'normal_payment_9_months_and_1_day_after_period_end'},common));
    const taxReturn=deadline('company_tax_return',addCalendarMonths(period.endDate,RULESET.companyTaxReturnMonthsFromPeriodEnd),asOfDate,['GOVUK-COMPANY-ACCOUNTS-AND-RETURNS'],Object.assign({basis:'return_12_months_after_period_end'},common));
    return[payment,taxReturn];
  }
  function build(input){
    const profile=input&&input.profile,periods=clone(input&&input.periodRecords||[]),asOfDate=input&&input.asOfDate,rules=approvedRuleset();
    if(!Domain.isoDate(asOfDate))throw new Error('Company deadline as-of date is required');
    const gate=CompanyProfile.transactionGate(profile);if(!gate.allowed)return{status:'review_required',reasonCodes:gate.reasons,asOfDate,rulesetVersion:RULESET_VERSION,verifiedAt:VERIFIED_AT,reviewBy:REVIEW_BY,deadlines:[]};
    if(asOfDate>rules.reviewBy)return{status:'stale_rule',reasonCodes:['company_deadline_rule_review_expired'],asOfDate,rulesetVersion:RULESET_VERSION,verifiedAt:VERIFIED_AT,reviewBy:REVIEW_BY,deadlines:[]};
    const byId=new Map();for(const period of periods){Domain.validateCompanyTaxPeriod(period);if(period.entityId!==profile.entityId)throw new Error('Company deadline period references another entity');const old=byId.get(period.id);if(!old||period.revision>old.revision)byId.set(period.id,period);else if(period.revision===old.revision&&JSON.stringify(period)!==JSON.stringify(old))throw new Error('Company deadline period revision conflict');}
    const selected=Array.from(byId.values()).sort((a,b)=>a.startDate.localeCompare(b.startDate)),deadlines=[accountsDeadline(profile,asOfDate)];for(const period of selected)deadlines.push(...corporationTaxDeadlines(period,asOfDate));
    const reasons=unique(deadlines.flatMap(item=>item.reasonCodes||[]));return{status:reasons.length?'review_required':'supported_deadlines',reasonCodes:reasons,asOfDate,rulesetVersion:RULESET_VERSION,verifiedAt:VERIFIED_AT,reviewBy:REVIEW_BY,deadlines};
  }
  return{RULESET_VERSION,VERIFIED_AT,REVIEW_BY,SOURCES,RULESET,validateRuleset,approvedRuleset,addCalendarMonths,addDays,lastDayOfTwelveMonths,deadlineStatus,accountsDeadline,corporationTaxDeadlines,build};
});

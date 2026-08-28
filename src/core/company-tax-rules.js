(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./money'):root.TaxMateMoney,node?require('./domain-schema'):root.TaxMateDomain);
  if(node)module.exports=api;root.TaxMateCompanyTaxRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money,Domain){
  'use strict';
  if(!Money||!Domain)throw new Error('TaxMate company-tax rule dependencies are required');

  const VERIFIED_AT='2026-08-28',RULESET_VERSION='uk-company-tax.2026-08-28.3';
  const SOURCES=Object.freeze({
    rates:Object.freeze({id:'GOVUK-CT-RATES-2026',title:'Corporation Tax rates and allowances',url:'https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax',authority:'HM Revenue & Customs'}),
    marginalRelief:Object.freeze({id:'HMRC-CTM03925-2026',title:'Small profits rate: marginal relief formula',url:'https://www.gov.uk/hmrc-internal-manuals/company-taxation-manual/ctm03925',authority:'HM Revenue & Customs'}),
    shortPeriod:Object.freeze({id:'HMRC-CTM03930-2026',title:'Small profits rate: accounting period less than 12 months',url:'https://www.gov.uk/hmrc-internal-manuals/company-taxation-manual/ctm03930',authority:'HM Revenue & Customs'}),
    periods:Object.freeze({id:'GOVUK-CT-ACCOUNTING-PERIODS',title:'Accounting periods for Corporation Tax',url:'https://www.gov.uk/corporation-tax-accounting-period',authority:'HM Revenue & Customs'}),
    firstAccountsLength:Object.freeze({id:'GOVUK-FIRST-COMPANY-ACCOUNTS',title:'Your limited company\'s first accounts and Company Tax Return',url:'https://www.gov.uk/first-company-accounts-and-return',authority:'Companies House and HM Revenue & Customs'}),
    accountsPeriodMaximum:Object.freeze({id:'GOVUK-COMPANY-YEAR-END-18-MONTHS',title:'Change your company\'s year end',url:'https://www.gov.uk/change-your-companys-year-end',authority:'Companies House'}),
    firstAccounts:Object.freeze({id:'HMRC-COM1100-NEW-COMPANY-PERIODS',title:'Accounting periods: company accounting periods: new cases',url:'https://www.gov.uk/hmrc-internal-manuals/cotax-manual/com1100',authority:'HM Revenue & Customs'}),
    expenses:Object.freeze({id:'GOVUK-CT-COMPANY-EXPENSES-2025',title:'Company expenses you can deduct before paying Corporation Tax',url:'https://www.gov.uk/guidance/company-expenses-you-can-deduct-before-paying-corporation-tax',authority:'HM Revenue & Customs'}),
    preTrading:Object.freeze({id:'HMRC-BIM46351-2026',title:'Specific deductions: pre-trading expenditure: scope',url:'https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim46351',authority:'HM Revenue & Customs'}),
    losses:Object.freeze({id:'GOVUK-CT-LOSSES-CARRY-FORWARD',title:'Carry forward Corporation Tax losses',url:'https://www.gov.uk/guidance/carry-forward-corporation-tax-losses',authority:'HM Revenue & Customs'}),
    precision:Object.freeze({id:'HMRC-COM130040-2026',title:'Returns and computations: no preceding arithmetic rounding',url:'https://www.gov.uk/hmrc-internal-manuals/cotax-manual/com130040',authority:'HM Revenue & Customs'}),
    financeAct2026:Object.freeze({id:'UKPGA-2026-11-SECTIONS-11-12',title:'Finance Act 2026 sections 11 and 12',url:'https://www.legislation.gov.uk/ukpga/2026/11/sections/11-12',authority:'UK Parliament'}),
    thresholds:Object.freeze({id:'GOVUK-CT-RATES-THRESHOLDS',title:'Corporation Tax rates',url:'https://www.gov.uk/corporation-tax-rates/rates',authority:'HM Revenue & Customs'})
  });
  const rate=days=>Object.freeze({smallRate:Object.freeze({numerator:19,denominator:100}),mainRate:Object.freeze({numerator:25,denominator:100}),lowerLimitMinor:5000000,upperLimitMinor:25000000,marginalFraction:Object.freeze({numerator:3,denominator:200}),financialYearDays:days});
  const RULESET=Object.freeze({
    schemaVersion:1,rulesetVersion:RULESET_VERSION,jurisdiction:'UK',verifiedAt:VERIFIED_AT,effectiveFrom:'2025-04-01',effectiveTo:'2028-03-31',reviewBy:'2028-03-31',
    officialSources:Object.freeze(Object.values(SOURCES)),supportedFinancialYears:Object.freeze([
      Object.freeze({id:'FY2025',startDate:'2025-04-01',endDate:'2026-03-31',...rate(365)}),
      Object.freeze({id:'FY2026',startDate:'2026-04-01',endDate:'2027-03-31',...rate(365)}),
      Object.freeze({id:'FY2027',startDate:'2027-04-01',endDate:'2028-03-31',...rate(366)})
    ]),
    supportedPredicates:Object.freeze({ukResident:true,ringFenceProfits:false,closeInvestmentHoldingCompany:false,associatedCompaniesMaximum:50,qualifyingDistributionsMinor:0,currency:'GBP',lossesArisingOnOrAfter:'2017-04-01',maximumSimpleLossProfitMinor:500000000}),
    estimateRoundingPolicy:'retain_exact_rational_then_nearest_penny_at_output'
  });
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value),keys=(value,expected)=>plain(value)&&Object.keys(value).sort().join('|')===expected.slice().sort().join('|');
  const dateValue=value=>Domain.isoDate(value)?Date.parse(value+'T00:00:00Z'):NaN;
  const inclusiveDays=(start,end)=>Math.floor((dateValue(end)-dateValue(start))/86400000)+1;
  function ratio(value,label){if(!plain(value)||!Number.isSafeInteger(value.numerator)||!Number.isSafeInteger(value.denominator)||value.numerator<0||value.denominator<=0)throw new Error('Invalid '+label);}
  function validateRuleset(value){
    const errors=[];
    if(!keys(value,['schemaVersion','rulesetVersion','jurisdiction','verifiedAt','effectiveFrom','effectiveTo','reviewBy','officialSources','supportedFinancialYears','supportedPredicates','estimateRoundingPolicy']))errors.push('unknown or missing top-level fields');
    if(value&&value.schemaVersion!==1)errors.push('schemaVersion must be 1');if(value&&value.rulesetVersion!==RULESET_VERSION)errors.push('rulesetVersion is not approved');if(value&&value.jurisdiction!=='UK')errors.push('jurisdiction must be UK');
    for(const field of ['verifiedAt','effectiveFrom','effectiveTo','reviewBy'])if(!Domain.isoDate(value&&value[field]))errors.push(field+' is invalid');
    if(value&&(value.verifiedAt!==VERIFIED_AT||value.effectiveFrom!=='2025-04-01'||value.effectiveTo!=='2028-03-31'||value.reviewBy!=='2028-03-31'))errors.push('ruleset dates changed');
    if(!Array.isArray(value&&value.officialSources)||JSON.stringify(value.officialSources)!==JSON.stringify(Object.values(SOURCES)))errors.push('official sources are incomplete or changed');
    if(!Array.isArray(value&&value.supportedFinancialYears)||value.supportedFinancialYears.length!==3)errors.push('financial years are required');else for(const [index,year] of value.supportedFinancialYears.entries()){try{const expected=[{id:'FY2025',startDate:'2025-04-01',endDate:'2026-03-31',days:365},{id:'FY2026',startDate:'2026-04-01',endDate:'2027-03-31',days:365},{id:'FY2027',startDate:'2027-04-01',endDate:'2028-03-31',days:366}][index];if(!keys(year,['id','startDate','endDate','smallRate','mainRate','lowerLimitMinor','upperLimitMinor','marginalFraction','financialYearDays'])||year.id!==expected.id||year.startDate!==expected.startDate||year.endDate!==expected.endDate||year.lowerLimitMinor!==5000000||year.upperLimitMinor!==25000000||year.financialYearDays!==expected.days)throw new Error('invalid');ratio(year.smallRate,'small rate');ratio(year.mainRate,'main rate');ratio(year.marginalFraction,'marginal fraction');if(year.smallRate.numerator!==19||year.smallRate.denominator!==100||year.mainRate.numerator!==25||year.mainRate.denominator!==100||year.marginalFraction.numerator!==3||year.marginalFraction.denominator!==200)throw new Error('changed');}catch(_){errors.push('financial year is invalid');}}
    const predicates=value&&value.supportedPredicates;if(!plain(predicates)||predicates.ukResident!==true||predicates.ringFenceProfits!==false||predicates.closeInvestmentHoldingCompany!==false||predicates.associatedCompaniesMaximum!==50||predicates.qualifyingDistributionsMinor!==0||predicates.currency!=='GBP'||predicates.lossesArisingOnOrAfter!=='2017-04-01'||predicates.maximumSimpleLossProfitMinor!==500000000)errors.push('supported predicates changed');
    if(value&&value.estimateRoundingPolicy!=='retain_exact_rational_then_nearest_penny_at_output')errors.push('rounding policy changed');return{valid:errors.length===0,errors};
  }
  function approvedRuleset(){const result=validateRuleset(RULESET);if(!result.valid)throw new Error('Invalid approved company tax ruleset: '+result.errors.join('; '));return RULESET;}
  function roundRationalMinor(numerator,denominator){
    const n=typeof numerator==='bigint'?numerator:BigInt(numerator),d=typeof denominator==='bigint'?denominator:BigInt(denominator);if(d<=0n||n<0n)throw new Error('Invalid non-negative tax fraction');const value=(n*2n+d)/(d*2n);if(value>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Tax result exceeds safe pence range');return Number(value);
  }
  function financialYearsForPeriod(startDate,endDate,ruleset=RULESET){
    const validation=validateRuleset(ruleset);if(!validation.valid)return{status:'unknown_rule',reasons:validation.errors};if(!Domain.isoDate(startDate)||!Domain.isoDate(endDate)||startDate>endDate)return{status:'review_required',reasons:['corporation_tax_period_dates_invalid']};
    const segments=[];for(const year of ruleset.supportedFinancialYears){const start=startDate>year.startDate?startDate:year.startDate,end=endDate<year.endDate?endDate:year.endDate;if(start<=end)segments.push({year,startDate:start,endDate:end,days:inclusiveDays(start,end)});}
    const covered=segments.reduce((sum,segment)=>sum+segment.days,0),days=inclusiveDays(startDate,endDate);if(covered!==days)return{status:'unknown_rule',reasons:['corporation_tax_period_outside_verified_rules']};
    const signature=year=>JSON.stringify([year.smallRate,year.mainRate,year.lowerLimitMinor,year.upperLimitMinor,year.marginalFraction]);if(new Set(segments.map(segment=>signature(segment.year))).size>1)return{status:'review_required',reasons:['corporation_tax_rate_change_split_required']};return{status:'supported_calculated',reasons:[],days,segments};
  }
  function rulesForPeriod(startDate,endDate,asOfDate,ruleset=RULESET){
    const coverage=financialYearsForPeriod(startDate,endDate,ruleset);if(coverage.status!=='supported_calculated')return coverage;if(!Domain.isoDate(asOfDate))return{status:'review_required',reasons:['corporation_tax_as_of_date_required']};if(asOfDate>ruleset.reviewBy)return{status:'stale_rule',reasons:['corporation_tax_rule_review_expired']};return coverage;
  }
  function calculateEstimate(taxableProfitMinor,augmentedProfitMinor,periodDays,year,options={}){
    Money.assertMinor(taxableProfitMinor,'Taxable company profit',{nonNegative:true});Money.assertMinor(augmentedProfitMinor,'Augmented company profit',{nonNegative:true});if(augmentedProfitMinor<taxableProfitMinor)throw new Error('Augmented profit cannot be lower than taxable profit');if(!Number.isSafeInteger(periodDays)||periodDays<1||periodDays>year.financialYearDays)throw new Error('Unsupported Corporation Tax period length');
    const associatedCompanies=Number(options.associatedCompanies||0);if(!Number.isSafeInteger(associatedCompanies)||associatedCompanies<0||associatedCompanies>RULESET.supportedPredicates.associatedCompaniesMaximum)throw new Error('Unsupported associated company count');const divisor=BigInt(associatedCompanies+1);
    const n=BigInt(taxableProfitMinor),a=BigInt(augmentedProfitMinor),days=BigInt(periodDays),yearDays=BigInt(year.financialYearDays),lower=BigInt(year.lowerLimitMinor),upper=BigInt(year.upperLimitMinor),belowOrAtLower=a*yearDays*divisor<=lower*days,atOrAboveUpper=a*yearDays*divisor>=upper*days;
    const lowerThresholdMinor=roundRationalMinor(lower*days,yearDays*divisor),upperThresholdMinor=roundRationalMinor(upper*days,yearDays*divisor);let band,taxMinor,marginalReliefMinor=0,mainRateTaxMinor=roundRationalMinor(n*BigInt(year.mainRate.numerator),BigInt(year.mainRate.denominator));
    if(taxableProfitMinor===0){band='zero';taxMinor=0;}else if(belowOrAtLower){band='small_profits';taxMinor=roundRationalMinor(n*BigInt(year.smallRate.numerator),BigInt(year.smallRate.denominator));}else if(atOrAboveUpper){band='main_rate';taxMinor=mainRateTaxMinor;}else{
      band='marginal_relief';const gapNumerator=upper*days-a*yearDays*divisor,reliefNumerator=BigInt(year.marginalFraction.numerator)*gapNumerator*n,reliefDenominator=BigInt(year.marginalFraction.denominator)*yearDays*divisor*a;marginalReliefMinor=roundRationalMinor(reliefNumerator,reliefDenominator);taxMinor=mainRateTaxMinor-marginalReliefMinor;
    }
    return{band,taxableProfitMinor,augmentedProfitMinor,associatedCompanies,thresholdDivisor:associatedCompanies+1,lowerThresholdMinor,upperThresholdMinor,mainRateTaxMinor,marginalReliefMinor,corporationTaxEstimateMinor:taxMinor,formulaVersion:RULESET_VERSION,roundingPolicy:RULESET.estimateRoundingPolicy};
  }
  return{VERIFIED_AT,RULESET_VERSION,SOURCES,RULESET,validateRuleset,approvedRuleset,inclusiveDays,roundRationalMinor,financialYearsForPeriod,rulesForPeriod,calculateEstimate};
});

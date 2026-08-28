(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./money'):root.TaxMateMoney,node?require('./domain-schema'):root.TaxMateDomain);
  if(node)module.exports=api;root.TaxMateCompanyProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money,Domain){
  'use strict';
  if(!Money||!Domain)throw new Error('TaxMate company-profile dependencies are required');

  const PROFILE_SCHEMA_VERSION=1;
  const PROFILE_RULESET_VERSION='uk-ltd-profile.2026-08-22.2';
  const COMPANY_NUMBER_STATUSES=Object.freeze(['provided','not_available']);
  const TRADING_STATUSES=Object.freeze(['not_started','trading','dormant','ceased']);
  const CT_STATUSES=Object.freeze(['not_registered','registration_pending','registered','dormant','ceased','unknown']);
  const RISK_FIELDS=Object.freeze([
    'multipleCompanies','groupStructure','associatedCompanies','propertyOrInvestment','chargeableGains','researchAndDevelopmentClaims',
    'inventoryOrStock','complexForeignCurrency','fullVat','benefitsInKind','complexPensionsOrShareSchemes','companyCollaboration'
  ]);
  const SETUP_RISK_FIELDS=Object.freeze(['groupStructure','associatedCompanies','propertyOrInvestment','inventoryOrStock','fullVat']);
  const DEFERRED_RISK_FIELDS=Object.freeze(['chargeableGains','researchAndDevelopmentClaims','complexForeignCurrency','benefitsInKind','complexPensionsOrShareSchemes']);
  const DERIVED_RISK_FIELDS=Object.freeze(['multipleCompanies','companyCollaboration']);
  const RISK_ANSWER_VALUES=Object.freeze([true,false,'not_sure','not_assessed']);
  const UNSUPPORTED_REGISTRY=Object.freeze({
    multipleCompanies:'multiple_company_ui_not_supported',
    groupStructure:'group_structure_not_supported',
    associatedCompanies:'associated_company_review_required',
    propertyOrInvestment:'property_or_investment_company_not_supported',
    chargeableGains:'chargeable_gains_not_supported',
    researchAndDevelopmentClaims:'research_and_development_claim_not_supported',
    inventoryOrStock:'inventory_or_stock_not_supported',
    complexForeignCurrency:'complex_foreign_currency_not_supported',
    fullVat:'full_vat_not_supported',
    benefitsInKind:'benefits_in_kind_not_supported',
    complexPensionsOrShareSchemes:'complex_pensions_or_share_schemes_not_supported',
    companyCollaboration:'company_collaboration_not_supported'
  });
  const QUESTIONS=Object.freeze([
    Object.freeze({id:'legal_name',fact:'company legal name'}),
    Object.freeze({id:'company_type',fact:'UK private limited company and GBP profile'}),
    Object.freeze({id:'company_number',fact:'company number availability'}),
    Object.freeze({id:'incorporation_date',fact:'incorporation date'}),
    Object.freeze({id:'trading_status',fact:'trading status and start date'}),
    Object.freeze({id:'accounting_period',fact:'accounts period dates'}),
    Object.freeze({id:'corporation_tax_status',fact:'Corporation Tax status'}),
    Object.freeze({id:'account_holder_roles',fact:'account holder director and shareholder roles'}),
    Object.freeze({id:'share_structure',fact:'directors, shareholders and ordinary shares'}),
    Object.freeze({id:'activity_profile',fact:'company activity profile'}),
    Object.freeze({id:'unsupported_screen',fact:'unsupported company complexity screen'}),
    Object.freeze({id:'confirmation',fact:'identity fact confirmation'})
  ]);

  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=300)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
  const companyNumber=value=>typeof value==='string'&&/^[A-Z0-9]{8}$/.test(value.trim().toUpperCase());
  const daysBetween=(start,end)=>Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);
  const lastDayOfCalendarMonths=(start,months)=>{
    const source=new Date(start+'T00:00:00Z'),day=source.getUTCDate(),target=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth()+months,1)),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
    target.setUTCDate(day>lastDay?lastDay:day);
    if(day<=lastDay)target.setUTCDate(target.getUTCDate()-1);
    return target.toISOString().slice(0,10);
  };
  const reason=(code,kind='review_required')=>({code,kind});

  function createDraft(input={}){
    if(!text(input.entityId,128))throw new Error('Company entity identity is required');
    const now=Number(input.now)||Date.now();
    return{
      id:input.id||'company-profile:'+input.entityId,
      entityId:input.entityId,
      schemaVersion:PROFILE_SCHEMA_VERSION,
      profileRulesetVersion:PROFILE_RULESET_VERSION,
      lifecycleStatus:'draft',
      assessmentStatus:'review_required',
      assessmentReasons:['company_legal_name_required'],
      createdAt:now,updatedAt:now,deletedAt:null,deviceId:input.deviceId||'company-profile'
    };
  }

  function ownershipBasisPoints(shareholders){
    if(!Array.isArray(shareholders)||!shareholders.length||shareholders.some(holder=>!Number.isSafeInteger(holder.shares)||holder.shares<=0))return null;
    return Money.allocateMinor(10000,shareholders.map(holder=>holder.shares));
  }

  function normalize(input){
    const profile=clone(input||{});
    if(typeof profile.legalName==='string')profile.legalName=profile.legalName.trim();
    if(typeof profile.companyNumber==='string')profile.companyNumber=profile.companyNumber.trim().toUpperCase();
    profile.directors=Array.isArray(profile.directors)?profile.directors:[];
    profile.shareholders=Array.isArray(profile.shareholders)?profile.shareholders:[];
    profile.shareClasses=Array.isArray(profile.shareClasses)?profile.shareClasses:[];
    profile.riskAnswers=plain(profile.riskAnswers)?profile.riskAnswers:{};
    const points=ownershipBasisPoints(profile.shareholders);
    if(points)profile.shareholders=profile.shareholders.map((holder,index)=>Object.assign({},holder,{ownershipBasisPoints:points[index]}));
    return profile;
  }

  function missingQuestion(profile){
    const p=normalize(profile);
    if(!text(p.legalName))return QUESTIONS[0];
    if(p.jurisdiction!=='UK'||p.companyType!=='private_limited_by_shares'||p.currency!=='GBP')return QUESTIONS[1];
    if(!COMPANY_NUMBER_STATUSES.includes(p.companyNumberStatus)||(p.companyNumberStatus==='provided'&&!companyNumber(p.companyNumber)))return QUESTIONS[2];
    if(!Domain.isoDate(p.incorporationDate))return QUESTIONS[3];
    if(!TRADING_STATUSES.includes(p.tradingStatus)||(p.tradingStatus==='trading'&&!Domain.isoDate(p.tradingStartDate)))return QUESTIONS[4];
    if(!Domain.isoDate(p.accountingReferenceDate)||!plain(p.accountingPeriod)||!Domain.isoDate(p.accountingPeriod.startDate)||!Domain.isoDate(p.accountingPeriod.endDate)||p.accountingPeriod.status!=='confirmed')return QUESTIONS[5];
    if(!CT_STATUSES.includes(p.corporationTaxStatus))return QUESTIONS[6];
    if(!plain(p.accountHolder)||typeof p.accountHolder.isDirector!=='boolean'||typeof p.accountHolder.isShareholder!=='boolean')return QUESTIONS[7];
    if(!p.directors.length||!p.shareholders.length||!p.shareClasses.length)return QUESTIONS[8];
    if(!text(p.activityType,128))return QUESTIONS[9];
    if(SETUP_RISK_FIELDS.some(field=>![true,false,'not_sure'].includes(p.riskAnswers[field]))||DERIVED_RISK_FIELDS.some(field=>typeof p.riskAnswers[field]!=='boolean')||DEFERRED_RISK_FIELDS.some(field=>p.riskAnswers[field]!=null&&!RISK_ANSWER_VALUES.includes(p.riskAnswers[field])))return QUESTIONS[10];
    if(!Number.isFinite(Number(p.confirmedAt))||Number(p.confirmedAt)<=0)return QUESTIONS[11];
    return null;
  }

  function assess(input){
    const p=normalize(input),reasons=[];
    const add=(code,kind)=>{if(!reasons.some(item=>item.code===code))reasons.push(reason(code,kind));};
    const next=missingQuestion(p);
    if(next)add('question_'+next.id+'_required','review_required');
    if(p.jurisdiction!=null&&p.jurisdiction!=='UK')add('uk_company_required','unsupported_profile');
    if(p.companyType!=null&&p.companyType!=='private_limited_by_shares')add('private_company_limited_by_shares_required','unsupported_profile');
    if(p.currency!=null&&p.currency!=='GBP')add('gbp_company_required','unsupported_profile');
    if(p.companyNumberStatus==='provided'&&!companyNumber(p.companyNumber))add('company_number_review_required','review_required');
    if(Domain.isoDate(p.incorporationDate)&&p.tradingStatus==='trading'&&Domain.isoDate(p.tradingStartDate)&&p.tradingStartDate<p.incorporationDate)add('trading_before_incorporation','review_required');
    if(plain(p.accountingPeriod)&&Domain.isoDate(p.accountingPeriod.startDate)&&Domain.isoDate(p.accountingPeriod.endDate)){
      const duration=daysBetween(p.accountingPeriod.startDate,p.accountingPeriod.endDate);
      if(duration<0)add('accounting_period_date_order_review_required','review_required');
      if(Domain.isoDate(p.incorporationDate)&&p.accountingPeriod.startDate<p.incorporationDate)add('accounts_period_before_incorporation','review_required');
      if(duration>=0&&p.accountingPeriod.endDate>lastDayOfCalendarMonths(p.accountingPeriod.startDate,18))add('accounts_period_over_18_months_review_required','review_required');
    }
    if(['dormant','ceased'].includes(p.tradingStatus)||['dormant','ceased'].includes(p.corporationTaxStatus))add('dormant_or_ceased_company_not_supported','unsupported_profile');
    if(p.corporationTaxStatus==='unknown')add('corporation_tax_status_review_required','review_required');
    if(plain(p.accountHolder)){
      if(p.accountHolder.isDirector===false)add('account_holder_must_be_director','unsupported_profile');
      if(p.accountHolder.isShareholder===false)add('account_holder_must_be_shareholder','unsupported_profile');
    }
    if(p.directors.length&&!p.directors.some(director=>director&&director.isAccountHolder===true))add('account_holder_director_record_required','review_required');
    if(p.shareholders.length&&!p.shareholders.some(holder=>holder&&holder.isAccountHolder===true))add('account_holder_shareholder_record_required','review_required');
    if(p.directors.some(director=>!director||!text(director.id,128)||!text(director.name,300)||typeof director.isAccountHolder!=='boolean'))add('director_identity_review_required','review_required');
    if(p.shareholders.some(holder=>!holder||!text(holder.id,128)||!text(holder.name,300)||typeof holder.isAccountHolder!=='boolean'||!text(holder.shareClassId,128)||!Number.isSafeInteger(holder.shares)||holder.shares<=0))add('shareholder_identity_review_required','review_required');
    const parties=[...p.directors,...p.shareholders],directorIds=p.directors.map(party=>party&&party.id).filter(Boolean),shareholderIds=p.shareholders.map(party=>party&&party.id).filter(Boolean);
    if(parties.some(party=>party&&['uid','accountUid','email','access','memberId'].some(field=>party[field]!=null)))add('company_party_access_field_not_allowed','review_required');
    if(new Set(directorIds).size!==directorIds.length||new Set(shareholderIds).size!==shareholderIds.length)add('company_party_identity_review_required','review_required');
    if(p.shareClasses.length){
      if(p.shareClasses.length!==1||p.shareClasses[0].name!=='ordinary'||p.shareClasses[0].dividendRights!=='equal')add('one_equal_rights_ordinary_share_class_required','unsupported_profile');
      else if(p.shareholders.some(holder=>holder.shareClassId!==p.shareClasses[0].id))add('share_class_link_review_required','review_required');
    }
    const points=ownershipBasisPoints(p.shareholders);
    if(p.shareholders.length&&!points)add('share_ownership_review_required','review_required');
    else if(points&&points.reduce((sum,value)=>sum+value,0)!==10000)add('share_ownership_review_required','review_required');
    if(p.activityType!=null&&p.activityType!=='service_digital')add('ordinary_service_or_digital_company_required','unsupported_profile');
    for(const field of RISK_FIELDS){if(p.riskAnswers[field]===true||p.riskAnswers[field]==='not_sure')add(UNSUPPORTED_REGISTRY[field],'review_required');}
    const status=reasons.some(item=>item.kind==='unsupported_profile')?'unsupported_profile':reasons.length?'review_required':'supported_profile';
    return{status,reasons:reasons.map(item=>item.code),nextQuestion:next,canRecordTransactions:status!=='unsupported_profile'&&!next,profile:p};
  }

  function transactionGate(profile){
    const result=assess(profile);
    return{allowed:result.canRecordTransactions,status:result.status,reasons:result.reasons,nextQuestion:result.nextQuestion&&result.nextQuestion.id||null};
  }

  function bookkeepingEligibility(profile){
    const result=assess(profile),blocking=result.reasons.filter(code=>code.startsWith('question_')||[
      'uk_company_required','private_company_limited_by_shares_required','gbp_company_required','dormant_or_ceased_company_not_supported',
      'account_holder_must_be_director','account_holder_must_be_shareholder','one_equal_rights_ordinary_share_class_required',
      'ordinary_service_or_digital_company_required'
    ].includes(code));
    return{allowed:result.canRecordTransactions&&blocking.length===0,status:result.status,reasons:blocking,nextQuestion:result.nextQuestion&&result.nextQuestion.id||null};
  }

  function taxEstimateEligibility(profile,requiredFields=SETUP_RISK_FIELDS){
    const result=assess(profile),fields=Array.from(new Set(requiredFields||[])).filter(field=>RISK_FIELDS.includes(field)),reasons=[];
    for(const field of fields){
      const answer=result.profile.riskAnswers&&result.profile.riskAnswers[field];
      if(answer===true||answer==='not_sure')reasons.push(UNSUPPORTED_REGISTRY[field]);
      else if(answer!==false)reasons.push(field+'_not_assessed');
    }
    return{allowed:bookkeepingEligibility(result.profile).allowed&&reasons.length===0,status:reasons.length?'review_required':'ready',reasons:Array.from(new Set(reasons))};
  }

  function onboardingRiskAnswers(value={},options={}){
    const answers={};
    for(const field of SETUP_RISK_FIELDS)if([true,false,'not_sure'].includes(value[field]))answers[field]=value[field];
    for(const field of DEFERRED_RISK_FIELDS)answers[field]=RISK_ANSWER_VALUES.includes(value[field])?value[field]:'not_assessed';
    answers.multipleCompanies=Number(options.activeLtdCount||0)>1;
    answers.companyCollaboration=false;
    return answers;
  }

  function answer(input,questionId,value,options={}){
    const p=normalize(input),now=Number(options.now)||Date.now();
    if(!QUESTIONS.some(question=>question.id===questionId))throw new Error('Unknown company-profile question');
    if(questionId==='legal_name')p.legalName=String(value||'').trim();
    else if(questionId==='company_type'){p.jurisdiction=value&&value.jurisdiction;p.companyType=value&&value.companyType;p.currency=value&&value.currency;}
    else if(questionId==='company_number'){p.companyNumberStatus=value&&value.status;p.companyNumber=value&&value.number?String(value.number).trim().toUpperCase():undefined;}
    else if(questionId==='incorporation_date')p.incorporationDate=value;
    else if(questionId==='trading_status'){p.tradingStatus=value&&value.status;p.tradingStartDate=value&&value.startDate||undefined;}
    else if(questionId==='accounting_period'){p.accountingPeriod=clone(value);p.accountingReferenceDate=value&&value.referenceDate||value&&value.endDate;}
    else if(questionId==='corporation_tax_status')p.corporationTaxStatus=value;
    else if(questionId==='account_holder_roles')p.accountHolder=clone(value);
    else if(questionId==='share_structure'){p.directors=clone(value&&value.directors||[]);p.shareholders=clone(value&&value.shareholders||[]);p.shareClasses=clone(value&&value.shareClasses||[]);}
    else if(questionId==='activity_profile')p.activityType=value;
    else if(questionId==='unsupported_screen'){p.riskAnswers={};for(const field of RISK_FIELDS)if(value&&RISK_ANSWER_VALUES.includes(value[field]))p.riskAnswers[field]=value[field];}
    else if(questionId==='confirmation')p.confirmedAt=value===true?now:null;
    p.updatedAt=now;p.deviceId=options.deviceId||p.deviceId||'company-profile';
    const result=assess(p);p.assessmentStatus=result.status;p.assessmentReasons=result.reasons;p.lifecycleStatus=result.canRecordTransactions?'confirmed':'draft';
    return normalize(p);
  }

  return{
    PROFILE_SCHEMA_VERSION,PROFILE_RULESET_VERSION,COMPANY_NUMBER_STATUSES,TRADING_STATUSES,CT_STATUSES,RISK_FIELDS,SETUP_RISK_FIELDS,DEFERRED_RISK_FIELDS,DERIVED_RISK_FIELDS,RISK_ANSWER_VALUES,UNSUPPORTED_REGISTRY,QUESTIONS,
    createDraft,ownershipBasisPoints,normalize,missingQuestion,assess,transactionGate,bookkeepingEligibility,taxEstimateEligibility,onboardingRiskAnswers,answer
  };
});

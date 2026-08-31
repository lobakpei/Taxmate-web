(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(
    node?require('../../core/company-access'):root.TaxMateCompanyAccess,
    node?require('../../core/company-identity'):root.TaxMateCompanyIdentity,
    node?require('../../core/company-ledger'):root.TaxMateCompanyLedger,
    node?require('../../core/company-profile'):root.TaxMateCompanyProfile,
    node?require('../../core/company-profile-history'):root.TaxMateCompanyProfileHistory,
    node?require('../../core/company-remuneration'):root.TaxMateCompanyRemuneration,
    node?require('../../core/company-remuneration-rules'):root.TaxMateCompanyRemunerationRules,
    node?require('../../core/company-scenario'):root.TaxMateCompanyScenario,
    node?require('../../core/company-tax'):root.TaxMateCompanyTax,
    node?require('../../core/company-treatment'):root.TaxMateCompanyTreatment,
    node?require('../../core/company-workspace'):root.TaxMateCompanyWorkspace,
    node?require('../../core/domain-schema'):root.TaxMateDomain,
    node?require('../../core/entitlement'):root.TaxMateEntitlement,
    node?require('../../core/money'):root.TaxMateMoney,
    node?require('../../core/partnership'):root.TaxMatePartnership,
    node?require('./company-state'):root.TaxMateCompanyState,
    node?require('./company-transaction-adapter'):root.TaxMateCompanyTransactionAdapter,
    node?require('./company-state-repository'):root.TaxMateCompanyStateRepository,
    node?require('./companies-house-provider'):root.TaxMateCompaniesHouseProvider
  );
  if(node)module.exports=api;
  root.TaxMateCanonicalCompanyDriver=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(CompanyAccess,CompanyIdentity,CompanyLedger,CompanyProfile,CompanyProfileHistory,CompanyRemuneration,CompanyRemunerationRules,CompanyScenario,CompanyTax,CompanyTreatment,CompanyWorkspace,Domain,Entitlement,Money,Partnership,State,TransactionAdapter,Repository,CompaniesHouse){
'use strict';

const DEFAULT_DEVICE_ID='taxmate-ltd-local';
const DEFAULT_NOW=Date.UTC(2026,7,24,12,0,0);
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const cleanText=(value,max=1000)=>typeof value==='string'&&value.trim()&&value.trim().length<=max?value.trim():null;
const COPY_KEY_BY_REASON=Object.freeze({
  answer_required:'error.choose_answer',confirmation_required:'error.choose_answer',director_answer_required:'error.choose_answer',
  company_name_required:'error.required',company_name_too_long:'error.company_name',company_name_character_not_permitted:'error.company_name',company_name_symbol_position:'error.company_name',company_name_private_ending_required:'error.company_name',company_name_invalid:'error.company_name',
  company_number_format:'error.company_number',company_number_invalid:'error.company_number',company_number_required:'error.company_number',
  incorporation_date_required:'error.required',incorporation_date_invalid:'error.invalid_date',future_incorporation:'error.future_incorporation',incorporation_after_trading_start:'error.trading_before_incorporation',incorporation_after_accounts_start:'error.invalid_date',
  trading_start_date_required:'error.required',trading_start_date_invalid:'error.invalid_date',future_trading:'error.future_trading',trading_before_incorporation:'error.trading_before_incorporation',trading_after_accounts_period:'error.invalid_date',
  accounting_period_required:'error.required',accounting_period_invalid:'error.invalid_date',accounting_period_start_after_end:'error.invalid_date',accounting_period_before_incorporation:'error.invalid_date',accounts_period_over_18_months:'error.invalid_date',
  founder_name_required:'error.required',founder_shares_invalid:'error.ownership_total',other_shares_invalid:'error.ownership_total',other_shareholder_name_required:'error.other_name',ownership_total_invalid:'error.ownership_total',
  description_required:'error.required',amountMinor_invalid:'error.required',amount_must_be_positive:'error.required',date_invalid:'error.invalid_date',allocation_exact_sum_required:'error.allocation_total',
  correction_reason_required:'error.required',company_correction_reason_required:'error.required',company_correction_evidence_required:'error.required',correctable_company_field_required:'error.fix_issue',
  ownership_shareholders_required:'error.required',ownership_shareholder_invalid:'error.ownership_total',ownership_effective_date_invalid:'error.invalid_date',ownership_effective_date_not_after_current:'error.invalid_date',ownership_reason_required:'error.required',ownership_evidence_required:'error.required',
  company_draft_not_found:'error.fix_issue',company_not_found:'error.fix_issue',record_not_found:'error.fix_issue',draft_record_not_found:'error.fix_issue',committed_record_required:'error.fix_issue',
  company_facts_incomplete:'error.fix_issue',scenario_required:'error.required',dividend_declaration_not_found:'error.fix_issue',remove_company_confirmation_required:'error.choose_answer'
});
const REASON_BY_ENGINE_MESSAGE=Object.freeze({
  'Ownership requires shareholders':'ownership_shareholders_required','Invalid ownership shareholder':'ownership_shareholder_invalid','Ownership effective date is invalid':'ownership_effective_date_invalid','Ownership change must start after the current ownership version':'ownership_effective_date_not_after_current','Ownership change reason is required':'ownership_reason_required','Company correction evidence is required':'company_correction_evidence_required','Company correction reason is required':'company_correction_reason_required'
});
const fieldError=(field,reasonCode,params={})=>Object.freeze({field,reasonCode,copyKey:COPY_KEY_BY_REASON[reasonCode]||'error.fix_issue',params:clone(params)});
const stableReason=(error,fallback)=>error&&typeof error.reasonCode==='string'&&/^[a-z][a-z0-9_]*$/.test(error.reasonCode)?error.reasonCode:REASON_BY_ENGINE_MESSAGE[String(error&&error.message||'')]||fallback;
function asMinor(value,field){if(!Number.isSafeInteger(value)||value<0)throw Object.assign(new Error(`${field}_invalid`),{field,reasonCode:`${field}_invalid`});return value;}
function asDate(value,field){if(!Domain.isoDate(value))throw Object.assign(new Error(`${field}_invalid`),{field,reasonCode:`${field}_invalid`});return value;}
function entryMinor(value){const minor=Math.round(Number(value||0)*100);if(!Number.isSafeInteger(minor))throw new Error('legacy_entry_amount_invalid');return minor;}
function periodDates(value){return value?{startDate:value.startDate,endDate:value.endDate}:null;}

class CanonicalCompanyDriver{
  constructor(options={}){
    this.mode=options.mode==='fresh'?'fresh':'existing';
    this.repository=options.repository?Repository.assertRepository(options.repository):Repository.memoryRepository(options.state);
    this.state=this.repository.load();
    this.initialState=clone(options.resetState||this.state);
    this.meta=clone(options.meta||{});
    this.copy=clone(options.copy||{});
    this.now=typeof options.now==='function'?options.now:()=>DEFAULT_NOW;
    this.deviceId=cleanText(options.deviceId,128)||DEFAULT_DEVICE_ID;
    this.companiesHouseProvider=options.companiesHouseProvider||CompaniesHouse.unavailableProvider();
    this.activeCompanyClaim=typeof options.activeCompanyClaim==='function'?options.activeCompanyClaim:async({companyId})=>({status:'claimed',activeCompanyId:companyId,idempotent:false,localTestOnly:true});
    this.trustedActiveCompanyId=cleanText(options.trustedActiveCompanyId,128)||null;
    this.runtime=clone(options.runtime||{providerMode:'localhost_only',firebase:false,sentry:false,googleSignIn:false,billing:false,promo:false,analytics:false,serviceWorker:false,externalNetwork:this.companiesHouseProvider.isNetworkProvider===true});
    this.enforceEntitlement=options.enforceEntitlement!==false;
    this.planMapping=clone(options.planMapping||CompanyAccess.FOUNDER_APPROVED_LTD_PLAN_MAPPING);
    this.personalTaxJurisdiction=cleanText(options.personalTaxJurisdiction,16)||cleanText(this.state.settings&&this.state.settings.personalTaxJurisdiction,16)||null;
    this.entitlementSnapshot=clone(options.entitlementSnapshot||{subscriptionStatus:'inactive',paidTier:'free',currentPeriodEnd:null,serverVerifiedAt:null,billingCadence:null});
    const persistedVerification=this.activeProfile()&&this.activeProfile().registryVerification;
    this.lookup=persistedVerification?{status:persistedVerification.status==='verified'||persistedVerification.status==='needs_checking'?'found':persistedVerification.status,verificationStatus:persistedVerification.status,number:persistedVerification.companyNumber,company:{number:persistedVerification.companyNumber,name:persistedVerification.registryFacts.legalName||null,incorporationDate:persistedVerification.registryFacts.incorporationDate||null,status:persistedVerification.registryFacts.companyStatus||null,type:persistedVerification.registryFacts.companyType||null,registryUrl:persistedVerification.registryFacts.registryUrl||null},reasons:clone(persistedVerification.reasonCodes),retryable:persistedVerification.retryable===true}: {status:'idle',number:null,company:null,reasons:[]};
    this.pendingPeriodPlan=null;
    this.sequence=0;
    State.validateState(this.state);
    this.initialCompanyDraftState=this.companyDraftFromProfile(this.activeProfile());
    this.companyDraftState=clone(this.initialCompanyDraftState);
  }

  domain(){return this.state.domain;}
  list(name){const values=this.domain()&&this.domain()[name];return Array.isArray(values)?values:[];}
  upsert(name,record){const values=this.list(name),index=values.findIndex(item=>item.id===record.id);if(index<0)values.push(record);else values[index]=record;return record;}
  activeProfile(){return this.list('companyProfiles').find(item=>item.deletedAt==null)||null;}
  entityFor(profile=this.activeProfile()){return profile?this.list('entities').find(item=>item.id===profile.entityId&&item.deletedAt==null)||null:null;}
  eventsFor(profile=this.activeProfile()){return profile?this.list('economicEvents').filter(item=>item.sourceTransaction&&item.sourceTransaction.beneficiaryEntityId===profile.entityId):[];}
  recordsFor(name,profile=this.activeProfile()){return profile?this.list(name).filter(item=>item.entityId===profile.entityId):[];}
  account(profile,ownerType){return this.list('paymentAccounts').find(item=>item.ownerType===ownerType&&item.deletedAt==null&&(ownerType==='entity'?item.ownerId===profile.entityId:item.id===`account-personal:${profile.entityId}`))||null;}
  validate(){State.validateState(this.state);return true;}
  persist(){this.validate();this.repository.replace(this.state);return true;}
  atomic(mutator){const before=clone(this.state);try{const result=mutator();this.persist();return result;}catch(error){this.state=before;throw error;}}
  access(action){if(!this.enforceEntitlement)return{allowed:true,mode:'domain_test_bypass',commercialGateApplied:false};return CompanyAccess.decide({action,snapshot:this.entitlementSnapshot,planMapping:this.planMapping,now:this.now(),offline:false,hasExistingLtdData:!!this.activeProfile()});}
  setEntitlementSnapshot(snapshot){this.entitlementSnapshot=clone(snapshot||{});return this.readSnapshot().entitlement;}
  setTrustedActiveCompanyId(companyId){this.trustedActiveCompanyId=cleanText(companyId,128)||null;return this.trustedActiveCompanyId;}
  setPersonalTaxJurisdiction(value){this.personalTaxJurisdiction=cleanText(value,16)||null;return this.personalTaxJurisdiction;}
  reload(){this.state=this.repository.load();State.validateState(this.state);const persisted=this.activeProfile()&&this.activeProfile().registryVerification;if(persisted)this.lookup={status:['verified','needs_checking'].includes(persisted.status)?'found':persisted.status,verificationStatus:persisted.status,number:persisted.companyNumber,company:{number:persisted.companyNumber,name:persisted.registryFacts&&persisted.registryFacts.legalName||null,incorporationDate:persisted.registryFacts&&persisted.registryFacts.incorporationDate||null,status:persisted.registryFacts&&persisted.registryFacts.companyStatus||null,type:persisted.registryFacts&&persisted.registryFacts.companyType||null,registryUrl:persisted.registryFacts&&persisted.registryFacts.registryUrl||null},reasons:clone(persisted.reasonCodes||[]),retryable:persisted.retryable===true};this.companyDraftState=this.companyDraftFromProfile(this.activeProfile());return this.readSnapshot();}
  newId(prefix){this.sequence+=1;return `${prefix}:${this.now()}:${this.deviceId}:${String(this.sequence).padStart(4,'0')}`.slice(0,128);}
  currentDate(){return new Date(this.now()).toISOString().slice(0,10);}
  requireAccess(action){const result=this.access(action);if(!result.allowed)throw Object.assign(new Error(result.reason||'company_action_not_available'),{code:result.reason||'company_action_not_available'});return result;}
  routeAccess(action,nextRoute,data={}){this.requireAccess(action);return{status:'ok',data:{...clone(data),noWrite:true},nextRoute};}
  saveProfile(profile){return this.atomic(()=>{this.upsert('companyProfiles',profile);const now=this.now(),entity=this.entityFor(profile);this.upsert('entities',{...(entity||{}),id:profile.entityId,name:profile.legalName||entity&&entity.name||'Limited company',type:'limited_company',currency:'GBP',createdAt:entity&&entity.createdAt||profile.createdAt||now,updatedAt:now,deletedAt:null,deviceId:this.deviceId});return profile;});}
  saveResult(name,result){return this.atomic(()=>{if(result.event)this.upsert('economicEvents',result.event);if(result.record)this.upsert(name,result.record);if(result.personalIncomeLink)this.upsert('personalIncomeLinks',result.personalIncomeLink);return result;});}

  companyDraftFromProfile(profile){
    if(!profile)return{status:'not_started',registrationStatus:null,directorAnswer:null,ownershipDraft:null,updatedAt:null};
    const directorAnswer=profile.accountHolder&&profile.accountHolder.isDirector===true?'yes':profile.accountHolder&&profile.accountHolder.isDirector===false?'no':'not_sure';
    return{
      status:profile.lifecycleStatus==='confirmed'?'confirmed':profile.companyNumberStatus==='not_available'&&!profile.incorporationDate?'registration_pending':'in_progress',
      registrationStatus:profile.companyNumberStatus==='provided'?'registered':'not_available',directorAnswer,
      ownershipDraft:Array.isArray(profile.shareholders)&&profile.shareholders.length?clone(profile.shareholders):null,updatedAt:profile.updatedAt||null
    };
  }

  projection(profile=this.activeProfile()){
    if(!profile||profile.lifecycleStatus!=='confirmed')return null;
    return CompanyWorkspace.buildProjection({profile,events:this.eventsFor(profile),periodRecords:this.recordsFor('companyTaxPeriods',profile),lossRecords:this.recordsFor('companyLossRecords',profile),salaryRecords:this.recordsFor('salaryRecords',profile),dividendDeclarations:this.recordsFor('dividendDeclarations',profile),syncConflicts:[],asOfDate:this.currentDate()});
  }

  taxYearRange(){const match=/^(\d{4})-\d{2}$/.exec(String(this.state.year||'')),startYear=match?Number(match[1]):2026;return{taxYear:this.state.year||`${startYear}-${String(startYear+1).slice(-2)}`,startDate:`${startYear}-04-06`,endDate:`${startYear+1}-04-05`};}
  legacyBusinessRow(business){
    const range=this.taxYearRange(),entries=this.state.entries.filter(entry=>entry.bizId===business.id&&entry.date>=range.startDate&&entry.date<=range.endDate),incomeMinor=Money.sumMinor(entries.filter(entry=>entry.kind==='income').map(entry=>entryMinor(entry.amount)),'Legacy income'),expenseMinor=Money.sumMinor(entries.filter(entry=>entry.kind==='expense').map(entry=>Math.round(entryMinor(entry.amount)*Number(entry.pct==null?100:entry.pct)/100)),'Legacy claimable expenses'),businessProfitMinor=incomeMinor-expenseMinor,partnership=Partnership.personalBusinessFigures(business,{incomeMinor,expensesMinor:expenseMinor,profitMinor:businessProfitMinor}),attentionIds=new Set(this.state.obReview||[]),allAttention=this.state.entries.filter(entry=>entry.bizId===business.id&&(entry._review===true||attentionIds.has(entry.id))),currentAttention=entries.filter(entry=>entry._review===true||attentionIds.has(entry.id)),isPartnership=business.structure==='partnership';
    return{
      id:business.id,name:business.name,businessType:'self_employed_business',structure:isPartnership?'partnership':'sole_trader',status:'active',source:'canonical_legacy_bookkeeping',
      share:{basis:isPartnership?partnership.basis:null,percent:isPartnership?partnership.sharePercent:100,applied:isPartnership?partnership.shareApplied:false,status:partnership.supported?'confirmed':'review_required'},
      summary:{kind:isPartnership?'personal_profit_estimate':'business_profit_estimate',taxYear:range.taxYear,amountMinor:partnership.supported?partnership.profitMinor:null,businessProfitMinor,incomeMinor,claimableExpensesMinor:expenseMinor,personalIncomeMinor:partnership.supported?partnership.incomeMinor:null,personalExpensesMinor:partnership.supported?partnership.expensesMinor:null,status:partnership.supported?'supported':'review_required',reasonCodes:partnership.supported?[]:[partnership.reason]},
      attention:{count:allAttention.length,currentYearCount:currentAttention.length,requiresReview:allAttention.length>0||!partnership.supported,reasonCodes:[...(!partnership.supported?[partnership.reason]:[]),...(allAttention.length?['bookkeeping_records_need_review']:[])]},
      actions:{primary:{callback:'onOpenLegacyBusiness',input:{businessId:business.id},nextRoute:'business.existing'},secondary:{callback:'onEditLegacyBusiness',input:{businessId:business.id},nextRoute:'business.existing.edit'}}
    };
  }
  companyBusinessRow(profile){
    const entity=this.entityFor(profile),ledger=CompanyLedger.reconcile(this.eventsFor(profile),profile.entityId),projection=profile.lifecycleStatus==='confirmed'?this.projection(profile):null,drafts=this.eventsFor(profile).filter(event=>event.status==='draft'),reviewReasons=projection?projection.reviewItems.map(item=>item.reasonCode):[],access=this.access(profile.lifecycleStatus==='confirmed'?'read':'resume_company_draft');
    return{
      id:profile.entityId,name:entity&&entity.name||profile.legalName||'Limited company',businessType:'limited_company',structure:'limited_company',status:profile.lifecycleStatus==='confirmed'?'active':'setup_incomplete',source:'canonical_company_domain',
      share:{basis:'issued_shares',percent:(profile.shareholders||[]).find(item=>item.isAccountHolder)?.ownershipBasisPoints/100||null,applied:true,status:profile.shareholders&&profile.shareholders.length?'confirmed':'draft'},
      summary:{kind:'company_accounting_profit',amountMinor:ledger.accountingProfitMinor,companyCashMinor:ledger.cashMinor,status:profile.lifecycleStatus==='confirmed'?'supported':'draft',reasonCodes:profile.lifecycleStatus==='confirmed'?[]:['company_setup_incomplete']},
      attention:{count:reviewReasons.length+drafts.length,currentYearCount:reviewReasons.length+drafts.length,requiresReview:reviewReasons.length+drafts.length>0,reasonCodes:[...new Set([...reviewReasons,...drafts.flatMap(item=>item.reviewReasons||[])])]},
      access:{allowed:access.allowed===true,requiredTier:'pro',reason:access.allowed?null:access.reason},
      actions:{primary:{callback:profile.lifecycleStatus==='confirmed'?'onOpenExistingCompany':'onResumeCompanyDraft',input:{entityId:profile.entityId},nextRoute:profile.lifecycleStatus==='confirmed'?'ltd.workspace.overview':this.resumeRoute(profile),enabled:access.allowed===true,disabledReason:access.allowed?null:access.reason},secondary:{callback:'onOpenCompanyEdit',input:{entityId:profile.entityId},nextRoute:'ltd.records.company-edit',enabled:this.access('edit_company').allowed===true,disabledReason:this.access('edit_company').allowed?null:this.access('edit_company').reason}}
    };
  }
  businessList(){return[...this.state.businesses.map(business=>this.legacyBusinessRow(business)),...this.list('companyProfiles').filter(item=>item.deletedAt==null).map(profile=>this.companyBusinessRow(profile))];}

  periodPlan(profile){
    if(!profile||!profile.incorporationDate||!profile.accountingPeriod)return null;
    try{
      const plan=CompanyIdentity.planFirstPeriods({incorporationDate:profile.incorporationDate,tradingStatus:profile.tradingStatus,tradingStartDate:profile.tradingStartDate||null,override:{enabled:true,startDate:profile.accountingPeriod.startDate,endDate:profile.accountingPeriod.endDate}}),confirmed=this.recordsFor('companyTaxPeriods',profile).map(period=>({id:period.id,startDate:period.startDate,endDate:period.endDate})).sort((a,b)=>a.startDate.localeCompare(b.startDate)),planned=plan.corporationTaxPeriods.map(period=>periodDates(period)),matches=confirmed.length===planned.length&&confirmed.every((period,index)=>period.startDate===planned[index].startDate&&period.endDate===planned[index].endDate);
      return{status:confirmed.length&& !matches?'review_required':'confirmed',accounts:clone(plan.accounts),corporationTaxPeriods:clone(plan.corporationTaxPeriods),confirmedTaxPeriods:confirmed,reconcilesConfirmedPeriods:matches,reasons:confirmed.length&&!matches?['period_plan_record_mismatch']:[]};
    }catch(error){return{status:'review_required',accounts:null,corporationTaxPeriods:[],confirmedTaxPeriods:[],reconcilesConfirmedPeriods:false,reasons:[String(error.message||error)]};}
  }

  readSnapshot(){
    const profile=this.activeProfile(),entity=this.entityFor(profile),gate=profile?CompanyProfile.bookkeepingEligibility(profile):null,taxGate=profile?CompanyProfile.taxEstimateEligibility(profile):null;
    let projection=null,projectionError=null;const periodPlan=this.periodPlan(profile);
    try{projection=this.projection(profile);}catch(_){projectionError={reasonCode:'projection_review_required',copyKey:'error.fix_issue',params:{}};}
    const resolved=Entitlement.resolve(this.entitlementSnapshot,this.now(),false);
    const activeCompanyCount=Math.max(this.list('companyProfiles').filter(item=>item.deletedAt==null).length,this.trustedActiveCompanyId?1:0),createAccess=this.access('create_company'),readAccess=this.access(profile&&profile.lifecycleStatus==='confirmed'?'read':'resume_company_draft');
    return{
      contractVersion:'taxmate-ltd-ui-facade.3',packageStatus:'INTEGRATED_CANDIDATE',mode:this.mode,dataset:clone(this.meta),context:{taxYear:this.taxYearRange().taxYear,currentDate:this.currentDate()},
      businessList:this.businessList(),
      companyLimit:{maximum:1,activeCount:activeCompanyCount,activeCompanyId:this.trustedActiveCompanyId||profile&&profile.entityId||null,canCreate:activeCompanyCount===0&&createAccess.allowed===true,canResumeTrustedClaim:!!(this.trustedActiveCompanyId&&!profile),additionalLtdSupported:false,requiredTier:'pro',reason:activeCompanyCount>0?'one_active_ltd_limit':createAccess.allowed?null:createAccess.reason,existingAction:profile?{callback:'onOpenExistingCompany',nextRoute:profile.lifecycleStatus==='confirmed'?'ltd.workspace.overview':this.resumeRoute(profile),enabled:readAccess.allowed===true,disabledReason:readAccess.allowed?null:readAccess.reason}:null},
      company:profile?{entity:clone(entity),profile:clone(profile),draftState:clone(this.companyDraftState),bookkeepingEligibility:clone(gate),taxEstimateEligibility:clone(taxGate),periodPlan:clone(this.pendingPeriodPlan||periodPlan)}:null,
      lookupStatus:clone(this.lookup),
      workspace:{projection:clone(projection),projectionError,events:clone(this.eventsFor(profile)),salaryRecords:clone(this.recordsFor('salaryRecords',profile)),dividendDeclarations:clone(this.recordsFor('dividendDeclarations',profile)),ownershipHistory:clone(profile&&Array.isArray(profile.shareholders)&&profile.shareholders.length?CompanyProfileHistory.ensureHistory(profile).ownershipHistory:[])},
      entitlement:{...resolved,planMappingStatus:'FOUNDER_APPROVED_PRO_ONLY',commercialGateApplied:this.enforceEntitlement,planMapping:clone(this.planMapping),actions:Object.fromEntries(Array.from(CompanyAccess.LTD_PRO_ACTIONS).map(action=>[action,this.access(action)]))},
      informationCopy:clone(this.copy),
      runtime:{...clone(this.runtime),externalNetwork:this.companiesHouseProvider.isNetworkProvider===true}
    };
  }

  reset(){this.state=clone(this.initialState);this.lookup={status:'idle',number:null,company:null,reasons:[]};this.pendingPeriodPlan=null;this.companyDraftState=clone(this.initialCompanyDraftState);this.sequence=0;this.persist();return{status:'ok',data:{mode:this.mode},nextRoute:'home'};}

  async chooseBusinessCategory(input={}){
    if(input.category==='self_employed_business')return{status:'ok',data:{category:input.category,stage:2,choices:['just_me','partnership']},nextRoute:'business.self-employed-structure'};
    if(input.category!=='limited_company')return{status:'field_error',fieldErrors:[fieldError('category','answer_required')]};
    this.requireAccess('create_company');let profile=this.activeProfile();
    if(profile)return{status:'ok',data:{limitReached:true,noWrite:true,profile:clone(profile),action:{callback:'onOpenExistingCompany',nextRoute:profile.lifecycleStatus==='confirmed'?'ltd.workspace.overview':this.resumeRoute(profile)}},nextRoute:'ltd.one-company-limit'};
    const now=this.now(),requestedId=cleanText(input.companyId,128)||null,entityId=this.trustedActiveCompanyId||requestedId||this.newId('company');
    if(this.trustedActiveCompanyId&&requestedId&&requestedId!==this.trustedActiveCompanyId)throw Object.assign(new Error('one_active_ltd_limit'),{code:'one_active_ltd_limit'});
    const claim=await this.activeCompanyClaim({companyId:entityId});
    if(!claim||claim.activeCompanyId!==entityId||!['claimed','existing'].includes(claim.status))throw Object.assign(new Error('active_company_claim_failed'),{code:claim&&claim.reasonCode||'active_company_claim_failed'});
    this.trustedActiveCompanyId=entityId;
    profile=CompanyProfile.createDraft({entityId,now,deviceId:this.deviceId});this.saveProfile(profile);this.companyDraftState=this.companyDraftFromProfile(profile);
    return{status:'ok',data:{limitReached:false,profile:clone(profile),activeCompanyClaim:{activeCompanyId:entityId,idempotent:claim.idempotent===true}},nextRoute:'ltd.onboarding.step1'};
  }
  chooseSelfEmployedStructure(input={}){if(!['just_me','partnership'].includes(input.structure))return{status:'field_error',fieldErrors:[fieldError('structure','answer_required')]};return{status:'ok',data:{category:'self_employed_business',structure:input.structure,delegatedToExistingBusinessFlow:true},nextRoute:'business.existing'};}
  openLegacyBusiness(input={}){const business=this.state.businesses.find(item=>item.id===input.businessId);return business?{status:'ok',data:{businessId:business.id,noWrite:true,delegatedToExistingBusinessFlow:true},nextRoute:'business.existing'}:{status:'field_error',fieldErrors:[fieldError('businessId','company_not_found')]};}
  editLegacyBusiness(input={}){const business=this.state.businesses.find(item=>item.id===input.businessId);return business?{status:'ok',data:{businessId:business.id,noWrite:true,delegatedToExistingBusinessFlow:true},nextRoute:'business.existing.edit'}:{status:'field_error',fieldErrors:[fieldError('businessId','company_not_found')]};}
  openExistingCompany(){this.requireAccess('read');const profile=this.activeProfile();if(!profile)return{status:'field_error',fieldErrors:[fieldError('company','company_not_found')]};return{status:'ok',data:{entityId:profile.entityId,noWrite:true},nextRoute:profile.lifecycleStatus==='confirmed'?'ltd.workspace.overview':this.resumeRoute(profile)};}
  resumeRoute(profile){if(!profile)return'ltd.onboarding.step1';if(profile.companyNumberStatus==='not_available'&&!profile.incorporationDate)return'ltd.onboarding.registration-details';const next=CompanyProfile.missingQuestion(profile),step=next&&['legal_name','company_type','company_number','incorporation_date'].includes(next.id)?1:next&&['trading_status','accounting_period','corporation_tax_status'].includes(next.id)?2:next&&['account_holder_roles','share_structure'].includes(next.id)?3:next&&['activity_profile','unsupported_screen'].includes(next.id)?4:5;return`ltd.onboarding.step${step}`;}
  resumeDraft(){this.requireAccess('resume_company_draft');const profile=this.activeProfile();if(!profile)return{status:'field_error',fieldErrors:[fieldError('company','company_draft_not_found')]};return{status:'ok',data:{profile:clone(profile),draftState:clone(this.companyDraftState)},nextRoute:this.resumeRoute(profile)};}
  saveCompanyDraft(){this.requireAccess('resume_company_draft');const profile=this.activeProfile();if(!profile||profile.lifecycleStatus==='confirmed')return{status:'field_error',fieldErrors:[fieldError('company','company_draft_not_found')]};this.persist();return{status:'ok',data:{profile:clone(profile),draftState:clone(this.companyDraftState),persistedByCodexLayer:true},nextRoute:'home'};}
  fixCompanyFact(input={}){
    this.requireAccess('resume_company_draft');
    const reason=String(input.reasonCode||''),step=/(registration|legal_name|company_name|company_number|incorporation)/.test(reason)?1:/(trading|accounting|period|corporation_tax_status)/.test(reason)?2:/(director|shareholder|ownership|share_structure|account_holder)/.test(reason)?3:/(activity|group|associated|property|inventory|vat|unsupported)/.test(reason)?4:null;
    if(!step)return{status:'field_error',fieldErrors:[fieldError('reasonCode','company_facts_incomplete')]};
    return{status:'ok',data:{reasonCode:reason,fieldId:input.fieldId||null,noWrite:true},nextRoute:`ltd.onboarding.step${step}`};
  }

  async lookupCompany(input={}){
    this.requireAccess('companies_house_lookup');
    const number=CompanyIdentity.normalizeCompanyNumber(input.companyNumber||'');
    const validation=CompanyIdentity.validateCompanyNumber(number);
    if(!validation.valid){this.lookup={status:'field_error',number,reasons:[validation.reason],company:null};return{status:'field_error',fieldErrors:[fieldError('companyNumber',validation.reason)],data:clone(this.lookup)};}
    this.lookup={status:'loading',number:validation.normalized||number,company:null,reasons:[]};
    const result=await this.companiesHouseProvider.lookup(validation.normalized||number);
    const reasons=Array.from(new Set([...(result.reasonCodes||[]),...(result.reasonCode?[result.reasonCode]:[])]));
    this.lookup={status:result.status,verificationStatus:result.status==='found'?(result.verificationStatus||CompaniesHouse.assessRegistryCompany(result.company).verificationStatus):result.status,number:validation.normalized||number,company:clone(result.company||null),reasons,retryable:result.retryable===true};
    const profile=this.activeProfile();
    if(profile){
      const company=result.company||{},providerStatus=this.lookup.verificationStatus==='found'?'needs_checking':this.lookup.verificationStatus;
      const hasConfirmedManualFacts=profile.companyNumberStatus==='provided'&&profile.companyNumber===(validation.normalized||number);
      const officialMatches=company.name===profile.legalName&&company.incorporationDate===profile.incorporationDate;
      const verifiedFactsEdited=providerStatus==='verified'&&hasConfirmedManualFacts&&!officialMatches;
      const storedStatus=verifiedFactsEdited?'needs_checking':providerStatus;
      const storedReasons=verifiedFactsEdited?Array.from(new Set([...reasons,'verified_facts_edited'])):reasons;
      if(verifiedFactsEdited){this.lookup.verificationStatus=storedStatus;this.lookup.reasons=clone(storedReasons);}
      const verification={schemaVersion:1,status:storedStatus,companyNumber:validation.normalized||number,checkedAt:this.now(),verifiedAt:storedStatus==='verified'?this.now():profile.registryVerification&&profile.registryVerification.verifiedAt||null,verificationSource:'companies_house_api',provider:'companies_house_api',retryable:result.retryable===true,reasonCodes:storedReasons,registryFacts:{legalName:company.name||null,incorporationDate:company.incorporationDate||null,companyStatus:company.status||null,companyType:company.type||null,registryUrl:company.registryUrl||null},userFacts:{legalName:profile.legalName||null,incorporationDate:profile.incorporationDate||null}},candidate={...profile,registryVerification:verification,updatedAt:this.now(),deviceId:this.deviceId},assessment=CompanyProfile.assess(candidate);
      candidate.assessmentStatus=assessment.status;candidate.assessmentReasons=assessment.reasons;this.saveProfile(candidate);
    }
    if(result.status==='found')return{status:'ok',data:clone(this.lookup),nextRoute:null};
    if(result.status==='field_error')return{status:'field_error',fieldErrors:[fieldError('companyNumber',result.reasonCode||'company_number_invalid')],data:clone(this.lookup)};
    return{status:'review_required',reviewReasons:clone(this.lookup.reasons),data:clone(this.lookup),nextRoute:null};
  }
  async recheckCompany(input={}){const profile=this.activeProfile(),number=input.companyNumber||profile&&profile.companyNumber;if(!profile||!number)return{status:'field_error',fieldErrors:[fieldError('companyNumber','company_number_required')]};const result=await this.lookupCompany({companyNumber:number});return{...result,nextRoute:'ltd.records.company-edit'};}

  planCompanyPeriods(input={}){
    this.requireAccess('resume_company_draft');
    const profile=this.activeProfile();if(!profile||!profile.incorporationDate)return{status:'field_error',fieldErrors:[fieldError('incorporationDate','incorporation_date_required')]};
    const tradingStatus=input.tradingStatus,tradingStartDate=input.tradingStartDate||null,override=input.override&&input.override.enabled===true?clone(input.override):undefined;
    if(!CompanyProfile.TRADING_STATUSES.includes(tradingStatus))return{status:'field_error',fieldErrors:[fieldError('tradingStatus','answer_required')]};
    if(tradingStatus==='trading'&&!Domain.isoDate(tradingStartDate))return{status:'field_error',fieldErrors:[fieldError('tradingStartDate','trading_start_date_required')]};
    try{const plan=CompanyIdentity.planFirstPeriods({incorporationDate:profile.incorporationDate,tradingStatus,tradingStartDate,override});this.pendingPeriodPlan={status:'draft',accounts:clone(plan.accounts),corporationTaxPeriods:clone(plan.corporationTaxPeriods),confirmedTaxPeriods:[],reconcilesConfirmedPeriods:false,reasons:[]};return{status:'ok',data:{periodPlan:clone(this.pendingPeriodPlan),noCompanyWrite:true},nextRoute:null};}catch(error){return{status:'field_error',fieldErrors:[fieldError(override?'accountingPeriod':'tradingStartDate','accounting_period_invalid')]};}
  }

  continueStep(input={}){
    this.requireAccess('resume_company_draft');
    const profile=this.activeProfile();if(!profile)return{status:'field_error',fieldErrors:[fieldError('company','company_draft_not_found')]};
    const step=Number(input.step),values=input.values||{},now=this.now(),errors=[];let next=profile;
    try{
      if(step===1){
        const numberStatus=values.companyNumberStatus;let number=null;if(!['provided','not_available'].includes(numberStatus))errors.push(fieldError('companyNumberStatus','answer_required'));
        const name=CompanyIdentity.validateCompanyName(values.legalName||'',{requirePrivateEnding:numberStatus==='provided'});if(!name.valid)errors.push(fieldError('legalName',name.reason,{invalidCharacters:name.invalidCharacters||[]}));
        const date=values.incorporationDate;
        if(numberStatus==='provided'){
          const valid=CompanyIdentity.validateCompanyNumber(values.companyNumber||'');if(!valid.valid)errors.push(fieldError('companyNumber',valid.reason));else number=valid.normalized;
          if(!date)errors.push(fieldError('incorporationDate','incorporation_date_required'));else if(!Domain.isoDate(date))errors.push(fieldError('incorporationDate','incorporation_date_invalid'));else if(date>new Date(this.now()).toISOString().slice(0,10))errors.push(fieldError('incorporationDate','future_incorporation'));
        }
        if(errors.length)return{status:'field_error',fieldErrors:errors};
        next=CompanyProfile.answer(next,'legal_name',name.name,{now,deviceId:this.deviceId});
        next=CompanyProfile.answer(next,'company_type',{jurisdiction:'UK',companyType:'private_limited_by_shares',currency:'GBP'},{now,deviceId:this.deviceId});
        next=CompanyProfile.answer(next,'company_number',{status:numberStatus,number},{now,deviceId:this.deviceId});
        if(numberStatus==='provided')next=CompanyProfile.answer(next,'incorporation_date',date,{now,deviceId:this.deviceId});
        if(numberStatus==='provided'){
          const matching=this.lookup&&this.lookup.number===number&&this.activeProfile().registryVerification&&this.activeProfile().registryVerification.companyNumber===number?clone(this.activeProfile().registryVerification):null;
          if(matching){const official=matching.registryFacts||{},same=matching.status==='verified'&&official.legalName===name.name&&official.incorporationDate===date;next.registryVerification={...matching,status:same?'verified':'needs_checking',verifiedAt:same?(matching.verifiedAt||matching.checkedAt||now):matching.verifiedAt||null,verificationSource:'companies_house_api',reasonCodes:same?[]:Array.from(new Set([...(matching.reasonCodes||[]),'verified_facts_edited'])),userFacts:{legalName:name.name,incorporationDate:date}};}
          else next.registryVerification={schemaVersion:1,status:'manual_unverified',companyNumber:number,checkedAt:now,verifiedAt:null,verificationSource:'manual_entry',provider:'manual_entry',retryable:false,reasonCodes:['companies_house_verification_not_completed'],registryFacts:{legalName:null,incorporationDate:null,companyStatus:null,companyType:null,registryUrl:null},userFacts:{legalName:name.name,incorporationDate:date}};
          if(next.registryVerification.status!=='verified'){next.assessmentStatus='review_required';next.assessmentReasons=Array.from(new Set([...(next.assessmentReasons||[]),...next.registryVerification.reasonCodes]));}
        }else next.registryVerification={schemaVersion:1,status:'not_registered',companyNumber:null,checkedAt:now,provider:'user_fact',retryable:false,reasonCodes:['company_not_yet_registered'],registryFacts:{legalName:null,incorporationDate:null,companyStatus:null,companyType:null,registryUrl:null}};
        this.companyDraftState={...this.companyDraftState,status:numberStatus==='provided'?'in_progress':'registration_pending',registrationStatus:numberStatus==='provided'?'registered':'not_available',updatedAt:now};
      }else if(step===2){
        if(profile.companyNumberStatus==='not_available'&&!profile.incorporationDate){
          if(values.registrationDeferredAcknowledged!==true)return{status:'field_error',fieldErrors:[fieldError('registrationDeferredAcknowledged','confirmation_required')]};
          return{status:'ok',data:{profile:clone(profile),draftState:clone(this.companyDraftState),officialFactsDeferred:true},nextRoute:'ltd.onboarding.step3'};
        }
        const tradingStatus=values.tradingStatus,startDate=values.tradingStartDate;
        if(!CompanyProfile.TRADING_STATUSES.includes(tradingStatus))errors.push(fieldError('tradingStatus','answer_required'));
        if(!Domain.isoDate(profile.incorporationDate))errors.push(fieldError('incorporationDate','incorporation_date_required'));
        if(tradingStatus==='trading'&&!startDate)errors.push(fieldError('tradingStartDate','trading_start_date_required'));else if(tradingStatus==='trading'&&!Domain.isoDate(startDate))errors.push(fieldError('tradingStartDate','trading_start_date_invalid'));
        let planned=this.pendingPeriodPlan&&this.pendingPeriodPlan.accounts||null;
        if(!planned&&CompanyProfile.TRADING_STATUSES.includes(tradingStatus)&&Domain.isoDate(profile.incorporationDate)&&(tradingStatus!=='trading'||Domain.isoDate(startDate))){
          try{planned=CompanyIdentity.planFirstPeriods({incorporationDate:profile.incorporationDate,tradingStatus,tradingStartDate:tradingStatus==='trading'?startDate:null}).accounts;}catch(_){planned=null;}
        }
        const period=values.accountingPeriod&&values.accountingPeriod.startDate?values.accountingPeriod:planned||{};if(!period.startDate||!period.endDate)errors.push(fieldError('accountingPeriod','accounting_period_required'));else if(!Domain.isoDate(period.startDate)||!Domain.isoDate(period.endDate))errors.push(fieldError('accountingPeriod','accounting_period_invalid'));
        if(Domain.isoDate(period.startDate)&&Domain.isoDate(period.endDate)&&period.startDate>period.endDate)errors.push(fieldError('accountingPeriod','accounting_period_start_after_end'));
        if(Domain.isoDate(profile.incorporationDate)&&Domain.isoDate(period.startDate)&&period.startDate<profile.incorporationDate)errors.push(fieldError('accountingPeriod','accounting_period_before_incorporation'));
        if(tradingStatus==='trading'&&Domain.isoDate(startDate)&&Domain.isoDate(profile.incorporationDate)&&startDate<profile.incorporationDate)errors.push(fieldError('tradingStartDate','trading_before_incorporation'));
        if(tradingStatus==='trading'&&Domain.isoDate(startDate)&&startDate>new Date(this.now()).toISOString().slice(0,10))errors.push(fieldError('tradingStartDate','future_trading'));
        if(tradingStatus==='trading'&&Domain.isoDate(startDate)&&Domain.isoDate(period.endDate)&&startDate>period.endDate)errors.push(fieldError('tradingStartDate','trading_after_accounts_period'));
        if(!CompanyProfile.CT_STATUSES.includes(values.corporationTaxStatus))errors.push(fieldError('corporationTaxStatus','answer_required'));
        if(errors.length)return{status:'field_error',fieldErrors:errors};
        next=CompanyProfile.answer(next,'trading_status',{status:tradingStatus,startDate},{now,deviceId:this.deviceId});
        next=CompanyProfile.answer(next,'accounting_period',{startDate:period.startDate,endDate:period.endDate,referenceDate:period.referenceDate||period.endDate,status:'confirmed'},{now,deviceId:this.deviceId});
        next=CompanyProfile.answer(next,'corporation_tax_status',values.corporationTaxStatus,{now,deviceId:this.deviceId});
      }else if(step===3){
        const founderName=cleanText(values.founderName,300),otherName=cleanText(values.otherShareholderName,300),founderShares=Number(values.founderShares),otherShares=values.otherShares==null?0:Number(values.otherShares),directorAnswer=values.directorAnswer;
        if(!founderName)errors.push(fieldError('founderName','founder_name_required'));if(!Number.isSafeInteger(founderShares)||founderShares<=0)errors.push(fieldError('founderShares','founder_shares_invalid'));if(!Number.isSafeInteger(otherShares)||otherShares<0)errors.push(fieldError('otherShares','other_shares_invalid'));if(otherShares>0&&!otherName)errors.push(fieldError('otherShareholderName','other_shareholder_name_required'));if(!['yes','no','not_sure'].includes(directorAnswer))errors.push(fieldError('directorAnswer','director_answer_required'));
        if(errors.length)return{status:'field_error',fieldErrors:errors};
        if(directorAnswer==='not_sure'){next=clone(next);delete next.accountHolder;}else next=CompanyProfile.answer(next,'account_holder_roles',{isDirector:directorAnswer==='yes',isShareholder:true},{now,deviceId:this.deviceId});
        const shareholders=[{id:'shareholder:account-holder',name:founderName,isAccountHolder:true,shareClassId:'ordinary',shares:founderShares}];if(otherShares>0)shareholders.push({id:'shareholder:other',name:otherName,isAccountHolder:false,shareClassId:'ordinary',shares:otherShares});
        next=CompanyProfile.answer(next,'share_structure',{directors:directorAnswer==='yes'?[{id:'director:account-holder',name:founderName,isAccountHolder:true}]:[],shareholders,shareClasses:[{id:'ordinary',name:'ordinary',dividendRights:'equal'}]},{now,deviceId:this.deviceId});
        this.companyDraftState={...this.companyDraftState,status:profile.companyNumberStatus==='not_available'&&!profile.incorporationDate?'registration_pending':directorAnswer==='yes'?'in_progress':'director_review_required',directorAnswer,ownershipDraft:clone(next.shareholders),updatedAt:now};
      }else if(step===4){
        const riskAnswers=CompanyProfile.onboardingRiskAnswers(values.riskAnswers||{},{activeLtdCount:this.list('companyProfiles').filter(item=>item.deletedAt==null).length});
        const missing=CompanyProfile.SETUP_RISK_FIELDS.filter(field=>![true,false,'not_sure'].includes(riskAnswers[field]));if(missing.length)return{status:'field_error',fieldErrors:missing.map(field=>fieldError(field,'answer_required'))};
        if(![true,false,'not_sure'].includes(values.ordinaryServiceDigital))return{status:'field_error',fieldErrors:[fieldError('ordinaryServiceDigital','answer_required')]};
        if(values.ordinaryServiceDigital===true)next=CompanyProfile.answer(next,'activity_profile','service_digital',{now,deviceId:this.deviceId});
        else next=CompanyProfile.answer(next,'activity_profile','review_required',{now,deviceId:this.deviceId});
        next=CompanyProfile.answer(next,'unsupported_screen',riskAnswers,{now,deviceId:this.deviceId});
      }else if(step===5){
        if(values.confirmed!==true)return{status:'field_error',fieldErrors:[fieldError('confirmed','confirmation_required')]};
        next=CompanyProfile.answer(next,'confirmation',true,{now,deviceId:this.deviceId});
      }else return{status:'failure',error:{reasonCode:'unknown_onboarding_step',copyKey:'error.fix_issue'}};
      this.saveProfile(next);
      if(step===2)this.pendingPeriodPlan=null;
      if(step===5){const eligibility=CompanyProfile.bookkeepingEligibility(next);if(!eligibility.allowed)return{status:'field_error',fieldErrors:[fieldError(eligibility.nextQuestion||'companyFacts','company_facts_incomplete')],reviewReasons:eligibility.reasons,data:{eligibility}};this.companyDraftState={...this.companyDraftState,status:'confirmed',updatedAt:now};this.ensurePaymentAccounts(next);return{status:next.assessmentStatus==='review_required'?'review_required':'ok',reviewReasons:next.assessmentReasons||[],data:{profile:clone(next),eligibility},nextRoute:'ltd.workspace.overview'};}
      if(step===1&&next.companyNumberStatus==='not_available'&&!next.incorporationDate)return{status:'ok',data:{profile:clone(next),draftState:clone(this.companyDraftState),officialFactsDeferred:true},nextRoute:'ltd.onboarding.step2'};
      if(step===3&&next.companyNumberStatus==='not_available'&&!next.incorporationDate)return{status:'review_required',reviewReasons:['company_registration_required_before_bookkeeping',...(this.companyDraftState.directorAnswer!=='yes'?['director_confirmation_required']:[])],data:{profile:clone(next),draftState:clone(this.companyDraftState),bookkeepingAllowed:false},nextRoute:'ltd.onboarding.registration-pending'};
      if(step===3&&this.companyDraftState.directorAnswer!=='yes')return{status:'review_required',reviewReasons:['account_holder_director_confirmation_required'],data:{profile:clone(next),draftState:clone(this.companyDraftState),bookkeepingAllowed:false},nextRoute:'ltd.onboarding.director-review'};
      return{status:'ok',data:{profile:clone(next)},nextRoute:`ltd.onboarding.step${step+1}`};
    }catch(error){return{status:'field_error',fieldErrors:[fieldError(error.field||'companyFacts',stableReason(error,'company_facts_incomplete'))]};}
  }

  ensurePaymentAccounts(profile){return this.atomic(()=>{const now=this.now();if(!this.account(profile,'entity'))this.upsert('paymentAccounts',{id:`account-company-bank:${profile.entityId}`,ownerType:'entity',ownerId:profile.entityId,name:'Company bank',currency:'GBP',createdAt:now,updatedAt:now,deviceId:this.deviceId});if(!this.account(profile,'person'))this.upsert('paymentAccounts',{id:`account-personal:${profile.entityId}`,ownerType:'person',ownerId:'person:account-holder',name:'Account holder personal account',currency:'GBP',createdAt:now,updatedAt:now,deviceId:this.deviceId});return true;});}

  transaction(input={}){
    this.requireAccess('create_event');const profile=this.activeProfile();if(!profile)return{status:'field_error',fieldErrors:[fieldError('company','company_not_found')]};this.ensurePaymentAccounts(profile);
    const editEvent=input.editDraftEventId?this.eventsFor(profile).find(item=>item.id===input.editDraftEventId):null;if(input.editDraftEventId&&(!editEvent||editEvent.status!=='draft'))return{status:'field_error',fieldErrors:[fieldError('eventId','draft_record_not_found')]};
    let amountMinor,date;try{amountMinor=asMinor(input.amountMinor,'amountMinor');date=asDate(input.date,'date');}catch(error){return{status:'field_error',fieldErrors:[fieldError(error.field||'record',stableReason(error,'record_invalid'))]};}
    const type=input.type,description=cleanText(input.description,300),evidenceRefs=Array.isArray(input.evidenceRefs)?input.evidenceRefs.map(item=>cleanText(item,512)).filter(Boolean):[];
    if(amountMinor<=0||!description)return{status:'field_error',fieldErrors:[...(!description?[fieldError('description','description_required')]:[]),...(amountMinor<=0?[fieldError('amountMinor','amount_must_be_positive')]:[])]};
    const companyAccount=this.account(profile,'entity'),personalAccount=this.account(profile,'person'),facts={type,id:editEvent?editEvent.id.slice('company-event:'.length):this.newId(type),entityId:profile.entityId,date,amountMinor,description,evidenceRefs,updatedAt:this.now(),deviceId:this.deviceId};
    if(type===CompanyLedger.TYPES.COMPANY_INCOME){
      const invoicePartyId=cleanText(input.invoicePartyId,128);if(!invoicePartyId)return{status:'field_error',fieldErrors:[fieldError('invoicePartyId','invoice_party_required')]};
      const treatment=input.category?{canonicalCategory:input.category,treatmentBasis:input.treatmentBasis||'income_treatment_review_required',confirmations:clone(input.taxFacts||{})}:TransactionAdapter.deriveIncomeTreatment(input);
      Object.assign(facts,{invoicePartyId,receiverPaymentAccountId:companyAccount.id,receiverOwnerType:'entity',category:treatment.canonicalCategory,treatmentBasis:treatment.treatmentBasis});
      facts.companyTaxTreatment=CompanyTreatment.assessIncome(facts,profile,treatment.confirmations);
    }
    else if([CompanyLedger.TYPES.COMPANY_EXPENSE,CompanyLedger.TYPES.PERSONALLY_PAID_EXPENSE].includes(type)){
      const personal=type===CompanyLedger.TYPES.PERSONALLY_PAID_EXPENSE;let shared=null;
      if(Array.isArray(input.sharedAllocations)){
        const entitiesByBusinessId=Object.fromEntries(this.state.businesses.map(item=>[item.id,`entity:${item.id}`])),allocation=TransactionAdapter.deriveSharedAllocation({grossAmountMinor:amountMinor,companyEntityId:profile.entityId,allocations:input.sharedAllocations,entitiesByBusinessId});
        if(allocation.status!=='ok')return{status:'field_error',fieldErrors:[fieldError('sharedAllocations',allocation.reasonCode)]};
        shared=allocation.data;facts.amountMinor=shared.companyAmountMinor;
      }
      const treatment=input.category?{canonicalCategory:input.category,treatmentBasis:input.treatmentBasis||'expense_treatment_review_required',confirmations:clone(input.taxFacts||{}),provenance:clone(input.expenseFactProvenance||null)}:TransactionAdapter.deriveExpenseTreatment({...input,amountMinor,sharedExpense:shared});
      let canonicalCategory=treatment.canonicalCategory,basis=treatment.treatmentBasis,confirmations=treatment.confirmations;
      const invoicePartyId=input.taxFacts&&input.taxFacts.invoiceToCompany==='yes'?profile.entityId:(cleanText(input.invoicePartyId,128)||'party:unconfirmed');
      Object.assign(facts,{invoicePartyId,payerPaymentAccountId:personal?personalAccount.id:companyAccount.id,payerOwnerType:personal?'person':'entity',reimbursementExpected:personal?true:undefined,category:canonicalCategory,treatmentBasis:basis,sharedExpense:shared,expenseFactProvenance:treatment.provenance||{schemaVersion:1,companyUseScope:'unknown',sourceQuestion:'money.only_company',answer:'unknown',allocationDerived:!!shared,companyAllocationMinor:shared&&shared.companyAmountMinor||null,grossAmountMinor:shared&&shared.grossAmountMinor||amountMinor,derivedAtAction:'company_expense_capture'}});
      facts.companyTaxTreatment=CompanyTreatment.assessExpense(facts,profile,confirmations);
      if(canonicalCategory==='ordinary_running'&&facts.companyTaxTreatment.status==='review_required'){canonicalCategory='unknown';basis='unknown_review_required';confirmations={};facts.category=canonicalCategory;facts.treatmentBasis=basis;facts.companyTaxTreatment=CompanyTreatment.assessExpense(facts,profile,confirmations);}
    }
    else if([CompanyLedger.TYPES.DIRECTOR_LOAN_FUNDING,CompanyLedger.TYPES.SHARE_CAPITAL_FUNDING].includes(type))Object.assign(facts,{payerPaymentAccountId:personalAccount.id,receiverPaymentAccountId:companyAccount.id,payerOwnerType:'person',receiverOwnerType:'entity',category:type==='share_capital_funding'?'share_capital':'director_loan',treatmentBasis:type==='share_capital_funding'?'share_capital_confirmed':'director_loan_confirmed',shareCapitalEvidenceConfirmed:type==='share_capital_funding'?input.shareCapitalEvidenceConfirmed===true:undefined});
    else if(type===CompanyLedger.TYPES.DIRECTOR_LOAN_REPAYMENT)Object.assign(facts,{payerPaymentAccountId:companyAccount.id,receiverPaymentAccountId:personalAccount.id,payerOwnerType:'entity',receiverOwnerType:'person',category:'director_loan_repayment',treatmentBasis:'director_loan_repayment_confirmed'});
    else return{status:'failure',error:{reasonCode:'unsupported_transaction_type',copyKey:'error.fix_issue',params:{}}};
    const result=CompanyLedger.buildEvent({profile,paymentAccounts:this.list('paymentAccounts'),currentEvents:this.eventsFor(profile),facts});if(result.envelope)this.atomic(()=>this.upsert('economicEvents',result.envelope));return{status:result.status==='posted'||result.status==='existing'?'ok':'review_required',reviewReasons:result.reasons||[],data:{event:clone(result.envelope),editedDraftId:editEvent&&editEvent.id||null,identityPreserved:editEvent?result.envelope&&result.envelope.id===editEvent.id:null,ledger:clone(result.ledger||CompanyLedger.reconcile(this.eventsFor(profile),profile.entityId))},nextRoute:editEvent?'ltd.money.record-detail':'ltd.workspace.money'};
  }

  recordView(event){
    const source=event.sourceTransaction||{},postings=(event.journals||[]).flatMap(group=>group.postings||[]),movement=code=>postings.filter(row=>row.accountCode===code).reduce((sum,row)=>sum+row.debitMinor-row.creditMinor,0),shared=source.sharedExpense||null;
    const allocationRows=(shared&&shared.allocations||[]).map(item=>{const legacy=item.sourceBusinessId&&this.state.businesses.find(business=>business.id===item.sourceBusinessId);return{id:item.id,scope:item.scope,entityId:item.entityId,label:item.scope==='private'?'private_use':legacy?legacy.name:item.entityId===source.beneficiaryEntityId?(this.entityFor()&&this.entityFor().name||'limited_company'):'other_business',amountMinor:item.amountMinor};});
    return{eventId:event.id,status:event.status,type:source.companyTransactionType,date:source.date,description:source.purpose,grossAmountMinor:shared?shared.grossAmountMinor:source.amountMinor,companyAmountMinor:shared?shared.companyAmountMinor:source.amountMinor,paidBy:source.payerOwnerType==='person'?'account_holder':'company',taxStatus:source.companyTaxTreatment&&source.companyTaxTreatment.status||event.treatmentDecision&&event.treatmentDecision.taxTreatmentStatus||'unassessed',reviewReasons:clone(event.reviewReasons||source.companyTaxTreatment&&source.companyTaxTreatment.reasonCodes||[]),evidenceRefs:clone(source.evidenceRefs||[]),companyCashEffectMinor:movement('COMPANY_BANK'),directorLoanEffectMinor:-movement('DIRECTOR_LOAN'),expenseEffectMinor:movement('OPERATING_EXPENSE')+movement('DIRECTOR_SALARY_EXPENSE')+movement('EMPLOYER_NI_EXPENSE'),incomeEffectMinor:-movement('TRADING_INCOME'),sharedAllocations:allocationRows,technical:{journalCount:(event.journals||[]).length,postingCount:postings.length}};
  }
  openRecord(input={}){this.requireAccess('read');const event=this.eventsFor().find(item=>item.id===input.eventId);return event?{status:'ok',data:{event:clone(event),recordView:this.recordView(event)},nextRoute:'ltd.money.record-detail'}:{status:'field_error',fieldErrors:[fieldError('eventId','record_not_found')]};}
  openDraftEdit(input={}){
    this.requireAccess('edit_draft_event');
    const event=this.eventsFor().find(item=>item.id===input.eventId);if(!event||event.status!=='draft')return{status:'field_error',fieldErrors:[fieldError('eventId','draft_record_not_found')]};const source=event.sourceTransaction||{},allocation=event.allocations&&event.allocations[0]||{};
    return{status:'ok',data:{eventId:event.id,revision:event.revision,recordIdentity:{eventId:event.id,sourceFactId:event.id.slice('company-event:'.length)},values:{type:source.companyTransactionType,date:source.date,amountMinor:source.sharedExpense&&source.sharedExpense.grossAmountMinor||source.amountMinor,description:source.purpose,evidenceRefs:clone(source.evidenceRefs||[]),invoicePartyId:source.invoicePartyId||null,category:allocation.category||null,taxFacts:clone(source.companyTaxTreatment&&source.companyTaxTreatment.confirmations||{}),sharedAllocations:clone(source.sharedExpense&&source.sharedExpense.allocations||null),shareCapitalEvidenceConfirmed:source.shareCapitalEvidenceConfirmed===true},allowedFields:['date','amountMinor','description','evidenceRefs','invoicePartyId','category','taxFacts','sharedAllocations','shareCapitalEvidenceConfirmed'],saveCallback:'onSaveDraftEdit'},nextRoute:'ltd.money.draft-edit'};
  }
  saveDraftEdit(input={}){
    this.requireAccess('edit_draft_event');
    const event=this.eventsFor().find(item=>item.id===input.eventId);if(!event||event.status!=='draft')return{status:'field_error',fieldErrors:[fieldError('eventId','draft_record_not_found')]};const source=event.sourceTransaction||{},allocation=event.allocations&&event.allocations[0]||{},changes=clone(input.changes||{}),base={type:source.companyTransactionType,date:source.date,amountMinor:source.sharedExpense&&source.sharedExpense.grossAmountMinor||source.amountMinor,description:source.purpose,evidenceRefs:clone(source.evidenceRefs||[]),invoicePartyId:source.invoicePartyId||null,category:allocation.category||null,taxFacts:clone(source.companyTaxTreatment&&source.companyTaxTreatment.confirmations||{}),sharedAllocations:clone(source.sharedExpense&&source.sharedExpense.allocations||undefined),shareCapitalEvidenceConfirmed:source.shareCapitalEvidenceConfirmed===true};
    return this.transaction({...base,...changes,editDraftEventId:event.id});
  }
  deleteDraft(input={}){this.requireAccess('edit_draft_event');const event=this.eventsFor().find(item=>item.id===input.eventId);if(!event||event.status!=='draft')return{status:'field_error',fieldErrors:[fieldError('eventId','draft_record_not_found')]};this.atomic(()=>{this.domain().economicEvents=this.list('economicEvents').filter(item=>item.id!==event.id);});return{status:'ok',data:{deletedEventId:event.id},nextRoute:'ltd.workspace.money'};}
  correctRecord(input={}){
    this.requireAccess('correct_event');
    const prior=this.eventsFor().find(item=>item.id===input.eventId);if(!prior||prior.status!=='committed')return{status:'field_error',fieldErrors:[fieldError('eventId','committed_record_required')]};
    const reason=cleanText(input.reasonCode,128);if(!reason)return{status:'field_error',fieldErrors:[fieldError('reasonCode','correction_reason_required')]};
    const profile=this.activeProfile(),source=prior.sourceTransaction,replacement=input.replacement||{},type=source.companyTransactionType,date=replacement.date||source.date,amountMinor=Number.isSafeInteger(replacement.amountMinor)?replacement.amountMinor:source.amountMinor,description=cleanText(replacement.description||source.purpose,300);
    try{asDate(date,'date');asMinor(amountMinor,'amountMinor');}catch(error){return{status:'field_error',fieldErrors:[fieldError(error.field,stableReason(error,`${error.field}_invalid`))]};}if(!description)return{status:'field_error',fieldErrors:[fieldError('description','description_required')]};
    const facts={type,id:this.newId('corrected'),entityId:profile.entityId,date,amountMinor,description,invoicePartyId:source.invoicePartyId,payerPaymentAccountId:source.payerPaymentAccountId,receiverPaymentAccountId:source.receiverPaymentAccountId,payerOwnerType:source.payerOwnerType,receiverOwnerType:source.receiverOwnerType,reimbursementExpected:source.reimbursementExpected,sharedExpense:clone(source.sharedExpense),expenseFactProvenance:clone(source.expenseFactProvenance),category:prior.allocations&&prior.allocations[0]&&prior.allocations[0].category,treatmentBasis:prior.treatmentDecision&&prior.treatmentDecision.basis,evidenceRefs:clone(source.evidenceRefs||[]),updatedAt:this.now(),deviceId:this.deviceId};
    if([CompanyLedger.TYPES.COMPANY_EXPENSE,CompanyLedger.TYPES.PERSONALLY_PAID_EXPENSE].includes(type))facts.companyTaxTreatment=CompanyTreatment.assessExpense(facts,profile,clone(source.companyTaxTreatment&&source.companyTaxTreatment.confirmations||{}));
    else if(type===CompanyLedger.TYPES.COMPANY_INCOME)facts.companyTaxTreatment=CompanyTreatment.assessIncome(facts,profile,clone(source.companyTaxTreatment&&source.companyTaxTreatment.confirmations||{}));
    else if(type===CompanyLedger.TYPES.SHARE_CAPITAL_FUNDING)facts.shareCapitalEvidenceConfirmed=true;
    const reversed=CompanyLedger.reverseEvent(prior,{now:this.now(),deviceId:this.deviceId,reversalEventId:this.newId('company-correction')}),candidateEvents=this.eventsFor().map(item=>item.id===prior.id?reversed:item),result=CompanyLedger.buildEvent({profile,paymentAccounts:this.list('paymentAccounts'),currentEvents:candidateEvents,facts});
    this.atomic(()=>{this.upsert('economicEvents',reversed);if(result.envelope)this.upsert('economicEvents',result.envelope);});return{status:result.status==='posted'?'ok':'review_required',reviewReasons:result.reasons||[],data:{reasonCode:reason,reversed:clone(reversed),replacement:clone(result.envelope)},nextRoute:'ltd.money.record-detail'};
  }

  runCtEstimate(input={}){
    this.requireAccess('create_period');
    const profile=this.activeProfile();
    if(!profile)return{status:'field_error',fieldErrors:[fieldError('company','company_not_found')]};
    const topics=input.reviewTopics||{};
    if(['records','periods','losses'].some(topic=>!['yes','not_sure'].includes(topics[topic])))return{status:'field_error',fieldErrors:[fieldError('reviewTopics','answer_required')]};
    if(Object.values(topics).some(answer=>answer==='not_sure'))return{status:'review_required',reviewReasons:Object.entries(topics).filter(([,answer])=>answer==='not_sure').map(([topic])=>`corporation_tax_${topic}_review_required`),data:{periodRecords:[],lossRecords:[],topics:clone(topics),noCalculation:true},nextRoute:'ltd.tax.ct-review'};
    const result=CompanyTax.computeEstimates({profile,events:this.eventsFor(profile),ctFacts:clone(input.ctFacts||{}),lossRecords:this.recordsFor('companyLossRecords',profile),lossUseMinorByPeriod:clone(input.lossUseMinorByPeriod||[]),priorPeriodRecords:this.recordsFor('companyTaxPeriods',profile),asOfDate:input.asOfDate||this.currentDate(),now:this.now(),deviceId:this.deviceId});
    this.atomic(()=>{for(const record of result.periodRecords||[])this.upsert('companyTaxPeriods',record);for(const record of result.lossRecords||[])this.upsert('companyLossRecords',record);});
    return{status:result.status==='supported_calculated'?'ok':'review_required',reviewReasons:result.reasonCodes||result.reasons||[],data:clone(result),nextRoute:'ltd.tax.ct-review'};
  }

  scenarioDefinitions(input={}){
    let definitions=clone(input.scenarios||[]);const ordinary=input.ordinaryFacts||{};
    if(!definitions.length&&Number.isSafeInteger(ordinary.amountMinor)&&ordinary.amountMinor>=0){const amount=ordinary.amountMinor,salary=Math.floor(amount/2);definitions=[{kind:'salary',amountMinor:amount},{kind:'dividend',amountMinor:amount},{kind:'mix',salaryGrossMinor:salary,dividendTotalMinor:amount-salary},{kind:'leave',amountMinor:0}];}
    return definitions.map((item,index)=>{
      if(item&&Number.isSafeInteger(item.salaryGrossMinor)&&Number.isSafeInteger(item.dividendTotalMinor))return{id:item.id||item.kind||`scenario-${index+1}`,salaryGrossMinor:item.salaryGrossMinor,dividendTotalMinor:item.dividendTotalMinor};
      const amount=Number(item&&item.amountMinor);
      if(!Number.isSafeInteger(amount)||amount<0)return{id:item&&item.kind||`scenario-${index+1}`,salaryGrossMinor:-1,dividendTotalMinor:-1};
      if(item.kind==='salary')return{id:'salary',salaryGrossMinor:amount,dividendTotalMinor:0};
      if(item.kind==='dividend')return{id:'dividend',salaryGrossMinor:0,dividendTotalMinor:amount};
      if(item.kind==='leave')return{id:'retained',salaryGrossMinor:0,dividendTotalMinor:0};
      return{id:item.kind||`scenario-${index+1}`,salaryGrossMinor:-1,dividendTotalMinor:-1};
    });
  }
  runScenario(input={}){
    this.requireAccess('create_scenario');
    try{
      const baseline=input.baseline?CompanyScenario.createBaseline(clone(input.baseline)):this.defaultScenarioBaseline(input),scenarios=this.scenarioDefinitions(input);
      if(!scenarios.length)return{status:'field_error',fieldErrors:[fieldError('scenarios','scenario_required')]};
      const before=JSON.stringify(this.state),result=CompanyScenario.compare({baseline,scenarios,asOfDate:input.asOfDate||this.currentDate()});
      if(JSON.stringify(this.state)!==before)throw new Error('scenario_mutated_actual_books');
      return{status:result.status==='supported_provisional'?'ok':'review_required',reviewReasons:result.results.flatMap(item=>item.reasonCodes||item.reasons||[]),data:{...clone(result),semanticStatus:result.status==='supported_provisional'?'supported_calculated':'review_required',comparisonScope:'displayed_examples',mixedScenarioMethod:'equal_split_example'},nonPosting:true,nextRoute:'ltd.tax.scenario-results'};
    }catch(error){const reason=stableReason(error,'scenario_facts_need_checking');return{status:'review_required',reviewReasons:[reason],data:{nonPosting:true,noCalculation:true,ordinaryFacts:clone(input.ordinaryFacts||{}),reasonCode:reason},nextRoute:'ltd.tax.scenario-results'};}
  }
  defaultScenarioBaseline(input={}){
    const profile=this.activeProfile(),projection=this.projection(profile),period=this.recordsFor('companyTaxPeriods',profile).find(item=>item.status==='supported_calculated'),provenance=profile&&profile.scenarioFactProvenance;
    if(!period)throw Object.assign(new Error('corporation_tax_period_required'),{field:'scenario'});
    if(this.personalTaxJurisdiction!=='EWNI')throw Object.assign(new Error('personal_tax_jurisdiction_required'),{field:'personalTaxJurisdiction'});
    const required=['directorClass1CategoryA','directorForFullTaxYear','standardTaxCode1257L','noOtherEmploymentOrPayeAdjustments','employmentAllowanceUnavailableConfirmed','useMaximumEligibleCarriedLoss'];
    if(!provenance||provenance.status!=='confirmed'||required.some(field=>provenance[field]!==true)||!Array.isArray(provenance.sourceRefs)||!provenance.sourceRefs.length)throw Object.assign(new Error('scenario_facts_need_checking'),{reasonCode:'scenario_facts_need_checking',field:'scenario'});
    if(this.recordsFor('salaryRecords',profile).length||this.recordsFor('dividendDeclarations',profile).length)throw Object.assign(new Error('scenario_actual_payments_need_checking'),{reasonCode:'scenario_actual_payments_need_checking',field:'scenario'});
    const personalNonDividendIncomeBeforeScenarioMinor=Money.sumMinor(this.state.businesses.map(business=>this.legacyBusinessRow(business).summary.amountMinor||0),'Scenario personal business income'),personalDividendIncomeBeforeScenarioMinor=Money.sumMinor(this.recordsFor('personalIncomeLinks',profile).filter(link=>link.kind==='company_dividend').map(link=>link.grossAmountMinor),'Scenario prior personal dividends'),accountsEvidenceRefs=Array.from(new Set([...(period.sourceEventRevisionIds||[]),...provenance.sourceRefs]));
    const confirmations={noActualSalaryOrDividendInBaseline:true,directorClass1CategoryA:true,directorForFullTaxYear:true,standardTaxCode1257L:true,noOtherEmploymentOrPayeAdjustments:true,employmentAllowanceUnavailableConfirmed:true,useMaximumEligibleCarriedLoss:true,otherShareholderPersonalTaxDataAbsent:true};
    return CompanyScenario.createBaseline({profile,periodRecord:period,personalTaxJurisdiction:this.personalTaxJurisdiction,eligibleCarriedLossMinor:this.recordsFor('companyLossRecords',profile).reduce((sum,item)=>sum+(item.remainingMinor||0),0),companyCashBeforeRemunerationMinor:Math.max(0,projection.metrics.companyCash.amountMinor),confirmedOpeningDistributableReserveMinor:Number(provenance.confirmedOpeningDistributableReserveMinor||0),personalNonDividendIncomeBeforeScenarioMinor,personalDividendIncomeBeforeScenarioMinor,baselineClass4NiMinor:Number(provenance.baselineClass4NiMinor||0),accountsEvidenceRefs,confirmations});
  }

  recordSalary(input={}){
    this.requireAccess('confirm_salary');const profile=this.activeProfile();this.ensurePaymentAccounts(profile);
    try{
      const source=clone(input.salary||{}),gross=source.grossSalaryMinor,employee=CompanyRemunerationRules.calculateEmployeeNi(gross),employer=CompanyRemunerationRules.calculateEmployerNi(gross),paye=CompanyRemunerationRules.calculatePayeEstimate(gross),salary={...source,id:source.id||this.newId('salary-record'),personId:'person:account-holder',personalTaxJurisdiction:this.personalTaxJurisdiction,companyPaymentAccountId:this.account(profile,'entity').id,personalPaymentAccountId:this.account(profile,'person').id,payeWithheldMinor:source.payeWithheldMinor,employeeNiMinor:source.employeeNiMinor,employerNiMinor:source.employerNiMinor};
      if(!Number.isSafeInteger(gross)||gross<=0)return{status:'field_error',fieldErrors:[fieldError('grossSalaryMinor','amount_must_be_positive')]};
      if(salary.payeWithheldMinor!==paye.payeEstimateMinor||salary.employeeNiMinor!==employee.employeeNiMinor||salary.employerNiMinor!==employer.employerNiMinor)return{status:'field_error',fieldErrors:[fieldError('payrollResult','confirmed_payroll_result_mismatch')]};
      const result=CompanyRemuneration.confirmSalary({profile,paymentAccounts:this.list('paymentAccounts'),currentEvents:this.eventsFor(profile),currentSalaryRecords:this.recordsFor('salaryRecords',profile),currentPersonalIncomeLinks:this.recordsFor('personalIncomeLinks',profile),salary,now:this.now(),deviceId:this.deviceId});
      this.saveResult('salaryRecords',result);return{status:['confirmed','existing'].includes(result.status)?'ok':'review_required',reviewReasons:result.reasons||[],data:clone(result),nextRoute:'ltd.tax.salary-record'};
    }catch(error){return{status:'field_error',fieldErrors:[fieldError('salary',stableReason(error,'salary_invalid'))]};}
  }
  declareDividend(input={}){
    this.requireAccess('declare_dividend');const profile=this.activeProfile();this.ensurePaymentAccounts(profile);
    try{const source=clone(input.dividend||{}),dividend={...source,id:source.id||this.newId('dividend-record'),totalDividendMinor:Number.isSafeInteger(source.totalDividendMinor)?source.totalDividendMinor:source.totalMinor};const result=CompanyRemuneration.declareDividend({profile,paymentAccounts:this.list('paymentAccounts'),currentEvents:this.eventsFor(profile),currentDividendDeclarations:this.recordsFor('dividendDeclarations',profile),dividend,now:this.now(),deviceId:this.deviceId});this.saveResult('dividendDeclarations',result);return{status:result.status==='declared'?'ok':'review_required',reviewReasons:result.reasons||[],data:clone(result),nextRoute:'ltd.tax.dividend-detail'};}catch(error){return{status:'field_error',fieldErrors:[fieldError('dividend',stableReason(error,'dividend_invalid'))]};}
  }
  payDividend(input={}){this.requireAccess('record_dividend_payment');const profile=this.activeProfile(),record=this.recordsFor('dividendDeclarations',profile).find(item=>item.id===input.declarationId);if(!record)return{status:'field_error',fieldErrors:[fieldError('declarationId','dividend_declaration_not_found')]};try{const result=CompanyRemuneration.payDividend({profile,paymentAccounts:this.list('paymentAccounts'),currentEvents:this.eventsFor(profile),declaration:record,companyPaymentAccountId:this.account(profile,'entity').id,personId:'person:account-holder',voucherArtifactRefs:clone(input.voucherArtifactRefs||[]),now:this.now(),deviceId:this.deviceId});this.saveResult('dividendDeclarations',result);return{status:result.status==='paid'?'ok':'review_required',reviewReasons:result.reasons||[],data:clone(result),nextRoute:'ltd.tax.dividend-detail'};}catch(error){return{status:'field_error',fieldErrors:[fieldError('voucherArtifactRefs',stableReason(error,'dividend_payment_invalid'))]};}}

  validateCompanyCorrection(profile,field,value){
    const errors=[];let normalized=clone(value);
    if(field==='legalName'){const check=CompanyIdentity.validateCompanyName(value);if(!check.valid)errors.push(fieldError(field,check.reason,{invalidCharacters:check.invalidCharacters||[]}));else normalized=check.name;}
    else if(field==='companyNumber'){const check=CompanyIdentity.validateCompanyNumber(value);if(!check.valid)errors.push(fieldError(field,check.reason));else normalized=check.normalized;}
    else if(['incorporationDate','tradingStartDate'].includes(field)){if(!Domain.isoDate(value))errors.push(fieldError(field,field==='incorporationDate'?'incorporation_date_invalid':'trading_start_date_invalid'));else if(value>new Date(this.now()).toISOString().slice(0,10))errors.push(fieldError(field,field==='incorporationDate'?'future_incorporation':'future_trading'));}
    else if(field==='tradingStatus'&&!CompanyProfile.TRADING_STATUSES.includes(value))errors.push(fieldError(field,'answer_required'));
    else if(field==='corporationTaxStatus'&&!CompanyProfile.CT_STATUSES.includes(value))errors.push(fieldError(field,'answer_required'));
    else if(field==='accountingPeriod'){
      if(!value||!Domain.isoDate(value.startDate)||!Domain.isoDate(value.endDate))errors.push(fieldError(field,'accounting_period_invalid'));
      else{normalized={...clone(value),referenceDate:value.referenceDate||value.endDate,status:'confirmed'};if(value.startDate>value.endDate)errors.push(fieldError(field,'accounting_period_start_after_end'));}
    }
    if(errors.length)return{errors,normalized};
    const candidate={...clone(profile),[field]:clone(normalized)},inc=candidate.incorporationDate,trading=candidate.tradingStatus==='trading'?candidate.tradingStartDate:null,period=candidate.accountingPeriod;
    if(Domain.isoDate(inc)&&Domain.isoDate(trading)&&trading<inc)errors.push(fieldError(field==='incorporationDate'?'incorporationDate':'tradingStartDate',field==='incorporationDate'?'incorporation_after_trading_start':'trading_before_incorporation'));
    if(period&&Domain.isoDate(period.startDate)&&Domain.isoDate(inc)&&period.startDate<inc)errors.push(fieldError(field==='incorporationDate'?'incorporationDate':'accountingPeriod',field==='incorporationDate'?'incorporation_after_accounts_start':'accounting_period_before_incorporation'));
    if(period&&Domain.isoDate(period.endDate)&&Domain.isoDate(trading)&&trading>period.endDate)errors.push(fieldError(field==='accountingPeriod'?'accountingPeriod':'tradingStartDate','trading_after_accounts_period'));
    if(period&&Domain.isoDate(period.startDate)&&Domain.isoDate(period.endDate)&&CompanyProfile.assess(candidate).reasons.includes('accounts_period_over_18_months_review_required'))errors.push(fieldError('accountingPeriod','accounts_period_over_18_months'));
    return{errors,normalized};
  }
  companyCorrectionRecords(profile){return{events:this.eventsFor(profile),periods:this.recordsFor('companyTaxPeriods',profile),losses:this.recordsFor('companyLossRecords',profile),salaries:this.recordsFor('salaryRecords',profile),dividends:this.recordsFor('dividendDeclarations',profile),personalIncomeLinks:this.recordsFor('personalIncomeLinks',profile)};}
  editCompany(input={}){
    this.requireAccess('edit_company');
    const profile=this.activeProfile(),field=input.field;if(!profile||!CompanyProfileHistory.CORRECTABLE_FIELDS.includes(field))return{status:'field_error',fieldErrors:[fieldError('field','correctable_company_field_required')]};
    const reason=cleanText(input.reason,1000),evidenceRefs=Array.isArray(input.evidenceRefs)?input.evidenceRefs.map(item=>cleanText(item,512)).filter(Boolean):[];if(!reason)return{status:'field_error',fieldErrors:[fieldError('reason','company_correction_reason_required')]};if(!evidenceRefs.length)return{status:'field_error',fieldErrors:[fieldError('evidenceRefs','company_correction_evidence_required')]};
    const check=this.validateCompanyCorrection(profile,field,input.value);if(check.errors.length)return{status:'field_error',fieldErrors:check.errors,data:{activeValue:clone(profile[field]),activeValueUnchanged:true}};
    try{const result=CompanyProfileHistory.applySetupCorrection({profile,field,value:clone(check.normalized),reason,evidenceRefs,records:this.companyCorrectionRecords(profile),now:this.now(),deviceId:this.deviceId});if(result.status==='applied')this.saveProfile(result.profile);return{status:result.status==='applied'?'ok':'review_required',reviewReasons:result.reasons||[],data:{...clone(result),activeValue:clone(this.activeProfile()[field]),activeValueUnchanged:result.status!=='applied'},nextRoute:'ltd.records.company-edit'};}catch(error){return{status:'field_error',fieldErrors:[fieldError(field,error.reasonCode||'company_facts_incomplete')],data:{activeValue:clone(profile[field]),activeValueUnchanged:true}};}
  }
  changeOwnership(input={}){this.requireAccess('change_ownership');const profile=this.activeProfile();try{const result=CompanyProfileHistory.recordOwnershipChange({profile,effectiveDate:input.effectiveDate,shareholders:clone(input.shareholders||[]),reason:input.reason,evidenceRefs:clone(input.evidenceRefs||[]),dividendDeclarations:this.recordsFor('dividendDeclarations',profile),now:this.now(),deviceId:this.deviceId});if(result.status==='applied')this.saveProfile(result.profile);return{status:result.status==='applied'?'ok':'review_required',reviewReasons:result.reasons||[],data:clone(result),nextRoute:'ltd.records.ownership'};}catch(error){return{status:'field_error',fieldErrors:[fieldError('ownership',stableReason(error,'ownership_change_invalid'))]};}}
  workingPack(){this.requireAccess('download_evidence');const profile=this.activeProfile();try{const pack=CompanyWorkspace.buildWorkingPack({profile,events:this.eventsFor(profile),periodRecords:this.recordsFor('companyTaxPeriods',profile),lossRecords:this.recordsFor('companyLossRecords',profile),salaryRecords:this.recordsFor('salaryRecords',profile),dividendDeclarations:this.recordsFor('dividendDeclarations',profile),personalIncomeLinks:this.recordsFor('personalIncomeLinks',profile),syncConflicts:[],asOfDate:this.currentDate(),generatedAt:this.now()});CompanyWorkspace.validateWorkingPack(pack);return{status:pack.status==='supported_estimate_working_pack'?'ok':'review_required',reviewReasons:pack.projection.reviewItems.map(item=>item.reasonCode),data:{fileName:`taxmate-${String(profile.legalName||'company').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-working-pack.json`,mimeType:'application/json',payload:pack},nextRoute:'ltd.records.working-pack'};}catch(error){return{status:'review_required',reviewReasons:[error.message||'working_pack_review_required'],data:null,nextRoute:'ltd.records.working-pack'};}}
  removeCompany(input={}){this.requireAccess('remove_company');const profile=this.activeProfile();if(!profile||input.confirmed!==true)return{status:'field_error',fieldErrors:[fieldError('confirmed','remove_company_confirmation_required')]};const now=this.now(),entity=this.entityFor(profile);this.atomic(()=>{this.upsert('companyProfiles',{...profile,deletedAt:now,updatedAt:now,deviceId:this.deviceId});if(entity)this.upsert('entities',{...entity,deletedAt:now,updatedAt:now,deviceId:this.deviceId});for(const account of this.list('paymentAccounts').filter(item=>item.ownerId===profile.entityId))this.upsert('paymentAccounts',{...account,deletedAt:now,updatedAt:now,deviceId:this.deviceId});for(const event of this.eventsFor(profile).filter(item=>item.status==='committed'))this.upsert('economicEvents',CompanyLedger.reverseEvent(event,{now,deviceId:this.deviceId,reversalEventId:this.newId('company-removal')}));});return{status:'ok',data:{removedEntityId:profile.entityId,activeCompanySlotRetained:true},nextRoute:'home'};}
}

return{CanonicalCompanyDriver,DEFAULT_DEVICE_ID,DEFAULT_NOW};
});

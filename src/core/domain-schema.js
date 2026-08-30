(function(root,factory){
  const money=typeof module==='object'&&module.exports?require('./money'):root.TaxMateMoney;
  const api=factory(money);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.TaxMateDomain=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money){
  'use strict';

  if(!Money) throw new Error('TaxMate money engine is required');
  const DOMAIN_SCHEMA_VERSION=6;
  const CURRENCY='GBP';
  const ENTITY_TYPES=Object.freeze(['sole_trade','partnership','limited_company']);
  const PARTNERSHIP_AMOUNT_BASES=Object.freeze(['whole_partnership','user_share','legacy_unconfirmed']);
  const TREATMENT_STATUSES=Object.freeze(['supported','record_only','review_required','unsupported','stale_rule','unknown_rule']);
  const EVENT_STATUSES=Object.freeze(['draft','committed','reversed']);
  const JOURNAL_STATUSES=Object.freeze(['draft','posted','reversed']);

  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
  const text=(value,max=256)=>typeof value==='string'&&value.length>0&&value.length<=max;
  const optionalText=(value,max=256)=>value==null||text(value,max);
  const COMPANY_RISK_FIELDS=Object.freeze(['multipleCompanies','groupStructure','associatedCompanies','propertyOrInvestment','chargeableGains','researchAndDevelopmentClaims','inventoryOrStock','complexForeignCurrency','fullVat','benefitsInKind','complexPensionsOrShareSchemes','companyCollaboration']);
  const COMPANY_SETUP_RISK_FIELDS=Object.freeze(['groupStructure','associatedCompanies','propertyOrInvestment','inventoryOrStock','fullVat']);
  const COMPANY_DERIVED_RISK_FIELDS=Object.freeze(['multipleCompanies','companyCollaboration']);
  const companyRiskAnswer=value=>typeof value==='boolean'||value==='not_sure'||value==='not_assessed';

  function isoDate(value){
    if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) return false;
    const [,year,month,day]=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date=new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
    return date.getUTCFullYear()===Number(year)&&date.getUTCMonth()===Number(month)-1&&date.getUTCDate()===Number(day);
  }

  function lastDayOfCalendarMonths(start,months){
    const source=new Date(start+'T00:00:00Z'),day=source.getUTCDate(),target=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth()+months,1)),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
    target.setUTCDate(day>lastDay?lastDay:day);
    if(day<=lastDay)target.setUTCDate(target.getUTCDate()-1);
    return target.toISOString().slice(0,10);
  }

  function uniqueIds(records,label){
    const ids=new Set();
    for(const record of records){
      if(!text(record&&record.id,128)) throw new Error(label+' id is invalid');
      if(ids.has(record.id)) throw new Error('Duplicate '+label+' id');
      ids.add(record.id);
    }
    return ids;
  }

  function validatePerson(person){
    if(!plain(person)||!text(person.id,128)||!optionalText(person.accountUid,128)) throw new Error('Invalid person');
    return true;
  }

  function validateLegalEntity(entity){
    if(!plain(entity)||!text(entity.id,128)||!text(entity.name,300)||!ENTITY_TYPES.includes(entity.type)) throw new Error('Invalid legal entity');
    if(entity.type==='partnership'&&!PARTNERSHIP_AMOUNT_BASES.includes(entity.partnershipAmountBasis)) throw new Error('Partnership amount basis is required');
    if(entity.type==='partnership'&&(!Number.isSafeInteger(entity.userProfitSharePercent)||entity.userProfitSharePercent<1||entity.userProfitSharePercent>100)) throw new Error('Partnership user profit share is required');
    if(entity.type==='partnership'&&!text(entity.userProfitShareSource,128)) throw new Error('Partnership user profit share source is required');
    if(entity.type!=='partnership'&&entity.partnershipAmountBasis!=null) throw new Error('Partnership amount basis is only valid for a partnership');
    if(entity.type!=='partnership'&&(entity.userProfitSharePercent!=null||entity.userProfitShareSource!=null)) throw new Error('Partnership user profit share is only valid for a partnership');
    if(entity.currency!=null&&entity.currency!==CURRENCY) throw new Error('V1.5 supports GBP entities only');
    return true;
  }

  function validateProject(project){
    if(!plain(project)||!text(project.id,128)||!text(project.entityId,128)||!text(project.name,300)) throw new Error('Invalid project');
    return true;
  }

  function validatePaymentAccount(account){
    if(!plain(account)||!text(account.id,128)||!['person','entity','other'].includes(account.ownerType)||!text(account.ownerId,128)||!text(account.name,300)||(account.currency||CURRENCY)!==CURRENCY) throw new Error('Invalid payment account');
    return true;
  }

  function validateCompanyParty(party,kind){
    if(!plain(party)||!text(party.id,128)||!text(party.name,300)||typeof party.isAccountHolder!=='boolean') throw new Error('Invalid company '+kind);
    for(const field of ['uid','accountUid','email','access','memberId']) if(party[field]!=null) throw new Error('Company parties do not receive account access');
    return true;
  }

  function validateCompanyProfileRevision(record,profile){
    if(!plain(record)||record.schemaVersion!==1||!text(record.id,128)||record.entityId!==profile.entityId||!Number.isSafeInteger(record.revision)||record.revision<1||!['setup_correction','effective_change'].includes(record.kind)||!text(record.field,128)||!text(record.reason,1000)||!Array.isArray(record.evidenceRefs)||!record.evidenceRefs.length||record.evidenceRefs.some(ref=>!text(ref,512))||!plain(record.impact)||!Array.isArray(record.impact.affectedRecordIds)||!['applied','review_required'].includes(record.status)||!Number.isFinite(Number(record.createdAt))||!Number.isFinite(Number(record.updatedAt))||!text(record.deviceId,128))throw new Error('Invalid company profile revision');
    if(record.effectiveDate!=null&&!isoDate(record.effectiveDate))throw new Error('Invalid company profile revision effective date');
    return true;
  }

  function validateCompanyOwnershipVersion(version,profile){
    if(!plain(version)||version.schemaVersion!==1||!text(version.id,128)||version.entityId!==profile.entityId||!Number.isSafeInteger(version.version)||version.version<1||!isoDate(version.effectiveFrom)||(version.effectiveTo!=null&&!isoDate(version.effectiveTo))||(version.effectiveTo!=null&&version.effectiveTo<=version.effectiveFrom)||!text(version.shareClassId,128)||!Array.isArray(version.shareholders)||!version.shareholders.length||!Array.isArray(version.evidenceRefs)||!version.evidenceRefs.length||version.evidenceRefs.some(ref=>!text(ref,512))||(version.sourceRevisionId!=null&&!text(version.sourceRevisionId,128))||!Number.isFinite(Number(version.createdAt))||!Number.isFinite(Number(version.updatedAt))||!text(version.deviceId,128))throw new Error('Invalid company ownership version');
    uniqueIds(version.shareholders,'ownership shareholder');version.shareholders.forEach(holder=>{validateCompanyParty(holder,'ownership shareholder');if(holder.shareClassId!==version.shareClassId||!Number.isSafeInteger(holder.shares)||holder.shares<=0||!Number.isSafeInteger(holder.ownershipBasisPoints)||holder.ownershipBasisPoints<0)throw new Error('Invalid ownership shareholding');});
    if(Money.sumMinor(version.shareholders.map(holder=>holder.ownershipBasisPoints),'Ownership version')!==10000)throw new Error('Ownership version must total 100%');
    const expected=Money.allocateMinor(10000,version.shareholders.map(holder=>holder.shares));if(expected.some((amount,index)=>amount!==version.shareholders[index].ownershipBasisPoints))throw new Error('Ownership version must match shares');return true;
  }

  function ownershipForDate(profile,date){
    if(!Array.isArray(profile.ownershipHistory)||!profile.ownershipHistory.length)return profile.shareholders;
    const matches=profile.ownershipHistory.filter(version=>version.effectiveFrom<=date&&(version.effectiveTo==null||date<version.effectiveTo));
    if(matches.length!==1)throw new Error('Dividend date must resolve to exactly one ownership version');return matches[0].shareholders;
  }

  function validateCompanyProfile(profile){
    if(!plain(profile)||!text(profile.id,128)||!text(profile.entityId,128)||profile.schemaVersion!==1||!text(profile.profileRulesetVersion,128)||!['draft','confirmed'].includes(profile.lifecycleStatus)||!['supported_profile','review_required','unsupported_profile'].includes(profile.assessmentStatus)||!Array.isArray(profile.assessmentReasons)||profile.assessmentReasons.some(code=>!text(code,128))||!Number.isFinite(Number(profile.createdAt))||!Number.isFinite(Number(profile.updatedAt))||!text(profile.deviceId,128)) throw new Error('Invalid company profile');
    if(profile.deletedAt!=null&&!Number.isFinite(Number(profile.deletedAt))) throw new Error('Invalid company profile deletion state');
    if(profile.legalName!=null&&!text(profile.legalName,300)) throw new Error('Invalid company legal name');
    if(profile.companyNumberStatus!=null&&!['provided','not_available'].includes(profile.companyNumberStatus)) throw new Error('Invalid company number status');
    if(profile.companyNumberStatus==='provided'&&(typeof profile.companyNumber!=='string'||!/^[A-Z0-9]{8}$/.test(profile.companyNumber))) throw new Error('Invalid company number');
    {const r=profile.registryVerification,allowsNullNumber=r&&['not_checked','not_registered'].includes(r.status),allowsNullCheckedAt=r&&r.status==='not_checked';if(!plain(r)||r.schemaVersion!==1||!['not_checked','verified','needs_checking','not_found','unavailable','manual_unverified','not_registered'].includes(r.status)||(allowsNullNumber?r.companyNumber!=null:!text(r.companyNumber,32))||(allowsNullCheckedAt?r.checkedAt!=null:!Number.isFinite(Number(r.checkedAt)))||!text(r.provider,128)||!Array.isArray(r.reasonCodes)||r.reasonCodes.some(code=>!text(code,128))||!plain(r.registryFacts)||!optionalText(r.registryFacts.legalName,300)||!optionalText(r.registryFacts.incorporationDate,32)||!optionalText(r.registryFacts.companyStatus,128)||!optionalText(r.registryFacts.companyType,128)||!optionalText(r.registryFacts.registryUrl,512))throw new Error('Invalid company registry verification');}
    for(const field of ['incorporationDate','tradingStartDate','accountingReferenceDate']) if(profile[field]!=null&&!isoDate(profile[field])) throw new Error('Invalid company date');
    if(profile.tradingStatus!=null&&!['not_started','trading','dormant','ceased'].includes(profile.tradingStatus))throw new Error('Invalid company trading status');
    if(profile.corporationTaxStatus!=null&&!['not_registered','registration_pending','registered','dormant','ceased','unknown'].includes(profile.corporationTaxStatus))throw new Error('Invalid Corporation Tax status');
    if(profile.accountHolder!=null&&(!plain(profile.accountHolder)||typeof profile.accountHolder.isDirector!=='boolean'||typeof profile.accountHolder.isShareholder!=='boolean'))throw new Error('Invalid account-holder company roles');
    if(profile.accountingPeriod!=null&&(!plain(profile.accountingPeriod)||!isoDate(profile.accountingPeriod.startDate)||!isoDate(profile.accountingPeriod.endDate)||!['draft','confirmed'].includes(profile.accountingPeriod.status))) throw new Error('Invalid company accounting period');
    if(profile.directors!=null){if(!Array.isArray(profile.directors))throw new Error('Invalid company directors');uniqueIds(profile.directors,'director');profile.directors.forEach(party=>validateCompanyParty(party,'director'));}
    if(profile.shareholders!=null){
      if(!Array.isArray(profile.shareholders))throw new Error('Invalid company shareholders');uniqueIds(profile.shareholders,'shareholder');profile.shareholders.forEach(holder=>{validateCompanyParty(holder,'shareholder');if(!text(holder.shareClassId,128)||!Number.isSafeInteger(holder.shares)||holder.shares<=0||!Number.isSafeInteger(holder.ownershipBasisPoints)||holder.ownershipBasisPoints<0||holder.ownershipBasisPoints>10000)throw new Error('Invalid company shareholding');});
      if(profile.shareholders.length){if(Money.sumMinor(profile.shareholders.map(holder=>holder.ownershipBasisPoints),'Company ownership')!==10000)throw new Error('Company ownership must total 100%');const expected=Money.allocateMinor(10000,profile.shareholders.map(holder=>holder.shares));if(expected.some((value,index)=>value!==profile.shareholders[index].ownershipBasisPoints))throw new Error('Company ownership must match ordinary shares');}
    }
    if(profile.shareClasses!=null){if(!Array.isArray(profile.shareClasses))throw new Error('Invalid company share classes');const shareClassIds=uniqueIds(profile.shareClasses,'share class');profile.shareClasses.forEach(shareClass=>{if(!text(shareClass.name,128)||!['equal','unequal'].includes(shareClass.dividendRights))throw new Error('Invalid company share class');});if(Array.isArray(profile.shareholders)&&profile.shareholders.some(holder=>!shareClassIds.has(holder.shareClassId)))throw new Error('Shareholder references an unknown share class');}
    if(profile.profileRevisionHistory!=null){if(!Array.isArray(profile.profileRevisionHistory))throw new Error('Invalid company profile revision history');uniqueIds(profile.profileRevisionHistory,'company profile revision');profile.profileRevisionHistory.forEach(record=>validateCompanyProfileRevision(record,profile));for(let index=0;index<profile.profileRevisionHistory.length;index++)if(profile.profileRevisionHistory[index].revision!==index+1)throw new Error('Company profile revisions must be contiguous');}
    if(profile.ownershipHistory!=null){if(!Array.isArray(profile.ownershipHistory)||!profile.ownershipHistory.length)throw new Error('Invalid company ownership history');uniqueIds(profile.ownershipHistory,'company ownership version');const ordered=profile.ownershipHistory.slice().sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||a.version-b.version);ordered.forEach(version=>validateCompanyOwnershipVersion(version,profile));for(let index=0;index<ordered.length;index++){if(ordered[index].version!==index+1)throw new Error('Company ownership versions must be contiguous');if(index&&ordered[index-1].effectiveTo!==ordered[index].effectiveFrom)throw new Error('Company ownership history must be continuous');}if(ordered.at(-1).effectiveTo!=null||JSON.stringify(ordered.at(-1).shareholders)!==JSON.stringify(profile.shareholders))throw new Error('Current ownership must match the open ownership version');}
    if(profile.riskAnswers!=null&&(!plain(profile.riskAnswers)||Object.keys(profile.riskAnswers).some(key=>!COMPANY_RISK_FIELDS.includes(key)||!companyRiskAnswer(profile.riskAnswers[key])))) throw new Error('Invalid company risk answers');
    if(profile.lifecycleStatus==='confirmed'){
      const periodDays=plain(profile.accountingPeriod)&&isoDate(profile.accountingPeriod.startDate)&&isoDate(profile.accountingPeriod.endDate)?Math.round((Date.parse(profile.accountingPeriod.endDate+'T00:00:00Z')-Date.parse(profile.accountingPeriod.startDate+'T00:00:00Z'))/86400000):NaN;
      const periodWithinEighteenMonths=Number.isFinite(periodDays)&&periodDays>=0&&profile.accountingPeriod.endDate<=lastDayOfCalendarMonths(profile.accountingPeriod.startDate,18);
      if(!['supported_profile','review_required'].includes(profile.assessmentStatus)||!text(profile.legalName,300)||!['provided','not_available'].includes(profile.companyNumberStatus)||profile.jurisdiction!=='UK'||profile.companyType!=='private_limited_by_shares'||profile.currency!=='GBP'||!isoDate(profile.incorporationDate)||!isoDate(profile.accountingReferenceDate)||!['not_started','trading'].includes(profile.tradingStatus)||(profile.tradingStatus==='trading'&&!isoDate(profile.tradingStartDate))||!['not_registered','registration_pending','registered','unknown'].includes(profile.corporationTaxStatus)||!plain(profile.accountHolder)||profile.accountHolder.isDirector!==true||profile.accountHolder.isShareholder!==true||profile.activityType!=='service_digital'||!plain(profile.accountingPeriod)||profile.accountingPeriod.status!=='confirmed'||!periodWithinEighteenMonths||!Array.isArray(profile.directors)||!profile.directors.some(director=>director.isAccountHolder===true)||!Array.isArray(profile.shareholders)||!profile.shareholders.some(holder=>holder.isAccountHolder===true)||!Array.isArray(profile.shareClasses)||profile.shareClasses.length!==1||profile.shareClasses[0].name!=='ordinary'||profile.shareClasses[0].dividendRights!=='equal'||!plain(profile.riskAnswers)||COMPANY_SETUP_RISK_FIELDS.some(field=>![true,false,'not_sure'].includes(profile.riskAnswers[field]))||COMPANY_DERIVED_RISK_FIELDS.some(field=>typeof profile.riskAnswers[field]!=='boolean')||COMPANY_RISK_FIELDS.some(field=>profile.riskAnswers[field]!=null&&!companyRiskAnswer(profile.riskAnswers[field]))||!Number.isFinite(Number(profile.confirmedAt))||Number(profile.confirmedAt)<=0) throw new Error('Confirmed company profile is incomplete');
    }
    return true;
  }

  function validateSalarySnapshot(snapshot){
    if(!plain(snapshot)||!text(snapshot.recordId,128)||!text(snapshot.entityId,128)||!text(snapshot.personId,128)||snapshot.taxYear!=='2026-27'||!isoDate(snapshot.payDate)||snapshot.category!=='A'||snapshot.directorNiBasis!=='annual_full_tax_year'||snapshot.payrollResultConfirmed!==true||snapshot.payeRegistrationConfirmed!==true||snapshot.paidWithinNineMonthsConfirmed!==true||!['pending_rti','reported_rti'].includes(snapshot.payeReportingStatus)||!text(snapshot.rulesetVersion,128)||!Array.isArray(snapshot.evidenceRefs)||!snapshot.evidenceRefs.length||snapshot.evidenceRefs.some(ref=>!text(ref,512)))throw new Error('Invalid salary snapshot');
    for(const field of ['grossSalaryMinor','payeWithheldMinor','employeeNiMinor','employerNiMinor','netPayMinor','totalCompanyCostMinor'])Money.assertMinor(snapshot[field],'Salary '+field,{nonNegative:true});if(Money.sumMinor([snapshot.payeWithheldMinor,snapshot.employeeNiMinor,snapshot.netPayMinor],'Salary gross reconciliation')!==snapshot.grossSalaryMinor||Money.sumMinor([snapshot.grossSalaryMinor,snapshot.employerNiMinor],'Salary company cost')!==snapshot.totalCompanyCostMinor)throw new Error('Salary snapshot does not reconcile');return true;
  }

  function validateDividendAllocation(allocation){if(!plain(allocation)||!text(allocation.shareholderId,128)||typeof allocation.isAccountHolder!=='boolean'||!Number.isSafeInteger(allocation.shares)||allocation.shares<=0||!Number.isSafeInteger(allocation.ownershipBasisPoints)||allocation.ownershipBasisPoints<0||!Number.isSafeInteger(allocation.amountMinor)||allocation.amountMinor<=0)throw new Error('Invalid dividend allocation');return true;}
  function validateDividendSnapshot(snapshot){
    if(!plain(snapshot)||!text(snapshot.recordId,128)||!text(snapshot.entityId,128)||!text(snapshot.shareClassId,128)||!['declared','paid'].includes(snapshot.status)||!isoDate(snapshot.declarationDate)||!isoDate(snapshot.paymentDate)||snapshot.paymentDate<snapshot.declarationDate||!Number.isSafeInteger(snapshot.totalDividendMinor)||snapshot.totalDividendMinor<=0||!Number.isSafeInteger(snapshot.perShareMinor)||snapshot.perShareMinor<=0||!Number.isSafeInteger(snapshot.totalShares)||snapshot.totalShares<=0||!Number.isSafeInteger(snapshot.confirmedDistributableProfitMinor)||snapshot.confirmedDistributableProfitMinor<snapshot.totalDividendMinor||snapshot.independentAccountsConfirmation!==true||snapshot.corporationTaxEstimateOnly!==false||!Array.isArray(snapshot.allocations)||!snapshot.allocations.length||!Array.isArray(snapshot.distributableProfitEvidenceRefs)||!snapshot.distributableProfitEvidenceRefs.length||snapshot.distributableProfitEvidenceRefs.some(ref=>!text(ref,512))||!text(snapshot.boardApprovalEvidenceRef,512)||!text(snapshot.minutesArtifactRef,512)||!Array.isArray(snapshot.voucherArtifactRefs)||snapshot.voucherArtifactRefs.some(ref=>!text(ref,512))||!text(snapshot.rulesetVersion,128))throw new Error('Invalid dividend snapshot');uniqueIds(snapshot.allocations.map(item=>({id:item.shareholderId})),'dividend shareholder');snapshot.allocations.forEach(validateDividendAllocation);if(Money.sumMinor(snapshot.allocations.map(item=>item.amountMinor),'Dividend allocations')!==snapshot.totalDividendMinor||Money.sumMinor(snapshot.allocations.map(item=>item.shares),'Dividend shares')!==snapshot.totalShares||Money.sumMinor(snapshot.allocations.map(item=>item.ownershipBasisPoints),'Dividend ownership')!==10000||snapshot.totalDividendMinor!==snapshot.perShareMinor*snapshot.totalShares||snapshot.allocations.some(item=>item.amountMinor!==item.shares*snapshot.perShareMinor)||snapshot.allocations.filter(item=>item.isAccountHolder).length!==1)throw new Error('Dividend snapshot does not allocate equally');if(snapshot.status==='declared'&&snapshot.voucherArtifactRefs.length!==0)throw new Error('Unpaid dividend cannot contain payment vouchers');if(snapshot.status==='paid'&&snapshot.voucherArtifactRefs.length!==snapshot.allocations.length)throw new Error('Paid dividend vouchers are incomplete');return true;
  }

  function validateSourceTransaction(source){
    if(!plain(source)||!text(source.id,128)||!['income','expense','transfer','funding','salary','dividend','tax','adjustment'].includes(source.kind)||!isoDate(source.date)) throw new Error('Invalid source transaction');
    Money.assertMinor(source.amountMinor,'Source amount',{nonNegative:true});
    if((source.currency||CURRENCY)!==CURRENCY) throw new Error('V1.5 supports GBP transactions only');
    for(const field of ['invoicePartyId','beneficiaryEntityId','payerPaymentAccountId','receiverPaymentAccountId','companyTransactionType','purpose']) if(!optionalText(source[field],field==='purpose'?2000:128)) throw new Error('Invalid source transaction '+field);
    for(const field of ['payerOwnerType','receiverOwnerType'])if(source[field]!=null&&!['person','entity','other'].includes(source[field]))throw new Error('Invalid source transaction '+field);
    if(source.reimbursementExpected!=null&&typeof source.reimbursementExpected!=='boolean')throw new Error('Invalid reimbursement expectation');
    if(source.shareCapitalEvidenceConfirmed!=null&&typeof source.shareCapitalEvidenceConfirmed!=='boolean')throw new Error('Invalid share-capital evidence confirmation');
    if(source.sharedExpense!=null){
      const shared=source.sharedExpense,nonCompany=Number.isSafeInteger(shared.nonCompanyAmountMinor)?shared.nonCompanyAmountMinor:shared.personalAmountMinor;
      if(!['company_expense','personally_paid_expense'].includes(source.companyTransactionType)||!plain(shared)||!Number.isSafeInteger(shared.grossAmountMinor)||shared.grossAmountMinor<=0||!Number.isSafeInteger(shared.companyAmountMinor)||shared.companyAmountMinor<=0||!Number.isSafeInteger(nonCompany)||nonCompany<0||!Number.isSafeInteger(shared.businessUseBasisPoints)||shared.businessUseBasisPoints<1||shared.businessUseBasisPoints>10000||Money.sumMinor([shared.companyAmountMinor,nonCompany],'Shared expense allocation')!==shared.grossAmountMinor||source.amountMinor!==shared.companyAmountMinor)throw new Error('Invalid shared-expense allocation');
      if(Array.isArray(shared.allocations)){if(!shared.allocations.length||new Set(shared.allocations.map(item=>item&&item.id)).size!==shared.allocations.length||shared.allocations.some(item=>!plain(item)||!text(item.id,128)||!text(item.entityId,128)||!['business','private'].includes(item.scope)||!Number.isSafeInteger(item.amountMinor)||item.amountMinor<=0)||Money.sumMinor(shared.allocations.map(item=>item.amountMinor),'Shared expense legs')!==shared.grossAmountMinor)throw new Error('Invalid shared-expense allocation');const company=Money.sumMinor(shared.allocations.filter(item=>item.scope==='business'&&item.entityId===source.beneficiaryEntityId).map(item=>item.amountMinor),'Company shared allocation');if(company!==shared.companyAmountMinor)throw new Error('Invalid shared-expense company allocation');}
    }
    if(source.expenseFactProvenance!=null){const p=source.expenseFactProvenance;if(!plain(p)||p.schemaVersion!==1||!['only_company','not_only_company','shared','unknown'].includes(p.companyUseScope)||typeof p.allocationDerived!=='boolean'||!text(p.sourceQuestion,128)||!text(p.answer,128)||!text(p.derivedAtAction,128)||(p.companyAllocationMinor!=null&&!Number.isSafeInteger(p.companyAllocationMinor))||(p.grossAmountMinor!=null&&!Number.isSafeInteger(p.grossAmountMinor)))throw new Error('Invalid expense fact provenance');}
    if(source.companyTaxTreatment!=null){const decision=source.companyTaxTreatment;if(!plain(decision)||decision.schemaVersion!==1||!text(decision.treatmentRuleVersion,128)||!text(decision.companyTaxRulesetVersion,128)||!['supported_calculated','supported_record_only','review_required'].includes(decision.status)||!Array.isArray(decision.reasonCodes)||decision.reasonCodes.some(code=>!text(code,128))||!text(decision.accountingTreatment,128)||!text(decision.taxTreatment,128)||(decision.taxEffectiveDate!=null&&!isoDate(decision.taxEffectiveDate))||!plain(decision.confirmations)||!Array.isArray(decision.officialSourceIds)||decision.officialSourceIds.some(id=>!text(id,128))||!text(decision.sourceFactSignature,20000))throw new Error('Invalid company tax treatment snapshot');}
    if(source.salarySnapshot!=null)validateSalarySnapshot(source.salarySnapshot);if(source.dividendSnapshot!=null)validateDividendSnapshot(source.dividendSnapshot);
    if(source.evidenceRefs!=null&&(!Array.isArray(source.evidenceRefs)||source.evidenceRefs.some(ref=>!text(ref,512))))throw new Error('Invalid source evidence references');
    return true;
  }

  function validateCompanyTaxPeriod(period){
    if(!plain(period)||!text(period.id,128)||!text(period.entityId,128)||![1,2].includes(period.schemaVersion)||!['supported_calculated','review_required','stale_rule','unknown_rule'].includes(period.status)||!Array.isArray(period.reasonCodes)||period.reasonCodes.some(code=>!text(code,128))||!isoDate(period.accountsStartDate)||!isoDate(period.accountsEndDate)||!isoDate(period.startDate)||!isoDate(period.endDate)||period.accountsStartDate>period.startDate||period.startDate>period.endDate||period.endDate>period.accountsEndDate||!text(period.rulesetVersion,128)||!isoDate(period.rulesVerifiedAt)||!Number.isSafeInteger(period.accountingProfitMinor)||!Array.isArray(period.sourceEventRevisionIds)||period.sourceEventRevisionIds.some(id=>!text(id,256))||new Set(period.sourceEventRevisionIds).size!==period.sourceEventRevisionIds.length||!Array.isArray(period.lossRecordIds)||period.lossRecordIds.some(id=>!text(id,128))||new Set(period.lossRecordIds).size!==period.lossRecordIds.length||typeof period.calculationSignature!=='string'||!/^fnv1a32-[0-9a-f]{8}$/.test(period.calculationSignature)||typeof period.provisional!=='boolean'||!Number.isSafeInteger(period.revision)||period.revision<1||!Number.isFinite(Number(period.createdAt))||!Number.isFinite(Number(period.updatedAt))||!text(period.deviceId,128))throw new Error('Invalid company tax period');
    if(period.schemaVersion===2&&(!Number.isSafeInteger(period.accountsPeriodIndex)||period.accountsPeriodIndex<1||!Number.isSafeInteger(period.accountsPeriodCount)||period.accountsPeriodCount<period.accountsPeriodIndex||!isoDate(period.sourceDateStart)||!isoDate(period.sourceDateEnd)||period.sourceDateStart<period.accountsStartDate||period.sourceDateStart>period.sourceDateEnd||period.sourceDateEnd!==period.endDate||(period.accountsPeriodIndex===1?period.sourceDateStart!==period.accountsStartDate:period.sourceDateStart!==period.startDate)))throw new Error('Invalid company tax period split identity');
    const taxFields=['accountingToTaxAdjustmentMinor','preLossTaxableProfitMinor','lossUsedMinor','taxableProfitMinor','currentTradingLossMinor','corporationTaxEstimateMinor','marginalReliefMinor','afterTaxAccountingProfitMinor'];
    if(period.status==='supported_calculated'){if(period.reasonCodes.length||taxFields.some(field=>!Number.isSafeInteger(period[field]))||['preLossTaxableProfitMinor','lossUsedMinor','taxableProfitMinor','currentTradingLossMinor','corporationTaxEstimateMinor','marginalReliefMinor'].some(field=>period[field]<0)||!['zero','small_profits','marginal_relief','main_rate'].includes(period.rateBand))throw new Error('Calculated company tax period is incomplete');}
    else if(!period.reasonCodes.length||taxFields.some(field=>period[field]!==null)||period.rateBand!==null)throw new Error('Review company tax period must not contain a confident estimate');if((period.revision===1&&period.previousRevisionId!=null)||(period.revision>1&&period.previousRevisionId!==period.id+':'+(period.revision-1)))throw new Error('Invalid company tax period previous revision');return true;
  }

  function validateCompanyLossRecord(record){
    if(!plain(record)||!text(record.id,128)||!text(record.entityId,128)||record.schemaVersion!==1||record.kind!=='trading_loss'||!['opening_confirmed','calculated_period'].includes(record.sourceKind)||(record.sourceKind==='opening_confirmed'?record.sourcePeriodId!==null:!text(record.sourcePeriodId,128))||!isoDate(record.arisingDate)||!Number.isSafeInteger(record.amountMinor)||record.amountMinor<=0||!Array.isArray(record.uses)||record.uses.some(use=>!plain(use)||!text(use.periodId,128)||!Number.isSafeInteger(use.amountMinor)||use.amountMinor<=0)||new Set(record.uses.map(use=>use.periodId)).size!==record.uses.length||!Number.isSafeInteger(record.usedMinor)||record.usedMinor<0||record.usedMinor!==Money.sumMinor(record.uses.map(use=>use.amountMinor),'Company loss uses')||!Number.isSafeInteger(record.remainingMinor)||record.remainingMinor<0||Money.sumMinor([record.usedMinor,record.remainingMinor],'Company loss balance')!==record.amountMinor||!['active','exhausted','superseded'].includes(record.status)||(record.status==='active'&&record.remainingMinor===0)||(record.status==='exhausted'&&record.remainingMinor!==0)||(record.status==='superseded'&&(record.usedMinor!==0||record.remainingMinor!==record.amountMinor))||record.reliefScope!=='company_only_carry_forward'||record.sameTradeConfirmed!==true||!text(record.rulesetVersion,128)||!text(record.lossRuleVersion,128)||!Array.isArray(record.evidenceRefs)||record.evidenceRefs.some(ref=>!text(ref,512))||!Number.isSafeInteger(record.revision)||record.revision<1||!Number.isFinite(Number(record.createdAt))||!Number.isFinite(Number(record.updatedAt))||!text(record.deviceId,128))throw new Error('Invalid company loss record');if((record.revision===1&&record.previousRevisionId!=null)||(record.revision>1&&record.previousRevisionId!==record.id+':'+(record.revision-1)))throw new Error('Invalid company loss previous revision');return true;
  }

  function validateSalaryRecord(record){
    if(!plain(record)||record.schemaVersion!==1||record.status!=='confirmed'||!text(record.id,128)||!text(record.sourceEventId,128)||!text(record.sourceEventRevisionId,256)||!text(record.personalIncomeLinkId,128)||!Number.isSafeInteger(record.revision)||record.revision<1||!Number.isFinite(Number(record.createdAt))||!Number.isFinite(Number(record.updatedAt))||!text(record.deviceId,128))throw new Error('Invalid salary record');validateSalarySnapshot(record);if(record.id!==record.recordId||record.sourceEventRevisionId!==record.sourceEventId+':'+record.revision||(record.revision===1&&record.previousRevisionId!=null)||(record.revision>1&&record.previousRevisionId!==record.id+':'+(record.revision-1)))throw new Error('Invalid salary record revision');return true;
  }

  function validateDividendDeclaration(record){
    if(!plain(record)||record.schemaVersion!==1||!text(record.id,128)||record.id!==record.recordId||!text(record.declarationEventId,128)||!text(record.declarationEventRevisionId,256)||!Array.isArray(record.personalIncomeLinkIds)||record.personalIncomeLinkIds.some(id=>!text(id,128))||new Set(record.personalIncomeLinkIds).size!==record.personalIncomeLinkIds.length||!Number.isSafeInteger(record.revision)||record.revision<1||!Number.isFinite(Number(record.createdAt))||!Number.isFinite(Number(record.updatedAt))||!text(record.deviceId,128))throw new Error('Invalid dividend declaration');validateDividendSnapshot(record);if(record.status==='declared'&&(record.paymentEventId!=null||record.paymentEventRevisionId!=null||record.personalIncomeLinkIds.length)||record.status==='paid'&&(!text(record.paymentEventId,128)||!text(record.paymentEventRevisionId,256)||record.personalIncomeLinkIds.length!==1)||(record.revision===1&&record.previousRevisionId!=null)||(record.revision>1&&record.previousRevisionId!==record.id+':'+(record.revision-1)))throw new Error('Invalid dividend declaration lifecycle');return true;
  }

  function validatePersonalIncomeLink(link){
    if(!plain(link)||link.schemaVersion!==1||!text(link.id,128)||!text(link.personId,128)||!text(link.entityId,128)||!['director_salary','company_dividend'].includes(link.kind)||link.taxYear!=='2026-27'||!text(link.sourceRecordId,128)||!text(link.sourceRecordRevisionId,256)||!isoDate(link.paymentDate)||!Number.isSafeInteger(link.grossAmountMinor)||link.grossAmountMinor<=0||!Number.isSafeInteger(link.taxWithheldMinor)||link.taxWithheldMinor<0||link.taxWithheldMinor>link.grossAmountMinor||link.status!=='confirmed'||!Number.isSafeInteger(link.revision)||link.revision<1||!Number.isFinite(Number(link.createdAt))||!Number.isFinite(Number(link.updatedAt))||!text(link.deviceId,128)||(link.revision===1&&link.previousRevisionId!=null)||(link.revision>1&&link.previousRevisionId!==link.id+':'+(link.revision-1)))throw new Error('Invalid personal income link');return true;
  }

  function validateAllocationLeg(leg,sourceId){
    if(!plain(leg)||!text(leg.id,128)||leg.sourceTransactionId!==sourceId||!text(leg.entityId,128)||!['business','private'].includes(leg.scope)||!TREATMENT_STATUSES.includes(leg.treatmentStatus)) throw new Error('Invalid allocation leg');
    if(!optionalText(leg.projectId,128)||!optionalText(leg.category,128)||!optionalText(leg.reasonCode,128)) throw new Error('Invalid allocation leg reference');
    Money.assertMinor(leg.amountMinor,'Allocation amount',{nonNegative:true});
    return true;
  }

  function validateAllocationSet(source,legs){
    validateSourceTransaction(source);
    if(!Array.isArray(legs)||legs.length===0) throw new Error('Allocation legs are required');
    uniqueIds(legs,'allocation');
    legs.forEach(leg=>validateAllocationLeg(leg,source.id));
    Money.assertAllocationTotal(source.amountMinor,legs);
    return true;
  }

  function treatmentTotalMinor(legs){
    return Money.sumMinor((legs||[]).filter(leg=>leg.scope==='business'&&leg.treatmentStatus==='supported').map(leg=>leg.amountMinor),'Supported treatment total');
  }

  function validatePosting(posting,journal){
    if(!plain(posting)||!text(posting.id,128)||posting.journalEntryId!==journal.id||posting.entityId!==journal.entityId||posting.sourceTransactionId!==journal.sourceTransactionId||!journal.allocationIds.includes(posting.allocationId)||!text(posting.accountCode,128)||!optionalText(posting.paymentAccountId,128)) throw new Error('Invalid accounting posting');
    Money.assertMinor(posting.debitMinor,'Posting debit',{nonNegative:true});
    Money.assertMinor(posting.creditMinor,'Posting credit',{nonNegative:true});
    if((posting.debitMinor===0)===(posting.creditMinor===0)) throw new Error('A posting must contain exactly one non-zero debit or credit');
    return true;
  }

  function validateJournalGroup(journal,postings){
    if(!plain(journal)||!text(journal.id,128)||!text(journal.entityId,128)||!text(journal.economicEventId,128)||!text(journal.sourceTransactionId,128)||!Array.isArray(journal.allocationIds)||!journal.allocationIds.length||new Set(journal.allocationIds).size!==journal.allocationIds.length||journal.allocationIds.some(id=>!text(id,128))||!JOURNAL_STATUSES.includes(journal.status)||!Number.isSafeInteger(journal.revision)||journal.revision<1) throw new Error('Invalid journal entry');
    if(!Array.isArray(postings)||postings.length<2) throw new Error('A journal requires at least two postings');
    uniqueIds(postings,'posting');
    postings.forEach(posting=>validatePosting(posting,journal));
    const debit=Money.sumMinor(postings.map(posting=>posting.debitMinor),'Journal debit');
    const credit=Money.sumMinor(postings.map(posting=>posting.creditMinor),'Journal credit');
    if(debit!==credit) throw new Error('Journal postings must balance exactly');
    return true;
  }

  function validateEconomicEventEnvelope(envelope){
    if(!plain(envelope)||!text(envelope.id,128)||!text(envelope.idempotencyKey,256)||!EVENT_STATUSES.includes(envelope.status)||!Number.isSafeInteger(envelope.revision)||envelope.revision<1) throw new Error('Invalid economic event envelope');
    validateSourceTransaction(envelope.sourceTransaction);
    if(envelope.sourceTransaction.economicEventId!=null&&envelope.sourceTransaction.economicEventId!==envelope.id) throw new Error('Source transaction belongs to another economic event');
    validateAllocationSet(envelope.sourceTransaction,envelope.allocations);
    const journals=Array.isArray(envelope.journals)?envelope.journals:[];
    uniqueIds(journals.map(group=>group&&group.journal),'journal');
    const allocationMap=new Map(envelope.allocations.map(allocation=>[allocation.id,allocation])),postedAllocations=new Set();
    journals.forEach(group=>{
      if(!plain(group)||!plain(group.journal)||group.journal.economicEventId!==envelope.id||group.journal.sourceTransactionId!==envelope.sourceTransaction.id) throw new Error('Journal belongs to another economic event');
      validateJournalGroup(group.journal,group.postings);
      const selected=group.journal.allocationIds.map(id=>allocationMap.get(id));if(selected.some(allocation=>!allocation||allocation.scope!=='business'||allocation.treatmentStatus!=='supported'))throw new Error('Journal references an unsupported allocation');
      for(const id of group.journal.allocationIds){if(postedAllocations.has(id))throw new Error('Allocation is posted more than once');postedAllocations.add(id);}
      const debit=Money.sumMinor(group.postings.map(posting=>posting.debitMinor),'Journal debit'),allocated=Money.sumMinor(selected.map(allocation=>allocation.amountMinor),'Journal allocation');if(debit!==allocated)throw new Error('Journal must post its allocations exactly once');
    });
    if(envelope.status==='committed'&&envelope.accountingRuleVersion!=null){const supported=envelope.allocations.filter(allocation=>allocation.scope==='business'&&allocation.treatmentStatus==='supported').map(allocation=>allocation.id);if(!text(envelope.accountingRuleVersion,128)||!supported.length||supported.some(id=>!postedAllocations.has(id)))throw new Error('Committed accounting event must post every supported allocation');}
    if(envelope.status==='committed'&&journals.some(group=>group.journal.status!=='posted')) throw new Error('Committed events may only contain posted journals');
    if(envelope.status==='reversed'&&!text(envelope.reversalEventId,128)) throw new Error('Reversed events must reference their reversal');
    if(envelope.accessDecision!=null){const decision=envelope.accessDecision,snapshot=decision&&decision.previousSnapshot;if(envelope.origin!=='company_v1_5'||envelope.revision<2||!plain(decision)||decision.schemaVersion!==1||!['correction','reversal'].includes(decision.action)||decision.basis!=='retained_after_downgrade'||decision.previousRevisionId!==envelope.previousRevisionId||typeof decision.previousFingerprint!=='string'||!/^fnv1a32-[0-9a-f]{8}$/.test(decision.previousFingerprint)||!plain(snapshot)||snapshot.id!==envelope.id||snapshot.revision!==envelope.revision-1||snapshot.status!=='committed'||snapshot.origin!=='company_v1_5'||!text(decision.reasonCode,128)||!/^[a-z0-9][a-z0-9_-]*$/.test(decision.reasonCode)||(decision.action==='reversal')!==(envelope.status==='reversed'))throw new Error('Invalid retained company access decision');}
    return true;
  }

  function validateDomainState(domain){
    if(!plain(domain)||domain.schemaVersion!==DOMAIN_SCHEMA_VERSION||!['complete','review_required'].includes(domain.migrationStatus)) throw new Error('Invalid TaxMate domain state');
    for(const key of ['persons','entities','companyProfiles','projects','paymentAccounts','economicEvents','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','migrationIssues','syncConflicts']) if(!Array.isArray(domain[key])) throw new Error('Invalid TaxMate domain collection '+key);
    uniqueIds(domain.persons,'person');uniqueIds(domain.entities,'entity');uniqueIds(domain.companyProfiles,'company profile');uniqueIds(domain.projects,'project');uniqueIds(domain.paymentAccounts,'payment account');uniqueIds(domain.economicEvents,'economic event');uniqueIds(domain.companyTaxPeriods,'company tax period');uniqueIds(domain.companyLossRecords,'company loss record');uniqueIds(domain.salaryRecords,'salary record');uniqueIds(domain.dividendDeclarations,'dividend declaration');uniqueIds(domain.personalIncomeLinks,'personal income link');
    domain.persons.forEach(validatePerson);domain.entities.forEach(validateLegalEntity);domain.companyProfiles.forEach(validateCompanyProfile);domain.projects.forEach(validateProject);domain.paymentAccounts.forEach(validatePaymentAccount);domain.economicEvents.forEach(validateEconomicEventEnvelope);domain.companyTaxPeriods.forEach(validateCompanyTaxPeriod);domain.companyLossRecords.forEach(validateCompanyLossRecord);domain.salaryRecords.forEach(validateSalaryRecord);domain.dividendDeclarations.forEach(validateDividendDeclaration);domain.personalIncomeLinks.forEach(validatePersonalIncomeLink);
    const entityIds=new Set(domain.entities.map(entity=>entity.id)),projectMap=new Map(domain.projects.map(project=>[project.id,project]));
    if(domain.companyProfiles.filter(profile=>profile.deletedAt==null).length>1)throw new Error('V1.5 supports one active limited company');
    domain.companyProfiles.forEach(profile=>{const entity=domain.entities.find(candidate=>candidate.id===profile.entityId);if(!entity||entity.type!=='limited_company')throw new Error('Company profile references an invalid entity');if(profile.legalName&&entity.name!==profile.legalName)throw new Error('Company profile legal name must match its entity');});
    domain.projects.forEach(project=>{if(!entityIds.has(project.entityId))throw new Error('Project references an unknown entity');});
    const paymentAccountIds=new Set(domain.paymentAccounts.map(account=>account.id));domain.economicEvents.forEach(event=>{if(event.sourceTransaction.beneficiaryEntityId&&!entityIds.has(event.sourceTransaction.beneficiaryEntityId))throw new Error('Source transaction references an unknown beneficiary entity');for(const field of ['payerPaymentAccountId','receiverPaymentAccountId'])if(event.sourceTransaction[field]&&!paymentAccountIds.has(event.sourceTransaction[field]))throw new Error('Source transaction references an unknown payment account');event.allocations.forEach(leg=>{if(!entityIds.has(leg.entityId))throw new Error('Allocation references an unknown entity');if(leg.projectId&&(!projectMap.has(leg.projectId)||projectMap.get(leg.projectId).entityId!==leg.entityId))throw new Error('Allocation project belongs to another entity');});event.journals.forEach(group=>{if(!entityIds.has(group.journal.entityId))throw new Error('Journal references an unknown entity');group.postings.forEach(posting=>{if(posting.paymentAccountId&&!paymentAccountIds.has(posting.paymentAccountId))throw new Error('Posting references an unknown payment account');});});});
    const taxPeriodMap=new Map(domain.companyTaxPeriods.map(period=>[period.id,period])),lossMap=new Map(domain.companyLossRecords.map(record=>[record.id,record]));domain.companyTaxPeriods.forEach(period=>{if(!entityIds.has(period.entityId))throw new Error('Company tax period references an unknown entity');period.lossRecordIds.forEach(id=>{const record=lossMap.get(id);if(!record||record.entityId!==period.entityId||!(record.sourcePeriodId===period.id||record.uses.some(use=>use.periodId===period.id)))throw new Error('Company tax period references an invalid loss record');});});domain.companyLossRecords.forEach(record=>{if(!entityIds.has(record.entityId))throw new Error('Company loss references an unknown entity');if(record.sourcePeriodId){const period=taxPeriodMap.get(record.sourcePeriodId);if(!period||period.entityId!==record.entityId)throw new Error('Company loss references an invalid tax period');}record.uses.forEach(use=>{const period=taxPeriodMap.get(use.periodId);if(!period||period.entityId!==record.entityId||!period.lossRecordIds.includes(record.id))throw new Error('Company loss use references an invalid tax period');});});
    const eventMap=new Map(domain.economicEvents.map(event=>[event.id,event])),personIds=new Set(domain.persons.map(person=>person.id)),linkMap=new Map(domain.personalIncomeLinks.map(link=>[link.id,link])),salaryMap=new Map(domain.salaryRecords.map(record=>[record.id,record])),dividendMap=new Map(domain.dividendDeclarations.map(record=>[record.id,record]));domain.salaryRecords.forEach(record=>{const event=eventMap.get(record.sourceEventId),link=linkMap.get(record.personalIncomeLinkId);if(!entityIds.has(record.entityId)||!personIds.has(record.personId)||!event||!event.sourceTransaction.salarySnapshot||event.sourceTransaction.salarySnapshot.recordId!==record.id||record.sourceEventRevisionId!==event.id+':'+event.revision||!link||link.sourceRecordId!==record.id)throw new Error('Salary record references invalid canonical sources');});domain.dividendDeclarations.forEach(record=>{const declaration=eventMap.get(record.declarationEventId);if(!entityIds.has(record.entityId)||!declaration||!declaration.sourceTransaction.dividendSnapshot||declaration.sourceTransaction.dividendSnapshot.recordId!==record.id||record.declarationEventRevisionId!==declaration.id+':'+declaration.revision)throw new Error('Dividend declaration references invalid canonical sources');if(record.status==='paid'){const payment=eventMap.get(record.paymentEventId),link=linkMap.get(record.personalIncomeLinkIds[0]);if(!payment||!payment.sourceTransaction.dividendSnapshot||payment.sourceTransaction.dividendSnapshot.recordId!==record.id||record.paymentEventRevisionId!==payment.id+':'+payment.revision||!link||link.sourceRecordId!==record.id)throw new Error('Paid dividend references invalid canonical sources');}});domain.personalIncomeLinks.forEach(link=>{if(!personIds.has(link.personId)||!entityIds.has(link.entityId))throw new Error('Personal income link references an unknown party');const source=link.kind==='director_salary'?salaryMap.get(link.sourceRecordId):dividendMap.get(link.sourceRecordId);if(!source||source.entityId!==link.entityId||link.sourceRecordRevisionId!==source.id+':'+source.revision)throw new Error('Personal income link references an invalid source record');});
    domain.salaryRecords.forEach(record=>{if(record.personId!=='person:account-holder')throw new Error('Salary record must link the TaxMate account holder');});domain.dividendDeclarations.forEach(record=>{const profile=domain.companyProfiles.find(candidate=>candidate.entityId===record.entityId),expected=profile&&ownershipForDate(profile,record.declarationDate).slice().sort((a,b)=>a.id.localeCompare(b.id)).map(holder=>({shareholderId:holder.id,isAccountHolder:holder.isAccountHolder,shares:holder.shares,ownershipBasisPoints:holder.ownershipBasisPoints})),actual=record.allocations.map(allocation=>({shareholderId:allocation.shareholderId,isAccountHolder:allocation.isAccountHolder,shares:allocation.shares,ownershipBasisPoints:allocation.ownershipBasisPoints}));if(!profile||profile.shareClasses.length!==1||record.shareClassId!==profile.shareClasses[0].id||JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Dividend allocation does not match ownership at the declaration date');});domain.personalIncomeLinks.forEach(link=>{if(link.personId!=='person:account-holder')throw new Error('Personal income must link the TaxMate account holder');});
    return true;
  }

  return {
    DOMAIN_SCHEMA_VERSION,CURRENCY,ENTITY_TYPES,PARTNERSHIP_AMOUNT_BASES,TREATMENT_STATUSES,EVENT_STATUSES,JOURNAL_STATUSES,
    COMPANY_RISK_FIELDS,isoDate,validatePerson,validateLegalEntity,validateCompanyProfile,validateCompanyProfileRevision,validateCompanyOwnershipVersion,ownershipForDate,validateProject,validatePaymentAccount,validateSalarySnapshot,validateDividendSnapshot,validateSourceTransaction,validateCompanyTaxPeriod,validateCompanyLossRecord,validateSalaryRecord,validateDividendDeclaration,validatePersonalIncomeLink,
    validateAllocationLeg,validateAllocationSet,treatmentTotalMinor,validatePosting,validateJournalGroup,validateEconomicEventEnvelope,validateDomainState
  };
});

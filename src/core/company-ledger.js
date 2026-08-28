(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./money'):root.TaxMateMoney,node?require('./domain-schema'):root.TaxMateDomain,node?require('./company-profile'):root.TaxMateCompanyProfile,node?require('./company-treatment'):root.TaxMateCompanyTreatment,node?require('./revision-sync'):root.TaxMateRevisionSync);
  if(node)module.exports=api;root.TaxMateCompanyLedger=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money,Domain,CompanyProfile,CompanyTreatment,RevisionSync){
  'use strict';
  if(!Money||!Domain||!CompanyProfile||!CompanyTreatment||!RevisionSync)throw new Error('TaxMate company-ledger dependencies are required');

  const LEDGER_SCHEMA_VERSION=1,ACCOUNTING_RULE_VERSION='uk-company-ledger.2026-08-22.1';
  const TYPES=Object.freeze({
    COMPANY_INCOME:'company_income',COMPANY_EXPENSE:'company_expense',PERSONALLY_PAID_EXPENSE:'personally_paid_expense',
    DIRECTOR_LOAN_FUNDING:'director_loan_funding',DIRECTOR_LOAN_REPAYMENT:'director_loan_repayment',SHARE_CAPITAL_FUNDING:'share_capital_funding',OPENING_BALANCE:'opening_balance',
    DIRECTOR_SALARY:'director_salary',PAYROLL_TAX_PAYMENT:'payroll_tax_payment',DIVIDEND_DECLARATION:'dividend_declaration',DIVIDEND_PAYMENT:'dividend_payment'
  });
  const ACCOUNTS=Object.freeze({
    COMPANY_BANK:Object.freeze({code:'COMPANY_BANK',group:'asset',label:'Company bank/cash'}),
    OPERATING_EXPENSE:Object.freeze({code:'OPERATING_EXPENSE',group:'expense',label:'Ordinary operating expense'}),
    TRADING_INCOME:Object.freeze({code:'TRADING_INCOME',group:'income',label:'Trading income'}),
    DIRECTOR_LOAN:Object.freeze({code:'DIRECTOR_LOAN',group:'liability',label:'Director/founder loan'}),
    PAYE_NI_PAYABLE:Object.freeze({code:'PAYE_NI_PAYABLE',group:'liability',label:'PAYE and National Insurance due'}),
    DIVIDEND_PAYABLE:Object.freeze({code:'DIVIDEND_PAYABLE',group:'liability',label:'Declared dividend due'}),
    SHARE_CAPITAL:Object.freeze({code:'SHARE_CAPITAL',group:'equity',label:'Share capital'}),
    RETAINED_EARNINGS:Object.freeze({code:'RETAINED_EARNINGS',group:'equity',label:'Retained profit/loss'}),
    DIRECTOR_SALARY_EXPENSE:Object.freeze({code:'DIRECTOR_SALARY_EXPENSE',group:'expense',label:'Director salary'}),
    EMPLOYER_NI_EXPENSE:Object.freeze({code:'EMPLOYER_NI_EXPENSE',group:'expense',label:'Employer National Insurance'})
  });
  const ACCOUNT_BY_CODE=Object.freeze(Object.fromEntries(Object.values(ACCOUNTS).map(account=>[account.code,account])));
  const UNSUPPORTED_COST_CATEGORIES=Object.freeze(['formation','capital','software_development','self_created_software','intangible','research_and_development','stock','inventory','non_deductible','unknown']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=256)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
  const sum=values=>Money.sumMinor(values,'Company ledger total');
  const sourceKind=type=>type===TYPES.COMPANY_INCOME?'income':([TYPES.COMPANY_EXPENSE,TYPES.PERSONALLY_PAID_EXPENSE].includes(type)?'expense':(type===TYPES.DIRECTOR_SALARY?'salary':([TYPES.DIVIDEND_DECLARATION,TYPES.DIVIDEND_PAYMENT].includes(type)?'dividend':(type===TYPES.PAYROLL_TAX_PAYMENT?'tax':(type===TYPES.OPENING_BALANCE?'adjustment':(type===TYPES.DIRECTOR_LOAN_REPAYMENT?'transfer':'funding'))))));
  const safeMinor=(value,label)=>{Money.assertMinor(value,label,{nonNegative:true});return value;};

  function signature(facts){
    return JSON.stringify([facts.type,facts.id,facts.entityId,facts.date,facts.amountMinor,facts.description||null,facts.invoicePartyId||null,facts.payerPaymentAccountId||null,facts.receiverPaymentAccountId||null,facts.payerOwnerType||null,facts.receiverOwnerType||null,facts.category||null,facts.treatmentBasis||null,facts.reimbursementExpected==null?null:facts.reimbursementExpected,facts.shareCapitalEvidenceConfirmed==null?null:facts.shareCapitalEvidenceConfirmed,facts.sharedExpense||null,facts.expenseFactProvenance||null,facts.companyTaxTreatment||null,facts.salarySnapshot||null,facts.dividendSnapshot||null,facts.openingBalances||null,facts.evidenceRefs||[]]);
  }

  function validateFacts(facts,profile){
    if(!facts||!Object.values(TYPES).filter(type=>type!==TYPES.OPENING_BALANCE).includes(facts.type)||!text(facts.id,128)||!text(facts.entityId,128)||!Domain.isoDate(facts.date)||!text(facts.description,2000))throw new Error('Invalid company transaction facts');
    if(!profile||facts.entityId!==profile.entityId)throw new Error('Company transaction references another entity');
    safeMinor(facts.amountMinor,'Company transaction amount');if(facts.amountMinor<=0)throw new Error('Company transaction amount must be positive');
    if(facts.shareCapitalEvidenceConfirmed!=null&&typeof facts.shareCapitalEvidenceConfirmed!=='boolean')throw new Error('Invalid share-capital evidence confirmation');
    if(facts.sharedExpense!=null){
      const shared=facts.sharedExpense,nonCompany=Number.isSafeInteger(shared.nonCompanyAmountMinor)?shared.nonCompanyAmountMinor:shared.personalAmountMinor;
      if(![TYPES.COMPANY_EXPENSE,TYPES.PERSONALLY_PAID_EXPENSE].includes(facts.type)||!Number.isSafeInteger(shared.grossAmountMinor)||shared.grossAmountMinor<=0||!Number.isSafeInteger(shared.companyAmountMinor)||shared.companyAmountMinor<=0||!Number.isSafeInteger(nonCompany)||nonCompany<0||!Number.isSafeInteger(shared.businessUseBasisPoints)||shared.businessUseBasisPoints<1||shared.businessUseBasisPoints>10000||Money.sumMinor([shared.companyAmountMinor,nonCompany],'Shared expense allocation')!==shared.grossAmountMinor||shared.companyAmountMinor!==facts.amountMinor)throw new Error('Invalid shared-expense allocation');
      if(Array.isArray(shared.allocations)){
        if(!shared.allocations.length||new Set(shared.allocations.map(item=>item&&item.id)).size!==shared.allocations.length||shared.allocations.some(item=>!item||!text(item.id,128)||!text(item.entityId,128)||!['business','private'].includes(item.scope)||!Number.isSafeInteger(item.amountMinor)||item.amountMinor<=0)||Money.sumMinor(shared.allocations.map(item=>item.amountMinor),'Shared expense legs')!==shared.grossAmountMinor)throw new Error('Invalid shared-expense allocation');
        const company=Money.sumMinor(shared.allocations.filter(item=>item.scope==='business'&&item.entityId===facts.entityId).map(item=>item.amountMinor),'Company shared allocation');if(company!==shared.companyAmountMinor)throw new Error('Invalid shared-expense company allocation');
      }
    }
    if(facts.expenseFactProvenance!=null){const p=facts.expenseFactProvenance;if(!p||p.schemaVersion!==1||!['only_company','not_only_company','shared','unknown'].includes(p.companyUseScope)||typeof p.allocationDerived!=='boolean')throw new Error('Invalid expense fact provenance');}
    if(facts.salarySnapshot!=null)Domain.validateSalarySnapshot(facts.salarySnapshot);if(facts.dividendSnapshot!=null)Domain.validateDividendSnapshot(facts.dividendSnapshot);
    if(facts.evidenceRefs!=null&&(!Array.isArray(facts.evidenceRefs)||facts.evidenceRefs.some(ref=>!text(ref,512))))throw new Error('Invalid company evidence reference');
    if(facts.companyTaxTreatment!=null)CompanyTreatment.validateDecision(facts.companyTaxTreatment,facts,profile);
    return true;
  }

  function baseSource(facts){
    const source={id:'company-source:'+facts.id,economicEventId:'company-event:'+facts.id,kind:sourceKind(facts.type),date:facts.date,amountMinor:facts.amountMinor,currency:'GBP',beneficiaryEntityId:facts.entityId,purpose:facts.description,companyTransactionType:facts.type};
    for(const field of ['invoicePartyId','payerPaymentAccountId','receiverPaymentAccountId','payerOwnerType','receiverOwnerType'])if(facts[field]!=null)source[field]=facts[field];
    if(facts.reimbursementExpected!=null)source.reimbursementExpected=facts.reimbursementExpected;
    if(facts.shareCapitalEvidenceConfirmed!=null)source.shareCapitalEvidenceConfirmed=facts.shareCapitalEvidenceConfirmed;
    if(facts.sharedExpense!=null)source.sharedExpense=clone(facts.sharedExpense);
    if(facts.expenseFactProvenance!=null)source.expenseFactProvenance=clone(facts.expenseFactProvenance);
    if(facts.companyTaxTreatment!=null)source.companyTaxTreatment=clone(facts.companyTaxTreatment);
    if(facts.salarySnapshot!=null)source.salarySnapshot=clone(facts.salarySnapshot);if(facts.dividendSnapshot!=null)source.dividendSnapshot=clone(facts.dividendSnapshot);
    if(facts.evidenceRefs&&facts.evidenceRefs.length)source.evidenceRefs=clone(facts.evidenceRefs);
    return source;
  }

  function baseAllocation(source,facts,status,reasonCode){
    const allocation={id:'company-allocation:'+facts.id,sourceTransactionId:source.id,entityId:facts.entityId,scope:'business',treatmentStatus:status,amountMinor:facts.amountMinor,category:facts.category||facts.type};
    if(reasonCode)allocation.reasonCode=reasonCode;return allocation;
  }

  function draftResult(facts,reasons,previous){
    const unique=Array.from(new Set(reasons)),sourceSignature=signature(facts);if(previous&&previous.status==='draft'&&previous.sourceSignature===sourceSignature&&JSON.stringify(previous.reviewReasons||[])===JSON.stringify(unique))return{status:'review_required',reasons:unique,envelope:clone(previous)};
    const source=baseSource(facts),allocation=baseAllocation(source,facts,'review_required',unique[0]),revision=previous?previous.revision+1:1,stamp=Number(facts.updatedAt)||Date.now();
    const envelope={id:'company-event:'+facts.id,idempotencyKey:'company-ledger:'+facts.id+':draft:'+revision,status:'draft',revision,sourceTransaction:source,allocations:[allocation],journals:[],origin:'company_v1_5',ledgerSchemaVersion:LEDGER_SCHEMA_VERSION,accountingRuleVersion:ACCOUNTING_RULE_VERSION,validationStatus:'local_review',reviewReasons:unique,treatmentDecision:{status:'review_required',reasons:unique,taxTreatmentStatus:'unassessed'},sourceSignature,createdAt:previous&&previous.createdAt||Number(facts.createdAt)||stamp,updatedAt:stamp,deviceId:facts.deviceId||'company-ledger'};
    if(previous)envelope.previousRevisionId=RevisionSync.revisionId(previous);Domain.validateEconomicEventEnvelope(envelope);if(previous)RevisionSync.validateRevisionTransition(previous,envelope);return{status:'review_required',reasons:unique,envelope};
  }

  function posting(journal,allocation,account,debitMinor,creditMinor,extra={}){
    return Object.assign({id:journal.id+':'+account.code+':'+(extra.sequence||0),journalEntryId:journal.id,entityId:journal.entityId,sourceTransactionId:journal.sourceTransactionId,allocationId:allocation.id,accountCode:account.code,debitMinor,creditMinor},extra.paymentAccountId?{paymentAccountId:extra.paymentAccountId}:{});
  }

  function postedResult(facts,postings,currentEvents,previous){
    const source=baseSource(facts),allocation=baseAllocation(source,facts,'supported'),eventId=source.economicEventId,revision=previous?previous.revision+1:1,journal={id:'company-journal:'+facts.id,entityId:facts.entityId,economicEventId:eventId,sourceTransactionId:source.id,allocationIds:[allocation.id],status:'posted',revision,accountingRuleVersion:ACCOUNTING_RULE_VERSION};
    const rows=postings(journal,allocation),stamp=Number(facts.updatedAt)||Date.now(),taxDecision=facts.companyTaxTreatment,envelope={id:eventId,idempotencyKey:'company-ledger:'+facts.id+':'+revision,status:'committed',revision,sourceTransaction:source,allocations:[allocation],journals:[{journal,postings:rows}],origin:'company_v1_5',ledgerSchemaVersion:LEDGER_SCHEMA_VERSION,accountingRuleVersion:ACCOUNTING_RULE_VERSION,validationStatus:'local_validated',treatmentDecision:{status:'accounting_supported',taxTreatmentStatus:taxDecision?taxDecision.status:'unassessed',basis:facts.treatmentBasis,...(taxDecision?{companyTaxRulesetVersion:taxDecision.companyTaxRulesetVersion,taxEffectiveDate:taxDecision.taxEffectiveDate,taxTreatment:taxDecision.taxTreatment}:{})},sourceSignature:signature(facts),createdAt:previous&&previous.createdAt||Number(facts.createdAt)||stamp,updatedAt:stamp,deviceId:facts.deviceId||'company-ledger'};
    if(previous)envelope.previousRevisionId=RevisionSync.revisionId(previous);Domain.validateEconomicEventEnvelope(envelope);if(previous)RevisionSync.validateRevisionTransition(previous,envelope);return{status:'posted',reasons:[],envelope,ledger:reconcile([...(currentEvents||[]),envelope],facts.entityId)};
  }

  function findExisting(events,facts){return(events||[]).find(event=>event&&event.id==='company-event:'+facts.id);}
  function duplicateResult(existing,facts){if(existing.sourceSignature===signature(facts))return{status:'existing',reasons:[],envelope:clone(existing)};return{status:'review_required',reasons:['economic_event_id_conflict'],envelope:clone(existing)};}

  function profileAndDateReasons(profile,facts){
    const gate=CompanyProfile.transactionGate(profile),reasons=gate.allowed?[]:[...gate.reasons];
    if(Domain.isoDate(profile&&profile.incorporationDate)&&facts.date<profile.incorporationDate)reasons.push('transaction_before_incorporation_review_required');
    const operating=[TYPES.COMPANY_INCOME,TYPES.COMPANY_EXPENSE,TYPES.PERSONALLY_PAID_EXPENSE,TYPES.DIRECTOR_SALARY].includes(facts.type);
    if(operating&&profile&&profile.tradingStatus!=='trading')reasons.push('company_not_trading_review_required');
    if(operating&&Domain.isoDate(profile&&profile.tradingStartDate)&&facts.date<profile.tradingStartDate&&!CompanyTreatment.supportsPreTradingPosting(facts,profile))reasons.push('pre_trading_treatment_review_required');
    return reasons;
  }

  function paymentAccountMatches(accounts,id,ownerType,entityId){const account=(accounts||[]).find(candidate=>candidate&&candidate.id===id);return!!account&&account.ownerType===ownerType&&account.currency==='GBP'&&(ownerType!=='entity'||account.ownerId===entityId);}
  function partyReasons(facts,paymentAccounts){
    const reasons=[],expense=[TYPES.COMPANY_EXPENSE,TYPES.PERSONALLY_PAID_EXPENSE].includes(facts.type);
    if(facts.type===TYPES.DIRECTOR_SALARY&&facts.salarySnapshot){const receiver=(paymentAccounts||[]).find(account=>account&&account.id===facts.receiverPaymentAccountId);if(!receiver||receiver.ownerId!==facts.salarySnapshot.personId)reasons.push('salary_receiver_must_be_account_holder');}
    if(facts.type===TYPES.DIRECTOR_SALARY){if(!facts.salarySnapshot||facts.payerOwnerType!=='entity'||facts.receiverOwnerType!=='person'||!text(facts.payerPaymentAccountId,128)||!text(facts.receiverPaymentAccountId,128))reasons.push('confirmed_salary_payment_accounts_required');}
    if([TYPES.PAYROLL_TAX_PAYMENT,TYPES.DIVIDEND_PAYMENT].includes(facts.type)&&(!text(facts.payerPaymentAccountId,128)||facts.payerOwnerType!=='entity'))reasons.push('company_payment_account_required');
    if((facts.type===TYPES.COMPANY_INCOME||expense)&&!text(facts.invoicePartyId,128))reasons.push('invoice_party_required');
    if(expense&&facts.invoicePartyId!==facts.entityId)reasons.push('company_invoice_party_review_required');
    if(facts.type===TYPES.COMPANY_INCOME&&(!text(facts.receiverPaymentAccountId,128)||facts.receiverOwnerType!=='entity'))reasons.push('company_receiving_account_required');
    if(facts.type===TYPES.COMPANY_EXPENSE&&(!text(facts.payerPaymentAccountId,128)||facts.payerOwnerType!=='entity'))reasons.push('company_payment_account_required');
    if(facts.type===TYPES.PERSONALLY_PAID_EXPENSE&&(!text(facts.payerPaymentAccountId,128)||facts.payerOwnerType!=='person'||facts.reimbursementExpected!==true))reasons.push('personal_payer_and_reimbursement_confirmation_required');
    if([TYPES.DIRECTOR_LOAN_FUNDING,TYPES.SHARE_CAPITAL_FUNDING].includes(facts.type)&&(!text(facts.payerPaymentAccountId,128)||!text(facts.receiverPaymentAccountId,128)||facts.payerOwnerType!=='person'||facts.receiverOwnerType!=='entity'))reasons.push('founder_to_company_payment_accounts_required');
    if(facts.type===TYPES.DIRECTOR_LOAN_REPAYMENT&&(!text(facts.payerPaymentAccountId,128)||!text(facts.receiverPaymentAccountId,128)||facts.payerOwnerType!=='entity'||facts.receiverOwnerType!=='person'))reasons.push('company_to_founder_payment_accounts_required');
    if(facts.receiverPaymentAccountId&&!paymentAccountMatches(paymentAccounts,facts.receiverPaymentAccountId,facts.receiverOwnerType,facts.entityId))reasons.push('receiving_payment_account_ownership_review_required');
    if(facts.payerPaymentAccountId&&!paymentAccountMatches(paymentAccounts,facts.payerPaymentAccountId,facts.payerOwnerType,facts.entityId))reasons.push('payer_payment_account_ownership_review_required');
    return reasons;
  }

  function classificationReasons(facts){
    if(facts.type===TYPES.DIRECTOR_SALARY&&(!facts.salarySnapshot||facts.treatmentBasis!=='confirmed_payroll_result'||!facts.companyTaxTreatment||facts.companyTaxTreatment.status!=='supported_calculated'))return['confirmed_salary_record_required'];
    if(facts.type===TYPES.PAYROLL_TAX_PAYMENT&&facts.treatmentBasis!=='confirmed_payroll_tax_payment')return['payroll_tax_payment_confirmation_required'];
    if(facts.type===TYPES.DIVIDEND_DECLARATION&&(!facts.dividendSnapshot||facts.dividendSnapshot.status!=='declared'||facts.treatmentBasis!=='confirmed_dividend_declaration'))return['confirmed_dividend_declaration_required'];
    if(facts.type===TYPES.DIVIDEND_PAYMENT&&(!facts.dividendSnapshot||facts.dividendSnapshot.status!=='paid'||facts.treatmentBasis!=='confirmed_dividend_payment'))return['confirmed_dividend_payment_required'];
    if([TYPES.COMPANY_EXPENSE,TYPES.PERSONALLY_PAID_EXPENSE].includes(facts.type)){
      const recordOnly=facts.category==='non_deductible'&&facts.companyTaxTreatment&&facts.companyTaxTreatment.status==='supported_record_only'&&facts.companyTaxTreatment.taxTreatment==='non_deductible_add_back';
      if(UNSUPPORTED_COST_CATEGORIES.includes(facts.category)&&!recordOnly)return['company_cost_treatment_review_required'];
      if(facts.treatmentBasis!=='ordinary_running_expense_confirmed'&&!(recordOnly&&facts.treatmentBasis==='confirmed_non_deductible_expense'))return['ordinary_running_expense_confirmation_required'];
    }
    if(facts.type===TYPES.COMPANY_INCOME&&facts.treatmentBasis!=='ordinary_trading_income_confirmed')return['ordinary_trading_income_confirmation_required'];
    if(facts.type===TYPES.DIRECTOR_LOAN_FUNDING&&facts.treatmentBasis!=='director_loan_confirmed')return['funding_classification_review_required'];
    if(facts.type===TYPES.DIRECTOR_LOAN_REPAYMENT&&facts.treatmentBasis!=='director_loan_repayment_confirmed')return['repayment_classification_review_required'];
    if(facts.type===TYPES.SHARE_CAPITAL_FUNDING){
      const reasons=[];if(facts.treatmentBasis!=='share_capital_confirmed')reasons.push('share_capital_classification_review_required');if(facts.shareCapitalEvidenceConfirmed!==true||!Array.isArray(facts.evidenceRefs)||!facts.evidenceRefs.length)reasons.push('share_capital_evidence_review_required');return reasons;
    }
    return[];
  }

  function buildEvent(input){
    const facts=clone(input&&input.facts),profile=input&&input.profile,currentEvents=input&&input.currentEvents||[],paymentAccounts=input&&input.paymentAccounts||[];validateFacts(facts,profile);
    const existing=findExisting(currentEvents,facts);if(existing&&existing.status!=='draft')return duplicateResult(existing,facts);const ledgerEvents=existing?currentEvents.filter(event=>event.id!==existing.id):currentEvents;
    const reasons=[...profileAndDateReasons(profile,facts),...partyReasons(facts,paymentAccounts),...classificationReasons(facts)];
    if(facts.type===TYPES.COMPANY_EXPENSE&&facts.sharedExpense&&facts.sharedExpense.grossAmountMinor!==facts.amountMinor)reasons.push('company_paid_shared_expense_review_required');
    if(reasons.length)return draftResult(facts,reasons,existing);
    const current=reconcile(ledgerEvents,facts.entityId);
    if(current.balanceStatus!=='reconciled'&&ledgerEvents.length)return draftResult(facts,['company_ledger_review_required'],existing);
    if(facts.type===TYPES.COMPANY_EXPENSE&&current.cashMinor<facts.amountMinor)return draftResult(facts,['insufficient_recorded_company_cash'],existing);
    if(facts.type===TYPES.DIRECTOR_SALARY&&current.cashMinor<facts.salarySnapshot.netPayMinor)return draftResult(facts,['insufficient_recorded_company_cash'],existing);
    if(facts.type===TYPES.PAYROLL_TAX_PAYMENT&&(current.balances.PAYE_NI_PAYABLE<facts.amountMinor||current.cashMinor<facts.amountMinor))return draftResult(facts,[current.balances.PAYE_NI_PAYABLE<facts.amountMinor?'payroll_tax_payment_exceeds_recorded_liability':'insufficient_recorded_company_cash'],existing);
    if(facts.type===TYPES.DIVIDEND_PAYMENT&&(current.balances.DIVIDEND_PAYABLE<facts.amountMinor||current.cashMinor<facts.amountMinor))return draftResult(facts,[current.balances.DIVIDEND_PAYABLE<facts.amountMinor?'dividend_payment_exceeds_declared_liability':'insufficient_recorded_company_cash'],existing);
    if(facts.type===TYPES.DIRECTOR_LOAN_REPAYMENT){
      if(current.directorLoan.balanceMinor<facts.amountMinor)return draftResult(facts,['director_loan_overdrawn_not_supported'],existing);
      if(current.cashMinor<facts.amountMinor)return draftResult(facts,['insufficient_recorded_company_cash'],existing);
    }
    if(facts.type===TYPES.COMPANY_INCOME)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.COMPANY_BANK,facts.amountMinor,0,{sequence:1,paymentAccountId:facts.receiverPaymentAccountId}),posting(journal,allocation,ACCOUNTS.TRADING_INCOME,0,facts.amountMinor,{sequence:2})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.COMPANY_EXPENSE)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.OPERATING_EXPENSE,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.COMPANY_BANK,0,facts.amountMinor,{sequence:2,paymentAccountId:facts.payerPaymentAccountId})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.PERSONALLY_PAID_EXPENSE)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.OPERATING_EXPENSE,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.DIRECTOR_LOAN,0,facts.amountMinor,{sequence:2})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.DIRECTOR_SALARY){const salary=facts.salarySnapshot,taxLiability=sum([salary.payeWithheldMinor,salary.employeeNiMinor,salary.employerNiMinor]);return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.DIRECTOR_SALARY_EXPENSE,salary.grossSalaryMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.EMPLOYER_NI_EXPENSE,salary.employerNiMinor,0,{sequence:2}),posting(journal,allocation,ACCOUNTS.COMPANY_BANK,0,salary.netPayMinor,{sequence:3,paymentAccountId:facts.payerPaymentAccountId}),posting(journal,allocation,ACCOUNTS.PAYE_NI_PAYABLE,0,taxLiability,{sequence:4})
    ].filter(row=>row.debitMinor!==0||row.creditMinor!==0),ledgerEvents,existing);}
    if(facts.type===TYPES.PAYROLL_TAX_PAYMENT)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.PAYE_NI_PAYABLE,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.COMPANY_BANK,0,facts.amountMinor,{sequence:2,paymentAccountId:facts.payerPaymentAccountId})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.DIVIDEND_DECLARATION)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.RETAINED_EARNINGS,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.DIVIDEND_PAYABLE,0,facts.amountMinor,{sequence:2})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.DIVIDEND_PAYMENT)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.DIVIDEND_PAYABLE,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.COMPANY_BANK,0,facts.amountMinor,{sequence:2,paymentAccountId:facts.payerPaymentAccountId})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.DIRECTOR_LOAN_FUNDING)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.COMPANY_BANK,facts.amountMinor,0,{sequence:1,paymentAccountId:facts.receiverPaymentAccountId}),posting(journal,allocation,ACCOUNTS.DIRECTOR_LOAN,0,facts.amountMinor,{sequence:2})
    ],ledgerEvents,existing);
    if(facts.type===TYPES.DIRECTOR_LOAN_REPAYMENT)return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.DIRECTOR_LOAN,facts.amountMinor,0,{sequence:1}),posting(journal,allocation,ACCOUNTS.COMPANY_BANK,0,facts.amountMinor,{sequence:2,paymentAccountId:facts.payerPaymentAccountId})
    ],ledgerEvents,existing);
    return postedResult(facts,(journal,allocation)=>[
      posting(journal,allocation,ACCOUNTS.COMPANY_BANK,facts.amountMinor,0,{sequence:1,paymentAccountId:facts.receiverPaymentAccountId}),posting(journal,allocation,ACCOUNTS.SHARE_CAPITAL,0,facts.amountMinor,{sequence:2})
    ],ledgerEvents,existing);
  }

  function openingDraftFacts(input,amountMinor,openingBalances){return{id:input.id,entityId:input.entityId,type:TYPES.OPENING_BALANCE,date:input.date,amountMinor,description:input.description||'Opening company balances',category:'opening_balance',treatmentBasis:'opening_balance_confirmed',receiverPaymentAccountId:input.companyPaymentAccountId,receiverOwnerType:'entity',shareCapitalEvidenceConfirmed:input.shareCapitalEvidenceConfirmed,openingBalances,createdAt:input.createdAt,updatedAt:input.updatedAt,deviceId:input.deviceId,evidenceRefs:input.evidenceRefs||[]};}
  function buildOpeningBalance(input){
    const facts=clone(input&&input.facts),profile=input&&input.profile,currentEvents=input&&input.currentEvents||[],paymentAccounts=input&&input.paymentAccounts||[];
    if(!facts||!text(facts.id,128)||!text(facts.entityId,128)||facts.entityId!==profile.entityId||!Domain.isoDate(facts.date))throw new Error('Invalid company opening-balance facts');
    const value=(field,label)=>safeMinor(facts[field]==null?0:facts[field],label),cash=value('cashMinor','Opening cash'),loan=value('directorLoanCreditMinor','Opening director loan'),loanDebit=value('directorLoanDebitMinor','Opening overdrawn director loan'),capital=value('shareCapitalMinor','Opening share capital'),retained=value('retainedEarningsMinor','Opening retained earnings'),loss=value('accumulatedLossMinor','Opening accumulated loss');
    const debit=sum([cash,loss]),credit=sum([loan,capital,retained]),openingBalances={cashMinor:cash,directorLoanCreditMinor:loan,directorLoanDebitMinor:loanDebit,shareCapitalMinor:capital,retainedEarningsMinor:retained,accumulatedLossMinor:loss},draftFacts=openingDraftFacts(facts,Math.max(debit,credit),openingBalances);
    const existing=findExisting(currentEvents,draftFacts);if(existing&&existing.status!=='draft')return duplicateResult(existing,draftFacts);const ledgerEvents=existing?currentEvents.filter(event=>event.id!==existing.id):currentEvents;
    const reasons=[...profileAndDateReasons(profile,draftFacts)];if(ledgerEvents.some(event=>event&&event.status!=='reversed'&&event.sourceTransaction&&event.sourceTransaction.beneficiaryEntityId===facts.entityId))reasons.push('opening_balance_must_precede_company_events');if(currentEvents.some(event=>event&&event.id!=='company-event:'+facts.id&&event.sourceTransaction&&event.sourceTransaction.companyTransactionType===TYPES.OPENING_BALANCE))reasons.push('opening_balance_already_recorded');if(cash&&!paymentAccountMatches(paymentAccounts,facts.companyPaymentAccountId,'entity',facts.entityId))reasons.push('company_payment_account_required');if(capital&&(facts.shareCapitalEvidenceConfirmed!==true||!Array.isArray(facts.evidenceRefs)||!facts.evidenceRefs.length))reasons.push('share_capital_evidence_review_required');if(loanDebit>0)reasons.push('director_loan_overdrawn_not_supported');if(retained>0&&loss>0)reasons.push('opening_retained_result_conflict');if(debit===0&&credit===0)reasons.push('opening_balance_empty');if(debit!==credit)reasons.push('opening_balance_does_not_reconcile');if(reasons.length)return draftResult(draftFacts,reasons,existing);
    return postedResult(draftFacts,(journal,allocation)=>{
      const rows=[];if(cash)rows.push(posting(journal,allocation,ACCOUNTS.COMPANY_BANK,cash,0,{sequence:1,paymentAccountId:facts.companyPaymentAccountId}));if(loss)rows.push(posting(journal,allocation,ACCOUNTS.RETAINED_EARNINGS,loss,0,{sequence:2}));if(loan)rows.push(posting(journal,allocation,ACCOUNTS.DIRECTOR_LOAN,0,loan,{sequence:3}));if(capital)rows.push(posting(journal,allocation,ACCOUNTS.SHARE_CAPITAL,0,capital,{sequence:4}));if(retained)rows.push(posting(journal,allocation,ACCOUNTS.RETAINED_EARNINGS,0,retained,{sequence:5}));return rows;
    },ledgerEvents,existing);
  }

  function reconcile(events,entityId){
    const balances=Object.fromEntries(Object.keys(ACCOUNT_BY_CODE).map(code=>[code,0])),issues=[],balanceIssues=[],includedEventIds=[],draftEventIds=[];let totalDebit=0,totalCredit=0,provisional=false;
    for(const event of events||[]){
      if(!event||event.sourceTransaction&&event.sourceTransaction.beneficiaryEntityId!==entityId)continue;
      try{Domain.validateEconomicEventEnvelope(event);}catch(_){issues.push('invalid_economic_event');balanceIssues.push('invalid_economic_event');continue;}
      if(event.status==='draft'){draftEventIds.push(event.id);issues.push(...(event.reviewReasons||['draft_event_review_required']));continue;}
      if(event.status==='reversed')continue;
      if(event.validationStatus!=='server_validated')provisional=true;
      for(const group of event.journals||[]){
        if(group.journal.entityId!==entityId){issues.push('journal_entity_mismatch');balanceIssues.push('journal_entity_mismatch');continue;}
        for(const row of group.postings){
          const account=ACCOUNT_BY_CODE[row.accountCode];if(!account){issues.push('unsupported_account_code');balanceIssues.push('unsupported_account_code');continue;}
          totalDebit=sum([totalDebit,row.debitMinor]);totalCredit=sum([totalCredit,row.creditMinor]);
          const movement=['asset','expense'].includes(account.group)?sum([row.debitMinor,-row.creditMinor]):sum([row.creditMinor,-row.debitMinor]);balances[row.accountCode]=sum([balances[row.accountCode],movement]);
        }
      }
      includedEventIds.push(event.id);
    }
    const groupTotal=group=>sum(Object.values(ACCOUNT_BY_CODE).filter(account=>account.group===group).map(account=>balances[account.code]));
    const assets=groupTotal('asset'),liabilities=groupTotal('liability'),equity=groupTotal('equity'),income=groupTotal('income'),expenses=groupTotal('expense'),rightSide=sum([liabilities,equity,income,-expenses]),equationDelta=sum([assets,-rightSide]),profit=sum([income,-expenses]),loan=balances.DIRECTOR_LOAN,cash=balances.COMPANY_BANK;
    if(totalDebit!==totalCredit){issues.push('trial_balance_mismatch');balanceIssues.push('trial_balance_mismatch');}if(equationDelta!==0){issues.push('accounting_equation_mismatch');balanceIssues.push('accounting_equation_mismatch');}if(loan<0){issues.push('director_loan_overdrawn_review_required');balanceIssues.push('director_loan_overdrawn_review_required');}if(cash<0){issues.push('negative_company_cash_review_required');balanceIssues.push('negative_company_cash_review_required');}
    const unique=Array.from(new Set(issues)),balanceUnique=Array.from(new Set(balanceIssues));return{status:unique.length?'review_required':'reconciled',balanceStatus:balanceUnique.length?'review_required':'reconciled',reasons:unique,balanceReasons:balanceUnique,provisional,totalDebitMinor:totalDebit,totalCreditMinor:totalCredit,balances,assetsMinor:assets,liabilitiesMinor:liabilities,equityMinor:equity,incomeMinor:income,expensesMinor:expenses,accountingProfitMinor:profit,equationDeltaMinor:equationDelta,cashMinor:cash,directorLoan:{balanceMinor:loan,status:loan>0?'company_owes_you':loan<0?'you_owe_company_review_required':'settled'},includedEventIds,draftEventIds};
  }

  function reverseEvent(event,options={}){
    Domain.validateEconomicEventEnvelope(event);if(event.status!=='committed')throw new Error('Only a committed company event may be reversed');
    const next=clone(event),revision=event.revision+1,stamp=Number(options.now)||Date.now();delete next.accessDecision;next.status='reversed';next.revision=revision;next.previousRevisionId=RevisionSync.revisionId(event);next.reversalEventId=options.reversalEventId||'company-reversal:'+event.id+':'+revision;next.idempotencyKey='company-ledger:'+event.id+':reverse:'+revision;next.updatedAt=stamp;next.deviceId=options.deviceId||event.deviceId;next.validationStatus='local_validated';next.sourceSignature=String(event.sourceSignature||'')+'|reversed:'+revision;Domain.validateEconomicEventEnvelope(next);RevisionSync.validateRevisionTransition(event,next);return next;
  }

  return{LEDGER_SCHEMA_VERSION,ACCOUNTING_RULE_VERSION,TYPES,ACCOUNTS,ACCOUNT_BY_CODE,UNSUPPORTED_COST_CATEGORIES,signature,buildEvent,buildOpeningBalance,reconcile,reverseEvent};
});

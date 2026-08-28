'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const State=require('../src/integration/ltd/company-state');
const CompanyProfile=require('../src/core/company-profile');
const CompanyTreatment=require('../src/core/company-treatment');
const CompanyLedger=require('../src/core/company-ledger');
const CompanyTax=require('../src/core/company-tax');

const DATASET_ID='founder-ux-p9-4-20260823';
const MODES=Object.freeze(['fresh','existing']);
const FIXED_NOW=Date.UTC(2026,7,23,9,0,0);
const DEVICE_ID='founder-preview-p9-4-20260823';
const RECEIPT_REFERENCE_ROUTE='/__taxmate-founder-preview-receipt-reference.svg';
const EXPECTED_SOURCE=Object.freeze({businessNames:Object.freeze(['das','Evri','Newset','Taxmate app']),businessCount:4,entryCount:79,receiptReferenceCount:27});
const clone=value=>JSON.parse(JSON.stringify(value));
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);

function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();}
function assertExpectedSource(payload,state){
  const names=state.businesses.map(business=>business.name);
  if(state.businesses.length!==EXPECTED_SOURCE.businessCount||state.entries.length!==EXPECTED_SOURCE.entryCount||!same(names,EXPECTED_SOURCE.businessNames))throw new Error('Founder Preview backup identity does not match the approved 4-business/79-entry source');
  if(state.businesses.some(business=>business.structure!=='partnership'||business.share!==50))throw new Error('Founder Preview backup partnership structure/share drift detected');
  if(payload.receiptBinariesIncluded!==false)throw new Error('Founder Preview JSON must not contain receipt binaries');
  const refs=state.entries.filter(entry=>entry.receiptPath||entry.receiptUrl);
  if(refs.length!==EXPECTED_SOURCE.receiptReferenceCount||!Array.isArray(payload.receiptManifest)||payload.receiptManifest.length!==EXPECTED_SOURCE.receiptReferenceCount)throw new Error('Founder Preview receipt-reference identity drift detected');
}
function buildProfile(entityId){
  let profile=CompanyProfile.createDraft({entityId,now:FIXED_NOW,deviceId:DEVICE_ID});
  const noRisks=Object.fromEntries(CompanyProfile.RISK_FIELDS.map(field=>[field,false]));
  const answers=[
    ['legal_name','ToodaLoop Ltd'],
    ['company_type',{jurisdiction:'UK',companyType:'private_limited_by_shares',currency:'GBP'}],
    ['company_number',{status:'not_available'}],
    ['incorporation_date','2025-12-15'],
    ['trading_status',{status:'trading',startDate:'2025-12-15'}],
    ['accounting_period',{startDate:'2025-12-15',endDate:'2027-01-31',referenceDate:'2027-01-31',status:'confirmed'}],
    ['corporation_tax_status','registered'],
    ['account_holder_roles',{isDirector:true,isShareholder:true}],
    ['share_structure',{directors:[{id:'director:preview-founder',name:'Founder',isAccountHolder:true}],shareholders:[{id:'shareholder:preview-founder',name:'Founder',isAccountHolder:true,shareClassId:'ordinary',shares:51},{id:'shareholder:preview-other',name:'Other shareholder',isAccountHolder:false,shareClassId:'ordinary',shares:49}],shareClasses:[{id:'ordinary',name:'ordinary',dividendRights:'equal'}]}],
    ['activity_profile','service_digital'],['unsupported_screen',noRisks],['confirmation',true]
  ];
  for(const [question,value] of answers)profile=CompanyProfile.answer(profile,question,value,{now:FIXED_NOW,deviceId:DEVICE_ID});
  profile.previewIdentityStatus='preview_only_no_company_number';
  profile.scenarioFactProvenance={schemaVersion:1,status:'confirmed',directorClass1CategoryA:true,directorForFullTaxYear:true,standardTaxCode1257L:true,noOtherEmploymentOrPayeAdjustments:true,employmentAllowanceUnavailableConfirmed:true,useMaximumEligibleCarriedLoss:true,confirmedOpeningDistributableReserveMinor:0,sourceRefs:['preview-only:founder-scenario-facts'],confirmedAt:FIXED_NOW};
  if(profile.lifecycleStatus!=='confirmed'||profile.assessmentStatus!=='supported_profile')throw new Error('Preview-only Ltd profile did not pass the canonical company-profile gate');
  return profile;
}
function transactionFacts(type,id,amountMinor,date,description,evidenceRef,entityId,accounts){
  const facts={type,id,entityId,date,amountMinor,description,evidenceRefs:[evidenceRef],updatedAt:FIXED_NOW,deviceId:DEVICE_ID},ordinary={revenueExpenseConfirmed:true,whollyAndExclusivelyBusiness:true,specificallyDisallowed:false,capitalExpense:false,wouldBeDeductibleAfterTrading:true,reliefClaimedElsewhere:false,advancePaymentOrStock:false};
  if(type===CompanyLedger.TYPES.COMPANY_INCOME){Object.assign(facts,{invoicePartyId:'preview-only:client',receiverPaymentAccountId:accounts.company.id,receiverOwnerType:'entity',category:'sales',treatmentBasis:'ordinary_trading_income_confirmed'});facts.companyTaxTreatment=CompanyTreatment.assessIncome(facts,accounts.profile,{ordinaryTradingIncomeConfirmed:true,nonTradingIncome:false,chargeableGain:false});}
  else if(type===CompanyLedger.TYPES.COMPANY_EXPENSE){Object.assign(facts,{invoicePartyId:entityId,payerPaymentAccountId:accounts.company.id,payerOwnerType:'entity',category:'ordinary_running',treatmentBasis:'ordinary_running_expense_confirmed',expenseFactProvenance:{schemaVersion:1,companyUseScope:'only_company',sourceQuestion:'money.only_company',answer:'only_company',allocationDerived:false,companyAllocationMinor:null,grossAmountMinor:amountMinor,derivedAtAction:'company_expense_capture'}});facts.companyTaxTreatment=CompanyTreatment.assessExpense(facts,accounts.profile,ordinary);}
  else if(type===CompanyLedger.TYPES.PERSONALLY_PAID_EXPENSE){Object.assign(facts,{invoicePartyId:entityId,payerPaymentAccountId:accounts.personal.id,payerOwnerType:'person',reimbursementExpected:true,category:'ordinary_running',treatmentBasis:'ordinary_running_expense_confirmed',expenseFactProvenance:{schemaVersion:1,companyUseScope:'only_company',sourceQuestion:'money.only_company',answer:'only_company',allocationDerived:false,companyAllocationMinor:null,grossAmountMinor:amountMinor,derivedAtAction:'company_expense_capture'}});facts.companyTaxTreatment=CompanyTreatment.assessExpense(facts,accounts.profile,ordinary);}
  else throw new Error('Unsupported Founder Preview transaction type');
  return facts;
}
function addCanonicalLtd(state){
  const entityId='company-preview:toodaloop-ltd',profile=buildProfile(entityId),entity={id:entityId,name:'ToodaLoop Ltd',type:'limited_company',currency:'GBP',createdAt:FIXED_NOW,updatedAt:FIXED_NOW,deviceId:DEVICE_ID,previewOnly:true};
  const companyAccount={id:'account-company-bank:'+entityId,ownerType:'entity',ownerId:entityId,name:'Company bank',currency:'GBP',createdAt:FIXED_NOW,updatedAt:FIXED_NOW,deviceId:DEVICE_ID};
  const personalAccount={id:'account-personal:'+entityId,ownerType:'person',ownerId:'person:account-holder',name:'Founder personal account',currency:'GBP',createdAt:FIXED_NOW,updatedAt:FIXED_NOW,deviceId:DEVICE_ID};
  const accounts={company:companyAccount,personal:personalAccount,profile},inputs=[
    transactionFacts(CompanyLedger.TYPES.COMPANY_INCOME,'preview-toodaloop-income-001',1000000,'2026-05-15','Client project income','invoice:toodaloop-demo-001',entityId,accounts),
    transactionFacts(CompanyLedger.TYPES.COMPANY_EXPENSE,'preview-toodaloop-company-expense-001',100000,'2026-06-10','Company-paid hosting expense','receipt:company-hosting-demo-001',entityId,accounts),
    transactionFacts(CompanyLedger.TYPES.PERSONALLY_PAID_EXPENSE,'preview-toodaloop-personal-expense-001',1500000,'2026-07-05','Personally-paid development expense','receipt:founder-development-demo-001',entityId,accounts)
  ],events=[];
  for(const facts of inputs){const result=CompanyLedger.buildEvent({profile,paymentAccounts:[companyAccount,personalAccount],currentEvents:events,facts});if(result.status!=='posted')throw new Error('Preview-only Ltd transaction did not post through the canonical ledger');events.push(result.envelope);}
  const tax=CompanyTax.computeEstimates({profile,events,ctFacts:{ukResidentConfirmed:true,ringFenceProfits:false,closeInvestmentHoldingCompany:false,associatedCompaniesConfirmedNone:true,qualifyingDistributionsMinor:0,accountsCompleteConfirmed:true,sameTradeContinues:true},lossRecords:[],lossUseMinorByPeriod:[0],asOfDate:'2026-08-23',now:FIXED_NOW,deviceId:DEVICE_ID});
  if(tax.status!=='supported_calculated'||tax.corporationTaxEstimateMinor!==0||!tax.lossRecords.length)throw new Error('Preview-only Ltd loss/Corporation Tax scenario did not calculate canonically');
  state.domain.entities.push(entity);state.domain.companyProfiles.push(profile);state.domain.paymentAccounts.push(companyAccount,personalAccount);state.domain.economicEvents.push(...events);state.domain.companyTaxPeriods.push(...tax.periodRecords);state.domain.companyLossRecords.push(...tax.lossRecords);state.domain.updatedAt=FIXED_NOW;state.domain.deviceId=DEVICE_ID;
  return{profile,events,tax,ledger:CompanyLedger.reconcile(events,entityId)};
}
function preserveSourceProof(source,current){
  if(!same(source.businesses,current.businesses))throw new Error('Founder Preview changed an imported business record');
  for(const original of source.entries){const found=current.entries.find(entry=>entry.id===original.id);if(!found)throw new Error('Founder Preview dropped an imported entry');const expected=clone(original);if(expected.receiptUrl)expected.receiptUrl=RECEIPT_REFERENCE_ROUTE+'?entry='+encodeURIComponent(expected.id);if(!same(expected,found))throw new Error('Founder Preview changed imported entry facts outside receipt-token isolation');}
  for(const key of ['yearData','customCats','activeCats','catRenames','folders','tombstones','obReview'])if(!same(source[key],current[key]))throw new Error('Founder Preview changed imported '+key);
}
function totalsFor(state,businessName){
  const business=state.businesses.find(candidate=>candidate.name===businessName),entries=state.entries.filter(entry=>entry.bizId===business.id&&entry.date>='2026-04-06'&&entry.date<='2027-04-05'),income=entries.filter(entry=>entry.kind==='income').reduce((sum,entry)=>sum+entry.amount,0),expenses=entries.filter(entry=>entry.kind==='expense').reduce((sum,entry)=>sum+entry.amount*(entry.pct==null?100:entry.pct)/100,0);return{entries:entries.length,income,claimableExpenses:Math.round(expenses*100)/100,visibleProfit:Math.round((income-expenses)*100)/100};
}
function buildPreviewDataset(options={}){
  const mode=options.mode;if(!MODES.includes(mode))throw new Error('Founder Preview mode must be fresh or existing');
  const expectedSha256=String(options.expectedSha256||'').toUpperCase();if(!options.backupPath||!/^[A-F0-9]{64}$/.test(expectedSha256))throw new Error('Exact Founder Preview backup path and SHA-256 are required');
  const bytes=fs.readFileSync(options.backupPath),actualSha256=sha256(bytes);if(actualSha256!==expectedSha256)throw new Error('Founder Preview backup SHA-256 mismatch');
  const payload=JSON.parse(bytes.toString('utf8')),imported=State.importBackup(payload,FIXED_NOW,DEVICE_ID);assertExpectedSource(payload,imported);
  const state=clone(imported),receiptUrls=state.entries.filter(entry=>entry.receiptUrl).map(entry=>entry.receiptUrl);for(const entry of state.entries)if(entry.receiptUrl)entry.receiptUrl=RECEIPT_REFERENCE_ROUTE+'?entry='+encodeURIComponent(entry.id);state.tab='home';state.year='2026-27';let ltd=null;if(mode==='existing')ltd=addCanonicalLtd(state);
  const normalized=State.migrate(state,FIXED_NOW,DEVICE_ID);State.validateState(normalized);preserveSourceProof(imported,normalized);const serialized=JSON.stringify(normalized);if(receiptUrls.some(url=>serialized.includes(url))||/firebasestorage\.googleapis\.com|[?&]token=/i.test(serialized))throw new Error('Production receipt download URL leaked into Founder Preview state');
  const meta={datasetId:DATASET_ID,mode,backupSha256:actualSha256,canonicalImport:true,stateSchemaVersion:normalized.v,personalBusinessCount:4,companyCount:mode==='existing'?1:0,homeBusinessCount:mode==='existing'?5:4,entryCount:79,reviewCount:(normalized.obReview||[]).filter(id=>normalized.entries.some(entry=>entry.id===id&&entry._review)).length,receiptReferenceCount:normalized.entries.filter(entry=>entry.receiptPath||entry.receiptUrl).length,receiptDownloadTokensRemoved:receiptUrls.length,receiptBinariesIncluded:false,evri:totalsFor(normalized,'Evri')};
  if(ltd)meta.ltd={name:'ToodaLoop Ltd',ownershipBasisPoints:ltd.profile.shareholders.map(holder=>holder.ownershipBasisPoints),eventCount:ltd.events.length,accountingProfitMinor:ltd.ledger.accountingProfitMinor,companyCashMinor:ltd.ledger.cashMinor,directorLoanMinor:ltd.ledger.directorLoan.balanceMinor,corporationTaxEstimateMinor:ltd.tax.corporationTaxEstimateMinor,currentTradingLossMinor:ltd.tax.periodRecords.reduce((sum,period)=>sum+(period.currentTradingLossMinor||0),0)};
  return{state:normalized,meta:Object.freeze(meta),deviceId:DEVICE_ID};
}
function browserLoaderScript(bundles){
  const payload=JSON.stringify(bundles).replace(/</g,'\\u003c');
  return `'use strict';(function(){const runtime=window.TaxMateFounderPreview;if(!runtime||!runtime.active||runtime.dataset!=='${DATASET_ID}')return;const bundles=${payload},bundle=bundles[runtime.mode];if(!bundle)return;const stateKey=runtime.storageKey('taxmateuk_v1'),metaKey=runtime.storageKey('dataset_meta'),stored=localStorage.getItem(metaKey);let current=null;try{current=stored&&JSON.parse(stored);}catch(_){}if(runtime.resetDataset||!current||current.backupSha256!==bundle.meta.backupSha256||current.mode!==bundle.meta.mode){TaxMateState.validateState(bundle.state);localStorage.setItem(stateKey,JSON.stringify(bundle.state));localStorage.setItem(metaKey,JSON.stringify(bundle.meta));localStorage.setItem(runtime.storageKey('taxmateuk_device_v1'),bundle.deviceId);}window.TaxMateFounderPreviewDataset=Object.freeze(Object.assign({active:true},bundle.meta));if(runtime.resetDataset&&window.history&&window.history.replaceState){const url=new URL(window.location.href);url.searchParams.delete('resetDataset');window.history.replaceState(null,'',url.toString());}})();`;
}

module.exports={DATASET_ID,MODES,FIXED_NOW,DEVICE_ID,EXPECTED_SOURCE,RECEIPT_REFERENCE_ROUTE,sha256,buildPreviewDataset,browserLoaderScript};

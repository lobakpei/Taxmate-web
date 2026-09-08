(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateCompanyStatutory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='uk-ltd-checklist.2026-09-05.1',VERIFIED_AT='2026-09-05',REVIEW_BY='2027-09-05';
  const STATES=['completed','outstanding','not_applicable','unsupported','needs_checking'];
  const LABELS={completed:'已完成',outstanding:'仲要做',not_applicable:'不適用',unsupported:'TaxMate 暫不支援',needs_checking:'請查實'};
  const URL={
    utr:'https://www.gov.uk/limited-company-formation',
    accounts:'https://www.gov.uk/guidance/using-software-to-file-your-companys-information',
    ixbrl:'https://www.gov.uk/government/news/the-online-accounts-and-company-tax-return-service-is-closing',
    software:'https://www.gov.uk/government/publications/corporation-tax-commercial-software-suppliers',
    cs01:'https://www.gov.uk/running-a-limited-company/confirmation-statement',
    identity:'https://www.gov.uk/guidance/when-you-need-to-verify-your-identity-for-companies-house',
    payroll:'https://www.gov.uk/running-payroll/reporting-to-hmrc',
    dividend:'https://www.gov.uk/running-a-limited-company/taking-money-out-of-a-limited-company',
    vat:'https://www.gov.uk/register-for-vat',
    loan:'https://www.gov.uk/directors-loans/you-owe-your-company-money',
    records:'https://www.gov.uk/running-a-limited-company/company-and-accounting-records',
    deadlines:'https://www.gov.uk/prepare-file-annual-accounts-for-limited-company',
    ct600:'https://www.gov.uk/guidance/the-company-tax-return-guide'
  };
  const clone=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=512;
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const refs=value=>Array.isArray(value)&&value.length>0&&value.every(text);
  const addDays=(value,days)=>new Date(Date.parse(value+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
  function addMonths(value,months){const d=new Date(value+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
  const BOOLEAN_FACTS=['utrReceived','corporationTaxRegistered','accountsFiled','accountsSoftwareReady','hmrcSoftwareReady','cs01Filed','directorsVerified','pscsVerified','noPayroll','noDividends','vatRegistered','noOverdrawnDirectorLoan','recordsBackedUp','retentionExceptionsChecked','microEntityEligibilityConfirmed','noUnsupportedBalancesConfirmed','comparativeFiguresChecked','directorApprovalConfirmed'];
  const DATE_FACTS=['cs01ReviewDate','directorIdentityDueDate','pscIdentityDueDate','vatWindowStart','vatWindowEnd','vatFirstExceededMonthEnd','vatExpectedKnownOn'];
  const MONEY_FACTS=['vatTaxableTurnoverMinor','vatNext30DaysMinor'];
  BOOLEAN_FACTS.push('vatOutsideBooksComplete','vatForecastConfirmed','vatDeletedHistoryReconstructed');
  DATE_FACTS.push('vatCoverageStart','vatCoverageEnd','vatUnresolvedFutureKnownOn');
  function vatFactType(key,value){
    if(/^vatClassification:.+:\d+$/.test(key))return ['taxable','exempt','outside_scope'].includes(value);
    if(/^vatTaxPoint:.+:\d+$/.test(key))return date(value);
    if(/^vatOutsideSales:\d{4}-\d{2}$/.test(key))return date(key.slice(-7)+'-01')&&Number.isSafeInteger(value)&&value>=0;
    if(/^vatException:\d{4}-\d{2}-\d{2}$/.test(key))return date(key.slice(-10))&&value===true;
    return false;
  }
  function validateFacts(facts){
    if(!plain(facts)||Object.keys(facts).length>12000)throw new Error('Invalid statutory facts');
    for(const [key,fact] of Object.entries(facts)){
      if(!plain(fact)||Object.keys(fact).some(k=>!['value','evidenceRefs'].includes(k))||!refs(fact.evidenceRefs))throw new Error('Statutory evidence is required');
      const valid=BOOLEAN_FACTS.includes(key)||/^(ct600Filed|corporationTaxPaid):.{1,128}$/.test(key)?typeof fact.value==='boolean':DATE_FACTS.includes(key)?date(fact.value):MONEY_FACTS.includes(key)?Number.isSafeInteger(fact.value)&&fact.value>=0:false;
      if(!valid&&!vatFactType(key,fact.value))throw new Error('Invalid statutory fact: '+key);
    }
    return true;
  }
  function validateReview(review){
    if(plain(review)&&Object.keys(review).some(key=>!['schemaVersion','id','entityId','startDate','endDate','reviewedOn','sourceFingerprint','revision','updatedAt','deviceId','facts'].includes(key)))throw new Error('Unexpected statutory review field');
    if(!plain(review)||review.schemaVersion!==1||!text(review.id)||!text(review.entityId)||!date(review.startDate)||!date(review.endDate)||review.endDate<review.startDate||!date(review.reviewedOn)||!text(review.sourceFingerprint)||!Number.isSafeInteger(review.revision)||review.revision<1||!Number.isFinite(review.updatedAt)||!text(review.deviceId))throw new Error('Invalid statutory review');
    validateFacts(review.facts);return true;
  }
  function displayFigure(value){return Number.isSafeInteger(value)?{status:'known',text:(value/100).toFixed(2),currency:'GBP',valueMinor:value}:{status:'needs_checking',text:'Please check',copyKey:'statutory.needs_checking',valueMinor:null};}
  function vatReview(input,facts={},historicFacts=[]){
    const asOf=input.asOfDate,entityId=input.profile.entityId,value=key=>facts[key]?.value;
    const end=addDays(asOf.slice(0,7)+'-01',-1),start=addDays(addMonths(end,-12),1);
    const rows=[],unclassified=[],sourceRecords=[],monthly={};
    for(const event of input.events||[]){
      const tx=event.sourceTransaction;
      // Invoices are recognised by their company_income posting. The later
      // sales_invoice_payment is not a second sale; loans/funding are not sales.
      if(event.status==='reversed'||!tx||tx.beneficiaryEntityId!==entityId||tx.companyTransactionType!=='company_income')continue;
      const suffix=event.id+':'+event.revision,classification=value('vatClassification:'+suffix),taxPoint=value('vatTaxPoint:'+suffix);
      if(event.status!=='committed'||!['taxable','exempt','outside_scope'].includes(classification)||!date(taxPoint)||!Number.isSafeInteger(tx.amountMinor)){unclassified.push(event.id);continue;}
      rows.push({recordId:event.id,revision:event.revision,date:taxPoint,classification,amountMinor:tx.amountMinor});
      sourceRecords.push({recordId:event.id,revision:event.revision,field:'VAT taxable-sale review',basis:'canonical_sale_and_evidenced_classification',evidenceRefs:[...(facts['vatClassification:'+suffix]?.evidenceRefs||[]),...(facts['vatTaxPoint:'+suffix]?.evidenceRefs||[])]});
      if(classification==='taxable'&&taxPoint<=asOf)monthly[taxPoint.slice(0,7)]=(monthly[taxPoint.slice(0,7)]||0)+tx.amountMinor;
    }
    for(const [key,entry]of Object.entries(facts))if(key.startsWith('vatOutsideSales:'))monthly[key.slice(-7)]=(monthly[key.slice(-7)]||0)+entry.value;
    const total=(from,to)=>Object.entries(monthly).filter(([month])=>month>=from.slice(0,7)&&month<=to.slice(0,7)).reduce((sum,[,minor])=>sum+minor,0);
    const automaticMinor=total(start,end),complete=value('vatCoverageStart')<=start&&value('vatCoverageEnd')>=end&&value('vatOutsideBooksComplete')===true&&value('vatForecastConfirmed')===true&&Number.isSafeInteger(value('vatNext30DaysMinor'))&&!unclassified.length&&(!input.vatHistoryIncomplete||value('vatDeletedHistoryReconstructed')===true);
    const crossings=[],historicalEnds=new Set();
    // Scan every available month, not just the currently selected accounts year.
    for(const month of Object.keys(monthly).sort()){
      const monthEnd=addDays(addMonths(month+'-01',1),-1);
      if(monthEnd>end)continue;
      const windowStart=addDays(addMonths(monthEnd,-12),1),minor=total(windowStart,monthEnd);
      if(Number.isSafeInteger(minor)&&minor>9000000){historicalEnds.add(monthEnd);break;}
    }
    for(const old of [facts,...historicFacts,...(input.profile?.retentionVatCrossings?[input.profile.retentionVatCrossings]:[])]){
      if(date(old.vatFirstExceededMonthEnd?.value)&&old.vatFirstExceededMonthEnd.value<=asOf)historicalEnds.add(old.vatFirstExceededMonthEnd.value);
      const known=old.vatUnresolvedFutureKnownOn?.value||(old.vatNext30DaysMinor?.value>9000000?old.vatExpectedKnownOn?.value:null);
      if(date(known)&&known<=asOf&&!crossings.some(c=>c.kind==='future_30_days'&&c.knownOn===known))crossings.push({kind:'future_30_days',knownOn:known,dueDate:addDays(known,29),resolved:value('vatException:'+known)===true});
    }
    for(const monthEnd of [...historicalEnds].sort())crossings.push({kind:'rolling_12_months',monthEnd,dueDate:addDays(monthEnd,30),resolved:value('vatException:'+monthEnd)===true});
    const unresolved=crossings.filter(c=>!c.resolved),forecast=value('vatNext30DaysMinor');
    // Keep evidenced legacy totals visible as a separate manually reviewed basis.
    // They cannot certify completeness if real recorded sales are unclassified.
    const manualComplete=!rows.length&&!unclassified.length&&value('vatWindowStart')===start&&value('vatWindowEnd')===end&&Number.isSafeInteger(value('vatTaxableTurnoverMinor'))&&Number.isSafeInteger(forecast)&&(!input.vatHistoryIncomplete||value('vatDeletedHistoryReconstructed')===true);
    const amount=manualComplete?value('vatTaxableTurnoverMinor'):automaticMinor,validTotal=Number.isSafeInteger(amount),exceeded=unresolved.length>0||validTotal&&amount>9000000||forecast>9000000;
    return{mode:manualComplete?'evidenced_manual_legacy':'automatic_confirmed_sales',startDate:start,endDate:end,knownTaxableTurnoverMinor:validTotal?amount:null,complete:validTotal&&(complete||manualComplete),unknownSaleIds:unclassified,rows,sourceRecords,crossings,unresolvedCrossings:unresolved,earlyWarning:validTotal&&amount>=8000000,earlyWarningThresholdMinor:8000000,thresholdMinor:9000000,next30DaysMinor:Number.isSafeInteger(forecast)?forecast:null,exceeded,deadline:unresolved.map(c=>c.dueDate).sort()[0]||null};
  }
  function build(input={}){
    const profile=input.profile||{},figures=input.figures||{},asOf=input.asOfDate;
    if(!date(asOf)||!date(figures.startDate)||!date(figures.endDate)||!text(profile.entityId))throw new Error('Statutory checklist needs a dated company year');
    const stale=asOf>REVIEW_BY,review=profile.statutoryReview;
    let valid=false;try{validateReview(review);valid=review.entityId===profile.entityId&&review.startDate===figures.startDate&&review.endDate===figures.endDate&&review.reviewedOn<=asOf&&review.sourceFingerprint===input.sourceFingerprint;}catch(_){}
    const facts=valid?review.facts:{},fact=key=>facts[key]&&facts[key].value,source=keys=>keys.filter(key=>facts[key]).map(key=>({recordId:review.id,revision:review.revision,field:key,evidenceRefs:clone(facts[key].evidenceRefs),basis:'user_recorded_evidence'}));
    const deadline=(value,basis)=>date(value)?{status:'known',date:value,display:value,basis,urgency:value<asOf?'overdue':value===asOf?'due_today':'upcoming'}:{status:'needs_checking',date:null,display:'Please check',copyKey:'statutory.needs_checking',basis};
    const data=(input.deadlines&&input.deadlines.deadlines)||[],findDue=(kind,periodId)=>data.find(d=>d.kind===kind&&(!periodId||d.periodId===periodId))||{};
    const items=[],yearSource={recordId:profile.id||profile.entityId,field:'accountingPeriod',basis:'company_profile'};
    function item(id,title,status,copy,url,keys=[],due=null,basis='Check the official service for the applicable date',extra={}){
      const reasonCodes=[id+'_'+status];if(stale&&status!=='unsupported'){status='needs_checking';reasonCodes.push('statutory_guidance_review_expired');}
      const result={id,title,status,statusLabel:LABELS[status],statusCopyKey:'statutory.status.'+status,plainEnglish:copy,officialLinks:[{title,url}],deadline:deadline(stale?null:due,basis),triggerReasons:reasonCodes,sourceRecords:[yearSource,...source(keys)],sourceIds:[profile.id||profile.entityId,...source(keys).map(s=>s.recordId+':'+s.revision+':'+s.field)],...extra};items.push(result);return result;
    }
    const confirmed=(key)=>fact(key)===true?'completed':fact(key)===false?'outstanding':'needs_checking';
    item('utr','Corporation Tax registration and UTR',fact('utrReceived')===true&&fact('corporationTaxRegistered')===true?'completed':'outstanding','Register for Corporation Tax within 3 months of starting business activity. Check the company UTR and HMRC account before filing; a Companies House number is not a UTR.',URL.utr,['utrReceived','corporationTaxRegistered'],date(profile.tradingStartDate)?addMonths(profile.tradingStartDate,3):null,'3 months after business activity starts; confirm the activity start date with HMRC');
    const softwareOnly=asOf>='2028-04-01',accounts=item('companies_house_accounts','Companies House accounts',fact('accountsFiled')===true?'completed':'outstanding',softwareOnly?'Prepare statutory accounts in suitable commercial software and file them with Companies House. The accounts web/paper route closed from 1 April 2028.':'Prepare the mapped figures for an eligible Companies House accounts service. From 1 April 2028, accounts require commercial software and iXBRL; confirmation statements remain a separate service.',URL.accounts,['accountsFiled','accountsSoftwareReady'],findDue('companies_house_accounts').dueDate,'Companies House deadline projection; check any changed accounting reference date or extension',{route:{asOfDate:asOf,softwareOnlyFrom:'2028-04-01',selected:softwareOnly?'commercial_ixbrl':'eligible_web_or_commercial',softwarePrepared:fact('accountsSoftwareReady')===true}});
    item('hmrc_ixbrl','HMRC CT600 and iXBRL filing route',fact('hmrcSoftwareReady')===true?'completed':'outstanding','Prepare the CT600, accounts and tax computation in HMRC-compatible commercial software. The joint online service closed on 31 March 2026. This preparation pack is not an iXBRL submission file.',URL.ixbrl,['hmrcSoftwareReady'],null,'Choose software before the Company Tax Return deadline',{capability:'preparation_and_mapping',officialLinks:[{title:'HMRC filing route',url:URL.ixbrl},{title:'Commercial software suppliers',url:URL.software}]});
    const csDate=fact('cs01ReviewDate'),csCurrent=date(csDate)&&csDate<=asOf&&asOf<addMonths(csDate,12);
    item('cs01','Confirmation statement (CS01)',csCurrent?confirmed('cs01Filed'):'needs_checking','Check the register and file CS01 at least every 12 months, including for a dormant company. The filing window is 14 days after the review period ends. Missing it can lead to penalties or strike-off; check your company record.',URL.cs01,['cs01ReviewDate','cs01Filed'],date(csDate)?addDays(csDate,14):null,'14 days after the confirmed review-period end; do not infer from the company accounts year');
    const identity=item('director_psc_identity','Director and PSC identity verification',fact('directorsVerified')===true&&fact('pscsVerified')===true?'completed':'needs_checking','Verify identity and link each applicable role. Directors provide personal codes with the confirmation statement; PSCs use a separate service and their own 14-day window. Check each role on the register. Do not enter personal codes into TaxMate.',URL.identity,['directorsVerified','pscsVerified','directorIdentityDueDate','pscIdentityDueDate']);
    identity.roleDeadlines=[{role:'director',status:confirmed('directorsVerified'),deadline:deadline(fact('directorIdentityDueDate'),'Date checked on the Companies House register for this director')},{role:'psc',status:confirmed('pscsVerified'),deadline:deadline(fact('pscIdentityDueDate'),'Separate PSC window checked on the register; do not copy the CS01 deadline')}];
    const inYear=(rows,key)=>rows.filter(r=>r.entityId===profile.entityId&&r.status!=='reversed'&&r.status!=='voided'&&r[key]>=figures.startDate&&r[key]<=figures.endDate);
    const salaries=inYear(input.salaryRecords||[],'payDate'),salaryEvents=(input.events||[]).filter(e=>e.status!=='reversed'&&e.sourceTransaction&&e.sourceTransaction.companyTransactionType==='director_salary'&&e.sourceTransaction.date>=figures.startDate&&e.sourceTransaction.date<=figures.endDate),salaryGap=salaryEvents.some(e=>e.status!=='committed'||!salaries.some(s=>s.sourceEventId===e.id));
    const payrollStatus=salaryGap?'needs_checking':salaries.length?(salaries.every(r=>r.payeRegistrationConfirmed===true&&(r.payrollReporting?.status||r.payeReportingStatus)==='reported_rti'&&refs(r.payrollReporting?.evidenceRefs||r.evidenceRefs))?'completed':'outstanding'):fact('noPayroll')===true?'not_applicable':'needs_checking';
    const payroll=item('paye_rti','PAYE / RTI',payrollStatus,'Check PAYE registration and report payroll using FPS on or before payday, unless an official exception applies. A recorded salary or Corporation Tax estimate does not mean RTI has been filed. Check EPS and other payroll duties where applicable.',URL.payroll,['noPayroll'],salaries.filter(s=>(s.payrollReporting?.status||s.payeReportingStatus)!=='reported_rti').map(s=>s.payDate).sort()[0], 'FPS normally on or before payday; check EPS and exceptions');
    payroll.sourceRecords.push(...salaries.map(r=>({recordId:r.id,revision:r.payrollReporting?.revision||r.revision,field:r.payrollReporting?'payrollReporting':'payeReportingStatus',evidenceRefs:r.payrollReporting?.evidenceRefs||r.evidenceRefs,basis:'payroll_record'})));
    const dividends=inYear(input.dividendDeclarations||[],'declarationDate'),dividendEvents=(input.events||[]).filter(e=>e.status!=='reversed'&&e.sourceTransaction&&e.sourceTransaction.companyTransactionType==='dividend_declaration'&&e.sourceTransaction.date>=figures.startDate&&e.sourceTransaction.date<=figures.endDate),dividendGap=dividendEvents.some(e=>e.status!=='committed'||!dividends.some(d=>d.declarationEventId===e.id));
    const documentsComplete=d=>text(d.boardApprovalEvidenceRef)&&text(d.minutesArtifactRef)&&refs(d.distributableProfitEvidenceRefs)&&Array.isArray(d.allocations)&&d.allocations.length>0&&Array.isArray(d.voucherArtifactRefs)&&d.voucherArtifactRefs.length===d.allocations.length&&new Set(d.voucherArtifactRefs).size===d.allocations.length&&d.voucherArtifactRefs.every(text);
    const dividend=item('dividend_documents','Dividend minutes and vouchers',dividendGap?'needs_checking':dividends.length?(dividends.every(documentsComplete)?'completed':'outstanding'):fact('noDividends')===true?'not_applicable':'needs_checking','Keep the board approval, meeting minutes, distributable-profit evidence and a voucher for every shareholder. Draft templates help prepare documents; generating a draft does not approve a dividend or prove it is lawful.',URL.dividend,['noDividends'],null,'Prepare and keep these with each dividend');
    dividend.sourceRecords.push(...dividends.map(d=>({recordId:d.id,revision:d.revision,field:'dividend_documents',evidenceRefs:[d.boardApprovalEvidenceRef,d.minutesArtifactRef,...(d.voucherArtifactRefs||[])].filter(Boolean),basis:'dividend_record'})));
    dividend.templates=dividends.map(d=>({declarationId:d.id,status:'draft_for_review',minutes:{companyName:profile.legalName,companyNumber:profile.companyNumber,date:d.declarationDate,totalDividend:displayFigure(d.totalDividendMinor),requiredFields:['meeting attendees','board approval and signatures','distributable-profit evidence'],existingArtifactRef:d.minutesArtifactRef||null},vouchers:(d.allocations||[]).map(a=>({companyName:profile.legalName,shareholderId:a.shareholderId,date:d.paymentDate,dividend:displayFigure(a.amountMinor),requiredFields:['shareholder name','company name','date','dividend amount'],status:'draft_for_review'}))}));
    const historicReviews=[...(profile.statutoryReviewHistory||[]),...(review?[review]:[])].filter(r=>{try{validateReview(r);return r.entityId===profile.entityId&&r.reviewedOn<=asOf;}catch(_){return false;}}),vat=vatReview({...input,asOfDate:asOf},facts,historicReviews.map(r=>r.facts));
    const vatItem=item('vat_rolling_threshold','VAT rolling 12-month review',fact('vatRegistered')===true?'unsupported':vat.exceeded?'outstanding':vat.complete?'completed':'needs_checking','Automatically totals confirmed VAT-taxable sales over rolling 12 months, including zero-rated sales. Confirm VAT classifications, tax-point dates, complete history, outside-book taxable supplies and expected next-30-day contracts. Funding and invoice payments are not counted as new sales. £80,000 is an early warning, not the legal threshold. VAT-registered company accounting needs a separate supported service.',URL.vat,Object.keys(facts).filter(k=>k.startsWith('vat')),vat.deadline,'Historical test: 30 days after crossing month-end. Future test: end of the 30-day period. An unresolved crossing does not disappear when turnover falls.',{reviewWindow:{startDate:vat.startDate,endDate:vat.endDate,complete:vat.complete},thresholdMinor:9000000,automaticReview:vat});
    vatItem.sourceRecords.push(...vat.sourceRecords,...historicReviews.filter(r=>r.facts.vatFirstExceededMonthEnd||r.facts.vatUnresolvedFutureKnownOn||r.facts.vatNext30DaysMinor?.value>9000000).map(r=>({recordId:r.id,revision:r.revision,field:'historic_VAT_crossing',basis:'preserved_evidenced_crossing',evidenceRefs:Object.values(r.facts).flatMap(f=>f.evidenceRefs)})));
    const loanRisk=figures.balanceSheet&&figures.balanceSheet.directorLoanDueMinor<0||(input.events||[]).some(e=>e.status!=='reversed'&&[...(e.reviewReasons||[]),...(e.validationReasons||[]),...(e.sourceTransaction?.companyTaxTreatment?.reasonCodes||[])].some(r=>/s455|overdrawn|loan_to_director/.test(r)));
    item('director_loan_s455','Director loan / s455',loanRisk||fact('noOverdrawnDirectorLoan')===false?'unsupported':fact('noOverdrawnDirectorLoan')===true?'not_applicable':'needs_checking','Money the company owes a director is different from money a director owes the company. Overdrawn director loans, s455, benefits and write-offs need a separate tax review. TaxMate does not calculate those cases.',URL.loan,['noOverdrawnDirectorLoan']);
    item('record_retention','Keep company accounting records',fact('recordsBackedUp')===true&&fact('retentionExceptionsChecked')===true?'completed':'outstanding','Keep your own accounting records for at least 6 years from the end of the last company financial year they relate to, longer for relevant assets, multi-period transactions, late returns or HMRC checks. This is your record-keeping duty, not a six-year TaxMate storage promise. Download records and paid reports before paid access ends.',URL.records,['recordsBackedUp','retentionExceptionsChecked'],addMonths(figures.endDate,72),'Earliest ordinary accounting-record retention date, not a deletion instruction; company minutes and other records may require longer',{deadlinePurpose:'retain_at_least_until',completionMeaning:'backup and retention review recorded; ongoing duty continues'});
    const periods=(input.periodRecords||[]).filter(p=>p.entityId===profile.entityId&&p.accountsStartDate===figures.startDate&&p.accountsEndDate===figures.endDate),returns=periods.map(p=>({periodId:p.id,status:confirmed('ct600Filed:'+p.id),deadline:deadline(findDue('company_tax_return',p.id).dueDate,'Later of return-period end + 12 months, relevant accounts-period end + 12 months (up to 18 months), and notice service + 3 months; check HMRC notices'),payment:{status:confirmed('corporationTaxPaid:'+p.id),deadline:deadline(findDue('corporation_tax_payment',p.id).dueDate,'Separate Corporation Tax payment deadline')}}));
    item('ct600_deadline','CT600 deadlines and Corporation Tax payment',returns.length&&returns.every(r=>r.status==='completed'&&r.payment.status==='completed')?'completed':'outstanding','For supported accounts periods up to 18 months, the CT600 filing deadline uses the later of the tax-period end plus 12 months and accounts-period end plus 12 months. An HMRC notice served later can extend it. Two CT600 returns can share one filing deadline; payment dates remain separate. Check each notice.', 'https://www.gov.uk/hmrc-internal-manuals/company-taxation-manual/ctm93030',periods.flatMap(p=>['ct600Filed:'+p.id,'corporationTaxPaid:'+p.id]),null,'See each Corporation Tax period below',{periods:returns});
    const lines=[...(input.accountsFiling&&input.accountsFiling.profitAndLossLines||[]),...(input.accountsFiling&&input.accountsFiling.balanceSheetLines||[]),...(input.corporationTaxReturns||[]).flatMap(r=>r.boxDetails||[])],unknownLines=lines.filter(l=>!Number.isSafeInteger(l.figureMinor));
    item('figures_need_checking','Check missing figures',lines.length&&!unknownLines.length?'completed':'needs_checking','A missing figure means Please check, never £0.00. Zero is displayed only when the calculation or recorded facts establish zero.',URL.ct600,[],null,'Resolve missing figures before entering the return',{unknownFieldIds:unknownLines.map(l=>l.id||'ct600:'+l.boxNumber)});
    accounts.eligibilityGuidance={plainEnglish:'Micro-entity size criteria require at least 2 of 3 measures, not all 3. Check the thresholds applicable to the accounting period, exclusions and qualification history before confirming eligibility.',url:'https://www.gov.uk/annual-accounts/microentities-small-and-dormant-companies'};
    dividend.blankTemplates={status:'draft_for_review',minutes:['Company name and number','Meeting date, attendees and chair','Evidence of profits available for distribution','Proposed dividend amount, share class and allocation','Board decision and signatures'],voucher:['Company name','Shareholder name','Date','Dividend amount'],completionEffect:'none'};
    // Child dates/statuses must not silently outlive their parent ruleset.
    if(stale){for(const role of identity.roleDeadlines){role.status='needs_checking';role.deadline=deadline(null,'Official guidance review expired');}for(const row of returns){row.status='needs_checking';row.deadline=deadline(null,'Official guidance review expired');row.payment.status='needs_checking';row.payment.deadline=deadline(null,'Official guidance review expired');}}
    for(const it of items){it.sourceIds=Array.from(new Set([...it.sourceIds,...it.sourceRecords.map(r=>r.recordId+(r.revision?':'+r.revision:''))]));}
    const blocking=items.filter(i=>!['completed','not_applicable'].includes(i.status));
    return{schemaVersion:1,rulesetVersion:VERSION,verifiedAt:VERIFIED_AT,reviewBy:REVIEW_BY,asOfDate:asOf,sourceFingerprint:input.sourceFingerprint,reviewStatus:valid?'current':review?'stale_or_invalid':'not_recorded',reviewRevision:review&&Number.isSafeInteger(review.revision)?review.revision:0,status: blocking.length?'needs_attention':'recorded_obligations_complete',statusDefinitions:LABELS,items,blockingItemIds:blocking.map(i=>i.id),allObligationsComplete:blocking.length===0,officialSubmissionVerified:false};
  }
  return{VERSION,VERIFIED_AT,REVIEW_BY,STATES,URL,validateFacts,validateReview,displayFigure,vatReview,build};
});

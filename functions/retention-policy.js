(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateRetentionPolicy=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=2,PAID=new Set(['plus','pro']),ACTIVE=new Set(['active','trialing']);
  const LTD_COLLECTIONS=Object.freeze(['persons','entities','companyProfiles','companyProfileRevisions','companyOwnershipVersions','projects','paymentAccounts','economicEvents','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','salesInvoices','supplierBills','fixedAssets','bankReconciliations']);
  const ACCOUNT_GROUP=Object.freeze({COMPANY_BANK:'asset',TRADE_RECEIVABLES:'asset',FIXED_ASSET_COST:'asset',ACCUMULATED_DEPRECIATION:'asset',DIRECTOR_LOAN:'liability',TRADE_PAYABLES:'liability',PAYE_NI_PAYABLE:'liability',DIVIDEND_PAYABLE:'liability',SHARE_CAPITAL:'equity',RETAINED_EARNINGS:'equity',OPERATING_EXPENSE:'expense',DEPRECIATION_EXPENSE:'expense',TRADING_INCOME:'income',DIRECTOR_SALARY_EXPENSE:'expense',EMPLOYER_NI_EXPENSE:'expense'});
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  const safeInt=value=>Number.isSafeInteger(Number(value))?Number(value):0;
  function ukDate(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
  function yearStart(now){const today=ukDate(now),year=Number(today.slice(0,4))-(today.slice(5)<'04-06'?1:0);return year+'-04-06';}
  function boundary(at){const year=Number(yearStart(at).slice(0,4))+1;return{retainThroughDate:year+'-04-05',deleteOnDate:year+'-04-06',retainUntil:Date.UTC(year,3,5,23)};}
  function paid(snapshot={},now=Date.now()){
    if(Number(snapshot.paidAccess?.plusExpiresAt)>now||Number(snapshot.paidAccess?.proExpiresAt)>now)return true;
    const projected=snapshot.promotionAccess||{};
    if(projected.plusPermanent===true||projected.proPermanent===true||Number(projected.plusExpiresAt)>now||Number(projected.proExpiresAt)>now)return true;
    if(ACTIVE.has(snapshot.subscriptionStatus)&&PAID.has(snapshot.paidTier)&&(!snapshot.currentPeriodEnd||Number(snapshot.currentPeriodEnd)>now))return true;
    if(PAID.has(snapshot.lastPaidTier)&&Number(snapshot.graceUntil)>now)return true;
    const grants=snapshot.promotions?Object.values(snapshot.promotions):snapshot.promotion?[snapshot.promotion]:[];
    return grants.some(p=>p&&p.status==='active'&&PAID.has(p.tier)&&Number(p.startsAt||0)<=now&&(p.permanent===true||p.expiresAt===null||Number(p.expiresAt)>now));
  }
  function accessEnd(snapshot={},now=Date.now()){
    const values=[snapshot.accountRetention&&snapshot.accountRetention.paidAccessEndedAt,snapshot.currentPeriodEnd,snapshot.graceUntil,snapshot.promotionAccess?.plusExpiresAt,snapshot.promotionAccess?.proExpiresAt,snapshot.paidAccess?.plusExpiresAt,snapshot.paidAccess?.proExpiresAt];
    if(snapshot.subscriptionStatus==='refunded')values[1]=snapshot.refundedAt;
    const grants=snapshot.promotions?Object.values(snapshot.promotions):snapshot.promotion?[snapshot.promotion]:[];
    for(const p of grants)if(p&&PAID.has(p.tier)&&p.expiresAt!=null)values.push(p.expiresAt);
    const ended=values.map(Number).filter(n=>Number.isFinite(n)&&n>0&&n<=now);
    if(!ended.length&&Number(snapshot.ltdArchive&&snapshot.ltdArchive.startedAt)>0)ended.push(Number(snapshot.ltdArchive.startedAt));
    return ended.length?Math.max(...ended):null;
  }
  function decide(snapshot={},now=Date.now()){
    const lifecycle=snapshot.accountRetention||{};
    if(lifecycle.purgeRequired===true&&date(lifecycle.requiredCutoffDate))return{schemaVersion:VERSION,status:'expired',cutoffDate:lifecycle.requiredCutoffDate,deleteOnDate:lifecycle.requiredCutoffDate,retainThroughDate:lifecycle.retainThroughDate||null};
    if(paid(snapshot,now))return{schemaVersion:VERSION,status:'paid',cutoffDate:null,deleteOnDate:null,retainThroughDate:null};
    const end=accessEnd(snapshot,now);
    if(!end)return{schemaVersion:VERSION,status:'needs_checking',cutoffDate:null,deleteOnDate:null,retainThroughDate:null,reason:'trusted_paid_access_end_required'};
    const dates=boundary(end),expired=ukDate(now)>=dates.deleteOnDate;
    return{schemaVersion:VERSION,status:expired?'expired':'retained',paidAccessEndedAt:end,...dates,cutoffDate:expired?dates.deleteOnDate:null};
  }
  function lifecycle(previous={},next={},now=Date.now()){
    const retention=clone(previous.accountRetention||{}),combined={...previous,...next},oldEnd=accessEnd(previous,now),nextPaid=paid(combined,now);
    // Any lapse beyond its deletion boundary stays due even if the webhook for
    // reactivation arrives before the purge worker. Verification time is not an end.
    if(nextPaid&&!paid(previous,now)&&oldEnd){const b=boundary(oldEnd);if(ukDate(now)>=b.deleteOnDate&&String(retention.lastDeletionCutoffDate||'')<b.deleteOnDate){retention.purgeRequired=true;retention.requiredCutoffDate=b.deleteOnDate;retention.retainThroughDate=b.retainThroughDate;}}
    if(!nextPaid){const end=accessEnd(combined,now);if(end){const b=boundary(end);retention.paidAccessEndedAt=end;retention.retainThroughDate=b.retainThroughDate;retention.scheduledDeletionDate=b.deleteOnDate;retention.deleteAfterAt=b.retainUntil;}else retention.dateNeedsChecking=true;}
    else if(!retention.purgeRequired){const ends=[combined.paidAccess?.plusExpiresAt,combined.paidAccess?.proExpiresAt,combined.currentPeriodEnd,combined.graceUntil,combined.promotionAccess?.plusExpiresAt,combined.promotionAccess?.proExpiresAt,...Object.values(combined.promotions||{single:combined.promotion}).filter(Boolean).map(p=>p.expiresAt)].map(Number).filter(n=>Number.isFinite(n)&&n>0),end=ends.length?Math.max(...ends):null;retention.dateNeedsChecking=!end;retention.deleteAfterAt=end?boundary(end).retainUntil:null;retention.scheduledDeletionDate=end?boundary(end).deleteOnDate:null;}
    return retention;
  }
  function validateControl(value){
    if(value==null)return null;const status=String(value.status||''),epoch=Number(value.epoch||0);
    if(value.schemaVersion!==VERSION||!['purging','complete','complete_with_warnings','failed'].includes(status)||!Number.isSafeInteger(epoch)||epoch<1||!date(value.cutoffDate)||!date(value.deleteOnDate)||value.cutoffDate!==value.deleteOnDate)throw new Error('Invalid retention control');
    return{schemaVersion:VERSION,status,epoch,cutoffDate:value.cutoffDate,deleteOnDate:value.deleteOnDate,retainThroughDate:value.retainThroughDate||null,startedAt:Number(value.startedAt)||null,completedAt:Number(value.completedAt)||null,leaseUntil:Number(value.leaseUntil)||null,warningCodes:Array.isArray(value.warningCodes)?value.warningCodes.slice():[]};
  }
  function controlWritable(value){const c=validateControl(value);return !c||['complete','complete_with_warnings'].includes(c.status);}
  function hash32(value){let h=0x811c9dc5;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
  function canonical(value){if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
  function fingerprint(value){let h=0x811c9dc5;const input=canonical(value);for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return'fnv1a32-'+h.toString(16).padStart(8,'0');}
  function eventDate(event){return event&&event.sourceTransaction&&event.sourceTransaction.date;}
  function recordDate(collection,record){
    if(collection==='economicEvents')return eventDate(record);if(collection==='companyTaxPeriods')return record.endDate;if(collection==='companyLossRecords')return record.arisingDate;if(collection==='salaryRecords')return record.payDate;if(collection==='dividendDeclarations')return record.paymentDate||record.declarationDate;if(collection==='personalIncomeLinks')return record.paymentDate;if(collection==='salesInvoices')return record.issueDate;if(collection==='supplierBills')return record.billDate;if(collection==='fixedAssets')return record.purchaseDate;if(collection==='bankReconciliations')return record.endDate;return null;
  }
  function currentBookRecord(collection,record,cutoff){
    const when=recordDate(collection,record);if(date(when)&&when>=cutoff)return true;if(['salesInvoices','supplierBills'].includes(collection))return record.status!=='voided'&&safeInt(record.outstandingMinor)>0;if(collection==='fixedAssets')return !['voided','disposed'].includes(record.status);if(collection==='companyLossRecords')return record.status==='active'&&safeInt(record.remainingMinor)>0;return false;
  }
  function companyId(collection,record,known){
    if(collection==='entities'&&record&&record.type==='limited_company')return record.id;if(record&&typeof record.entityId==='string')return record.entityId;if(record&&record.sourceTransaction&&typeof record.sourceTransaction.beneficiaryEntityId==='string')return record.sourceTransaction.beneficiaryEntityId;if(record&&record.ownerType==='entity'&&known.has(record.ownerId))return record.ownerId;if(known.size===1&&collection==='persons')return [...known][0];return null;
  }
  function profileForRetention(profile,cutoff,now,ownershipStart=cutoff){
    const next=clone(profile);delete next.profileRevisionHistory;delete next.statutoryReview;delete next.statutoryReviewHistory;
    const crossingFacts=clone(profile.retentionVatCrossings||{});for(const review of [...(profile.statutoryReviewHistory||[]),...(profile.statutoryReview?[profile.statutoryReview]:[])])for(const [key,fact]of Object.entries(review.facts||{}))if(['vatFirstExceededMonthEnd','vatUnresolvedFutureKnownOn'].includes(key)||key.startsWith('vatException:'))crossingFacts[key]=clone(fact);
    if(Object.keys(crossingFacts).length)next.retentionVatCrossings=crossingFacts;
    const timeline=(profile.ownershipHistory||[]).filter(v=>v.effectiveTo==null||v.effectiveTo>ownershipStart).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
    if(timeline.length)next.ownershipHistory=timeline.map((v,i)=>({...clone(v),version:i+1,effectiveFrom:i===0&&v.effectiveFrom<ownershipStart?ownershipStart:v.effectiveFrom,sourceRevisionId:null}));
    else if(Array.isArray(next.shareholders)&&next.shareholders.length&&Array.isArray(next.shareClasses)&&next.shareClasses.length)next.ownershipHistory=[{schemaVersion:1,id:`${next.id}:ownership:retained`,entityId:next.entityId,version:1,effectiveFrom:ownershipStart,effectiveTo:null,shareClassId:next.shareClasses[0].id,shareholders:clone(next.shareholders),evidenceRefs:[`retention:opening:${cutoff}`],sourceRevisionId:null,createdAt:now,updatedAt:now,deviceId:'server-retention'}];else delete next.ownershipHistory;
    next.retentionHistoryGap={schemaVersion:1,historyDeletedBefore:cutoff,requiresReview:true,sourceUpdatedAt:Number(profile.updatedAt)||0};next.updatedAt=now;next.deviceId='server-retention';return next;
  }
  function balanceSheet(events,entityId,cutoff){
    const balances=Object.fromEntries(Object.keys(ACCOUNT_GROUP).map(code=>[code,0])),bankBalances={};let debit=0,credit=0;
    for(const event of events||[]){if(eventDate(event)>=cutoff||event&&event.status!=='committed'||event&&event.sourceTransaction&&event.sourceTransaction.beneficiaryEntityId!==entityId)continue;for(const group of event.journals||[])for(const row of group.postings||[]){const kind=ACCOUNT_GROUP[row.accountCode];if(!kind)throw new Error('retention_unknown_ledger_account');const d=safeInt(row.debitMinor),c=safeInt(row.creditMinor);debit+=d;credit+=c;balances[row.accountCode]+=['asset','expense'].includes(kind)?d-c:c-d;if(row.accountCode==='COMPANY_BANK'){if(!row.paymentAccountId)throw new Error('retention_bank_identity_required');bankBalances[row.paymentAccountId]=(bankBalances[row.paymentAccountId]||0)+d-c;}}}
    balances.RETAINED_EARNINGS+=balances.TRADING_INCOME-balances.OPERATING_EXPENSE-balances.DEPRECIATION_EXPENSE-balances.DIRECTOR_SALARY_EXPENSE-balances.EMPLOYER_NI_EXPENSE;for(const [code,group] of Object.entries(ACCOUNT_GROUP))if(group==='income'||group==='expense')delete balances[code];return{balances,bankBalances,debit,credit,balanced:debit===credit};
  }
  function openingEnvelope(entityId,paymentAccounts,events,cutoff,now){
    const ledger=balanceSheet(events,entityId,cutoff),nonzero=Object.entries(ledger.balances).filter(([code,amount])=>code!=='COMPANY_BANK'&&amount!==0).map(([code,amount])=>[code,amount,null]).concat(Object.entries(ledger.bankBalances).filter(([,amount])=>amount!==0).map(([id,amount])=>['COMPANY_BANK',amount,id]));if(!nonzero.length)return{record:null,warning:null};
    const token=hash32(entityId),factId=`retention-opening:${token}:${cutoff}`,eventId='company-event:'+factId,sourceId='company-source:'+factId,allocationId='company-allocation:'+factId,journalId='company-journal:'+factId,bank=(paymentAccounts||[]).find(a=>a.ownerType==='entity'&&a.ownerId===entityId);const postings=[];let sequence=0,totalDebit=0,totalCredit=0;
    for(const [code,amount,paymentAccountId] of nonzero){const group=ACCOUNT_GROUP[code],debitMinor=['asset','expense'].includes(group)?Math.max(amount,0):Math.max(-amount,0),creditMinor=['asset','expense'].includes(group)?Math.max(-amount,0):Math.max(amount,0);sequence++;totalDebit+=debitMinor;totalCredit+=creditMinor;const row={id:`${journalId}:${code}:${sequence}`,journalEntryId:journalId,entityId,sourceTransactionId:sourceId,allocationId,accountCode:code,debitMinor,creditMinor};if(code==='COMPANY_BANK')row.paymentAccountId=paymentAccountId;postings.push(row);}
    if(totalDebit!==totalCredit||!ledger.balanced)return{record:null,warning:'retention_opening_balance_needs_checking'};
    const source={id:sourceId,economicEventId:eventId,kind:'adjustment',date:cutoff,amountMinor:totalDebit,currency:'GBP',beneficiaryEntityId:entityId,purpose:'Opening balances carried forward after expired history was deleted',companyTransactionType:'opening_balance',openingBalances:{accountBalances:clone(ledger.balances),historyDeletedBefore:cutoff},evidenceRefs:[]};
    const record={id:eventId,idempotencyKey:`company-ledger:${factId}:1`,status:'committed',revision:1,sourceTransaction:source,allocations:[{id:allocationId,sourceTransactionId:sourceId,entityId,scope:'business',treatmentStatus:'supported',amountMinor:totalDebit,category:'opening_balance'}],journals:[{journal:{id:journalId,entityId,economicEventId:eventId,sourceTransactionId:sourceId,allocationIds:[allocationId],status:'posted',revision:1,accountingRuleVersion:'uk-company-ledger.2026-08-22.1'},postings}],origin:'company_v1_5',ledgerSchemaVersion:1,accountingRuleVersion:'uk-company-ledger.2026-08-22.1',validationStatus:'server_validated',treatmentDecision:{status:'accounting_supported',taxTreatmentStatus:'unassessed',basis:'opening_balance_confirmed'},sourceSignature:canonical(['retention_opening',entityId,cutoff,ledger.balances]),createdAt:now,updatedAt:now,deviceId:'server-retention'};return{record,warning:null};
  }
  function transformDomain(source,cutoff,now,warnings){
    const domain=clone(source||{}),known=new Set((domain.entities||[]).filter(e=>e.type==='limited_company').map(e=>e.id)),events=domain.economicEvents||[],accounts=domain.paymentAccounts||[],keepCompanies=new Set(),requiredEvents=new Set();
    const current={};
    for(const c of ['companyTaxPeriods','salaryRecords','dividendDeclarations','salesInvoices','supplierBills','fixedAssets','bankReconciliations'])current[c]=(domain[c]||[]).filter(r=>currentBookRecord(c,r,cutoff)||(c==='dividendDeclarations'&&r.status==='declared'));
    for(const r of events)if(date(eventDate(r))&&eventDate(r)>=cutoff){const id=companyId('economicEvents',r,known);if(known.has(id))keepCompanies.add(id);requiredEvents.add(r.id);}
    for(const c of Object.keys(current))for(const r of current[c])if(known.has(r.entityId))keepCompanies.add(r.entityId);
    for(const r of domain.companyLossRecords||[])if(r.status==='active'&&r.remainingMinor>0)keepCompanies.add(r.entityId);
    for(const r of domain.companyProfiles||[])if(Number(r.createdAt)>=Date.parse(cutoff+'T00:00:00+01:00'))keepCompanies.add(r.entityId);
    const eventIds=new Set(events.map(r=>r.id));
    function dependencies(value){if(typeof value==='string'&&eventIds.has(value))requiredEvents.add(value);else if(Array.isArray(value))value.forEach(dependencies);else if(value&&typeof value==='object')Object.values(value).forEach(dependencies);}
    Object.values(current).forEach(dependencies);
    let size=-1;while(size!==requiredEvents.size){size=requiredEvents.size;for(const e of events)if(requiredEvents.has(e.id))dependencies(e);}
    const openings=[];
    for(const id of keepCompanies){const opening=openingEnvelope(id,accounts,events.filter(e=>!requiredEvents.has(e.id)),cutoff,now);if(opening.warning)throw new Error(opening.warning);if(opening.record)openings.push(opening.record);}
    domain.entities=(domain.entities||[]).filter(r=>r.type!=='limited_company'||keepCompanies.has(r.id));
    domain.companyProfiles=(domain.companyProfiles||[]).filter(r=>keepCompanies.has(r.entityId)).map(r=>profileForRetention(r,cutoff,now,current.dividendDeclarations.filter(d=>d.entityId===r.entityId).reduce((start,d)=>d.declarationDate<start?d.declarationDate:start,cutoff)));
    domain.projects=(domain.projects||[]).filter(r=>!known.has(r.entityId)||keepCompanies.has(r.entityId));
    domain.paymentAccounts=accounts.filter(r=>r.ownerType!=='entity'||!known.has(r.ownerId)||keepCompanies.has(r.ownerId));
    domain.economicEvents=events.filter(r=>{const id=companyId('economicEvents',r,known);return known.has(id)?keepCompanies.has(id)&&requiredEvents.has(r.id):!date(eventDate(r))||eventDate(r)>=cutoff;}).concat(openings).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    for(const c of Object.keys(current))domain[c]=current[c].filter(r=>keepCompanies.has(r.entityId));
    const periods=new Set(domain.companyTaxPeriods.map(r=>r.id));
    domain.companyLossRecords=(domain.companyLossRecords||[]).filter(r=>keepCompanies.has(r.entityId)&&(r.status==='active'||periods.has(r.sourcePeriodId)||(r.uses||[]).some(u=>periods.has(u.periodId)))).map(r=>{
      const next=clone(r),uses=(r.uses||[]).filter(u=>periods.has(u.periodId));next.uses=uses;next.usedMinor=uses.reduce((n,u)=>n+u.amountMinor,0);next.amountMinor=next.usedMinor+next.remainingMinor;
      if(!periods.has(next.sourcePeriodId)){next.sourcePeriodId=null;next.sourceKind='opening_confirmed';next.arisingDate=cutoff;next.evidenceRefs=[];next.retentionHistoryGap={historyDeletedBefore:cutoff,requiresReview:true};}
      // Preserve the recorded confirmation; never manufacture one during deletion.
      if(next.sameTradeConfirmed!==true)throw new Error('retention_loss_confirmation_required');
      next.revision=1;delete next.previousRevisionId;next.updatedAt=now;next.deviceId='server-retention';return next;
    });
    const losses=new Map(domain.companyLossRecords.map(r=>[r.id,r]));for(const p of domain.companyTaxPeriods)p.lossRecordIds=(p.lossRecordIds||[]).filter(id=>{const r=losses.get(id);return r&&(r.sourcePeriodId===p.id||r.uses.some(u=>u.periodId===p.id));});
    const sourceIds=new Set([...domain.salaryRecords,...domain.dividendDeclarations].map(r=>r.id));
    domain.personalIncomeLinks=(domain.personalIncomeLinks||[]).filter(r=>keepCompanies.has(r.entityId)&&sourceIds.has(r.sourceRecordId));
    domain.migrationIssues=(domain.migrationIssues||[]).filter(r=>!date(r.date)||r.date>=cutoff);domain.syncConflicts=[];domain.updatedAt=now;domain.deviceId='server-retention';return domain;
  }
  function apply(state,planValue,now=Date.now()){
    const next=clone(state),policy=planValue&&planValue.policy||{},cutoff=policy.cutoffDate;if(!cutoff)return next;const warnings=planValue.warnings||[];next.entries=(next.entries||[]).filter(e=>!date(e.date)||e.date>=cutoff);next.tombstones=(next.tombstones||[]).filter(e=>!date(e.date)||e.date>=cutoff);
    for(const key of Object.keys(next.yearData||{}))if(/^\d{4}-\d{2}$/.test(key)&&Number(key.slice(0,4))<Number(cutoff.slice(0,4)))delete next.yearData[key];next.metaVersions=next.metaVersions||{};for(const key of Object.keys(next.metaVersions))if(key.startsWith('yearData:')&&Number(key.slice(9,13))<Number(cutoff.slice(0,4)))next.metaVersions[key]={updatedAt:now,deviceId:'server-retention',deletedAt:now};
    next.obReview=(next.obReview||[]).filter(id=>(next.entries||[]).some(e=>e.id===id));next.domain=transformDomain(next.domain,cutoff,now,warnings);next.retention={schemaVersion:VERSION,epoch:Number(planValue.epoch)||Number(next.retention&&next.retention.epoch)||0,historyIncomplete:true,historyDeletedBefore:cutoff,cutoffDate:cutoff,deleteOnDate:policy.deleteOnDate||cutoff,appliedAt:now,warningCodes:[...new Set(warnings.map(w=>w.code))]};return next;
  }
  function recordsForCloud(state){
    const domain=state&&state.domain||{},known=new Set((domain.entities||[]).filter(e=>e.type==='limited_company').map(e=>e.id)),out=Object.fromEntries(LTD_COLLECTIONS.map(c=>[c,[]]));out.entities=(domain.entities||[]).filter(e=>known.has(e.id));out.persons=known.size?(domain.persons||[]).filter(p=>p.id==='person:account-holder'):[];
    for(const p of domain.companyProfiles||[]){if(!known.has(p.entityId))continue;const base=clone(p),revisions=base.profileRevisionHistory||[],ownership=base.ownershipHistory||[];delete base.profileRevisionHistory;delete base.ownershipHistory;out.companyProfiles.push(base);out.companyProfileRevisions.push(...revisions.map(r=>({...clone(r),entityId:p.entityId,profileId:p.id})));out.companyOwnershipVersions.push(...ownership.map(r=>({...clone(r),entityId:p.entityId,profileId:p.id})));}
    for(const c of ['projects','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','salesInvoices','supplierBills','fixedAssets','bankReconciliations'])out[c]=(domain[c]||[]).filter(r=>known.has(r.entityId));out.paymentAccounts=(domain.paymentAccounts||[]).filter(r=>known.has(r.ownerId)||known.size&&r.ownerType==='person'&&r.ownerId==='person:account-holder');out.economicEvents=(domain.economicEvents||[]).filter(r=>r.origin==='company_v1_5'&&known.has(r.sourceTransaction&&r.sourceTransaction.beneficiaryEntityId));return out;
  }
  function docId(recordId){const bytes=typeof TextEncoder!=='undefined'?new TextEncoder().encode(String(recordId)):Buffer.from(String(recordId)),raw=typeof Buffer!=='undefined'?Buffer.from(bytes).toString('base64'):btoa(String.fromCharCode(...bytes));return raw.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function envelope(collection,record,entityId,epoch){if(!entityId)throw new Error('Retention record company identity is ambiguous');return{schemaVersion:1,companyId:entityId,collection,documentId:docId(record.id),recordId:record.id,revision:safeInt(record.revision),updatedAt:Number(record.deletedAt||record.updatedAt||record.createdAt||0),deviceId:String(record.deviceId||'server-retention'),deletedAt:record.deletedAt==null?null:Number(record.deletedAt),payload:clone(record),checksum:fingerprint(record),retentionEpoch:Number(epoch)||0};}
  function cloudChanges(before,after,epoch){
    const old=recordsForCloud(before),next=recordsForCloud(after),deletes={},upserts={},known=new Set((after.domain&&after.domain.entities||[]).filter(e=>e.type==='limited_company').map(e=>e.id));for(const collection of LTD_COLLECTIONS){const a=new Map(old[collection].map(r=>[r.id,r])),b=new Map(next[collection].map(r=>[r.id,r]));deletes[collection]=[...a.keys()].filter(id=>!b.has(id));upserts[collection]=[...b.values()].filter(r=>!a.has(r.id)||fingerprint(a.get(r.id))!==fingerprint(r)).map(r=>envelope(collection,r,companyId(collection,r,known),epoch));}return{deletes,upserts};
  }
  function plan(state,snapshot,now=Date.now()){
    const policy=decide(snapshot,now),cutoff=policy.cutoffDate,result={schemaVersion:VERSION,policy,deleteEntryIds:[],deleteYearKeys:[],receiptPaths:[],warningCodes:[],warnings:[],blockers:[]};if(!cutoff)return result;for(const e of state.entries||[])if(date(e.date)&&e.date<cutoff){result.deleteEntryIds.push(e.id);if(typeof e.receiptPath==='string')result.receiptPaths.push(e.receiptPath);}result.deleteYearKeys=Object.keys(state.yearData||{}).filter(k=>/^\d{4}-\d{2}$/.test(k)&&Number(k.slice(0,4))<Number(cutoff.slice(0,4)));const next=apply(state,{schemaVersion:VERSION,policy,warnings:result.warnings,epoch:null},now),changes=cloudChanges(state,next,0);result.deleteLtdRecordIds=changes.deletes;result.upsertLtdRecords=changes.upserts;result.warningCodes=[...new Set(result.warnings.map(w=>w.code))];return result;
  }
  function applyControl(state,control,now=Date.now()){const c=validateControl(control);if(!c||!['complete','complete_with_warnings'].includes(c.status)||Number(state.retention&&state.retention.epoch)>=c.epoch)return clone(state);return apply(state,{schemaVersion:VERSION,policy:{cutoffDate:c.cutoffDate,deleteOnDate:c.deleteOnDate},warnings:(c.warningCodes||[]).map(code=>({code})),epoch:c.epoch},now);}
  function restoreState(state,control,{paidAccess=false,now=Date.now()}={}){const c=validateControl(control),next=clone(state);if(!c)return{state:next,omittedExpiredHistory:false};if(!controlWritable(c))throw new Error('retention_restore_paused');if(paidAccess){next.retention={...next.retention,epoch:c.epoch};return{state:next,omittedExpiredHistory:false};}delete next.retention;return{state:applyControl(next,c,now),omittedExpiredHistory:true};}
  return{VERSION,LTD_COLLECTIONS,ukDate,yearStart,boundary,paid,accessEnd,decide,lifecycle,validateControl,controlWritable,recordDate,plan,apply,applyControl,restoreState,recordsForCloud,cloudChanges,docId,envelope,fingerprint};
});

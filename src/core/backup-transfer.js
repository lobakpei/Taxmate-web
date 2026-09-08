(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./retention-policy'):root.TaxMateRetentionPolicy,node?require('./company-access'):root.TaxMateCompanyAccess,node?require('./company-books'):root.TaxMateCompanyBooks,node?require('../integration/ltd/company-state'):root.TaxMateCompanyState);if(node)module.exports=api;root.TaxMateBackupTransfer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Policy,Access,Books,State){
  'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
  function project(state,{snapshot={},control=null,now=Date.now(),restoring=false}={}){
    if(!Policy.controlWritable(control))throw new Error('retention_transfer_paused');
    let next=clone(state),omittedExpiredHistory=false;const policy=Policy.decide(snapshot,now);
    if(restoring&&control){const result=Policy.restoreState(next,control,{paidAccess:Policy.paid(snapshot,now),now});next=result.state;omittedExpiredHistory=result.omittedExpiredHistory;}
    else if(policy.status==='expired'){next=Policy.apply(next,{policy,epoch:control&&control.epoch,warnings:[]},now);omittedExpiredHistory=true;}
    const domain=next.domain||{},ids=new Set((domain.entities||[]).filter(e=>e.type==='limited_company').map(e=>e.id)),allowed=Access.decide({action:'full_backup',snapshot,now,hasExistingLtdData:ids.size>0}).allowed,omittedLtd=ids.size>0&&!allowed;
    if(omittedLtd){domain.entities=domain.entities.filter(e=>!ids.has(e.id));domain.projects=(domain.projects||[]).filter(r=>!ids.has(r.entityId));domain.paymentAccounts=(domain.paymentAccounts||[]).filter(r=>!ids.has(r.ownerId));domain.economicEvents=(domain.economicEvents||[]).filter(r=>!ids.has(r.sourceTransaction&&r.sourceTransaction.beneficiaryEntityId));for(const c of ['companyProfiles','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','salesInvoices','supplierBills','fixedAssets','bankReconciliations'])domain[c]=[];}
    next=State.migrate(next,now,'backup-transfer');State.validateState(next);return{state:next,omittedLtd,omittedExpiredHistory,notice:omittedLtd||omittedExpiredHistory?'This backup includes eligible records only. Expired or unavailable LTD history is excluded; ordinary records remain available.':''};
  }
  function input(state,profile){const d=state.domain;return{profile,events:d.economicEvents.filter(e=>e.sourceTransaction?.beneficiaryEntityId===profile.entityId),...Object.fromEntries([['periodRecords','companyTaxPeriods'],['salaryRecords','salaryRecords'],['dividendDeclarations','dividendDeclarations'],['salesInvoices','salesInvoices'],['supplierBills','supplierBills'],['fixedAssets','fixedAssets'],['bankReconciliations','bankReconciliations']].map(([k,c])=>[k,(d[c]||[]).filter(r=>r.entityId===profile.entityId)]))};}
  function relocate(state,mapping){
    const current=new Set((state.domain.companyProfiles||[]).filter(p=>p.statutoryReview&&p.statutoryReview.sourceFingerprint===Books.statutoryFingerprint(input(state,p))).map(p=>p.id));
    function walk(value){if(typeof value==='string'){if(mapping[value])return mapping[value].path; if((value.startsWith('[')||value.startsWith('{'))&&Object.keys(mapping).some(p=>value.includes(p)))try{return JSON.stringify(walk(JSON.parse(value)));}catch(_){}return value;}if(Array.isArray(value))return value.map(walk);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)]));return value;}
    const next=walk(state);for(const entry of next.entries||[]){const source=(state.entries||[]).find(e=>e.id===entry.id),m=source&&mapping[source.receiptPath||source.receiptUrl];if(m){entry.receiptPath=m.path;entry.receiptUrl=m.url;}}
    // ZIP hashes prove that relocation changed the address, not the evidence.
    // Only previously current reviews are rebound; stale reviews stay stale.
    for(const p of next.domain.companyProfiles||[])if(current.has(p.id))p.statutoryReview.sourceFingerprint=Books.statutoryFingerprint(input(next,p));
    State.validateState(next);return next;
  }
  return{project,relocate};
});

(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateCompanyEvidence=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value)),isReceiptPath=value=>typeof value==='string'&&/^receipts\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(value),push=(rows,recordType,recordId,refs)=>{for(const ref of refs||[])if(isReceiptPath(ref))rows.push({recordType,recordId,originalPath:ref});};
  function requiredReceiptAssociations(state){const domain=state&&state.domain||{},rows=[];for(const event of domain.economicEvents||[])push(rows,'economic_event',event.id,event.sourceTransaction&&event.sourceTransaction.evidenceRefs);for(const record of domain.salaryRecords||[])push(rows,'salary_record',record.id,record.evidenceRefs);for(const record of domain.dividendDeclarations||[]){push(rows,'dividend_declaration',record.id,record.distributableProfitEvidenceRefs);push(rows,'dividend_declaration',record.id,[record.boardApprovalEvidenceRef,record.minutesArtifactRef,...(record.voucherArtifactRefs||[])]);}for(const profile of domain.companyProfiles||[]){for(const revision of profile.profileRevisionHistory||[])push(rows,'company_profile_revision',revision.id,revision.evidenceRefs);for(const version of profile.ownershipHistory||[])push(rows,'ownership_version',version.id,version.evidenceRefs);}return rows.sort((a,b)=>a.originalPath.localeCompare(b.originalPath)||a.recordType.localeCompare(b.recordType)||a.recordId.localeCompare(b.recordId));}
  function replaceReceiptReference(state,association,newPath){const next=clone(state),domain=next.domain||{},replace=refs=>(refs||[]).map(ref=>ref===association.originalPath?newPath:ref),recordType=association.recordType,id=association.recordId;if(recordType==='economic_event'){const record=(domain.economicEvents||[]).find(item=>item.id===id);if(record&&record.sourceTransaction)record.sourceTransaction.evidenceRefs=replace(record.sourceTransaction.evidenceRefs);}else if(recordType==='salary_record'){const record=(domain.salaryRecords||[]).find(item=>item.id===id);if(record)record.evidenceRefs=replace(record.evidenceRefs);}else if(recordType==='dividend_declaration'){const record=(domain.dividendDeclarations||[]).find(item=>item.id===id);if(record){record.distributableProfitEvidenceRefs=replace(record.distributableProfitEvidenceRefs);record.voucherArtifactRefs=replace(record.voucherArtifactRefs);for(const field of ['boardApprovalEvidenceRef','minutesArtifactRef'])if(record[field]===association.originalPath)record[field]=newPath;}}else if(recordType==='company_profile_revision'){for(const profile of domain.companyProfiles||[]){const record=(profile.profileRevisionHistory||[]).find(item=>item.id===id);if(record)record.evidenceRefs=replace(record.evidenceRefs);}}else if(recordType==='ownership_version'){for(const profile of domain.companyProfiles||[]){const record=(profile.ownershipHistory||[]).find(item=>item.id===id);if(record)record.evidenceRefs=replace(record.evidenceRefs);}}return next;}
  function reviewRecords(state){
    const rows=[],domain=state.domain||{};
    for(const profile of domain.companyProfiles||[])for(const review of [...(profile.statutoryReviewHistory||[]),...(profile.statutoryReview?[profile.statutoryReview]:[])])rows.push({type:'statutory_review',id:review.id+':'+review.revision,record:review});
    for(const salary of domain.salaryRecords||[])for(const report of [...(salary.payrollReportingHistory||[]),...(salary.payrollReporting?[salary.payrollReporting]:[])])rows.push({type:'payroll_reporting',id:salary.id+':rti:'+report.revision,record:report});
    return rows;
  }
  function allRequiredReceiptAssociations(state){
    const rows=requiredReceiptAssociations(state);
    for(const row of reviewRecords(state)){
      const refs=row.type==='statutory_review'?Object.values(row.record.facts||{}).flatMap(f=>f.evidenceRefs||[]):row.record.evidenceRefs;
      push(rows,row.type,row.id,refs);
    }
    return [...new Map(rows.map(row=>[row.recordType+'|'+row.recordId+'|'+row.originalPath,row])).values()].sort((a,b)=>a.originalPath.localeCompare(b.originalPath)||a.recordType.localeCompare(b.recordType)||a.recordId.localeCompare(b.recordId));
  }
  function replaceAllReceiptReferences(state,association,newPath){
    const next=replaceReceiptReference(state,association,newPath);
    for(const row of reviewRecords(next))if(row.type===association.recordType&&row.id===association.recordId){
      if(row.type==='statutory_review')for(const fact of Object.values(row.record.facts||{}))fact.evidenceRefs=(fact.evidenceRefs||[]).map(ref=>ref===association.originalPath?newPath:ref);
      else row.record.evidenceRefs=(row.record.evidenceRefs||[]).map(ref=>ref===association.originalPath?newPath:ref);
    }
    return next;
  }
  return{isReceiptPath,requiredReceiptAssociations:allRequiredReceiptAssociations,replaceReceiptReference:replaceAllReceiptReferences};
});

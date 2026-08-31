(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./money'):root.TaxMateMoney,node?require('./domain-schema'):root.TaxMateDomain,node?require('./partnership'):root.TaxMatePartnership,node?require('./company-profile'):root.TaxMateCompanyProfile);
  if(node) module.exports=api;
  root.TaxMateDomainMigration=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money,Domain,Partnership,CompanyProfile){
  'use strict';
  if(!Money||!Domain||!Partnership||!CompanyProfile) throw new Error('TaxMate domain migration dependencies are required');
  const PROJECTION_VERSION=6,clone=value=>JSON.parse(JSON.stringify(value));
  function emptyDomain(now,deviceId){const stamp=Number(now)||Date.now();return{schemaVersion:Domain.DOMAIN_SCHEMA_VERSION,projectionVersion:PROJECTION_VERSION,migrationStatus:'complete',migratedAt:stamp,updatedAt:stamp,deviceId:deviceId||'legacy-migration',persons:[],entities:[],companyProfiles:[],projects:[],paymentAccounts:[],economicEvents:[],companyTaxPeriods:[],companyLossRecords:[],salaryRecords:[],dividendDeclarations:[],personalIncomeLinks:[],migrationIssues:[],syncConflicts:[]};}
  function latestLegacyRecords(entries,tombstones){
    const map=new Map(),compare=(left,right)=>{
      const time=(Number(left.updatedAt)||0)-(Number(right.updatedAt)||0);if(time)return time;
      const device=String(left.deviceId||'').localeCompare(String(right.deviceId||''));if(device)return device;
      return JSON.stringify(left).localeCompare(JSON.stringify(right));
    };
    for(const record of [...(entries||[]),...(tombstones||[])]){if(!record||!record.id)continue;const old=map.get(record.id);if(!old||compare(old,record)<0)map.set(record.id,record);}
    return Array.from(map.values()).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  }
  function sourceSignature(entry,entityId,amountMinor,treatmentStatus,basis){return JSON.stringify([entry.kind,entry.date,amountMinor,entityId,entry.cat||null,entry.note||null,entry.pct==null?null:entry.pct,entry.deletedAt||null,entry.updatedAt||null,entry.deviceId||null,treatmentStatus,basis]);}
  function reconcileLegacyState(state,options={}){
    const now=Number(options.now)||Date.now(),deviceId=options.deviceId||'legacy-migration',provenance=options.partnershipProvenance||'current_app';
    const prior=state.domain&&typeof state.domain==='object'?clone(state.domain):emptyDomain(now,deviceId),domain=emptyDomain(prior.migratedAt||now,prior.deviceId||deviceId);
    domain.updatedAt=now;domain.sourceStateSchemaVersion=Number(options.sourceStateSchemaVersion)||5;
    domain.persons=(prior.persons||[]).filter(record=>record.origin!=='legacy_v5');
    if(!domain.persons.some(person=>person.id==='person:account-holder'))domain.persons.push({id:'person:account-holder',accountUid:null,origin:'legacy_v5'});
    const priorEntities=new Map((prior.entities||[]).map(entity=>[entity.id,entity])),legacyEntityIds=new Set();
    domain.entities=(prior.entities||[]).filter(entity=>entity.origin!=='legacy_v5');
    domain.companyProfiles=(prior.companyProfiles||[]).map(profile=>CompanyProfile.normalize(profile));
    domain.companyTaxPeriods=(prior.companyTaxPeriods||[]).map(clone);domain.companyLossRecords=(prior.companyLossRecords||[]).map(clone);domain.salaryRecords=(prior.salaryRecords||[]).map(clone);domain.dividendDeclarations=(prior.dividendDeclarations||[]).map(clone);domain.personalIncomeLinks=(prior.personalIncomeLinks||[]).map(clone);
    const businesses=(state.businesses||[]).map(original=>{
      const business=clone(original),type=business.structure==='partnership'?'partnership':'sole_trade';
      if(type==='partnership'){const confirmedShare=Partnership.sharePercent(business);business.share=confirmedShare||50;business.partnershipAmountBasis=confirmedShare==null?Partnership.UNCONFIRMED:Partnership.normalizedBasis(business,provenance);business.partnershipBasisSource=business.partnershipAmountBasis===Partnership.UNCONFIRMED?'unknown_legacy_import':(business.partnershipBasisSource||'taxmate_v5_contract');}
      else{delete business.partnershipAmountBasis;delete business.partnershipBasisSource;}
      const id='entity:'+business.id,basis=type==='partnership'?business.partnershipAmountBasis:undefined,old=priorEntities.get(id);
      const entity={id,name:business.name,type,currency:'GBP',legacyBusinessId:business.id,origin:'legacy_v5',createdAt:Number(old&&old.createdAt)||Number(business.createdAt)||now,updatedAt:Number(business.updatedAt)||now,deviceId:business.deviceId||deviceId};
      if(basis){entity.partnershipAmountBasis=basis;entity.userProfitSharePercent=business.share;entity.userProfitShareSource='business.share';}
      Domain.validateLegalEntity(entity);domain.entities.push(entity);legacyEntityIds.add(id);return business;
    });
    const businessMap=new Map(businesses.map(business=>[business.id,business]));
    domain.projects=(prior.projects||[]).filter(record=>record.origin!=='legacy_v5'||legacyEntityIds.has(record.entityId));domain.paymentAccounts=(prior.paymentAccounts||[]).filter(record=>record.origin!=='legacy_v5');
    const priorEvents=new Map((prior.economicEvents||[]).map(event=>[event.id,event]));domain.economicEvents=(prior.economicEvents||[]).filter(event=>event.origin!=='legacy_v5');domain.migrationIssues=[];
    for(const entry of latestLegacyRecords(state.entries,state.tombstones)){
      const business=businessMap.get(entry.bizId||entry.businessId);if(!business){domain.migrationIssues.push({id:'legacy-entry:'+entry.id,recordType:'entry',recordId:entry.id,code:'missing_business'});continue;}
      let amountMinor;try{amountMinor=Money.poundsToMinorExact(entry.amount);}catch(_){domain.migrationIssues.push({id:'legacy-entry:'+entry.id,recordType:'entry',recordId:entry.id,code:'amount_precision_review_required'});continue;}
      if(amountMinor<0){domain.migrationIssues.push({id:'legacy-entry:'+entry.id,recordType:'entry',recordId:entry.id,code:'negative_legacy_amount'});continue;}
      const entityId='entity:'+business.id,unconfirmed=business.structure==='partnership'&&business.partnershipAmountBasis===Partnership.UNCONFIRMED,treatmentStatus=unconfirmed?'review_required':'supported';
      let businessPercent=100;if(entry.kind==='expense'&&entry.pct!=null){businessPercent=Number(entry.pct);if(!Number.isSafeInteger(businessPercent)||businessPercent<0||businessPercent>100){domain.migrationIssues.push({id:'legacy-entry:'+entry.id,recordType:'entry',recordId:entry.id,code:'business_use_percentage_review_required'});continue;}}
      const eventId='legacy-event:'+entry.id,existing=priorEvents.get(eventId),signature=sourceSignature(entry,entityId,amountMinor,treatmentStatus,business.partnershipAmountBasis),revision=existing&&existing.sourceSignature===signature?existing.revision:Math.max(1,Number(existing&&existing.revision)||0)+(existing?1:0);
      const source={id:'legacy-source:'+entry.id,economicEventId:eventId,kind:entry.kind,date:entry.date,amountMinor,currency:'GBP',beneficiaryEntityId:entityId};if(entry.note)source.purpose=entry.note;
      const portions=Money.allocateMinor(amountMinor,[businessPercent,100-businessPercent]),allocations=[];
      if(portions[0]>0||amountMinor===0){const allocation={id:'legacy-allocation:'+entry.id,sourceTransactionId:source.id,entityId,scope:'business',treatmentStatus,amountMinor:portions[0]};if(entry.cat)allocation.category=entry.cat;if(unconfirmed)allocation.reasonCode='partnership_basis_confirmation_required';allocations.push(allocation);}
      if(portions[1]>0){const privateAllocation={id:'legacy-allocation-private:'+entry.id,sourceTransactionId:source.id,entityId,scope:'private',treatmentStatus:'record_only',amountMinor:portions[1],reasonCode:'legacy_business_use_percentage'};if(entry.cat)privateAllocation.category=entry.cat;allocations.push(privateAllocation);}
      const deleted=entry.deletedAt!=null,event={id:eventId,idempotencyKey:'legacy-entry:'+entry.id+':'+revision,status:deleted?'reversed':'committed',revision,sourceTransaction:source,allocations,journals:[],origin:'legacy_v5',legacyEntryId:entry.id,sourceUpdatedAt:Number(entry.updatedAt)||0,sourceSignature:signature,createdAt:Number(existing&&existing.createdAt)||Number(entry.createdAt)||now,updatedAt:Number(entry.updatedAt)||now,deviceId:entry.deviceId||deviceId};
      if(deleted)event.reversalEventId='legacy-tombstone:'+entry.id+':'+(Number(entry.deletedAt)||event.updatedAt);
      Domain.validateEconomicEventEnvelope(event);domain.economicEvents.push(event);
    }
    domain.entities.sort((a,b)=>a.id.localeCompare(b.id));domain.economicEvents.sort((a,b)=>a.id.localeCompare(b.id));domain.syncConflicts=Array.isArray(prior.syncConflicts)?prior.syncConflicts:[];
    const unconfirmed=businesses.filter(b=>b.structure==='partnership'&&b.partnershipAmountBasis==='legacy_unconfirmed').map(b=>b.id);domain.partnershipConfirmationRequired=unconfirmed;domain.companyProfileReviewRequired=domain.companyProfiles.filter(profile=>profile.deletedAt==null&&profile.assessmentStatus!=='supported_profile').map(profile=>profile.id);domain.companyTaxReviewRequired=domain.companyTaxPeriods.filter(period=>period.status!=='supported_calculated').map(period=>period.id);domain.migrationStatus=domain.migrationIssues.length||unconfirmed.length||domain.companyProfileReviewRequired.length||domain.companyTaxReviewRequired.length||domain.syncConflicts.length?'review_required':'complete';
    return{businesses,domain};
  }
  return{PROJECTION_VERSION,emptyDomain,reconcileLegacyState};
});

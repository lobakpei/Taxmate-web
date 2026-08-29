(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('../../core/state-schema'):root.TaxMateState,node?require('../../core/domain-schema'):root.TaxMateDomain,node?require('../../core/domain-migration'):root.TaxMateDomainMigration);
  if(node)module.exports=api;root.TaxMateCompanyState=api;root.TaxMateState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ProductionState,Domain,DomainMigration){
  'use strict';
  if(!ProductionState||!Domain||!DomainMigration)throw new Error('TaxMate company-state dependencies are required');
  const COMPANY_STATE_SCHEMA_VERSION=8,COMPANY_EXPORT_SCHEMA_VERSION=5;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  function validOriginalMigration(value){return value&&value.schemaVersion===1&&value.toCompanyStateSchemaVersion===COMPANY_STATE_SCHEMA_VERSION&&value.atomicBoundary==='repository_replace'&&value.rollbackSnapshotRequired===true;}
  function migrate(input,now,deviceId,options={}){
    if(input&&Number(input.v||1)>Number(ProductionState.STATE_SCHEMA_VERSION))throw Object.assign(new Error('Future TaxMate state schema is not supported'),{code:'future-state-schema'});
    if(input&&Number(input.companyStateSchemaVersion||0)>COMPANY_STATE_SCHEMA_VERSION)throw Object.assign(new Error('Future company state schema is not supported'),{code:'future-company-state-schema'});
    if(input&&input.domain&&Number(input.domain.schemaVersion||0)>Number(Domain.DOMAIN_SCHEMA_VERSION))throw Object.assign(new Error('Future Ltd domain schema is not supported'),{code:'future-domain-schema'});
    const original=clone(input||{}),source=ProductionState.migrate(input,now,deviceId),stamp=Number(now)||Date.now(),productionNoChange=same(source,original);
    const projection=DomainMigration.reconcileLegacyState(source,{now:stamp,deviceId:deviceId||'company-domain-migration',sourceStateSchemaVersion:Number(input&&input.v||1),partnershipProvenance:options.partnershipProvenance||'current_app'});
    const alreadyCurrent=Number(original.v)===Number(ProductionState.STATE_SCHEMA_VERSION)&&Number(original.companyStateSchemaVersion)===COMPANY_STATE_SCHEMA_VERSION&&Number(original.domain&&original.domain.schemaVersion)===Number(Domain.DOMAIN_SCHEMA_VERSION)&&Number(original.domain&&original.domain.projectionVersion)===Number(DomainMigration.PROJECTION_VERSION)&&validOriginalMigration(original.companyStateMigration);
    if(alreadyCurrent&&productionNoChange){
      const stableDomain=clone(projection.domain);stableDomain.updatedAt=original.domain.updatedAt;
      if(same(projection.businesses,original.businesses)&&same(stableDomain,original.domain))return source;
    }
    source.businesses=projection.businesses;source.domain=projection.domain;source.companyStateSchemaVersion=COMPANY_STATE_SCHEMA_VERSION;
    if(validOriginalMigration(original.companyStateMigration)){
      source.companyStateMigration=clone(original.companyStateMigration);
      source.companyStateReconciliation={schemaVersion:1,reason:'legacy_projection_structural_change',fromDomainSchemaVersion:Number(original.domain&&original.domain.schemaVersion)||0,toDomainSchemaVersion:Domain.DOMAIN_SCHEMA_VERSION,fromProjectionVersion:Number(original.domain&&original.domain.projectionVersion)||0,toProjectionVersion:DomainMigration.PROJECTION_VERSION,previousDomainUpdatedAt:Number(original.domain&&original.domain.updatedAt)||0,appliedAt:stamp,deviceId:deviceId||'company-domain-migration'};
    }else source.companyStateMigration={schemaVersion:1,fromCompanyStateSchemaVersion:Number(original.companyStateSchemaVersion)||0,toCompanyStateSchemaVersion:COMPANY_STATE_SCHEMA_VERSION,fromStateSchemaVersion:Number(original.v)||1,toStateSchemaVersion:ProductionState.STATE_SCHEMA_VERSION,migratedAt:stamp,deviceId:deviceId||'company-domain-migration',atomicBoundary:'repository_replace',rollbackSnapshotRequired:true};
    return source;
  }
  function validateState(input){ProductionState.validateState(input);if(!input||input.companyStateSchemaVersion!==COMPANY_STATE_SCHEMA_VERSION)throw new Error('Invalid company state schema');Domain.validateDomainState(input.domain);const m=input.companyStateMigration;if(!validOriginalMigration(m))throw new Error('Invalid company state migration provenance');const r=input.companyStateReconciliation;if(r!=null&&(r.schemaVersion!==1||r.reason!=='legacy_projection_structural_change'||r.toDomainSchemaVersion!==Domain.DOMAIN_SCHEMA_VERSION||r.toProjectionVersion!==DomainMigration.PROJECTION_VERSION||!Number.isFinite(Number(r.appliedAt))||typeof r.deviceId!=='string'||!r.deviceId))throw new Error('Invalid company state reconciliation provenance');return true;}
  function importBackup(payload,now,deviceId){if(payload&&Number(payload.exportSchemaVersion)>COMPANY_EXPORT_SCHEMA_VERSION)throw Object.assign(new Error('Future company backup schema is not supported'),{code:'future-company-backup-schema'});const base=payload&&payload.data&&payload.data.domain?clone(payload.data):ProductionState.importBackup(payload,now,deviceId),trusted=!!(payload&&payload.data&&Number(payload.exportSchemaVersion)>=1&&payload.appVersion&&payload.buildId),state=migrate(base,now,deviceId,{partnershipProvenance:trusted?'taxmate_backup':'unknown_import'});validateState(state);return state;}
  function createExport(state,identity={},receiptManifest=[]){validateState(state);return{exportSchemaVersion:COMPANY_EXPORT_SCHEMA_VERSION,appVersion:identity.appVersion,buildId:identity.buildId,stateSchemaVersion:ProductionState.STATE_SCHEMA_VERSION,companyStateSchemaVersion:COMPANY_STATE_SCHEMA_VERSION,domainSchemaVersion:Domain.DOMAIN_SCHEMA_VERSION,exportedAt:new Date().toISOString(),receiptBinariesIncluded:false,receiptNotice:'Receipt image binaries are not included in this JSON backup. The receipt manifest preserves references only.',receiptManifest:clone(receiptManifest),data:clone(state)};}
  return{STATE_SCHEMA_VERSION:ProductionState.STATE_SCHEMA_VERSION,COMPANY_STATE_SCHEMA_VERSION,COMPANY_EXPORT_SCHEMA_VERSION,migrate,validateState,importBackup,createExport};
});

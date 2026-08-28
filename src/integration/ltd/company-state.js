'use strict';

const ProductionState=require('../../core/state-schema');
const Domain=require('../../core/domain-schema');
const DomainMigration=require('../../core/domain-migration');

const COMPANY_STATE_SCHEMA_VERSION=6;
const COMPANY_EXPORT_SCHEMA_VERSION=3;
const clone=value=>JSON.parse(JSON.stringify(value));

function migrate(input,now,deviceId,options={}){
  const source=ProductionState.migrate(input,now,deviceId);
  const stamp=Number(now)||Date.now();
  const projection=DomainMigration.reconcileLegacyState(source,{
    now:stamp,
    deviceId:deviceId||'company-domain-migration',
    sourceStateSchemaVersion:Number(input&&input.v||1),
    partnershipProvenance:options.partnershipProvenance||'current_app'
  });
  source.businesses=projection.businesses;
  source.domain=projection.domain;
  source.companyStateSchemaVersion=COMPANY_STATE_SCHEMA_VERSION;
  return source;
}

function validateState(input){
  ProductionState.validateState(input);
  if(!input||input.companyStateSchemaVersion!==COMPANY_STATE_SCHEMA_VERSION)throw new Error('Invalid company state schema');
  Domain.validateDomainState(input.domain);
  return true;
}

function importBackup(payload,now,deviceId){
  const base=ProductionState.importBackup(payload,now,deviceId);
  const trusted=!!(payload&&payload.data&&Number(payload.exportSchemaVersion)>=1&&payload.appVersion&&payload.buildId);
  const state=migrate(base,now,deviceId,{partnershipProvenance:trusted?'taxmate_backup':'unknown_import'});
  validateState(state);
  return state;
}

function createExport(state,identity={},receiptManifest=[]){
  validateState(state);
  const data=clone(state);
  return{
    exportSchemaVersion:COMPANY_EXPORT_SCHEMA_VERSION,
    appVersion:identity.appVersion,
    buildId:identity.buildId,
    stateSchemaVersion:ProductionState.STATE_SCHEMA_VERSION,
    companyStateSchemaVersion:COMPANY_STATE_SCHEMA_VERSION,
    domainSchemaVersion:Domain.DOMAIN_SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    receiptBinariesIncluded:false,
    receiptNotice:'Receipt image binaries are not included in this JSON backup. The receipt manifest preserves references only.',
    receiptManifest:clone(receiptManifest),
    data
  };
}

module.exports={COMPANY_STATE_SCHEMA_VERSION,COMPANY_EXPORT_SCHEMA_VERSION,migrate,validateState,importBackup,createExport};

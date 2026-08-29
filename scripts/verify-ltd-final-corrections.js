'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const CompanyState=require('../src/integration/ltd/company-state');
const LtdSync=require('../src/core/ltd-sync');
const copy=require('../src/integration/ltd/approved-copy.json');
const {make}=require('../tests/test-fixture');

const root=path.resolve(__dirname,'..');
const output=path.resolve(process.env.TAXMATE_LTD_FINAL_CORRECTION_EVIDENCE||path.join(root,'.ltd-final-correction-evidence','migration-noop-and-scenario-result.json'));
const clone=value=>JSON.parse(JSON.stringify(value));
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').toUpperCase();

async function main(){
  const legacy=clone(make('fresh').driver.state);delete legacy.domain;delete legacy.companyStateSchemaVersion;delete legacy.companyStateMigration;
  const first=CompanyState.migrate(legacy,1_000_000,'first-migration'),firstSnapshot=clone(first),second=CompanyState.migrate(first,2_000_000,'second-migration');
  assert.deepEqual(second,firstSnapshot);
  const current=clone(make('existing').driver.state),companyIds=new Set(current.domain.entities.filter(item=>item.type==='limited_company').map(item=>item.id)),remote=[];
  for(const [collection,records] of Object.entries(LtdSync.recordsForSync(current)))for(const record of records)remote.push(LtdSync.envelope(collection,record,LtdSync.companyIdForRecord(collection,record,companyIds)));
  const currentAgain=CompanyState.migrate(current,2_000_000,'current-reopen'),sync=LtdSync.reconcile(currentAgain,remote,'owner');
  assert.deepEqual({uploads:sync.uploads.length,downloads:sync.downloads.length,conflicts:sync.conflicts.length},{uploads:0,downloads:0,conflicts:0});
  const changed=clone(first),business=changed.businesses[0];changed.entries.push({id:'later-legacy-entry',bizId:business.id,businessId:business.id,kind:'income',date:'2026-08-01',amount:10,description:'Later structural record',createdAt:1_500_000,updatedAt:1_500_000,deletedAt:null,deviceId:'later-device',source:'user'});
  const reconciled=CompanyState.migrate(changed,3_000_000,'structural-reconcile'),reopened=CompanyState.migrate(reconciled,4_000_000,'post-reconcile-reopen');assert.deepEqual(reopened,reconciled);
  const scenario=await make('existing').facade.onRunScenario({ordinaryFacts:{amountMinor:100_000,when:'2026-09-01'},asOfDate:'2026-09-01'});assert.equal(scenario.data.comparisonScope,'displayed_examples');assert.equal(scenario.data.mixedScenarioMethod,'equal_split_example');assert.equal(copy.canonical.en['scenario.lowest_tax'],'Lowest tax of these examples');assert.equal(copy.canonical.en['scenario.mix'],'Example salary + dividend mix');
  const result={status:'PASS',generatedAt:new Date().toISOString(),migration:{firstStateSha256:hash(first),secondStateSha256:hash(second),stateEqual:hash(first)===hash(second),firstDataPayloadSha256:hash(CompanyState.createExport(first,{appVersion:'2.1.0',buildId:'evidence'}).data),secondDataPayloadSha256:hash(CompanyState.createExport(second,{appVersion:'2.1.0',buildId:'evidence'}).data),dataPayloadEqual:hash(CompanyState.createExport(first,{appVersion:'2.1.0',buildId:'evidence'}).data)===hash(CompanyState.createExport(second,{appVersion:'2.1.0',buildId:'evidence'}).data),provenance:first.companyStateMigration,secondProvenance:second.companyStateMigration,domainUpdatedAt:{first:first.domain.updatedAt,second:second.domain.updatedAt},syncAfterNoOp:{uploads:sync.uploads.length,downloads:sync.downloads.length,conflicts:sync.conflicts.length}},laterStructuralReconciliation:{originalMigrationPreserved:hash(reconciled.companyStateMigration)===hash(first.companyStateMigration),provenance:reconciled.companyStateReconciliation,reopenStateEqual:hash(reopened)===hash(reconciled),projectedRecordPresent:reconciled.domain.economicEvents.some(item=>item.id==='legacy-event:later-legacy-entry')},scenario:{status:scenario.status,resultIds:scenario.data.results.map(item=>item.id),comparisonScope:scenario.data.comparisonScope,mixedScenarioMethod:scenario.data.mixedScenarioMethod,nonPosting:scenario.nonPosting,copy:Object.fromEntries(Object.entries(copy.canonical).map(([locale,value])=>[locale,{mix:value['scenario.mix'],lowest:value['scenario.lowest_tax']}]))}};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');process.stdout.write(`LTD_FINAL_CORRECTIONS_PASS ${output}\n`);
}

main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

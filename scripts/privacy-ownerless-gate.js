'use strict';
const assert=require('node:assert/strict');
const Boundary=require('../src/core/account-boundary');
const empty={ids:new Set(),signatures:new Set(),scopes:[]};
const meta={businesses:[{id:'legacy-foreign-business',name:'Synthetic foreign legacy data',recordType:'business',schemaVersion:5}]};
const record={id:'legacy-foreign-entry',bizId:'legacy-foreign-business',kind:'income',amount:123,recordType:'entry',schemaVersion:5};
try{
  const metaResult=Boundary.partitionCloudMeta(meta,{uid:'clean-account',foreignIndex:empty}),recordResult=Boundary.partitionRecords([record],{uid:'clean-account',collection:'entries',foreignIndex:empty,requireOwner:true});
  assert.equal(metaResult.meta.businesses,undefined);assert.equal(metaResult.quarantined.length,1);assert.equal(metaResult.quarantined[0].reason,'owner_missing');assert.equal(recordResult.accepted.length,0);assert.equal(recordResult.quarantined.length,1);assert.equal(recordResult.quarantined[0].reason,'owner_missing');
  process.stdout.write(`${JSON.stringify({gate:'ownerless-clean-device',status:'PASS',rendered:0,backupEligible:0,syncEligible:0,quarantined:metaResult.quarantined.length+recordResult.quarantined.length})}\n`);
}catch(error){process.stderr.write(`${JSON.stringify({gate:'ownerless-clean-device',status:'FAILED',safeError:'privacy_assertion_failed'})}\n`);process.exitCode=1;}

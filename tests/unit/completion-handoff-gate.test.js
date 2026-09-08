'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
test('unfinished whole-account retention cannot be packaged as Fable-ready',()=>{
  const gate=require('../../docs/FOUNDER_COMPLETION_GATE.json');
  if(gate.status==='COMPLETE'){assert.equal(gate.openItems.length,0);return;}
  const result=spawnSync(process.execPath,['scripts/package-ltd-statutory-fable.js'],{cwd:root,encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/do not generate a Fable-ready package/);
});
test('retention worker refuses a live environment before reading or deleting data',()=>{
  const env={...process.env};delete env.FIRESTORE_EMULATOR_HOST;env.GCLOUD_PROJECT='taxmate-uk-2';
  const result=spawnSync(process.execPath,['-e',"require('./functions/retention-worker').retentionRun({projectId:'taxmate-uk-2',uid:'never-read',db:null,bucket:null})"],{cwd:root,encoding:'utf8',env});
  assert.notEqual(result.status,0);assert.match(result.stderr,/retention_worker_emulator_only/);
});

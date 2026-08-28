'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createFounderPreviewBackup}=require('../ui-preview-harness/sanitised-backup-fixture');
const {buildPreviewDataset}=require('../ui-preview-harness/founder-preview-dataset');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../src/integration/ltd/CanonicalCompanyDriver');
const {TaxMateLtdUIFacade}=require('../src/integration/ltd/TaxMateLtdUIFacade');

function make(mode='existing'){
  const bytes=Buffer.from(JSON.stringify(createFounderPreviewBackup(),null,2)+'\n'),sha=crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'taxmate-ui-test-')),file=path.join(dir,'backup.json');
  try{fs.writeFileSync(file,bytes);const bundle=buildPreviewDataset({mode,backupPath:file,expectedSha256:sha}),driver=new CanonicalCompanyDriver({mode,state:bundle.state,meta:bundle.meta,copy:{locales:['en','zh-HK','pl','ro','es','ur']},now:()=>DEFAULT_NOW,personalTaxJurisdiction:'EWNI'});return{bundle,driver,facade:new TaxMateLtdUIFacade({driver})};}
  finally{try{fs.unlinkSync(file);}catch(_){}try{fs.rmdirSync(dir);}catch(_){}}
}
module.exports={make};

'use strict';

const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const child=spawnSync(process.execPath,['scripts/run-ltd-actual-app-browser.js'],{
  cwd:root,
  env:{...process.env,TAXMATE_LTD_ACTUAL_APP_REVIEW:'1',TAXMATE_LTD_FOUNDER_ALIAS_PREVIEW_ONLY:'1',TAXMATE_LTD_ACTUAL_APP_EVIDENCE:path.join(os.tmpdir(),'TaxMate-ltd-founder-alias-preview-evidence')},
  stdio:'inherit'
});
process.exit(child.status==null?1:child.status);

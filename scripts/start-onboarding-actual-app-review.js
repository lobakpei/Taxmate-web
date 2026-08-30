'use strict';

const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const child=spawnSync(process.execPath,['scripts/run-onboarding-connected-browser.js'],{cwd:root,env:{...process.env,TAXMATE_ONBOARDING_REVIEW:'1'},stdio:'inherit'});
process.exit(child.status==null?1:child.status);

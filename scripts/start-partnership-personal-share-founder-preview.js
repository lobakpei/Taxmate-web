'use strict';
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),child=spawnSync(process.execPath,['tests/browser/partnership-personal-share.e2e.js'],{cwd:root,env:{...process.env,TAXMATE_PARTNERSHIP_SHARE_REVIEW:'1'},stdio:'inherit'});process.exit(child.status==null?1:child.status);

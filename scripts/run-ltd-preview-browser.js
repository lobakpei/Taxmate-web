'use strict';

const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localNodePath}=require('./local-tool-runtime');
const root=path.resolve(__dirname,'..');
const evidence=process.env.TAXMATE_LTD_PREVIEW_EVIDENCE||path.join(root,'.ltd-founder-preview-evidence');
const child=spawnSync(process.execPath,['tests/browser/ltd-preview.e2e.js'],{cwd:root,env:{...process.env,NODE_PATH:localNodePath(root),TAXMATE_LTD_PREVIEW_EVIDENCE:evidence},stdio:'inherit',windowsHide:true});
process.exit(child.status==null?1:child.status);

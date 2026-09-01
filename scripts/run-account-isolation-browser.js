'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');

const root=path.resolve(__dirname,'..'),firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd')),generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv),runtime=localToolEnvironment(root),evidence=process.env.TAXMATE_ACCOUNT_ISOLATION_EVIDENCE||path.join(root,'.hosting-build','account-isolation-evidence');
const env={...runtime.env,NODE_PATH:localNodePath(root),FUNCTIONS_DISCOVERY_TIMEOUT:'60000',TAXMATE_ACCOUNT_ISOLATION_EVIDENCE:evidence};
const command=`"${firebase}" emulators:exec --project demo-taxmate --only auth,firestore,storage "node tests/browser/account-isolation.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);process.exit(child.status==null?1:child.status);

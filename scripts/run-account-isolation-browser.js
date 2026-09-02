'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');

const root=path.resolve(__dirname,'..'),firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd')),generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv),runtime=localToolEnvironment(root),evidence=process.env.TAXMATE_ACCOUNT_ISOLATION_EVIDENCE||path.join(root,'.hosting-build','account-isolation-evidence');
const env={...runtime.env,NODE_PATH:localNodePath(root),FUNCTIONS_DISCOVERY_TIMEOUT:'60000',COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:4193',TAXMATE_ACCOUNT_ISOLATION_EVIDENCE:evidence};
const command=`"${firebase}" emulators:exec --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/account-isolation.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);process.exit(child.status==null?1:child.status);

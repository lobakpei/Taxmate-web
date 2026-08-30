'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');

const root=path.resolve(__dirname,'..');
const firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd'));
const generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv);
const evidence=process.env.TAXMATE_ONBOARDING_EVIDENCE||path.join(root,'.hosting-build','onboarding-connected-evidence');
const reviewMode=process.env.TAXMATE_ONBOARDING_REVIEW==='1';
const runtime=localToolEnvironment(root);
const env={...runtime.env,NODE_PATH:localNodePath(root),FUNCTIONS_DISCOVERY_TIMEOUT:'60000',COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'price_pro_annual_emulator',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:4180',TAXMATE_ONBOARDING_EVIDENCE:evidence,TAXMATE_ONBOARDING_REVIEW:reviewMode?'1':'0'};
const emulatorSet=process.env.TAXMATE_HOME_ASSISTANT_ONLY==='1'?'auth,firestore,storage':'auth,firestore,storage,functions';
const command=`"${firebase}" emulators:exec --project demo-taxmate --only ${emulatorSet} "node tests/browser/onboarding-connected.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
process.exit(child.status==null?1:child.status);

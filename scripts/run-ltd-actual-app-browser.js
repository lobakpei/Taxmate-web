'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');
const {prepare}=require('./emulator-test-config');

const root=path.resolve(__dirname,'..');
const firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd'));
const generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv);
const evidence=process.env.TAXMATE_LTD_ACTUAL_APP_EVIDENCE||path.join(root,'.ltd-actual-app-evidence');
const reviewMode=process.env.TAXMATE_LTD_ACTUAL_APP_REVIEW==='1';
const runtime=localToolEnvironment(root);
const previewPort=Number(process.env.TAXMATE_LTD_ACTUAL_APP_PORT||4177);
const ports={auth:process.env.TAXMATE_AUTH_EMULATOR_PORT||'39099',functions:process.env.TAXMATE_FUNCTIONS_EMULATOR_PORT||'35001',firestore:process.env.TAXMATE_FIRESTORE_EMULATOR_PORT||'38080',storage:process.env.TAXMATE_STORAGE_EMULATOR_PORT||'39199'};
const env={...runtime.env,TAXMATE_AUTH_EMULATOR_PORT:ports.auth,TAXMATE_FUNCTIONS_EMULATOR_PORT:ports.functions,TAXMATE_FIRESTORE_EMULATOR_PORT:ports.firestore,TAXMATE_STORAGE_EMULATOR_PORT:ports.storage,NODE_PATH:localNodePath(root),FUNCTIONS_DISCOVERY_TIMEOUT:'60000',GCLOUD_PROJECT:'demo-taxmate',GOOGLE_CLOUD_PROJECT:'demo-taxmate',FIREBASE_CONFIG:JSON.stringify({projectId:'demo-taxmate',storageBucket:'demo-taxmate.appspot.com'}),FIRESTORE_EMULATOR_HOST:`127.0.0.1:${ports.firestore}`,FIREBASE_AUTH_EMULATOR_HOST:`127.0.0.1:${ports.auth}`,FIREBASE_STORAGE_EMULATOR_HOST:`127.0.0.1:${ports.storage}`,FUNCTIONS_EMULATOR_HOST:`127.0.0.1:${ports.functions}`,COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:`http://127.0.0.1:${previewPort}`,TAXMATE_LTD_ACTUAL_APP_EVIDENCE:evidence,TAXMATE_LTD_ACTUAL_APP_REVIEW:reviewMode?'1':'0'};
const isolated=prepare(root,env),command=`"${firebase}" emulators:exec${isolated.arg} --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/ltd-actual-app.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
isolated.cleanup();
process.exit(child.status==null?1:child.status);

'use strict';
// Only the explicitly scoped normal-use UI suite. Never dispatch --all or a legacy suite.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');
const {prepare}=require('./emulator-test-config');
const root=path.resolve(__dirname,'..'),runtime=localToolEnvironment(root),run=Date.now().toString(36);
const out=path.join(root,'.hosting-build','review01-r01-r05-runs',run);fs.mkdirSync(out,{recursive:true});
const env={...runtime.env,NODE_PATH:localNodePath(root),TAXMATE_NORMAL_EVIDENCE:out,
 TAXMATE_AUTH_EMULATOR_PORT:'32399',TAXMATE_FUNCTIONS_EMULATOR_PORT:'32501',TAXMATE_FIRESTORE_EMULATOR_PORT:'32880',TAXMATE_STORAGE_EMULATOR_PORT:'32999',
 GCLOUD_PROJECT:'demo-taxmate',GOOGLE_CLOUD_PROJECT:'demo-taxmate',FIREBASE_CONFIG:JSON.stringify({projectId:'demo-taxmate',storageBucket:'demo-taxmate.appspot.com'}),
 FIRESTORE_EMULATOR_HOST:'127.0.0.1:32880',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:32399',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:32999',FUNCTIONS_EMULATOR_HOST:'127.0.0.1:32501',
 FUNCTIONS_DISCOVERY_TIMEOUT:'60000',COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',
 STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:41885'};
const isolated=prepare(root,env),firebase=localBinary(root,'node_modules/.bin/firebase.cmd');
console.log('NORMAL_USE_ONLY '+out);
try{const child=spawnSync(`"${firebase}" emulators:exec${isolated.arg} --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/review01-normal.e2e.js"`,{cwd:root,env,shell:true,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});fs.writeFileSync(path.join(out,'emulators.log'),String(child.stdout||'')+String(child.stderr||''));console.log(String(child.stdout||'').slice(-4000));console.error(String(child.stderr||'').slice(-1500));process.exitCode=child.status==null?1:child.status;}
finally{isolated.cleanup();}

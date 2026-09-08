'use strict';
// Explicitly scoped normal-use billing integration. No legacy aggregate suites.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime'),{prepare}=require('./emulator-test-config');
const {snapshot}=require('./billing-source-evidence'),{prepare:prepareBilling}=require('./billing-normal-config');
const root=path.resolve(__dirname,'..'),runtime=localToolEnvironment(root),out=path.join(root,'.hosting-build','billing-normal-runs',Date.now().toString(36));fs.mkdirSync(out,{recursive:true});
const env={...runtime.env,NODE_PATH:localNodePath(root),TAXMATE_NORMAL_EVIDENCE:out,
 TAXMATE_AUTH_EMULATOR_PORT:'33399',TAXMATE_FUNCTIONS_EMULATOR_PORT:'33501',TAXMATE_FIRESTORE_EMULATOR_PORT:'33880',TAXMATE_STORAGE_EMULATOR_PORT:'33999',
 GCLOUD_PROJECT:'demo-taxmate',GOOGLE_CLOUD_PROJECT:'demo-taxmate',FIREBASE_CONFIG:JSON.stringify({projectId:'demo-taxmate',storageBucket:'demo-taxmate.appspot.com'}),
 FIRESTORE_EMULATOR_HOST:'127.0.0.1:33880',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:33399',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:33999',FUNCTIONS_EMULATOR_HOST:'127.0.0.1:33501',
 FUNCTIONS_DISCOVERY_TIMEOUT:'60000',COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'sk_test_local_protocol_double',STRIPE_WEBHOOK_SECRET:'whsec_local_protocol_double',
 TAXMATE_STRIPE_EMULATOR_ORIGIN:'http://127.0.0.1:32777',BILLING_MONEY_OPERATIONS_ENABLED:'true',BILLING_CONSUMER_DISCLOSURES_READY:'true',
 STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_yearly',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly',STRIPE_PRO_ANNUAL_PRICE_ID:'price_pro_yearly',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:41895'};
const localConfig=prepareBilling(root),isolated=prepare(root,env),firebase=localBinary(root,'node_modules/.bin/firebase.cmd'),sourceBefore=snapshot(root);fs.writeFileSync(path.join(out,'source-before.json'),JSON.stringify(sourceBefore,null,2));
console.log('NORMAL_USE_ONLY '+out);
try{const run=spawnSync(`"${firebase}" emulators:exec${isolated.arg} --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/billing-normal.e2e.js"`,{cwd:root,env,shell:true,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});fs.writeFileSync(path.join(out,'emulators.log'),String(run.stdout||'')+String(run.stderr||''));console.log(String(run.stdout||'').slice(-5000));console.error(String(run.stderr||'').slice(-1500));process.exitCode=run.status==null?1:run.status;}
finally{isolated.cleanup();localConfig.cleanup();const sourceAfter=snapshot(root);fs.writeFileSync(path.join(out,'source-after.json'),JSON.stringify(sourceAfter,null,2));const unchanged=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);fs.writeFileSync(path.join(out,'source-identity.json'),JSON.stringify({unchanged,files:Object.keys(sourceBefore).length},null,2));if(!unchanged)process.exitCode=1;}

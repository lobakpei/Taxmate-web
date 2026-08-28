'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');
const root=path.resolve(__dirname,'..'),firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd'));
const generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv);
const runtime=localToolEnvironment(root),env={...runtime.env,NODE_PATH:localNodePath(root),STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'price_pro_annual_emulator',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'price_pro_legacy_emulator',PUBLIC_APP_URL:'http://127.0.0.1:4173'};
const command=`"${firebase}" emulators:exec --project demo-taxmate --only auth,firestore,storage,functions "node --test tests/integration/functions-emulator.test.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
process.exit(child.status==null?1:child.status);

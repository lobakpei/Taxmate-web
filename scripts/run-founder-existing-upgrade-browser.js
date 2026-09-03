'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {localToolEnvironment,localBinary,localNodePath}=require('./local-tool-runtime');

const root=path.resolve(__dirname,'..');
const firebase=localBinary(root,path.join('node_modules','.bin','firebase.cmd'));
const generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv);
const generatedConfig=path.join(root,'founder-existing-upgrade.firebase.json');
const evidence=process.env.TAXMATE_FOUNDER_UPGRADE_EVIDENCE||path.join(root,'.hosting-build','evidence','2.1.20','founder-existing-upgrade');
const redOnly=process.argv.includes('--red')||process.env.TAXMATE_FOUNDER_UPGRADE_RED_ONLY==='1';
const runtime=localToolEnvironment(root);
const portBase=20000+(process.pid%1500)*10;
const ports={auth:portBase+1,functions:portBase+2,firestore:portBase+3,storage:portBase+4,hub:portBase+5,logging:portBase+6,websocket:portBase+7,eventarc:portBase+8,tasks:portBase+9};
const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));config.emulators={auth:{port:ports.auth},functions:{port:ports.functions},firestore:{port:ports.firestore,websocketPort:ports.websocket},storage:{port:ports.storage},hub:{port:ports.hub},logging:{port:ports.logging},eventarc:{port:ports.eventarc},tasks:{port:ports.tasks},ui:{enabled:false}};fs.mkdirSync(path.dirname(generatedConfig),{recursive:true});fs.writeFileSync(generatedConfig,JSON.stringify(config));
const env={...runtime.env,NODE_PATH:localNodePath(root),FUNCTIONS_DISCOVERY_TIMEOUT:'60000',COMPANIES_HOUSE_API_KEY:'emulator-placeholder',STRIPE_SECRET_KEY:'emulator-placeholder',STRIPE_WEBHOOK_SECRET:'emulator-placeholder',STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',STRIPE_PRO_ANNUAL_PRICE_ID:'',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:4177',TAXMATE_LTD_ACTUAL_APP_EVIDENCE:evidence,TAXMATE_LTD_FOUNDER_EXISTING_UPGRADE_ONLY:'1',TAXMATE_LTD_FOUNDER_EXISTING_UPGRADE_RED_ONLY:redOnly?'1':'0',TAXMATE_AUTH_EMULATOR_PORT:String(ports.auth),TAXMATE_FUNCTIONS_EMULATOR_PORT:String(ports.functions),TAXMATE_FIRESTORE_EMULATOR_PORT:String(ports.firestore),TAXMATE_STORAGE_EMULATOR_PORT:String(ports.storage)};
const command=`"${firebase}" emulators:exec --config "${generatedConfig}" --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/ltd-actual-app.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
if(fs.existsSync(generatedConfig))fs.unlinkSync(generatedConfig);
process.exit(child.status==null?1:child.status);

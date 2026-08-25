'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const jdkRoot=path.join(root,'.tools','jdk');
const jdkName=fs.readdirSync(jdkRoot).find(name=>fs.existsSync(path.join(jdkRoot,name,'bin','java.exe')));
if(!jdkName)throw new Error('Portable JDK not found under .tools/jdk');
const javaHome=path.join(jdkRoot,jdkName);
const firebase=path.join(root,'node_modules','.bin','firebase.cmd');
const generatedEnv=path.join(root,'functions','.env.local'),hadEnv=fs.existsSync(generatedEnv);
const evidence=process.env.TAXMATE_PAID_SYNC_EVIDENCE||path.join(root,'.paid-sync-browser-evidence');
const env={
  ...process.env,
  JAVA_HOME:javaHome,
  PATH:path.join(javaHome,'bin')+path.delimiter+process.env.PATH,
  XDG_CONFIG_HOME:path.join(root,'.tools','config'),
  FUNCTIONS_DISCOVERY_TIMEOUT:'60000',
  STRIPE_SECRET_KEY:'emulator-placeholder',
  STRIPE_WEBHOOK_SECRET:'emulator-placeholder',
  STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly_emulator',
  STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_annual_emulator',
  STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly_emulator',
  STRIPE_PRO_ANNUAL_PRICE_ID:'price_pro_annual_emulator',
  STRIPE_PLUS_LEGACY_PRICE_IDS:'',
  STRIPE_PRO_LEGACY_PRICE_IDS:'price_pro_legacy_emulator',
  PUBLIC_APP_URL:'http://127.0.0.1:4176',
  TAXMATE_PAID_SYNC_EVIDENCE:evidence
};
const command=`"${firebase}" emulators:exec --project demo-taxmate --only auth,firestore,storage,functions "node tests/browser/paid-sync.e2e.js"`;
const child=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
if(!hadEnv&&fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
process.exit(child.status==null?1:child.status);

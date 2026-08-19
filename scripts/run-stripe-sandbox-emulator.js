'use strict';
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),firebase=path.join(root,'node_modules','.bin','firebase.cmd');
const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','TAXMATE_STRIPE_ACCOUNT_ID','STRIPE_PLUS_PRICE_ID','STRIPE_PRO_PRICE_ID'];
for(const name of required)if(!process.env[name]){console.error(`${name} is required`);process.exit(2);}
if(!/^acct_[A-Za-z0-9]+$/.test(process.env.TAXMATE_STRIPE_ACCOUNT_ID)){console.error('Invalid TaxMate Stripe account identity');process.exit(2);}
if(!/^price_[A-Za-z0-9]+$/.test(process.env.STRIPE_PLUS_PRICE_ID)||!/^price_[A-Za-z0-9]+$/.test(process.env.STRIPE_PRO_PRICE_ID)||process.env.STRIPE_PLUS_PRICE_ID===process.env.STRIPE_PRO_PRICE_ID){console.error('Invalid TaxMate Stripe price identities');process.exit(2);}
const jdkRoot=path.join(root,'.tools','jdk'),jdkName=fs.readdirSync(jdkRoot).find(name=>fs.existsSync(path.join(jdkRoot,name,'bin','java.exe')));
if(!jdkName)throw new Error('Portable JDK not found under .tools/jdk');
const javaHome=path.join(jdkRoot,jdkName);
const env={...process.env,JAVA_HOME:javaHome,PATH:path.join(javaHome,'bin')+path.delimiter+process.env.PATH,XDG_CONFIG_HOME:path.join(root,'.tools','config'),PUBLIC_APP_URL:'http://127.0.0.1:4173'};
const generatedEnv=path.join(root,'functions','.env.local'),generatedSecret=path.join(root,'functions','.secret.local');
if(fs.existsSync(generatedEnv)||fs.existsSync(generatedSecret))throw new Error('Refusing to overwrite existing Functions local configuration');
const testFile=process.argv[2]||'tests/integration/stripe-sandbox.test.js';
if(!/^tests[\\/]integration[\\/]stripe-[a-z-]+\.test\.js$/.test(testFile))throw new Error('Invalid Stripe integration test path');
const command=`"${firebase}" emulators:exec --project demo-taxmate --only auth,functions,firestore "node --test ${testFile}"`;
let result;
try{
  fs.writeFileSync(generatedEnv,`STRIPE_PLUS_PRICE_ID=${env.STRIPE_PLUS_PRICE_ID}\nSTRIPE_PRO_PRICE_ID=${env.STRIPE_PRO_PRICE_ID}\nPUBLIC_APP_URL=${env.PUBLIC_APP_URL}\n`,'utf8');
  fs.writeFileSync(generatedSecret,`STRIPE_SECRET_KEY=${env.STRIPE_SECRET_KEY}\nSTRIPE_WEBHOOK_SECRET=${env.STRIPE_WEBHOOK_SECRET}\n`,'utf8');
  result=spawnSync(command,{cwd:root,env,stdio:'inherit',shell:true});
}finally{
  if(fs.existsSync(generatedEnv))fs.unlinkSync(generatedEnv);
  if(fs.existsSync(generatedSecret))fs.unlinkSync(generatedSecret);
}
if(result.error)throw result.error;
process.exitCode=result.status==null?1:result.status;

'use strict';

// Read-only readiness check. Never creates prices/customers, starts an emulator,
// rewrites local settings, changes a webhook, or submits a provider event.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ACCOUNT='acct_1U6GdCL0bYJwhRlm';
const SPECS=[
  ['STRIPE_PLUS_MONTHLY_PRICE_ID',399,'month','prod_V6UOvRXvg4ALAg'],
  ['STRIPE_PLUS_ANNUAL_PRICE_ID',2999,'year','prod_V6UOvRXvg4ALAg'],
  ['STRIPE_PRO_MONTHLY_PRICE_ID',999,'month','prod_V6UPAGq9Yx0e2f'],
  ['STRIPE_PRO_ANNUAL_PRICE_ID',9999,'year','prod_V6UPAGq9Yx0e2f'],
  ['STRIPE_PRO_STANDARD_MONTHLY_PRICE_ID',1199,'month','prod_V6UPAGq9Yx0e2f']
];
function parseEnv(text){
  const values={};
  for(const line of text.split(/\r?\n/)){
    if(!line.trim()||line.trimStart().startsWith('#'))continue;
    const at=line.indexOf('=');
    if(at<1)throw new Error('PUBLIC_CONFIG_INVALID');
    values[line.slice(0,at).trim()]=line.slice(at+1).trim();
  }
  return values;
}
function readConfig(){
  return parseEnv(fs.readFileSync(path.join(__dirname,'stripe-test-prices.env'),'utf8'));
}
function inspect(config,env){
  const missing=[],conflicts=[];
  if(config.EXPECTED_STRIPE_MODE!=='test'||config.TAXMATE_STRIPE_ACCOUNT_ID!==ACCOUNT)conflicts.push('TEST_IDENTITY_CONFIGURATION');
  const ids=SPECS.map(([key])=>config[key]);
  if(ids.some(id=>!/^price_[A-Za-z0-9]+$/.test(id||''))||new Set(ids).size!==SPECS.length)conflicts.push('TEST_PRICE_CONFIGURATION');
  for(const [key,value] of Object.entries(config))if(env[key]!==undefined&&env[key]!==value)conflicts.push(key);
  // In particular, do not silently inherit the loopback protocol-double origin.
  if(env.TAXMATE_STRIPE_EMULATOR_ORIGIN)conflicts.push('TAXMATE_STRIPE_EMULATOR_ORIGIN');
  const key=env.STRIPE_SECRET_KEY||'',webhook=env.STRIPE_WEBHOOK_SECRET||'';
  const placeholder=value=>/local_protocol_double|placeholder|emulator/i.test(value);
  const usableKey=/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(key)&&!placeholder(key);
  const usableWebhook=/^whsec_[A-Za-z0-9]+$/.test(webhook)&&!placeholder(webhook);
  if(!usableKey)missing.push('AUTHORIZED_TAXMATE_TEST_KEY_IN_PROCESS');
  if(!usableWebhook)missing.push('GENUINE_RECEIVER_SIGNING_SECRET_IN_PROCESS');
  return{
    status:conflicts.length?'BLOCKED_CONFIGURATION':!usableKey?'BLOCKED_TEST_CREDENTIALS':'LOCAL_INPUTS_ONLY',
    expectedAccountId:ACCOUNT,expectedMode:'test',conflicts,missing,
    secretPresent:!!key,usableTestKeyShape:usableKey,signingSecretPresent:!!webhook,usableSigningSecretShape:usableWebhook,
    runtimeStarted:false,externalWrites:0,providerAccountVerified:false,providerPricesVerified:false,
    webhookTransportVerified:false,providerPaymentTests:'NOT_RUN'
  };
}
async function main(){
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--provider-read-only'))throw new Error('READ_ONLY_ARGUMENT_REQUIRED');
  const config=readConfig(),result=inspect(config,process.env);
  const live=parseEnv(fs.readFileSync(path.join(root,'functions','.env.taxmate-uk-2'),'utf8'));
  const liveIds=new Set(Object.values(live).flatMap(value=>value.split(',')).filter(value=>value.startsWith('price_')));
  if(SPECS.some(([name])=>liveIds.has(config[name]))){result.conflicts.push('LIVE_TEST_PRICE_OVERLAP');result.status='BLOCKED_CONFIGURATION';}
  result.providerReadRequested=args.includes('--provider-read-only');
  result.providerReadsAttempted=false;
  if(result.conflicts.length||!result.usableTestKeyShape||!result.providerReadRequested){
    console.log(JSON.stringify(result,null,2));
    if(result.conflicts.length||!result.usableTestKeyShape)process.exitCode=2;
    return;
  }
  result.providerReadsAttempted=true;
  try{
    const Stripe=require(path.join(root,'functions','node_modules','stripe'));
    const client=new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:0,timeout:15000});
    const account=await client.accounts.retrieve();
    if(account.id!==ACCOUNT)throw new Error('PROVIDER_ACCOUNT_MISMATCH');
    result.providerAccountVerified=true;
    result.prices=[];
    for(const [name,amount,interval,productId] of SPECS){
      const price=await client.prices.retrieve(config[name]);
      if(price.id!==config[name]||price.livemode!==false||price.active!==true||price.currency!=='gbp'||price.unit_amount!==amount||price.recurring?.interval!==interval||price.recurring?.interval_count!==1||(typeof price.product==='string'?price.product:price.product?.id)!==productId)throw new Error('PROVIDER_PRICE_ALIGNMENT_REQUIRED');
      result.prices.push({name,id:price.id,amountMinor:amount,currency:'gbp',interval,mode:'test'});
    }
    result.providerPricesVerified=true;
    // A key shape or a price read does not prove provider delivery to this App.
    result.status='PROVIDER_READS_VERIFIED_WEBHOOK_UNVERIFIED';
  }catch(error){
    const known=['PROVIDER_ACCOUNT_MISMATCH','PROVIDER_PRICE_ALIGNMENT_REQUIRED'];
    result.status='BLOCKED_PROVIDER_READ';
    result.reason=known.includes(error.message)?error.message:'PROVIDER_READ_UNAVAILABLE';
    process.exitCode=2;
  }
  console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main().catch(()=>{console.error(JSON.stringify({status:'BLOCKED_LOCAL_CONFIGURATION',externalWrites:0,providerPaymentTests:'NOT_RUN'}));process.exitCode=2;});
module.exports={parseEnv,readConfig,inspect,SPECS,ACCOUNT};

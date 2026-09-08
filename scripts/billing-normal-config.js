'use strict';
// Reproducible loopback-only configuration. Never overwrite existing settings.
const fs=require('node:fs'),path=require('node:path');
const publicValues={STRIPE_PLUS_MONTHLY_PRICE_ID:'price_plus_monthly',STRIPE_PLUS_ANNUAL_PRICE_ID:'price_plus_yearly',STRIPE_PRO_MONTHLY_PRICE_ID:'price_pro_monthly',STRIPE_PRO_ANNUAL_PRICE_ID:'price_pro_yearly',STRIPE_PLUS_LEGACY_PRICE_IDS:'',STRIPE_PRO_LEGACY_PRICE_IDS:'',PUBLIC_APP_URL:'http://127.0.0.1:41895',BILLING_MONEY_OPERATIONS_ENABLED:'true',BILLING_CONSUMER_DISCLOSURES_READY:'true',TAXMATE_STRIPE_EMULATOR_ORIGIN:'http://127.0.0.1:32777'};
const placeholders={STRIPE_SECRET_KEY:'sk_test_local_protocol_double',STRIPE_WEBHOOK_SECRET:'whsec_local_protocol_double',COMPANIES_HOUSE_API_KEY:'emulator-placeholder'};
function prepare(root){const created=[];for(const [name,expected]of [['.env.local',publicValues],['.secret.local',placeholders]]){const file=path.join(root,'functions',name);if(fs.existsSync(file)){const actual=Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const at=l.indexOf('=');return[l.slice(0,at),l.slice(at+1)];}));if(Object.keys(actual).some(k=>!(k in expected))||Object.entries(expected).some(([k,v])=>actual[k]!==v))throw Error('Existing functions/'+name+' differs from the known loopback demo settings; left untouched.');}else{fs.writeFileSync(file,'# Generated local protocol double only; never deploy/package.\n'+Object.entries(expected).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx'});created.push(file);}}
  return{cleanup(){for(const file of created)fs.unlinkSync(file);}};
}
module.exports={prepare};

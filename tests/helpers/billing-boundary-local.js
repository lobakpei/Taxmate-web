'use strict';
// Evaluate the actual boundary functions without initializing Admin, triggers,
// credentials or network clients. Marker checks fail closed after a refactor.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const functionRequire=require('node:module').createRequire(path.join(__dirname,'../../functions/package.json'));
const {HttpsError}=functionRequire('firebase-functions/v2/https');
function loadBoundary(transform=value=>value){
  const source=transform(fs.readFileSync(path.join(__dirname,'../../functions/index.js'),'utf8'));
  function section(start,end){
    const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
    if(a<0||b<0||source.indexOf(start,a+start.length)>=0)throw new Error('Billing boundary markers changed: '+start);
    return source.slice(a,b);
  }
  const logs=[],context={HttpsError,console:{error:(...args)=>logs.push(args)},
    FounderPromotions:require('../../functions/founder-promotions'),RetentionPolicy:require('../../functions/retention-policy')};
  const code=section('function billingFailure(category){','async function requireTier(')+
    section('async function billingCall(req,run,role){','exports.getBillingHistory=')+
    '\n({billingCall,billingFailure,auth,effectiveTier,retentionLifecycle})';
  return{...new vm.Script(code,{filename:'actual-index-billing-boundary.js'}).runInNewContext(context),logs,HttpsError};
}
module.exports={loadBoundary};

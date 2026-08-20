const path=require('node:path');

const tier=String(process.argv[2]||'').toLowerCase();
const cadence=String(process.argv[3]||'monthly').toLowerCase();
if(!['plus','pro'].includes(tier)||!['monthly','yearly'].includes(cadence))throw new Error('Usage: node scripts/create-stripe-hosted-test-checkout.js plus|pro monthly|yearly');
const required=['STRIPE_SECRET_KEY','TAXMATE_STRIPE_ACCOUNT_ID','STRIPE_PLUS_MONTHLY_PRICE_ID','STRIPE_PLUS_ANNUAL_PRICE_ID','STRIPE_PRO_MONTHLY_PRICE_ID','STRIPE_PRO_ANNUAL_PRICE_ID'];
for(const name of required){if(!process.env[name])throw new Error(`Missing ${name}`);}
const Stripe=require(path.resolve(__dirname,'..','functions','node_modules','stripe'));
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

async function main(){
  const account=await stripe.accounts.retrieve();
  if(account.id!==process.env.TAXMATE_STRIPE_ACCOUNT_ID)throw new Error(`Stripe account mismatch: ${account.id}`);
  const key=`STRIPE_${tier.toUpperCase()}_${cadence==='yearly'?'ANNUAL':'MONTHLY'}_PRICE_ID`,priceId=process.env[key],uid=`staging-hosted-${tier}-${cadence}-20260820`;
  const customer=await stripe.customers.create({email:`stripe-${tier}-${cadence}-test@taxmate.invalid`,metadata:{firebaseUid:uid,taxmate_fixture:'true'}});
  const session=await stripe.checkout.sessions.create({
    mode:'subscription',customer:customer.id,line_items:[{price:priceId,quantity:1}],
    allow_promotion_codes:true,automatic_tax:{enabled:false},
    success_url:`https://taxmate-staging.web.app/?billing=success&tier=${tier}&cadence=${cadence}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`https://taxmate-staging.web.app/?billing=cancelled&tier=${tier}&cadence=${cadence}`,
    subscription_data:{metadata:{firebaseUid:uid,tier,billingCadence:cadence,taxmate_fixture:'true'}},
    metadata:{taxmate_fixture:'true',tier,billingCadence:cadence}
  });
  const amount={plus:{monthly:399,yearly:2999},pro:{monthly:799,yearly:5999}}[tier][cadence];
  console.log(JSON.stringify({tier,cadence,uid,customerId:customer.id,sessionId:session.id,url:session.url,priceId,amount,currency:'gbp',automaticTax:false},null,2));
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});

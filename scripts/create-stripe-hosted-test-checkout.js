const path=require('node:path');

const tier=String(process.argv[2]||'').toLowerCase();
if(!['plus','pro'].includes(tier))throw new Error('Usage: node scripts/create-stripe-hosted-test-checkout.js plus|pro');
const required=['STRIPE_SECRET_KEY','TAXMATE_STRIPE_ACCOUNT_ID','STRIPE_PLUS_PRICE_ID','STRIPE_PRO_PRICE_ID'];
for(const name of required){if(!process.env[name])throw new Error(`Missing ${name}`);}
const Stripe=require(path.resolve(__dirname,'..','functions','node_modules','stripe'));
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

async function main(){
  const account=await stripe.accounts.retrieve();
  if(account.id!==process.env.TAXMATE_STRIPE_ACCOUNT_ID)throw new Error(`Stripe account mismatch: ${account.id}`);
  const priceId=tier==='plus'?process.env.STRIPE_PLUS_PRICE_ID:process.env.STRIPE_PRO_PRICE_ID;
  const customer=await stripe.customers.create({email:`stripe-${tier}-test@taxmate.invalid`,metadata:{firebaseUid:`staging-hosted-${tier}-20260819`,taxmate_fixture:'true'}});
  const session=await stripe.checkout.sessions.create({
    mode:'subscription',customer:customer.id,line_items:[{price:priceId,quantity:1}],
    allow_promotion_codes:true,automatic_tax:{enabled:false},
    success_url:`https://taxmate-staging.web.app/?billing=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`https://taxmate-staging.web.app/?billing=cancelled&tier=${tier}`,
    subscription_data:{metadata:{firebaseUid:`staging-hosted-${tier}-20260819`,tier,taxmate_fixture:'true'}},
    metadata:{taxmate_fixture:'true',tier}
  });
  console.log(JSON.stringify({tier,customerId:customer.id,sessionId:session.id,url:session.url,amount:tier==='plus'?399:849,currency:'gbp',automaticTax:false},null,2));
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});

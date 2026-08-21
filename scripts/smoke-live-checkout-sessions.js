'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const Stripe=require(path.resolve(__dirname,'..','functions','node_modules','stripe'));

const required=['STRIPE_SECRET_KEY','STRIPE_PLUS_MONTHLY_PRICE_ID','STRIPE_PLUS_ANNUAL_PRICE_ID','STRIPE_PRO_MONTHLY_PRICE_ID','STRIPE_PRO_ANNUAL_PRICE_ID','STRIPE_PLUS_PRODUCT_ID','STRIPE_PRO_PRODUCT_ID'];
for(const name of required)if(!process.env[name])throw new Error(`Missing ${name}`);
if(!/^rk_live_/.test(process.env.STRIPE_SECRET_KEY))throw new Error('A restricted LIVE Stripe key is required');

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:2});
const specs=[
  {key:'plusMonthly',tier:'plus',cadence:'monthly',amount:399,interval:'month',price:process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,product:process.env.STRIPE_PLUS_PRODUCT_ID},
  {key:'plusYearly',tier:'plus',cadence:'yearly',amount:2999,interval:'year',price:process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,product:process.env.STRIPE_PLUS_PRODUCT_ID},
  {key:'proMonthly',tier:'pro',cadence:'monthly',amount:799,interval:'month',price:process.env.STRIPE_PRO_MONTHLY_PRICE_ID,product:process.env.STRIPE_PRO_PRODUCT_ID},
  {key:'proYearly',tier:'pro',cadence:'yearly',amount:5999,interval:'year',price:process.env.STRIPE_PRO_ANNUAL_PRICE_ID,product:process.env.STRIPE_PRO_PRODUCT_ID}
];

async function expire(ids){
  const results=[];
  for(const id of ids){
    if(!/^cs_live_[A-Za-z0-9]+$/.test(id))throw new Error(`Invalid LIVE Checkout Session id: ${id}`);
    const session=await stripe.checkout.sessions.retrieve(id);
    const finalSession=session.status==='open'?await stripe.checkout.sessions.expire(id):session;
    results.push({id:finalSession.id,status:finalSession.status,livemode:finalSession.livemode});
  }
  return results;
}

async function create(){
  const created=[];
  try{
    for(const spec of specs){
      const session=await stripe.checkout.sessions.create({
        mode:'subscription',
        line_items:[{price:spec.price,quantity:1}],
        allow_promotion_codes:true,
        automatic_tax:{enabled:false},
        consent_collection:{terms_of_service:'required'},
        success_url:`https://www.taxmate.uk/?billing=success&tier=${spec.tier}&cadence=${spec.cadence}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`https://www.taxmate.uk/?billing=cancelled&tier=${spec.tier}&cadence=${spec.cadence}`,
        metadata:{taxmate_health_smoke:'true',tier:spec.tier,billingCadence:spec.cadence},
        subscription_data:{metadata:{taxmate_health_smoke:'true',tier:spec.tier,billingCadence:spec.cadence}},
        expand:['line_items']
      },{idempotencyKey:`taxmate-healthy-${spec.key}-${crypto.randomUUID()}`});
      created.push(session.id);
      assert.equal(session.livemode,true);
      assert.equal(session.status,'open');
      assert.equal(session.mode,'subscription');
      assert.equal(session.customer,null);
      assert.equal(session.subscription,null);
      assert.equal(session.payment_status,'unpaid');
      assert.equal(session.currency,'gbp');
      assert.equal(session.amount_total,spec.amount);
      assert.equal(session.total_details.amount_tax,0);
      assert.equal(session.automatic_tax.enabled,false);
      assert.equal(session.consent_collection.terms_of_service,'required');
      assert.equal(session.line_items.data.length,1);
      const price=session.line_items.data[0].price;
      assert.equal(price.id,spec.price);
      assert.equal(price.livemode,true);
      assert.equal(price.unit_amount,spec.amount);
      assert.equal(price.currency,'gbp');
      assert.equal(price.type,'recurring');
      assert.equal(price.recurring.interval,spec.interval);
      assert.equal(price.product,spec.product);
    }
    return specs.map((spec,index)=>({key:spec.key,tier:spec.tier,cadence:spec.cadence,amount:spec.amount,currency:'gbp',interval:spec.interval,sessionId:created[index]}));
  }catch(error){
    await expire(created).catch(()=>{});
    throw error;
  }
}

async function main(){
  const command=process.argv[2]||'create';
  if(command==='create')process.stdout.write(`${JSON.stringify(await create(),null,2)}\n`);
  else if(command==='expire'){
    const ids=JSON.parse(process.env.STRIPE_SMOKE_SESSION_IDS_JSON||'[]');
    if(!Array.isArray(ids)||ids.length!==4)throw new Error('STRIPE_SMOKE_SESSION_IDS_JSON must contain the four session ids');
    process.stdout.write(`${JSON.stringify(await expire(ids),null,2)}\n`);
  }else throw new Error('Usage: smoke-live-checkout-sessions.js <create|expire>');
}

if(require.main===module)main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
module.exports={specs,create,expire};

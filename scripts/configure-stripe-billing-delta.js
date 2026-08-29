'use strict';
const path=require('node:path');
const Stripe=require(path.resolve(__dirname,'..','functions','node_modules','stripe'));

const required=['STRIPE_SECRET_KEY','TAXMATE_STRIPE_ACCOUNT_ID','STRIPE_PLUS_PRODUCT_ID','STRIPE_PRO_PRODUCT_ID','EXPECTED_STRIPE_MODE'];
for(const name of required)if(!process.env[name])throw new Error(`Missing ${name}`);
if(process.env.EXPECTED_STRIPE_MODE!=='test')throw new Error('This candidate helper is TEST-mode only; production billing alignment requires separate release authority');
if(!/^(?:sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY))throw new Error('A TEST-mode Stripe key is required');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),expectedLive=false;
const desired=[
  {tier:'plus',cadence:'monthly',product:process.env.STRIPE_PLUS_PRODUCT_ID,amount:399,interval:'month'},
  {tier:'plus',cadence:'yearly',product:process.env.STRIPE_PLUS_PRODUCT_ID,amount:2999,interval:'year'},
  {tier:'pro',cadence:'monthly',product:process.env.STRIPE_PRO_PRODUCT_ID,amount:999,interval:'month'},
  {tier:'pro',cadence:'yearly',product:process.env.STRIPE_PRO_PRODUCT_ID,amount:9999,interval:'year'}
];

async function ensurePrice(spec){
  const prices=await stripe.prices.list({product:spec.product,active:true,limit:100});
  let price=prices.data.find(item=>item.currency==='gbp'&&item.unit_amount===spec.amount&&item.recurring?.interval===spec.interval&&item.recurring?.interval_count===1);
  if(!price)price=await stripe.prices.create({product:spec.product,currency:'gbp',unit_amount:spec.amount,recurring:{interval:spec.interval,interval_count:1},nickname:`TaxMate ${spec.tier} ${spec.cadence}`,metadata:{taxmate_tier:spec.tier,taxmate_cadence:spec.cadence,taxmate_price_model:'2026-08'}});
  if(price.livemode!==expectedLive)throw new Error(`${spec.tier} ${spec.cadence} mode mismatch`);
  if(price.tax_behavior==='inclusive')throw new Error(`${spec.tier} ${spec.cadence} must not claim VAT inclusion`);
  return{tier:spec.tier,cadence:spec.cadence,productId:spec.product,priceId:price.id,amount:price.unit_amount,currency:price.currency,interval:price.recurring.interval,livemode:price.livemode,createdNow:price.metadata?.taxmate_price_model==='2026-08'};
}

async function main(){
  const account=await stripe.accounts.retrieve();if(account.id!==process.env.TAXMATE_STRIPE_ACCOUNT_ID)throw new Error(`Stripe account mismatch: ${account.id}`);
  const products=await Promise.all([stripe.products.retrieve(process.env.STRIPE_PLUS_PRODUCT_ID),stripe.products.retrieve(process.env.STRIPE_PRO_PRODUCT_ID)]);
  if(products[0].name!=='TaxMate Plus'||products[1].name!=='TaxMate Pro')throw new Error('TaxMate Product identity mismatch');
  const prices=[];for(const spec of desired)prices.push(await ensurePrice(spec));
  process.stdout.write(`${JSON.stringify({accountId:account.id,mode:process.env.EXPECTED_STRIPE_MODE,prices},null,2)}\n`);
}
main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});

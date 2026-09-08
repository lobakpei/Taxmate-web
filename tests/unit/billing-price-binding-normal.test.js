'use strict';

// Normal configuration and service-consumption examples only. Provider-shaped
// values below are local test doubles, not payment or webhook transport evidence.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Prices=require('../../functions/billing-price-config');
const Plans=require('../../functions/billing-plans');
const Checkout=require('../../functions/billing-checkout');
const {parseEnv,readConfig,inspect}=require('../../scripts/check-stripe-test-connection');
const root=path.resolve(__dirname,'../..');
const live=parseEnv(fs.readFileSync(path.join(root,'functions','.env.taxmate-uk-2'),'utf8')),sandbox=readConfig();
const expected={
  live:{plusMonthly:'price_1U6Wi4Q2jZLVx6pgFbTCmjV3',plusAnnual:'price_1U6ZfnQ2jZLVx6pgNCCfs5Cg',proMonthly:'price_1UAGaQQ2jZLVx6pgKA7iqgDM',proAnnual:'price_1UAGbIQ2jZLVx6pgkobZ6oXz',standard:'price_1UAGahQ2jZLVx6pgEUvsFGO3',oldMonthly:['price_1U6WiHQ2jZLVx6pgJWYXlwHv','price_1U6ZgaQ2jZLVx6pgi7dHPBeO'],oldAnnual:'price_1U6ZgtQ2jZLVx6pgOeS7cRYl'},
  sandbox:{plusMonthly:'price_1U6HQBL0bYJwhRlmpOkns65Z',plusAnnual:'price_1U6ZEqL0bYJwhRlmu3DBbLiG',proMonthly:'price_1UD4YGL0bYJwhRlmQPC6Jbzk',proAnnual:'price_1UD4ZpL0bYJwhRlmLUMJIAZW',standard:'price_1UD4YzL0bYJwhRlmopJlN9op',oldMonthly:['price_1U6HQZL0bYJwhRlm1u5hbB7w','price_1U6ZErL0bYJwhRlm4P8aOWzy'],oldAnnual:'price_1U6ZErL0bYJwhRlmEjbDgo3i'}
};
for(const [mode,config] of Object.entries({live,sandbox})){
  for(const [tier,cadence,suffix,amount] of [
    ['plus','monthly','Monthly',399],['plus','yearly','Annual',2999],
    ['pro','monthly','Monthly',999],['pro','yearly','Annual',9999]
  ])test(mode+' '+tier+' '+cadence+' configuration reaches the real offer/price service',async()=>{
    const id=expected[mode][tier+suffix],reads=[],records=new Map();
    assert.equal(Prices.current(config,tier,cadence),id);
    assert.deepEqual(Prices.describe(config,id),{tier,cadence});
    const localPrice={id,currency:'gbp',unit_amount:amount,active:true,recurring:{interval:cadence==='yearly'?'year':'month',interval_count:1}};
    const client={prices:{retrieve:async requested=>{reads.push(requested);assert.equal(requested,id);return localPrice;}}};
    const plans=Plans.createService({client,priceFor:(t,c)=>Prices.current(config,t,c)});
    const db={doc:p=>({get:async()=>({exists:records.has(p),data:()=>records.get(p)}),create:async value=>records.set(p,value)})};
    const checkout=Checkout.createService({db,client,targetPrice:plans.targetPrice,now:()=>Date.parse('2026-09-07T12:00:00Z')});
    const result=await checkout.offer({uid:'normal-price-binding'},{tier,cadence});
    assert.deepEqual(reads,[id]);assert.equal(result.offer.priceMinor,amount);
    assert.equal(result.offer.cadence,cadence);assert.equal(result.offer.tier,tier);
    assert.equal(records.get('billingCheckoutOffers/'+result.offer.id).priceId,id);
  });
  test(mode+' retained historical prices keep Pro and their original cadence',()=>{
    for(const id of expected[mode].oldMonthly)assert.deepEqual(Prices.describe(config,id),{tier:'pro',cadence:'monthly',legacy:true});
    assert.deepEqual(Prices.describe(config,expected[mode].oldAnnual),{tier:'pro',cadence:'yearly',legacy:true});
  });
  test(mode+' standard monthly price is separate from the current launch selection',()=>{
    assert.notEqual(Prices.current(config,'pro','monthly'),expected[mode].standard);
    assert.equal(config.BILLING_MONEY_OPERATIONS_ENABLED,mode==='live'?'false':undefined);
    assert.equal(config.BILLING_CONSUMER_DISCLOSURES_READY,mode==='live'?'false':undefined);
  });
}
test('LIVE and TEST configuration are distinct and the source caller uses explicit price bindings',()=>{
  const a=Object.values(Prices.CURRENT_KEYS).flatMap(keys=>Object.values(keys)).map(key=>live[key]);
  const b=Object.values(Prices.CURRENT_KEYS).flatMap(keys=>Object.values(keys)).map(key=>sandbox[key]);
  assert.equal(new Set([...a,...b]).size,8);
  assert.equal(sandbox.EXPECTED_STRIPE_MODE,'test');assert.equal(sandbox.TAXMATE_STRIPE_ACCOUNT_ID,'acct_1U6GdCL0bYJwhRlm');
  assert.equal(sandbox.STRIPE_PRO_STANDARD_MONTHLY_PRICE_ID,expected.sandbox.standard);
  const source=fs.readFileSync(path.join(root,'functions','index.js'),'utf8');
  assert.match(source,/priceFor:\(tier,cadence\)=>BillingPrices\.current\(billingPriceConfiguration\(\),tier,cadence\)/);
  assert.match(source,/BillingPrices\.describe\(billingPriceConfiguration\(\),priceId\)/);
  assert.match(source,/PRO_MONTHLY_PRICE\.value\(\)/);assert.match(source,/PRO_ANNUAL_PRICE\.value\(\)/);
});
test('normal disconnected readiness stays local and does not claim provider success',()=>{
  const report=inspect(sandbox,{});
  assert.equal(report.status,'BLOCKED_TEST_CREDENTIALS');assert.equal(report.externalWrites,0);
  assert.equal(report.runtimeStarted,false);assert.equal(report.providerAccountVerified,false);
  assert.equal(report.webhookTransportVerified,false);assert.equal(report.providerPaymentTests,'NOT_RUN');
});

'use strict';

// Explicit runtime price IDs, never a provider product's mutable default price.
const CURRENT_KEYS=Object.freeze({
  plus:Object.freeze({monthly:'STRIPE_PLUS_MONTHLY_PRICE_ID',yearly:'STRIPE_PLUS_ANNUAL_PRICE_ID'}),
  pro:Object.freeze({monthly:'STRIPE_PRO_MONTHLY_PRICE_ID',yearly:'STRIPE_PRO_ANNUAL_PRICE_ID'})
});
function current(config,tier,cadence){
  const key=CURRENT_KEYS[tier]?.[cadence];
  return key?config[key]||'':'';
}
function describe(config,priceId){
  for(const tier of ['plus','pro'])for(const cadence of ['monthly','yearly']){
    const id=current(config,tier,cadence);
    if(id&&id===priceId)return{tier,cadence};
  }
  // A replaced annual price must not fall through to a monthly legacy alias.
  for(const [key,tier,cadence] of [
    ['STRIPE_PRO_LEGACY_ANNUAL_PRICE_IDS','pro','yearly'],
    ['STRIPE_PLUS_LEGACY_PRICE_IDS','plus','monthly'],
    ['STRIPE_PRO_LEGACY_PRICE_IDS','pro','monthly']
  ]){
    if(String(config[key]||'').split(',').map(id=>id.trim()).filter(Boolean).includes(priceId))return{tier,cadence,legacy:true};
  }
  return{tier:'free',cadence:null};
}
module.exports={CURRENT_KEYS,current,describe};

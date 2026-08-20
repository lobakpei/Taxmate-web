(function(root,factory){
  const api=factory(); if(typeof module==='object'&&module.exports) module.exports=api; root.TaxMateEntitlement=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TIERS={free:0,plus:1,pro:2};
  const ACTIVE=new Set(['active','trialing']);
  function activePromotion(snapshot,t){
    const candidates=[];
    if(snapshot.promotions&&typeof snapshot.promotions==='object')for(const [code,promotion] of Object.entries(snapshot.promotions))candidates.push({...promotion,code});
    if(!candidates.length&&snapshot.promotion)candidates.push({...snapshot.promotion,code:snapshot.promotion.promoCode||snapshot.promotion.promotionCodeId||null});
    return candidates.filter(p=>p&&p.status==='active'&&t<Number(p.expiresAt)&&TIERS[p.tier]>0).sort((a,b)=>TIERS[b.tier]-TIERS[a.tier]||Number(b.expiresAt)-Number(a.expiresAt))[0]||null;
  }
  function resolve(snapshot,now,offline){
    const t=Number(now)||Date.now();
    if(!snapshot||typeof snapshot!=='object') return {tier:'free',source:'none',reason:'missing'};
    const verified=Number(snapshot.serverVerifiedAt)||0;
    if(offline&&(!verified||t-verified>72*3600*1000)) return {tier:'free',source:'offline-expired',reason:'verification-stale'};
    const paid=ACTIVE.has(snapshot.subscriptionStatus)&&TIERS[snapshot.paidTier]>0&&(!snapshot.currentPeriodEnd||t<Number(snapshot.currentPeriodEnd));
    if(paid) return {tier:snapshot.paidTier,source:'stripe',reason:snapshot.subscriptionStatus};
    const promo=activePromotion(snapshot,t);
    if(promo) return {tier:promo.tier,source:'promotion',reason:'active',expiresAt:Number(promo.expiresAt),promoCode:promo.code};
    if(snapshot.graceUntil&&t<Number(snapshot.graceUntil)&&TIERS[snapshot.lastPaidTier]>0) return {tier:snapshot.lastPaidTier,source:'grace',reason:'payment-retry'};
    return {tier:'free',source:'fallback',reason:snapshot.subscriptionStatus||'expired'};
  }
  function canUse(tier,required){ return (TIERS[tier]||0)>=(TIERS[required]||0); }
  function validatePromotionCode(code){ return typeof code==='string'&&/^[A-Z0-9][A-Z0-9_-]{3,31}$/.test(code.trim().toUpperCase()); }
  return {TIERS,resolve,canUse,validatePromotionCode,activePromotion};
});

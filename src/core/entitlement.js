(function(root,factory){
  const api=factory(); if(typeof module==='object'&&module.exports) module.exports=api; root.TaxMateEntitlement=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TIERS={free:0,plus:1,pro:2};
  const ACTIVE=new Set(['active','trialing']);
  const DAY=86400000;
  function promotionActive(p,t){return !!(p&&p.status==='active'&&Number(p.startsAt||0)<=t&&TIERS[p.tier]>0&&(p.permanent===true||p.expiresAt===null||t<Number(p.expiresAt)));}
  function activePromotion(snapshot,t){
    const candidates=[];
    if(snapshot.promotions&&typeof snapshot.promotions==='object')for(const [code,promotion] of Object.entries(snapshot.promotions))candidates.push({...promotion,code});
    if(!candidates.length&&snapshot.promotion)candidates.push({...snapshot.promotion,code:snapshot.promotion.promoCode||snapshot.promotion.promotionCodeId||null});
    return candidates.filter(p=>promotionActive(p,t)).sort((a,b)=>TIERS[b.tier]-TIERS[a.tier]||((b.permanent||b.expiresAt===null)?Infinity:Number(b.expiresAt))-((a.permanent||a.expiresAt===null)?Infinity:Number(a.expiresAt)))[0]||null;
  }
  function resolve(snapshot,now,offline){
    const t=Number(now)||Date.now();
    if(!snapshot||typeof snapshot!=='object') return {tier:'free',source:'none',reason:'missing'};
    const verified=Number(snapshot.serverVerifiedAt)||0;
    if(offline&&(!verified||t-verified>72*3600*1000)) return {tier:'free',source:'offline-expired',reason:'verification-stale'};
    const paid=ACTIVE.has(snapshot.subscriptionStatus)&&TIERS[snapshot.paidTier]>0&&(!snapshot.currentPeriodEnd||t<Number(snapshot.currentPeriodEnd));
    const promo=activePromotion(snapshot,t);
    if(paid&&(!promo||TIERS[snapshot.paidTier]>=TIERS[promo.tier])) return {tier:snapshot.paidTier,source:'stripe',reason:snapshot.subscriptionStatus};
    if(promo) return {tier:promo.tier,source:'promotion',reason:'active',expiresAt:promo.expiresAt===null?null:Number(promo.expiresAt),permanent:promo.permanent===true||promo.expiresAt===null,promoCode:promo.code};
    if(snapshot.graceUntil&&t<Number(snapshot.graceUntil)&&TIERS[snapshot.lastPaidTier]>0) return {tier:snapshot.lastPaidTier,source:'grace',reason:'payment-retry'};
    return {tier:'free',source:'fallback',reason:snapshot.subscriptionStatus||'expired'};
  }
  function canUse(tier,required){ return (TIERS[tier]||0)>=(TIERS[required]||0); }
  function validatePromotionCode(code){ return typeof code==='string'&&/^[A-Z0-9][A-Z0-9_-]{3,31}$/.test(code.trim().toUpperCase()); }
  function notification(snapshot,now){
    const t=Number(now)||Date.now(),access=resolve(snapshot,t,false);
    if(snapshot&&snapshot.billingCadence==='yearly'&&ACTIVE.has(snapshot.subscriptionStatus)&&Number(snapshot.currentPeriodEnd)>t){
      const days=Math.ceil((Number(snapshot.currentPeriodEnd)-t)/DAY);
      if(days<=30){const tier=snapshot.paidTier==='pro'?'Pro':'Plus',date=new Date(Number(snapshot.currentPeriodEnd)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});return snapshot.cancelAtPeriodEnd?{id:`paid-end-${snapshot.currentPeriodEnd}`,stage:'paid-end',message:`Your ${tier} plan ends on ${date}.`,cta:'Manage subscription'}:{id:`paid-renew-${snapshot.currentPeriodEnd}`,stage:'paid-renew',message:`Your ${tier} plan renews on ${date} for ${snapshot.paidTier==='pro'?'£59.99':'£29.99'}.`,cta:'Manage subscription'};}
    }
    const promotions=snapshot&&snapshot.promotions&&typeof snapshot.promotions==='object'?Object.entries(snapshot.promotions):[];
    const active=activePromotion(snapshot||{},t);
    if(active&&!active.permanent&&active.expiresAt!==null){
      const days=Math.ceil((Number(active.expiresAt)-t)/DAY),tier=active.tier==='pro'?'Pro':'Plus';
      if(days<=1)return{id:`promo-${active.code}-1`,stage:'promo-1',message:`Your ${tier} access ends tomorrow.`,cta:'View plans'};
      if(days<=7)return{id:`promo-${active.code}-7`,stage:'promo-7',message:`7 days of ${tier} left.`,cta:'View plans'};
      if(days<=30){const date=new Date(Number(active.expiresAt)-1).toLocaleDateString('en-GB',{day:'numeric',month:'short'});return{id:`promo-${active.code}-30`,stage:'promo-30',message:`Your free ${tier} access ends on ${date}.`,cta:'View plans'};}
    }
    const expired=promotions.filter(([,p])=>p&&p.status==='active'&&!p.permanent&&p.expiresAt!==null&&Number(p.expiresAt)<=t).sort((a,b)=>Number(b[1].expiresAt)-Number(a[1].expiresAt))[0];
    if(expired){const oldTier=expired[1].tier==='pro'?'Pro':'Plus',current=access.tier==='plus'?'Plus':access.tier==='pro'?'Pro':'Free';return{id:`promo-${expired[0]}-expired-${expired[1].expiresAt}`,stage:'promo-expired',message:current==='Free'?`Your free ${oldTier} access has ended. You're now on Free. Your data is still here.`:`Your free ${oldTier} access has ended. You still have ${current} access. Your data is still here.`,cta:'View plans'};}
    return null;
  }
  function hasPermanentPro(snapshot,now){return activePromotion(snapshot||{},Number(now)||Date.now())?.tier==='pro'&&activePromotion(snapshot||{},Number(now)||Date.now())?.permanent===true;}
  return {TIERS,resolve,canUse,validatePromotionCode,activePromotion,notification,hasPermanentPro};
});

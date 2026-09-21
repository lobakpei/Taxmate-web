(function(root,factory){
  const api=factory(); if(typeof module==='object'&&module.exports) module.exports=api; root.TaxMateEntitlement=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TIERS={free:0,plus:1,pro:2};
  const ACTIVE=new Set(['active','trialing']);
  const DAY=86400000,UK_TAX_YEAR_START_MONTH=4,UK_TAX_YEAR_START_DAY=6;
  function ukDateParts(timestamp){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Number(timestamp))),value=type=>Number(parts.find(part=>part.type===type)?.value);return{year:value('year'),month:value('month'),day:value('day')};}
  function isoDate(parts){return`${String(parts.year).padStart(4,'0')}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}`;}
  function taxYearRetentionBoundary(timestamp){const start=ukDateParts(timestamp),beforeStart=start.month<UK_TAX_YEAR_START_MONTH||(start.month===UK_TAX_YEAR_START_MONTH&&start.day<UK_TAX_YEAR_START_DAY),deleteYear=beforeStart?start.year:start.year+1,deleteOn={year:deleteYear,month:UK_TAX_YEAR_START_MONTH,day:UK_TAX_YEAR_START_DAY},retainThrough={year:deleteYear,month:UK_TAX_YEAR_START_MONTH,day:UK_TAX_YEAR_START_DAY-1};return{retainThroughDate:isoDate(retainThrough),deleteOnDate:isoDate(deleteOn),retainUntil:Date.UTC(deleteOn.year,deleteOn.month-1,deleteOn.day)};}
  function displayIsoDate(value){return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});}
  function promotionActive(p,t){return !!(p&&p.status==='active'&&Number(p.startsAt||0)<=t&&TIERS[p.tier]>0&&(p.permanent===true||p.expiresAt===null||t<Number(p.expiresAt)));}
  function activePromotion(snapshot,t){
    const candidates=[];
    if(snapshot.promotions&&typeof snapshot.promotions==='object')for(const [code,promotion] of Object.entries(snapshot.promotions))candidates.push({...promotion,code});
    if(!candidates.length&&snapshot.promotion)candidates.push({...snapshot.promotion,code:snapshot.promotion.promoCode||snapshot.promotion.promotionCodeId||null});
    const projected=snapshot.promotionAccess||{};
    for(const tier of ['plus','pro'])if(projected[tier+'Permanent']===true||Number(projected[tier+'ExpiresAt'])>t)candidates.push({tier,status:'active',permanent:projected[tier+'Permanent']===true,expiresAt:projected[tier+'Permanent']===true?null:Number(projected[tier+'ExpiresAt']),code:null});
    return candidates.filter(p=>promotionActive(p,t)).sort((a,b)=>TIERS[b.tier]-TIERS[a.tier]||((b.permanent||b.expiresAt===null)?Infinity:Number(b.expiresAt))-((a.permanent||a.expiresAt===null)?Infinity:Number(a.expiresAt)))[0]||null;
  }
  function resolve(snapshot,now,offline){
    const t=Number(now)||Date.now();
    if(!snapshot||typeof snapshot!=='object') return {tier:'free',source:'none',reason:'missing'};
    // A permanent Founder/Pro grant has no provider expiry to re-check. Once the
    // server-verified, UID-scoped entitlement snapshot is cached, keep that grant
    // usable offline and reconcile any later revocation on the next connection.
    // Time-limited promotions and paid subscriptions still fail closed when the
    // cached server verification is stale.
    const verified=Number(snapshot.serverVerifiedAt)||0;
    const promo=activePromotion(snapshot,t);
    if(offline&&verified&&promo&&promo.permanent===true) return {tier:promo.tier,source:'promotion',reason:'offline-permanent',expiresAt:null,permanent:true,promoCode:promo.code};
    if(offline&&(!verified||t-verified>72*3600*1000)) return {tier:'free',source:'offline-expired',reason:'verification-stale'};
    const legacyPaid=ACTIVE.has(snapshot.subscriptionStatus)&&TIERS[snapshot.paidTier]>0&&(!snapshot.currentPeriodEnd||t<Number(snapshot.currentPeriodEnd))?snapshot.paidTier:'free';
    const funded=snapshot.paidAccess,paidTier=funded?(Number(funded.proExpiresAt)>t?'pro':Number(funded.plusExpiresAt)>t?'plus':'free'):legacyPaid;
    const playAccess=snapshot.googlePlayAccess||{},playTier=playAccess.active===true&&TIERS[playAccess.tier]>0&&Number(playAccess.expiresAt)>t?playAccess.tier:'free';
    const appStoreAccess=snapshot.appStoreAccess||{},appStoreTier=appStoreAccess.active===true&&TIERS[appStoreAccess.tier]>0&&Number(appStoreAccess.expiresAt)>t?appStoreAccess.tier:'free';
    const stripeExpiry=paidTier==='pro'?Number(funded?.proExpiresAt||snapshot.currentPeriodEnd||Infinity):paidTier==='plus'?Number(funded?.plusExpiresAt||snapshot.currentPeriodEnd||Infinity):0;
    const purchased=[{tier:paidTier,source:'stripe',expiresAt:stripeExpiry,access:null},{tier:playTier,source:'google_play',expiresAt:Number(playAccess.expiresAt)||0,access:playAccess},{tier:appStoreTier,source:'app_store',expiresAt:Number(appStoreAccess.expiresAt)||0,access:appStoreAccess}].sort((a,b)=>TIERS[b.tier]-TIERS[a.tier]||b.expiresAt-a.expiresAt)[0];
    const purchasedTier=purchased.tier;
    if(TIERS[purchasedTier]>0&&(!promo||TIERS[purchasedTier]>=TIERS[promo.tier])) return purchased.source==='stripe'?{tier:purchasedTier,source:'stripe',reason:snapshot.subscriptionStatus}: {tier:purchasedTier,source:purchased.source,reason:purchased.access.status||'active',expiresAt:Number(purchased.access.expiresAt),autoRenewEnabled:purchased.access.autoRenewEnabled===true};
    if(promo) return {tier:promo.tier,source:'promotion',reason:'active',expiresAt:promo.expiresAt===null?null:Number(promo.expiresAt),permanent:promo.permanent===true||promo.expiresAt===null,promoCode:promo.code};
    if(snapshot.graceUntil&&t<Number(snapshot.graceUntil)&&TIERS[snapshot.lastPaidTier]>0) return {tier:snapshot.lastPaidTier,source:'grace',reason:'payment-retry'};
    return {tier:'free',source:'fallback',reason:snapshot.subscriptionStatus||'expired'};
  }
  function chargeableProviders(snapshot,now=Date.now()){
    const data=snapshot&&typeof snapshot==='object'?snapshot:{},t=Number(now)||Date.now(),rows=[];
    const stripeStatuses=new Set(['active','trialing','past_due','unpaid','incomplete','paused']),stripeSubscriptions=Object.values(data.paidSubscriptions&&typeof data.paidSubscriptions==='object'?data.paidSubscriptions:{});
    const stripeEnd=Math.max(Number(data.currentPeriodEnd)||0,Number(data.paidAccess&&data.paidAccess.plusExpiresAt)||0,Number(data.paidAccess&&data.paidAccess.proExpiresAt)||0);
    const stripeStatus=String(data.subscriptionStatus||''),stripePending=stripeStatuses.has(stripeStatus)||stripeSubscriptions.some(value=>stripeStatuses.has(String(value&&value.providerStatus||'')));
    if(stripePending||stripeEnd>t)rows.push({provider:'stripe',tier:TIERS[data.paidTier]>0?data.paidTier:Number(data.paidAccess&&data.paidAccess.proExpiresAt)>t?'pro':Number(data.paidAccess&&data.paidAccess.plusExpiresAt)>t?'plus':'free',status:stripeStatus||'funded',expiresAt:stripeEnd||null});
    const play=data.googlePlayAccess||{},playStatus=String(play.status||''),playPending=['active','pending','on_hold','paused','in_grace_period'].includes(playStatus);
    if(playPending||play.active===true&&Number(play.expiresAt)>t)rows.push({provider:'google_play',tier:TIERS[play.tier]>0?play.tier:TIERS[play.purchasedTier]>0?play.purchasedTier:'free',status:playStatus||'active',expiresAt:Number(play.expiresAt)||null});
    const apple=data.appStoreAccess||{},appleStatus=String(apple.status||''),applePending=['active','pending','billing_retry','billing_grace_period'].includes(appleStatus);
    if(applePending||apple.active===true&&Number(apple.expiresAt)>t)rows.push({provider:'app_store',tier:TIERS[apple.tier]>0?apple.tier:TIERS[apple.purchasedTier]>0?apple.purchasedTier:'free',status:appleStatus||'active',expiresAt:Number(apple.expiresAt)||null});
    return rows;
  }
  function billingProviderConflict(snapshot,now=Date.now()){
    const providers=chargeableProviders(snapshot,now);
    return{active:providers.length>1,providers,evidence:snapshot&&snapshot.billingConflict||null};
  }
  function canUse(tier,required){ return (TIERS[tier]||0)>=(TIERS[required]||0); }
  function validatePromotionCode(code){ return typeof code==='string'&&/^[A-Z0-9][A-Z0-9_-]{3,31}$/.test(code.trim().toUpperCase()); }
  function paidAccessEnd(snapshot={},now=Date.now()){
    const values=[],grants=snapshot.promotions?Object.values(snapshot.promotions):snapshot.promotion?[snapshot.promotion]:[];
    for(const tier of ['plus','pro'])if(Number(snapshot.paidAccess?.[tier+'ExpiresAt'])>now)values.push(Number(snapshot.paidAccess[tier+'ExpiresAt']));
    if(snapshot.googlePlayAccess?.active===true&&TIERS[snapshot.googlePlayAccess.tier]>0&&Number(snapshot.googlePlayAccess.expiresAt)>now)values.push(Number(snapshot.googlePlayAccess.expiresAt));
    if(snapshot.appStoreAccess?.active===true&&TIERS[snapshot.appStoreAccess.tier]>0&&Number(snapshot.appStoreAccess.expiresAt)>now)values.push(Number(snapshot.appStoreAccess.expiresAt));
    const projected=snapshot.promotionAccess||{};
    for(const tier of ['plus','pro']){if(projected[tier+'Permanent']===true)return{status:'continuing',at:null};if(Number(projected[tier+'ExpiresAt'])>now)values.push(Number(projected[tier+'ExpiresAt']));}
    if(ACTIVE.has(snapshot.subscriptionStatus)&&TIERS[snapshot.paidTier]>0){
      if(!Number(snapshot.currentPeriodEnd))return{status:'needs_checking',at:null};
      values.push(Number(snapshot.currentPeriodEnd));
    }
    if(TIERS[snapshot.lastPaidTier]>0&&Number(snapshot.graceUntil)>now)values.push(Number(snapshot.graceUntil));
    for(const p of grants)if(promotionActive(p,now)){
      if(p.permanent===true||p.expiresAt===null)return{status:'continuing',at:null};
      values.push(Number(p.expiresAt));
    }
    return values.length?{status:'known',at:Math.max(...values)}:{status:'needs_checking',at:null};
  }
  function legacyNotification(snapshot,now){
    const t=Number(now)||Date.now(),access=resolve(snapshot,t,false);
    if(snapshot&&snapshot.cancelAtPeriodEnd===true&&ACTIVE.has(snapshot.subscriptionStatus)&&Number(snapshot.currentPeriodEnd)>t){
      const end=paidAccessEnd(snapshot,t),boundary=end.status==='known'?taxYearRetentionBoundary(end.at):null;
      const message=end.status==='continuing'?'Your subscription is set to end. Another continuing paid entitlement keeps your data and its included exports available.':boundary?
        'Paid access ends on '+new Date(end.at).toLocaleDateString('en-GB')+'. Download your paid PDF and Receipt Pack reports before then. Make a Full Backup ZIP for restoration, including receipt files. If you remain Free, historical bookkeeping data across your account is deleted on '+boundary.deleteOnDate+'. Plus or Pro keeps your history.':
        'Your subscription is set to end. Download paid reports and a Full Backup ZIP before paid access ends. Your effective paid-access end and data-deletion dates need checking.';
      return{id:'paid-end-'+snapshot.currentPeriodEnd,stage:'paid-end',message,cta:'Manage subscription'};
    }
    if(snapshot&&snapshot.billingCadence==='yearly'&&ACTIVE.has(snapshot.subscriptionStatus)&&Number(snapshot.currentPeriodEnd)>t){
      const days=Math.ceil((Number(snapshot.currentPeriodEnd)-t)/DAY);
      if(days<=30){const renewal=snapshot.nextRenewals?.find(r=>r.subscriptionId===snapshot.activeSubscriptionId);const date=new Date(Number(renewal?.at||snapshot.currentPeriodEnd)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),tier=renewal?.tier==='pro'?'Pro':renewal?.tier==='plus'?'Plus':null;return{id:`paid-renew-${snapshot.currentPeriodEnd}-${renewal?.tier||'review'}`,stage:'paid-renew',renewalAt:renewal?.at||snapshot.currentPeriodEnd,renewalTier:renewal?.tier||null,message:tier?`Your ${tier} renewal is scheduled for ${date}. Open Manage subscription to review the price and payment status.`:`Your subscription renewal is due on ${date}. Open Manage subscription to review the current plan and price.`,cta:'Manage subscription'};}
    }
    const promotions=snapshot&&snapshot.promotions&&typeof snapshot.promotions==='object'?Object.entries(snapshot.promotions):[];
    const active=activePromotion(snapshot||{},t);
    if(active&&!active.permanent&&active.expiresAt!==null){
      const days=Math.ceil((Number(active.expiresAt)-t)/DAY),tier=active.tier==='pro'?'Pro':'Plus',retained=displayIsoDate(taxYearRetentionBoundary(active.expiresAt).retainThroughDate),ltdNote=active.tier==='pro'?` Retained Limited Company records remain available through ${retained}.`:'';
      if(days<=1)return{id:`promo-${active.code}-1`,stage:'promo-1',message:`Your ${tier} access ends tomorrow. Download any paid reports you need and make a backup today.${ltdNote}`,cta:'View plans'};
      if(days<=7)return{id:`promo-${active.code}-7`,stage:'promo-7',message:`7 days of ${tier} left. Download any paid reports you need and make a backup before access ends.${ltdNote}`,cta:'View plans'};
      if(days<=30){const date=new Date(Number(active.expiresAt)-1).toLocaleDateString('en-GB',{day:'numeric',month:'short'});return{id:`promo-${active.code}-30`,stage:'promo-30',message:`Your free ${tier} access ends on ${date}. Download any paid reports you need and make a backup before then.${ltdNote}`,cta:'View plans'};}
    }
    const expired=promotions.filter(([,p])=>p&&p.status==='active'&&!p.permanent&&p.expiresAt!==null&&Number(p.expiresAt)<=t).sort((a,b)=>Number(b[1].expiresAt)-Number(a[1].expiresAt))[0];
    if(expired){const oldTier=expired[1].tier==='pro'?'Pro':'Plus',current=access.tier==='plus'?'Plus':access.tier==='pro'?'Pro':'Free',boundary=taxYearRetentionBoundary(expired[1].expiresAt),retained=displayIsoDate(boundary.retainThroughDate),ended=ukDateParts(t).year*10000+ukDateParts(t).month*100+ukDateParts(t).day>=Number(boundary.deleteOnDate.replaceAll('-','')),ltd=expired[1].tier==='pro';return{id:`promo-${expired[0]}-expired-${expired[1].expiresAt}`,stage:'promo-expired',message:current==='Free'?(ltd?(ended?`Your free ${oldTier} access has ended. Paid report exports are locked and the Limited Company tax-year retention period has ended.`:`Your free ${oldTier} access has ended. You're now on Free; paid report exports are locked. Retained Limited Company records remain available through ${retained}.`):`Your free ${oldTier} access has ended. You're now on Free; paid report exports are locked.`):`Your free ${oldTier} access has ended. You still have ${current} access.`,cta:'View plans'};}
    if(access.tier==='free'&&snapshot&&TIERS[snapshot.lastPaidTier]>0&&Number(snapshot.currentPeriodEnd)>0&&Number(snapshot.currentPeriodEnd)<=t){const ltd=snapshot.lastPaidTier==='pro',boundary=taxYearRetentionBoundary(snapshot.currentPeriodEnd),retained=displayIsoDate(boundary.retainThroughDate),today=ukDateParts(t),todayNumber=today.year*10000+today.month*100+today.day,ended=todayNumber>=Number(boundary.deleteOnDate.replaceAll('-','')),message=ltd?(ended?'Your paid access has ended. Paid report exports are locked and the Limited Company tax-year retention period has ended.':`Your paid access has ended. Paid report exports are locked. Retained Limited Company records remain available through ${retained}; make a backup before then.`):'Your paid access has ended. Paid report exports are locked; basic backup remains available on Free.';return{id:`paid-retention-${snapshot.currentPeriodEnd}`,stage:ltd&&ended?'paid-retention-ended':'paid-retention',message,cta:'View plans'};}
    return null;
  }
  // English message/cta remain for old non-UI consumers; the App renders only
  // these structured keys and dates, never the legacy prose.
  function notification(snapshot,now){
    const at=Number(now)||Date.now(),access=resolve(snapshot,at,false),old=legacyNotification(snapshot,at);
    const issue=snapshot&&(['past_due','unpaid','incomplete'].includes(snapshot.subscriptionStatus)||Object.values(snapshot.paidSubscriptions||{}).some(s=>['past_due','unpaid','incomplete'].includes(s.providerStatus))||['in_grace_period','on_hold'].includes(snapshot.googlePlayAccess?.status)||['billing_retry','billing_grace_period'].includes(snapshot.appStoreAccess?.status));
    if(issue&&access.tier!=='free')return{id:'payment-issue-'+snapshot.currentPeriodEnd,stage:'payment-issue',messageKey:'paymentIssue',action:'plans',dateAt:snapshot.currentPeriodEnd,tier:access.tier};
    if(!old)return null;
    const base={...old,action:old.stage.startsWith('paid-end')||old.stage==='paid-renew'?'plans':'viewPlans',tier:access.tier};
    if(old.stage==='paid-renew')return{...base,messageKey:'noticeRenewal',dateAt:old.renewalAt,tier:old.renewalTier||access.tier};
    if(old.stage==='paid-end'){const end=paidAccessEnd(snapshot,at);return{...base,messageKey:end.status==='continuing'?'noticeCancelContinuing':end.status==='known'?'noticeCancelUntil':'noticeCancelCheck',dateAt:end.at};}
    if(['promo-1','promo-7','promo-30'].includes(old.stage)){const promo=activePromotion(snapshot,at);return{...base,messageKey:'noticePromotionUntil',dateAt:promo.expiresAt,tier:promo.tier};}
    if(old.stage==='promo-expired'&&access.tier!=='free')return{...base,messageKey:'noticeOtherAccess'};
    const endedAt=old.stage==='promo-expired'?Math.max(...Object.values(snapshot.promotions||{}).filter(p=>p?.expiresAt&&Number(p.expiresAt)<=at).map(p=>Number(p.expiresAt))):Number(snapshot.currentPeriodEnd);
    const dates=taxYearRetentionBoundary(endedAt),today=isoDate(ukDateParts(at));
    return{...base,messageKey:today>=dates.deleteOnDate?'noticeRetentionEnded':'noticeFreeRetained',dateIso:dates.retainThroughDate};
  }
  function hasPermanentPro(snapshot,now){return activePromotion(snapshot||{},Number(now)||Date.now())?.tier==='pro'&&activePromotion(snapshot||{},Number(now)||Date.now())?.permanent===true;}
  return {TIERS,UK_TAX_YEAR_START_MONTH,UK_TAX_YEAR_START_DAY,ukDateParts,taxYearRetentionBoundary,resolve,chargeableProviders,billingProviderConflict,canUse,validatePromotionCode,activePromotion,notification,hasPermanentPro,paidAccessEnd};
});

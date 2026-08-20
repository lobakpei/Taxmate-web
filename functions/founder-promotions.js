'use strict';

const CODE_PATTERN=/^[A-Z0-9][A-Z0-9_-]{3,31}$/;
const TIER_WEIGHT={plus:1,pro:2};
const MAX_DURATION_DAYS=3650;
const MAX_REDEMPTIONS=1_000_000;

function normalizeCode(value){
  const code=String(value||'').trim().toUpperCase();
  return CODE_PATTERN.test(code)?code:null;
}

function finiteInteger(value){
  const number=Number(value);
  return Number.isInteger(number)?number:null;
}

function validateConfiguration(data,now=Date.now()){
  if(!data||typeof data!=='object')return{ok:false,reason:'missing'};
  if(data.active!==true)return{ok:false,reason:'inactive'};
  if(!TIER_WEIGHT[data.tier])return{ok:false,reason:'invalid-tier'};
  const maximum=finiteInteger(data.maxRedemptions),count=finiteInteger(data.redemptionCount);
  if(maximum===null||maximum<1||maximum>MAX_REDEMPTIONS)return{ok:false,reason:'invalid-max-redemptions'};
  if(count===null||count<0)return{ok:false,reason:'invalid-redemption-count'};
  if(count>=maximum)return{ok:false,reason:'redemption-limit-reached'};
  const duration=finiteInteger(data.durationDays),fixedExpiry=finiteInteger(data.expiresAt);
  const validDuration=duration!==null&&duration>=1&&duration<=MAX_DURATION_DAYS;
  const validFixedExpiry=fixedExpiry!==null&&fixedExpiry>Number(now);
  if(validDuration===validFixedExpiry)return{ok:false,reason:'invalid-expiry-configuration'};
  return{ok:true,tier:data.tier,maxRedemptions:maximum,redemptionCount:count,durationDays:validDuration?duration:null,expiresAt:validFixedExpiry?fixedExpiry:null};
}

function entitlementExpiry(configuration,now=Date.now()){
  return configuration.durationDays?Number(now)+configuration.durationDays*86400000:configuration.expiresAt;
}

function selectEffective(promotions,now=Date.now()){
  const entries=promotions&&typeof promotions==='object'?Object.entries(promotions):[];
  return entries.reduce((best,[code,promotion])=>{
    if(!promotion||promotion.status!=='active'||!TIER_WEIGHT[promotion.tier]||Number(promotion.expiresAt)<=Number(now))return best;
    const candidate={...promotion,code};
    if(!best||TIER_WEIGHT[candidate.tier]>TIER_WEIGHT[best.tier]||(candidate.tier===best.tier&&Number(candidate.expiresAt)>Number(best.expiresAt)))return candidate;
    return best;
  },null);
}

function redemptionId(code,uid){return`${code}__${uid}`;}

module.exports={CODE_PATTERN,TIER_WEIGHT,MAX_DURATION_DAYS,MAX_REDEMPTIONS,normalizeCode,validateConfiguration,entitlementExpiry,selectEffective,redemptionId};

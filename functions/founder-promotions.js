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
  const startsAt=finiteInteger(data.startsAt);
  if(startsAt===null)return{ok:false,reason:'invalid-start'};
  if(Number(now)<startsAt)return{ok:false,reason:'not-started'};
  const duration=finiteInteger(data.durationDays),fixedExpiry=finiteInteger(data.expiresAt);
  const validDuration=duration!==null&&duration>=1&&duration<=MAX_DURATION_DAYS;
  const validFixedExpiry=fixedExpiry!==null&&fixedExpiry>Number(now);
  const permanent=data.permanent===true;
  if([validDuration,validFixedExpiry,permanent].filter(Boolean).length!==1)return{ok:false,reason:'invalid-expiry-configuration'};
  return{ok:true,tier:data.tier,maxRedemptions:maximum,redemptionCount:count,startsAt,durationDays:validDuration?duration:null,expiresAt:validFixedExpiry?fixedExpiry:null,permanent};
}

function entitlementExpiry(configuration,now=Date.now()){
  if(configuration.permanent)return null;
  return configuration.durationDays?Number(now)+configuration.durationDays*86400000:configuration.expiresAt;
}

function activeGrant(promotion,now=Date.now()){
  if(!promotion||promotion.status!=='active'||!TIER_WEIGHT[promotion.tier])return false;
  if(Number(promotion.startsAt||0)>Number(now))return false;
  return promotion.permanent===true||promotion.expiresAt===null||Number(promotion.expiresAt)>Number(now);
}

function selectEffective(promotions,now=Date.now()){
  const entries=promotions&&typeof promotions==='object'?Object.entries(promotions):[];
  return entries.reduce((best,[code,promotion])=>{
    if(!activeGrant(promotion,now))return best;
    const candidate={...promotion,code};
    const candidateEnd=candidate.permanent||candidate.expiresAt===null?Infinity:Number(candidate.expiresAt);
    const bestEnd=best&&(best.permanent||best.expiresAt===null)?Infinity:Number(best&&best.expiresAt||0);
    if(!best||TIER_WEIGHT[candidate.tier]>TIER_WEIGHT[best.tier]||(candidate.tier===best.tier&&candidateEnd>bestEnd))return candidate;
    return best;
  },null);
}

function hasPermanentPro(promotions,now=Date.now()){
  return Object.values(promotions&&typeof promotions==='object'?promotions:{}).some(p=>p&&p.tier==='pro'&&p.permanent===true&&activeGrant(p,now));
}

function successMessage(configuration){
  const tier=configuration.tier==='pro'?'Pro':'Plus';
  if(configuration.permanent)return'Permanent Pro access unlocked.';
  const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'}).format(new Date(Number(configuration.expiresAt)-1));
  return`${tier} unlocked until ${date}.`;
}

function redemptionId(code,uid){return`${code}__${uid}`;}

module.exports={CODE_PATTERN,TIER_WEIGHT,MAX_DURATION_DAYS,MAX_REDEMPTIONS,normalizeCode,validateConfiguration,entitlementExpiry,activeGrant,selectEffective,hasPermanentPro,successMessage,redemptionId};

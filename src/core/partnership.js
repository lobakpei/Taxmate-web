(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./money'):root.TaxMateMoney,node?require('./domain-schema'):root.TaxMateDomain);
  if(node)module.exports=api;root.TaxMatePartnership=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Money,Domain){
  'use strict';
  if(!Money||!Domain)throw new Error('TaxMate partnership dependencies are required');

  const WHOLE='whole_partnership',USER_SHARE='user_share',UNCONFIRMED='legacy_unconfirmed';

  function sharePercent(business){
    const share=Number(business&&business.share);
    return Number.isSafeInteger(share)&&share>=1&&share<=100?share:null;
  }

  function profile(business){
    if(!business||business.structure!=='partnership')return{supported:true,basis:null,sharePercent:100,shareApplied:false};
    const basis=business.partnershipAmountBasis;
    if(!Domain.PARTNERSHIP_AMOUNT_BASES.includes(basis)||basis===UNCONFIRMED)return{supported:false,basis:basis||UNCONFIRMED,sharePercent:sharePercent(business),shareApplied:false,reason:'partnership_basis_confirmation_required'};
    const share=sharePercent(business);
    if(basis===WHOLE&&share==null)return{supported:false,basis,sharePercent:null,shareApplied:false,reason:'partnership_share_invalid'};
    return{supported:true,basis,sharePercent:basis===WHOLE?share:100,shareApplied:basis===WHOLE};
  }

  function personalAmount(business,storedAmount,options={}){
    const details=profile(business),integer=options.integer===true;
    if(integer)Money.assertMinor(storedAmount,'Stored partnership amount');
    else if(typeof storedAmount!=='number'||!Number.isFinite(storedAmount))throw new Error('Stored partnership amount must be finite');
    if(!details.supported)return Object.assign({amount:null},details);
    if(!details.shareApplied)return Object.assign({amount:storedAmount},details);
    let amount;
    if(integer){const sign=storedAmount<0?-1:1,absolute=Math.abs(storedAmount);amount=sign*Money.allocateMinor(absolute,[details.sharePercent,100-details.sharePercent])[0];}
    else amount=storedAmount*details.sharePercent/100;
    return Object.assign({amount},details);
  }

  function normalizedBasis(business,provenance){
    if(business&&Domain.PARTNERSHIP_AMOUNT_BASES.includes(business.partnershipAmountBasis))return business.partnershipAmountBasis;
    return provenance==='unknown_import'?UNCONFIRMED:WHOLE;
  }

  return{WHOLE,USER_SHARE,UNCONFIRMED,sharePercent,profile,personalAmount,normalizedBasis};
});

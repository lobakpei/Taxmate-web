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

  function personalBusinessFigures(business,figures){
    if(!figures||typeof figures!=='object')throw new Error('Business figures are required');
    const incomeMinor=Money.assertMinor(figures.incomeMinor,'Business income',{nonNegative:true});
    const expensesMinor=Money.assertMinor(figures.expensesMinor,'Business expenses',{nonNegative:true});
    const profitMinor=Money.assertMinor(figures.profitMinor,'Business profit');
    if(profitMinor!==incomeMinor-expensesMinor)throw new Error('Business profit must reconcile to income less expenses');
    const details=profile(business);
    if(!details.supported)return Object.freeze({...details,incomeMinor:null,expensesMinor:null,profitMinor:null,businessIncomeMinor:incomeMinor,businessExpensesMinor:expensesMinor,businessProfitMinor:profitMinor});
    const personalIncome=personalAmount(business,incomeMinor,{integer:true});
    const personalProfit=personalAmount(business,profitMinor,{integer:true});
    // Profit is the authoritative attributable amount. Derive the displayed
    // expense share from income less profit so the three visible figures and
    // the tax-engine input always reconcile to the exact penny.
    const personalExpensesMinor=personalIncome.amount-personalProfit.amount;
    Money.assertMinor(personalExpensesMinor,'Personal business expenses',{nonNegative:true});
    return Object.freeze({...details,incomeMinor:personalIncome.amount,expensesMinor:personalExpensesMinor,profitMinor:personalProfit.amount,businessIncomeMinor:incomeMinor,businessExpensesMinor:expensesMinor,businessProfitMinor:profitMinor});
  }

  function personalPortfolio(rows){
    if(!Array.isArray(rows))throw new Error('Business figure rows are required');
    const prepared=rows.map(row=>{
      if(!row||typeof row!=='object'||!row.business)throw new Error('Each business figure row is required');
      return Object.freeze({business:row.business,...personalBusinessFigures(row.business,row)});
    });
    const unsupported=prepared.filter(row=>!row.supported);
    return Object.freeze({
      supported:unsupported.length===0,
      hasPartnership:prepared.some(row=>row.business.structure==='partnership'),
      incomeMinor:unsupported.length?null:Money.sumMinor(prepared.map(row=>row.incomeMinor),'Personal business income'),
      expensesMinor:unsupported.length?null:Money.sumMinor(prepared.map(row=>row.expensesMinor),'Personal business expenses'),
      profitMinor:unsupported.length?null:Money.sumMinor(prepared.map(row=>row.profitMinor),'Personal business profit'),
      rows:Object.freeze(prepared),
      reasons:Object.freeze([...new Set(unsupported.map(row=>row.reason).filter(Boolean))])
    });
  }

  function normalizedBasis(business,provenance){
    if(business&&Domain.PARTNERSHIP_AMOUNT_BASES.includes(business.partnershipAmountBasis))return business.partnershipAmountBasis;
    return provenance==='unknown_import'?UNCONFIRMED:WHOLE;
  }

  return{WHOLE,USER_SHARE,UNCONFIRMED,sharePercent,profile,personalAmount,personalBusinessFigures,personalPortfolio,normalizedBasis};
});

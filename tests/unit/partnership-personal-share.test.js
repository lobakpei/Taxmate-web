'use strict';

const assert=require('node:assert/strict');
const test=require('node:test');
const Partnership=require('../../src/core/partnership');
const CompanyState=require('../../src/integration/ltd/company-state');

const whole=(id,share)=>({id,name:id,structure:'partnership',share,partnershipAmountBasis:Partnership.WHOLE,partnershipBasisSource:'test'});
const figures=(incomeMinor,expensesMinor)=>({incomeMinor,expensesMinor,profitMinor:incomeMinor-expensesMinor});

test('50% partnership figures reconcile to the Founder example in exact pence',()=>{
  const business=whole('example',50),before=JSON.stringify(business),result=Partnership.personalBusinessFigures(business,figures(2002944,653266));
  assert.equal(result.incomeMinor,1001472);
  assert.equal(result.expensesMinor,326633);
  assert.equal(result.profitMinor,674839);
  assert.equal(result.incomeMinor-result.expensesMinor,result.profitMinor);
  assert.equal(JSON.stringify(business),before);
});

test('positive, zero and loss shares round deterministically per business',()=>{
  assert.equal(Partnership.personalBusinessFigures(whole('positive',50),figures(1421025,0)).profitMinor,710513);
  assert.equal(Partnership.personalBusinessFigures(whole('zero',50),figures(0,0)).profitMinor,0);
  assert.equal(Partnership.personalBusinessFigures(whole('loss',50),figures(0,71347)).profitMinor,-35674);
  const portfolio=Partnership.personalPortfolio([
    {business:whole('positive',50),...figures(1421025,0)},
    {business:whole('zero',50),...figures(0,0)},
    {business:whole('loss',50),...figures(0,71347)}
  ]);
  assert.equal(portfolio.profitMinor,674839);
  assert.equal(portfolio.rows.reduce((sum,row)=>sum+row.profitMinor,0),portfolio.profitMinor);
  assert.equal(portfolio.incomeMinor-portfolio.expensesMinor,portfolio.profitMinor);
});

test('different shares and sole-trader rows aggregate without assuming 50%',()=>{
  const sole={id:'sole',name:'Sole',structure:'sole',share:100};
  const portfolio=Partnership.personalPortfolio([
    {business:sole,...figures(100000,20000)},
    {business:whole('quarter',25),...figures(40001,1)},
    {business:whole('sixty',60),...figures(0,10001)}
  ]);
  assert.equal(portfolio.rows[0].profitMinor,80000);
  assert.equal(portfolio.rows[1].profitMinor,10000);
  assert.equal(portfolio.rows[2].profitMinor,-6001);
  assert.equal(portfolio.profitMinor,83999);
  assert.equal(portfolio.incomeMinor-portfolio.expensesMinor,portfolio.profitMinor);
});

test('stored user-share figures are not reduced a second time',()=>{
  const business={id:'already-share',name:'Already share',structure:'partnership',share:25,partnershipAmountBasis:Partnership.USER_SHARE,partnershipBasisSource:'confirmed_user_share'};
  const result=Partnership.personalBusinessFigures(business,figures(100000,30000));
  assert.equal(result.shareApplied,false);
  assert.equal(result.incomeMinor,100000);
  assert.equal(result.expensesMinor,30000);
  assert.equal(result.profitMinor,70000);
});

test('missing legacy basis or share fails closed instead of inventing 50%',()=>{
  for(const business of [
    {id:'missing-basis',name:'Missing basis',structure:'partnership',share:50},
    {id:'missing-share',name:'Missing share',structure:'partnership',partnershipAmountBasis:Partnership.WHOLE}
  ]){
    const result=Partnership.personalBusinessFigures(business,figures(10000,2000));
    assert.equal(result.supported,false);
    assert.equal(result.incomeMinor,null);
    assert.equal(result.expensesMinor,null);
    assert.equal(result.profitMinor,null);
  }
});

test('state migration marks a missing partnership share unconfirmed even on current-app reconciliation',()=>{
  const raw={v:5,tab:'home',year:'2026-27',businesses:[{id:'missing',name:'Missing',structure:'partnership'}],entries:[{id:'entry',bizId:'missing',kind:'income',date:'2026-08-20',amount:100}],folders:[],tombstones:[],businessTombstones:[],folderTombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},settings:{}};
  const migrated=CompanyState.migrate(raw,1_000,'migration-test');
  CompanyState.validateState(migrated);
  const business=migrated.businesses[0],result=Partnership.personalBusinessFigures(business,figures(10000,0));
  assert.equal(business.partnershipAmountBasis,Partnership.UNCONFIRMED);
  assert.equal(result.supported,false);
  assert.equal(result.reason,'partnership_basis_confirmation_required');
});

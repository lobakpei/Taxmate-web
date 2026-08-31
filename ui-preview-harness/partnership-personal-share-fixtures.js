'use strict';

const CompanyState=require('../src/integration/ltd/company-state');
const Partnership=require('../src/core/partnership');
const {make}=require('../tests/test-fixture');

const FIXED_NOW=Date.UTC(2026,7,31,9,30,0);
const DEVICE_ID='partnership-personal-share-founder-preview';
const YEAR='2026-27';
const clone=value=>JSON.parse(JSON.stringify(value));

function business(id,name,structure='partnership',share=50){
  const record={id,name,structure,share:structure==='partnership'?share:100,createdAt:FIXED_NOW,updatedAt:FIXED_NOW,deletedAt:null,deviceId:DEVICE_ID,schemaVersion:5,recordType:'business'};
  if(structure==='partnership'){record.partnershipAmountBasis=Partnership.WHOLE;record.partnershipBasisSource='founder_preview_confirmed_whole_partnership';}
  return record;
}
function entry(id,bizId,kind,amount,description){return{id,bizId,businessId:bizId,kind,date:'2026-08-20',amount,cat:kind==='income'?'sales':'other',pct:kind==='expense'?100:undefined,desc:description,source:'founder_preview',createdAt:FIXED_NOW,updatedAt:FIXED_NOW,deletedAt:null,deviceId:DEVICE_ID,schemaVersion:5,recordType:'entry'};}
function blank(withLtd){
  if(withLtd){const state=clone(make('existing').driver.state);state.businesses=[];state.entries=[];state.tombstones=[];state.businessTombstones=[];state.folders=[];state.folderTombstones=[];state.customCats={};state.activeCats={};state.catRenames={};state.yearData={};state.obReview=[];state.tab='home';state.year=YEAR;state.settings={...state.settings,lang:'en',theme:'auto',tier:'pro'};return state;}
  return{v:5,tab:'home',year:YEAR,incFilter:'all',expFilter:'all',incCat:'all',expCat:'all',businesses:[],entries:[],tombstones:[],businessTombstones:[],folders:[],folderTombstones:[],yearData:{},customCats:{},activeCats:{},catRenames:{},metaVersions:{},metaUpdatedAt:FIXED_NOW,settings:{lang:'en',theme:'auto',tier:'pro'},obReview:[]};
}
function finish(state,businesses,entries){
  state.businesses=businesses;state.entries=entries;
  state.customCats=Object.fromEntries(businesses.map(item=>[item.id,{income:[],expense:[]}]))
  state.activeCats=Object.fromEntries(businesses.map(item=>[item.id,{income:['sales'],expense:['other']}]))
  const normalized=CompanyState.migrate(state,FIXED_NOW,DEVICE_ID);CompanyState.validateState(normalized);return normalized;
}
function current(withLtd=false){
  const businesses=[business('evri','Evri'),business('newset','Newset'),business('taxmate-app','Taxmate app')];
  const entries=[entry('evri-income','evri','income',20029.44,'Full partnership money in'),entry('evri-expense','evri','expense',5819.19,'Full partnership money out'),entry('taxmate-app-expense','taxmate-app','expense',713.47,'Full partnership loss')];
  return finish(blank(withLtd),businesses,entries);
}
function sole(){const businesses=[business('sole-review','Founder Review Trade','sole',100)],entries=[entry('sole-income','sole-review','income',2400,'Sole-trader income'),entry('sole-expense','sole-review','expense',400,'Sole-trader expense')];return finish(blank(false),businesses,entries);}
function single50(){const businesses=[business('single-partnership','Single 50% Partnership')],entries=[entry('single-income','single-partnership','income',20029.44,'Full partnership money in'),entry('single-expense','single-partnership','expense',6532.66,'Full partnership money out')];return finish(blank(false),businesses,entries);}
function mixed(){const businesses=[business('mixed-sole','Mixed Sole Trade','sole',100),business('mixed-partnership','Mixed Partnership','partnership',60)],entries=[entry('mixed-sole-income','mixed-sole','income',1000,'Sole income'),entry('mixed-sole-expense','mixed-sole','expense',200,'Sole expense'),entry('mixed-part-income','mixed-partnership','income',1500,'Partnership income'),entry('mixed-part-expense','mixed-partnership','expense',500,'Partnership expense')];return finish(blank(false),businesses,entries);}
function differentShares(){const businesses=[business('quarter-partnership','Quarter Share Partnership','partnership',25),business('sixty-partnership','Sixty Share Partnership','partnership',60),business('thirty-seven-partnership','Thirty Seven Share Partnership','partnership',37)],entries=[entry('quarter-income','quarter-partnership','income',1000.01,'Quarter-share income'),entry('quarter-expense','quarter-partnership','expense',200,'Quarter-share expense'),entry('sixty-expense','sixty-partnership','expense',100.01,'Sixty-share loss'),entry('thirty-seven-income','thirty-seven-partnership','income',333.33,'Thirty-seven-share income'),entry('thirty-seven-expense','thirty-seven-partnership','expense',33.33,'Thirty-seven-share expense')];return finish(blank(false),businesses,entries);}
function missingShare(){const state=blank(false),record=business('missing-share-partnership','Missing Share Partnership');delete record.share;delete record.partnershipAmountBasis;delete record.partnershipBasisSource;state.businesses=[record];state.entries=[entry('missing-share-income',record.id,'income',1000,'Missing-share income')];const normalized=CompanyState.migrate(state,FIXED_NOW,DEVICE_ID,{partnershipProvenance:'unknown_import'});CompanyState.validateState(normalized);return normalized;}

const builders=Object.freeze({sole,single50,multi50:()=>current(false),mixed,withLtd:()=>current(true),differentShares,current:()=>current(false),missingShare});
function all(){return Object.fromEntries(Object.entries(builders).map(([name,build])=>[name,build()]));}

module.exports={FIXED_NOW,DEVICE_ID,YEAR,builders,all};

'use strict';

function createFounderPreviewBackup(){
  const names=['das','Evri','Newset','Taxmate app'];
  const businesses=names.map((name,index)=>({id:`business-${index+1}`,name,structure:'partnership',share:50}));
  const entries=Array.from({length:79},(_,index)=>({
    id:`entry-${String(index+1).padStart(3,'0')}`,
    bizId:businesses[index%businesses.length].id,
    kind:index%5===0?'income':'expense',
    date:`2026-${String(index%8+4).padStart(2,'0')}-${String(index%27+1).padStart(2,'0')}`,
    amount:index%5===0?1000+index:10+index/100,
    cat:index%5===0?'sales':'other',
    pct:index%5===0?undefined:100,
    ...(index<27?{receiptPath:`receipts/preview/entry-${index+1}.jpg`}:{}) ,
    ...(index<2?{_review:true}:{})
  }));
  const customCats=Object.fromEntries(businesses.map(item=>[item.id,{income:[],expense:[]}]))
    ,activeCats=Object.fromEntries(businesses.map(item=>[item.id,{income:[],expense:[]}]))
    ,receiptManifest=entries.slice(0,27).map(entry=>({entryId:entry.id,path:entry.receiptPath,urlReference:true}));
  return{exportSchemaVersion:2,appVersion:'2.0.1',buildId:'founder-preview-test',stateSchemaVersion:5,exportedAt:'2026-08-23T09:00:00.000Z',receiptBinariesIncluded:false,receiptNotice:'References only',receiptManifest,data:{v:5,tab:'home',year:'2026-27',incFilter:'all',expFilter:'all',incCat:'all',expCat:'all',businesses,entries,tombstones:[],yearData:{},customCats,folders:[],expFolder:'all',catRenames:{},activeCats,settings:{lang:'en'},obReview:entries.slice(0,2).map(entry=>entry.id)}};
}

module.exports={createFounderPreviewBackup};

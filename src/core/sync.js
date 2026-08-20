(function(root,factory){
  const api=factory(); if(typeof module==='object'&&module.exports) module.exports=api; root.TaxMateSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  function compare(a,b){
    const at=Number(a&&a.updatedAt)||0, bt=Number(b&&b.updatedAt)||0;
    if(at!==bt) return at-bt;
    const ad=String(a&&a.deviceId||''), bd=String(b&&b.deviceId||'');
    if(ad!==bd) return ad<bd?-1:1;
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
  }
  function mergeRecords(local,remote){
    const map=new Map();
    [...(local||[]),...(remote||[])].forEach(r=>{ if(!r||!r.id)return; const old=map.get(r.id); if(!old||compare(old,r)<0) map.set(r.id,clone(r)); });
    return Array.from(map.values()).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  }
  function visible(records){ return (records||[]).filter(r=>r.deletedAt==null); }
  function touch(record,deviceId,now){ const t=Number(now)||Date.now(); return Object.assign({},record,{createdAt:Number(record.createdAt)||t,updatedAt:t,deletedAt:null,deviceId,schemaVersion:5}); }
  function tombstone(record,deviceId,now){ const t=Number(now)||Date.now(); return Object.assign({},record,{updatedAt:t,deletedAt:t,deviceId,schemaVersion:5}); }
  function mergeState(local,remote){
    const out=Object.assign({},local);
    ['businesses','entries','folders','tombstones'].forEach(k=>out[k]=mergeRecords(local&&local[k],remote&&remote[k]));
    return out;
  }
  return {compare,mergeRecords,visible,touch,tombstone,mergeState};
});

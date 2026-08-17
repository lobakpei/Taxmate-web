(function(root,factory){
  const api=factory(root.TaxMateVersions);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.TaxMateState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Versions){
  'use strict';
  const STATE_SCHEMA_VERSION=(Versions&&Versions.STATE_SCHEMA_VERSION)||5;
  const EXPORT_SCHEMA_VERSION=2;
  const MAX_RECORDS=100000;
  const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function text(v,max){ return typeof v==='string'&&v.length<=max; }
  function finite(v){ return typeof v==='number'&&Number.isFinite(v); }
  function validEntry(e){
    return plain(e)&&text(e.id,128)&&text(e.bizId||e.businessId,128)&&['income','expense'].includes(e.kind)&&
      text(e.date,10)&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&finite(e.amount)&&e.amount>=0&&e.amount<=1e12&&
      (!('note'in e)||text(e.note,2000))&&(!('cat'in e)||text(e.cat,128));
  }
  function validBusiness(b){ return plain(b)&&text(b.id,128)&&text(b.name,300)&&['sole','sole-trader','partnership'].includes(b.structure); }
  function rejectUnsafe(value,path){
    if(typeof value==='string'&&/<\/?(?:script|iframe|object|embed)|javascript:/i.test(value)) throw new Error('Unsafe content at '+path);
    if(Array.isArray(value)) value.forEach((x,i)=>rejectUnsafe(x,path+'['+i+']'));
    else if(plain(value)) Object.keys(value).forEach(k=>{ if(['__proto__','prototype','constructor'].includes(k)) throw new Error('Unsafe key at '+path); rejectUnsafe(value[k],path+'.'+k); });
  }
  function migrate(input,now,deviceId){
    if(!plain(input)) throw new Error('State must be an object');
    const source=clone(input), version=Number(source.v||1);
    if(version>STATE_SCHEMA_VERSION) throw new Error('Backup uses a newer state schema');
    source.businesses=Array.isArray(source.businesses)?source.businesses:[];
    source.entries=Array.isArray(source.entries)?source.entries:[];
    source.folders=Array.isArray(source.folders)?source.folders:[];
    source.tombstones=Array.isArray(source.tombstones)?source.tombstones:[];
    if(source.entries.length>MAX_RECORDS) throw new Error('Too many entries');
    const stamp=Number(now)||Date.now(), dev=deviceId||'legacy-migration';
    const meta=(r,type)=>Object.assign({},r,{id:r.id,createdAt:Number(r.createdAt)||stamp,updatedAt:Number(r.updatedAt)||Number(r.createdAt)||stamp,deletedAt:r.deletedAt==null?null:Number(r.deletedAt),deviceId:r.deviceId||dev,schemaVersion:STATE_SCHEMA_VERSION,recordType:type});
    source.businesses=source.businesses.map(b=>meta(b,'business'));
    source.entries=source.entries.map(e=>meta(Object.assign({},e,{businessId:e.businessId||e.bizId,bizId:e.bizId||e.businessId,taxYear:e.taxYear||null,source:e.source||'user'}),'entry'));
    source.folders=source.folders.map(f=>meta(f,'folder'));
    source.tombstones=source.tombstones.map(t=>meta(t,t.recordType||'entry'));
    source.yearData=plain(source.yearData)?source.yearData:{};
    source.customCats=plain(source.customCats)?source.customCats:{};
    source.activeCats=plain(source.activeCats)?source.activeCats:{};
    source.catRenames=plain(source.catRenames)?source.catRenames:{};
    source.settings=plain(source.settings)?source.settings:{};
    source.v=STATE_SCHEMA_VERSION;
    return source;
  }
  function validateState(input){
    rejectUnsafe(input,'state');
    if(!plain(input)||!Array.isArray(input.businesses)||!Array.isArray(input.entries)) throw new Error('Invalid TaxMate state');
    if(!input.businesses.every(validBusiness)) throw new Error('Invalid business record');
    if(!input.entries.every(validEntry)) throw new Error('Invalid financial record');
    const ids=new Set();
    input.entries.forEach(e=>{ if(ids.has(e.id)) throw new Error('Duplicate entry id'); ids.add(e.id); });
    return true;
  }
  function createExport(state,identity,receiptManifest){
    const data=migrate(state,Date.now(),identity&&identity.deviceId);
    validateState(data);
    return {exportSchemaVersion:EXPORT_SCHEMA_VERSION,appVersion:identity.appVersion,buildId:identity.buildId,stateSchemaVersion:STATE_SCHEMA_VERSION,exportedAt:new Date().toISOString(),receiptBinariesIncluded:false,receiptNotice:'Receipt image binaries are not included in this JSON backup. The receipt manifest preserves references only.',receiptManifest:receiptManifest||[],data};
  }
  function importBackup(payload,now,deviceId){
    rejectUnsafe(payload,'backup');
    if(!plain(payload)) throw new Error('Backup must be an object');
    if(payload.exportSchemaVersion>EXPORT_SCHEMA_VERSION) throw new Error('Backup uses a newer export schema');
    const candidate=payload.data||(Array.isArray(payload.businesses)?payload:null);
    if(!candidate) throw new Error('Not a TaxMate backup');
    const state=migrate(candidate,now,deviceId); validateState(state); return state;
  }
  return {STATE_SCHEMA_VERSION,EXPORT_SCHEMA_VERSION,MAX_RECORDS,migrate,validateState,createExport,importBackup};
});

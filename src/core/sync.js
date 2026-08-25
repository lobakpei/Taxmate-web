(function(root,factory){
  const api=factory(); if(typeof module==='object'&&module.exports) module.exports=api; root.TaxMateSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
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
    ['businesses','entries','folders','tombstones','businessTombstones','folderTombstones'].forEach(k=>out[k]=mergeRecords(local&&local[k],remote&&remote[k]));
    return out;
  }

  function versionRecord(stamp,fallback){
    const source=plain(stamp)?stamp:{};
    return {
      updatedAt:Number(source.updatedAt)||Number(fallback&&fallback.updatedAt)||0,
      deviceId:String(source.deviceId||fallback&&fallback.deviceId||''),
      deletedAt:source.deletedAt==null?null:Number(source.deletedAt)
    };
  }
  function mergeVersionedMap(localValues,remoteValues,localVersions,remoteVersions,prefix,localFallback,remoteFallback){
    const values={},versions={};
    const lv=plain(localValues)?localValues:{},rv=plain(remoteValues)?remoteValues:{};
    const lvers=plain(localVersions)?localVersions:{},rvers=plain(remoteVersions)?remoteVersions:{};
    const keys=new Set([...Object.keys(lv),...Object.keys(rv)]);
    Object.keys(lvers).filter(k=>k.indexOf(prefix)===0).forEach(k=>keys.add(k.slice(prefix.length)));
    Object.keys(rvers).filter(k=>k.indexOf(prefix)===0).forEach(k=>keys.add(k.slice(prefix.length)));
    keys.forEach(key=>{
      const versionKey=prefix+key;
      const ls=versionRecord(lvers[versionKey],localFallback);
      const rs=versionRecord(rvers[versionKey],remoteFallback);
      let useRemote=compare(ls,rs)<0;
      if(compare(ls,rs)===0){
        if(!(key in lv)&&(key in rv)) useRemote=true;
        else if((key in lv)&&(key in rv)) useRemote=JSON.stringify(lv[key]).localeCompare(JSON.stringify(rv[key]))<0;
      }
      const chosenStamp=useRemote?rs:ls;
      const chosenValues=useRemote?rv:lv;
      versions[versionKey]=clone(chosenStamp);
      if(chosenStamp.deletedAt==null&&Object.prototype.hasOwnProperty.call(chosenValues,key)) values[key]=clone(chosenValues[key]);
    });
    return {values,versions};
  }
  function mergeMeta(local,remote){
    const l=plain(local)?local:{},r=plain(remote)?remote:{};
    const businessRecords=mergeRecords([...(l.businesses||[]),...(l.businessTombstones||[])],[...(r.businesses||[]),...(r.businessTombstones||[])]);
    const folderRecords=mergeRecords([...(l.folders||[]),...(l.folderTombstones||[])],[...(r.folders||[]),...(r.folderTombstones||[])]);
    const localVersions=plain(l.metaVersions)?l.metaVersions:{},remoteVersions=plain(r.metaVersions)?r.metaVersions:{};
    const localFallback={updatedAt:l.updatedAt,deviceId:l.deviceId};
    const remoteFallback={updatedAt:r.updatedAt,deviceId:r.deviceId};
    const custom=mergeVersionedMap(l.customCats,r.customCats,localVersions,remoteVersions,'customCats:',localFallback,remoteFallback);
    const active=mergeVersionedMap(l.activeCats,r.activeCats,localVersions,remoteVersions,'activeCats:',localFallback,remoteFallback);
    const years=mergeVersionedMap(l.yearData,r.yearData,localVersions,remoteVersions,'yearData:',localFallback,remoteFallback);
    const settings=mergeVersionedMap({account:l.settings},{account:r.settings},localVersions,remoteVersions,'settings:',localFallback,remoteFallback);
    const versions=Object.assign({},custom.versions,active.versions,years.versions,settings.versions);
    return {
      businesses:visible(businessRecords),
      businessTombstones:businessRecords.filter(x=>x.deletedAt!=null),
      folders:visible(folderRecords),
      folderTombstones:folderRecords.filter(x=>x.deletedAt!=null),
      customCats:custom.values,
      activeCats:active.values,
      yearData:years.values,
      settings:settings.values.account||{},
      metaVersions:versions,
      updatedAt:Math.max(Number(l.updatedAt)||0,Number(r.updatedAt)||0),
      deviceId:compare(localFallback,remoteFallback)<0?String(r.deviceId||''):String(l.deviceId||'')
    };
  }

  function cloudAccountState(input){
    const source=plain(input)?input:{},meta=plain(source.meta)?source.meta:{};
    const businesses=[...(Array.isArray(meta.businesses)?meta.businesses:[]),...(Array.isArray(meta.businessTombstones)?meta.businessTombstones:[])].filter(x=>plain(x)&&x.id);
    const folders=[...(Array.isArray(meta.folders)?meta.folders:[]),...(Array.isArray(meta.folderTombstones)?meta.folderTombstones:[])].filter(x=>plain(x)&&x.id);
    const personalRecords=(Array.isArray(source.personalRecords)?source.personalRecords:[]).filter(x=>plain(x)&&x.id);
    const partnershipRecords=Math.max(0,Number(source.partnershipRecords)||0);
    const versionedFacts=[meta.customCats,meta.activeCats,meta.yearData,meta.metaVersions].some(value=>plain(value)&&Object.keys(value).length>0);
    const established=businesses.length>0||folders.length>0||personalRecords.length>0||partnershipRecords>0||versionedFacts;
    return {
      established,
      businessRecords:businesses.length,
      folderRecords:folders.length,
      personalRecords:personalRecords.length,
      partnershipRecords,
      metaExists:source.metaExists===true
    };
  }

  function emptyOutbox(){ return {version:1,items:[],lastSuccessAt:0}; }
  function normalizeOutbox(value){
    const source=plain(value)?value:{};
    return {version:1,items:Array.isArray(source.items)?source.items.filter(x=>plain(x)&&x.key&&x.kind).map(clone):[],lastSuccessAt:Number(source.lastSuccessAt)||0};
  }
  function operationKey(op){
    if(op&&op.key) return String(op.key);
    if(!op||!op.kind) throw new Error('Sync operation kind is required');
    if(op.kind==='personal-state') return 'personal-state:'+String(op.uid||'current');
    if(op.kind==='partnership-entry') return 'partnership-entry:'+String(op.ownerUid||'current')+':'+String(op.code||'')+':'+String(op.record&&op.record.id||'');
    if(op.kind==='partnership-business') return 'partnership-business:'+String(op.ownerUid||'current')+':'+String(op.code||'');
    throw new Error('Unsupported sync operation: '+op.kind);
  }
  function operationVersion(op){
    if(op&&op.record) return op.record;
    return {updatedAt:Number(op&&op.updatedAt)||0,deviceId:String(op&&op.deviceId||'')};
  }
  function enqueue(outbox,operation,now){
    const next=normalizeOutbox(outbox),op=clone(operation||{}),key=operationKey(op),at=Number(now)||Date.now();
    const index=next.items.findIndex(x=>x.key===key);
    if(index>=0&&compare(operationVersion(next.items[index]),operationVersion(op))>0) return next;
    const previous=index>=0?next.items[index]:null;
    const item=Object.assign({},op,{key,createdAt:Number(previous&&previous.createdAt)||at,queuedAt:at,attempts:0,lastAttemptAt:0,nextAttemptAt:0,lastError:null,status:'waiting'});
    if(index>=0) next.items[index]=item; else next.items.push(item);
    next.items.sort((a,b)=>Number(a.createdAt)-Number(b.createdAt)||String(a.key).localeCompare(String(b.key)));
    return next;
  }
  function markAttempt(outbox,key,now){
    const next=normalizeOutbox(outbox),item=next.items.find(x=>x.key===key); if(!item)return next;
    item.attempts=(Number(item.attempts)||0)+1; item.lastAttemptAt=Number(now)||Date.now(); item.status='waiting'; return next;
  }
  function classifyError(error){
    const raw=String(error&&error.code||error&&error.message||error||'sync-failed').toLowerCase();
    if(raw.includes('permission-denied')||raw.includes('permission_denied')) return 'permission-denied';
    if(raw.includes('unauth')) return 'unauthenticated';
    if(raw.includes('app-check')||raw.includes('app_check')) return 'app-check';
    if(raw.includes('network')||raw.includes('offline')||raw.includes('unavailable')) return 'network';
    return raw.slice(0,120);
  }
  function markFailure(outbox,key,error,now,attempted){
    const next=normalizeOutbox(outbox),item=next.items.find(x=>x.key===key); if(!item)return next;
    if(attempted&&compare(operationVersion(item),operationVersion(attempted))>0)return next;
    const at=Number(now)||Date.now(),attempts=Math.max(1,Number(item.attempts)||1);
    item.lastError=classifyError(error); item.status='failed'; item.nextAttemptAt=at+Math.min(60000,1000*Math.pow(2,Math.min(attempts,6))); return next;
  }
  function acknowledge(outbox,key,now,attempted){
    const next=normalizeOutbox(outbox);
    next.items=next.items.filter(x=>x.key!==key||(attempted&&compare(operationVersion(x),operationVersion(attempted))>0));
    next.lastSuccessAt=Number(now)||Date.now(); return next;
  }
  function due(outbox,now){ const at=Number(now)||Date.now(); return normalizeOutbox(outbox).items.filter(x=>!x.nextAttemptAt||Number(x.nextAttemptAt)<=at); }
  function status(input){
    const source=input||{},box=normalizeOutbox(source.outbox),pending=box.items.length;
    if(source.online===false) return {state:'offline',pending,message:pending?'Offline — '+pending+' change'+(pending===1?'':'s')+' waiting':'Offline'};
    if(!source.authReady) return {state:'waiting',pending,message:pending?'Waiting for sign-in — '+pending+' pending':'Waiting for sign-in'};
    if(source.hydrationState==='failed') return {state:'failed',pending,message:'Cloud restore failed — will retry',error:source.error||'hydration-failed'};
    if(source.error) return {state:'failed',pending,message:pending?'Sync failed — '+pending+' change'+(pending===1?'':'s')+' will retry':'Sync failed — will retry',error:source.error};
    if(source.hydrationState!=='converged') return {state:'waiting',pending,message:source.hydrationState==='loading'?'Restoring cloud data…':'Checking cloud data…'};
    const failed=box.items.filter(x=>x.status==='failed');
    if(failed.length) return {state:'failed',pending,message:'Sync failed — '+pending+' change'+(pending===1?'':'s')+' will retry',error:failed[0].lastError};
    if(pending) return {state:'waiting',pending,message:'Waiting to sync — '+pending+' change'+(pending===1?'':'s')};
    return {state:'synced',pending:0,message:'Synced'};
  }
  return {compare,mergeRecords,visible,touch,tombstone,mergeState,mergeMeta,mergeVersionedMap,cloudAccountState,emptyOutbox,normalizeOutbox,operationKey,enqueue,markAttempt,markFailure,acknowledge,due,status,classifyError};
});

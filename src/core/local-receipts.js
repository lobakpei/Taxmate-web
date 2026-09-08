(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateLocalReceipts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const NAME='taxmate-owned-receipts-v1',STORE='receipts';let opened=null;const urls=new Map();
  function database(){if(!opened)opened=new Promise((resolve,reject)=>{const request=indexedDB.open(NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'key'});request.onerror=()=>{opened=null;reject(request.error);};request.onsuccess=()=>resolve(request.result);});return opened;}
  function key(scope,path){if(typeof scope!=='string'||!scope||!/^receipts\/[^/]+\/[^/]+$/.test(path))throw new Error('Invalid local receipt identity');return scope+'|'+path;}
  async function transaction(mode,work){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Local receipt transaction aborted'));work(store,value=>{result=value;});});}
  async function get(scope,path){return transaction('readonly',(s,done)=>{const r=s.get(key(scope,path));r.onsuccess=()=>done(r.result||null);});}
  async function list(scope){return transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.filter(row=>row.scope===scope));});}
  async function put(scope,path,blob,{epoch=0,createdAt=Date.now()}={}){if(!(blob instanceof Blob)||!blob.size||blob.size>12*1024*1024)throw new Error('Invalid local receipt binary');const record={key:key(scope,path),scope,path,blob,epoch,createdAt};await transaction('readwrite',s=>s.add(record));return record;}
  async function remove(scope,path){await transaction('readwrite',s=>s.delete(key(scope,path)));const u=urls.get(key(scope,path));if(u)URL.revokeObjectURL(u);urls.delete(key(scope,path));}
  async function binary(scope,path){if(!/^receipts\/[^/]+\/[^/]+$/.test(path))return null;const r=await get(scope,path);return r?{bytes:new Uint8Array(await r.blob.arrayBuffer()),mimeType:r.blob.type||'image/jpeg'}:null;}
  async function objectUrl(scope,path){const k=key(scope,path);if(urls.has(k))return urls.get(k);const r=await get(scope,path);if(!r)return null;const u=URL.createObjectURL(r.blob);urls.set(k,u);return u;}
  function release(){for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();}
  async function clearScope(scope){for(const r of await list(scope))await remove(scope,r.path);}
  async function prune(scope,keep,control){if(!control)return;const names=new Set(keep),cutoff=Date.parse(control.cutoffDate+'T00:00:00+01:00');for(const r of await list(scope))if(r.epoch<control.epoch&&!names.has(r.path)&&r.createdAt<cutoff)await remove(scope,r.path);}
  function pathFromUrl(value){try{const u=new URL(value,typeof location!=='undefined'?location.origin:undefined);return u.pathname.startsWith('/_taxmate_receipt/')?decodeURIComponent(u.pathname.slice('/_taxmate_receipt/'.length)):null;}catch(_){return null;}}
  function url(path,origin){return origin+'/_taxmate_receipt/'+encodeURIComponent(path);}
  function cachedUrl(scope,path){return urls.get(key(scope,path))||null;}
  return{get,list,put,remove,binary,objectUrl,cachedUrl,release,clearScope,prune,pathFromUrl,url};
});

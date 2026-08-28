(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./company-state'):root.TaxMateCompanyState,node?require('node:fs'):null,node?require('node:path'):null);
  if(node)module.exports=api;
  root.TaxMateCompanyStateRepository=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(CompanyState,fs,path){
'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
function memoryRepository(initialState){let current=clone(initialState);CompanyState.validateState(current);return Object.freeze({kind:'memory',load(){return clone(current);},replace(next){CompanyState.validateState(next);current=clone(next);return clone(current);},rollbackSnapshot(){return null;}});}
function localStorageRepository(options={}){
  const storage=options.storage,key=options.key||'taxmateuk_v1',rollbackKey=options.rollbackKey||`${key}:pre-ltd-v1.5-rollback`,pendingKey=`${key}:atomic-pending`;
  if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new Error('Durable browser storage is required');
  const parse=(raw,label)=>{try{return JSON.parse(raw);}catch(_){throw new Error(`Invalid ${label} state`);}};
  return Object.freeze({kind:'localStorage',load(){const raw=storage.getItem(key);if(!raw)throw new Error('Canonical state is missing');const value=parse(raw,'canonical');CompanyState.validateState(value);if(storage.getItem(pendingKey)!=null)storage.removeItem(pendingKey);return clone(value);},replace(next){CompanyState.validateState(next);const encoded=JSON.stringify(next),prior=storage.getItem(key);storage.setItem(pendingKey,encoded);if(prior!=null&&!storage.getItem(rollbackKey)){const previous=parse(prior,'canonical');if(Number(previous.companyStateSchemaVersion||0)<Number(next.companyStateSchemaVersion||0))storage.setItem(rollbackKey,prior);}storage.setItem(key,encoded);storage.removeItem(pendingKey);return clone(next);},rollbackSnapshot(){const raw=storage.getItem(rollbackKey);return raw?parse(raw,'rollback'):null;}});
}
function fileRepository(options={}){
  if(!fs||!path)throw new Error('File repository is only available in Node.js');
  const file=path.resolve(options.file||''),rollbackFile=path.resolve(options.rollbackFile||`${file}.rollback.json`),tempFile=`${file}.pending`;
  if(!options.file)throw new Error('Durable repository path is required');
  if(!fs.existsSync(file)){CompanyState.validateState(options.initialState);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(options.initialState,null,2));}
  const load=()=>{const value=JSON.parse(fs.readFileSync(file,'utf8'));CompanyState.validateState(value);return value;};
  return Object.freeze({kind:'file',file,load(){return clone(load());},replace(next){CompanyState.validateState(next);const encoded=JSON.stringify(next,null,2),prior=fs.readFileSync(file);fs.writeFileSync(tempFile,encoded);if(fs.existsSync(rollbackFile))fs.unlinkSync(rollbackFile);fs.writeFileSync(rollbackFile,prior);fs.renameSync(tempFile,file);return clone(next);},rollbackSnapshot(){return fs.existsSync(rollbackFile)?JSON.parse(fs.readFileSync(rollbackFile,'utf8')):null;}});
}
function externalRepository(options={}){
  if(typeof options.load!=='function'||typeof options.replace!=='function')throw new Error('External repository load/replace callbacks are required');
  return Object.freeze({kind:options.kind||'external',load(){const value=options.load();CompanyState.validateState(value);return clone(value);},replace(next){CompanyState.validateState(next);const value=options.replace(clone(next));CompanyState.validateState(value==null?next:value);return clone(value==null?next:value);},rollbackSnapshot(){return typeof options.rollbackSnapshot==='function'?clone(options.rollbackSnapshot()):null;}});
}
function assertRepository(repository){if(!repository||typeof repository.load!=='function'||typeof repository.replace!=='function')throw new Error('A canonical company state repository is required');CompanyState.validateState(repository.load());return repository;}
return{memoryRepository,localStorageRepository,fileRepository,externalRepository,assertRepository};
});

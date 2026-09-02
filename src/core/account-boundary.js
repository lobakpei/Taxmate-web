(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateAccountBoundary=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,QUARANTINE_SLOT='ownership-quarantine';
  const TOP_COLLECTIONS=Object.freeze(['businesses','businessTombstones','entries','tombstones','folders','folderTombstones']);
  const DOMAIN_COLLECTIONS=Object.freeze(['persons','entities','companyProfiles','projects','paymentAccounts','economicEvents','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks','migrationIssues','syncConflicts']);
  const GENERIC_IDS=new Set(['person:account-holder']);
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const stable=value=>{
    if(Array.isArray(value))return value.map(stable);
    if(!plain(value))return value;
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  };
  const signature=(collection,record)=>record&&record.id?`${collection}:${record.id}:${JSON.stringify(stable(record))}`:null;
  function trustedServerClaim(claim,uid){return !!claim&&claim.schemaVersion===1&&claim.status==='verified'&&['server_migration','server_created'].includes(claim.claimType)&&String(claim.ownerUid||'')===String(uid||'');}
  function receiptPath(value){
    const source=String(value||'');
    if(/^receipts\/[^/]+\//.test(source))return source;
    if(!/^https?:\/\//i.test(source))return null;
    try{
      const url=new URL(source),match=/\/o\/([^?#]+)/.exec(url.pathname);
      if(match){const decoded=decodeURIComponent(match[1]);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}
      const name=url.searchParams.get('name');if(name){const decoded=decodeURIComponent(name);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}
    }catch(_){}
    return null;
  }
  function receiptOwner(value){const path=receiptPath(value),match=/^receipts\/([^/]+)\//.exec(path||'');return match?match[1]:null;}
  function previewProfile(record){
    const verification=record&&record.registryVerification||{};
    const legalName=String(record&&record.legalName||'').trim().toUpperCase(),companyNumber=String(record&&record.companyNumber||verification.companyNumber||'').trim().toUpperCase();
    const legacyGhost=legalName==='LOBAKPE FOUNDER PREVIEW LTD'&&(!companyNumber||companyNumber==='00000000');
    return !!record&&(legacyGhost||verification.previewFixture===true||verification.provider==='founder_preview_fixture'||verification.verificationSource==='founder_preview_fixture'||verification.previewAlias==='lobakpe1');
  }
  function stateIndex(state){
    const ids=new Set(),signatures=new Set(),records=[];
    for(const collection of TOP_COLLECTIONS){for(const record of state&&state[collection]||[]){if(!plain(record))continue;records.push({collection,record});const generic=record.id&&GENERIC_IDS.has(record.id);if(record.id&&!generic)ids.add(record.id);const value=generic?null:signature(collection,record);if(value)signatures.add(value);}}
    const domain=state&&state.domain||{};
    for(const collection of DOMAIN_COLLECTIONS){for(const record of domain[collection]||[]){if(!plain(record))continue;records.push({collection:`domain.${collection}`,record});const generic=record.id&&GENERIC_IDS.has(record.id);if(record.id&&!generic)ids.add(record.id);const value=generic?null:signature(`domain.${collection}`,record);if(value)signatures.add(value);}}
    return{ids,signatures,records};
  }
  function foreignIndex(storage,activeScope,accountStorage){
    const ids=new Set(),signatures=new Set(),scopes=[];
    if(!storage||!accountStorage||!accountStorage.validScope(activeScope))return{ids,signatures,scopes};
    const suffix=':canonical',prefix=accountStorage.PREFIX+':firebase:';
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);if(!key||!key.startsWith(prefix)||!key.endsWith(suffix)||key===accountStorage.key(activeScope,'canonical'))continue;
      let state;try{state=JSON.parse(storage.getItem(key));}catch(_){continue;}
      const index=stateIndex(state);index.ids.forEach(value=>ids.add(value));index.signatures.forEach(value=>signatures.add(value));scopes.push(key);
    }
    return{ids,signatures,scopes};
  }
  function recordBoundaryReason(collection,record,index,uid,options={}){
    if(!plain(record))return null;
    if(record.accountOwnerUid&&String(record.accountOwnerUid)!==String(uid||''))return'owner_mismatch';
    if(!record.accountOwnerUid&&options.requireOwner===true&&!trustedServerClaim(options.trustedClaim,uid))return'owner_missing';
    if(record.id&&index.ids.has(record.id))return'foreign_record';
    const value=signature(collection,record);return value&&index.signatures.has(value)?'foreign_record':null;
  }
  function referencesAny(value,ids,seen=new Set()){
    if(typeof value==='string')return ids.has(value);
    if(!value||typeof value!=='object'||seen.has(value))return false;
    seen.add(value);if(Array.isArray(value))return value.some(item=>referencesAny(item,ids,seen));
    return Object.values(value).some(item=>referencesAny(item,ids,seen));
  }
  function sanitiseReceiptReferences(value,uid){
    let changed=false;
    const visit=current=>{
      if(typeof current==='string'){const owner=receiptOwner(current);if(owner&&uid&&owner!==uid){changed=true;return undefined;}return current;}
      if(Array.isArray(current)){const result=[];for(const item of current){const next=visit(item);if(next!==undefined)result.push(next);}return result;}
      if(!plain(current))return current;
      const result={};for(const [key,item] of Object.entries(current)){const next=visit(item);if(next!==undefined)result[key]=next;else if(key==='receiptPath'||key==='receiptUrl')result[key]=null;}return result;
    };
    return{value:visit(value),changed};
  }
  function pushQuarantine(rows,collection,record,reason){rows.push({collection,reason,record:clone(record)});}
  function partitionState(input,options={}){
    const state=clone(input||{}),index=options.foreignIndex||{ids:new Set(),signatures:new Set()},uid=String(options.uid||''),quarantined=[];
    const removedBusinessIds=new Set(),removedEntityIds=new Set(),removedProfileIds=new Set();
    for(const collection of ['businesses','businessTombstones']){
      state[collection]=(state[collection]||[]).filter(record=>{const reason=recordBoundaryReason(collection,record,index,uid,options);if(reason){if(record.id)removedBusinessIds.add(record.id);pushQuarantine(quarantined,collection,record,reason);}return !reason;});
    }
    for(const collection of ['entries','tombstones'])state[collection]=(state[collection]||[]).flatMap(record=>{const reason=recordBoundaryReason(collection,record,index,uid,options)||removedBusinessIds.has(record&&record.bizId)&&'foreign_record';if(reason){pushQuarantine(quarantined,collection,record,reason);return[];}const receipt=sanitiseReceiptReferences(record,uid);if(receipt.changed)pushQuarantine(quarantined,collection,record,'foreign_receipt_reference');return[receipt.value];});
    for(const collection of ['folders','folderTombstones'])state[collection]=(state[collection]||[]).filter(record=>{const reason=recordBoundaryReason(collection,record,index,uid,options)||(removedBusinessIds.has(record&&record.bizId)||removedBusinessIds.has(record&&record.businessId))&&'foreign_record';if(reason)pushQuarantine(quarantined,collection,record,reason);return !reason;});
    for(const field of ['customCats','activeCats'])if(plain(state[field]))for(const key of Object.keys(state[field]))if(removedBusinessIds.has(key)){pushQuarantine(quarantined,field,{id:key,value:state[field][key]},'foreign_business_metadata');delete state[field][key];}
    const domain=plain(state.domain)?state.domain:{};
    domain.companyProfiles=(domain.companyProfiles||[]).flatMap(record=>{const receipt=sanitiseReceiptReferences(record,uid);if(receipt.changed)pushQuarantine(quarantined,'domain.companyProfiles',record,'foreign_receipt_reference');record=receipt.value;const reason=previewProfile(record)?'founder_preview_fixture':recordBoundaryReason('domain.companyProfiles',record,index,uid,options);if(reason){if(record.id)removedProfileIds.add(record.id);if(record.entityId)removedEntityIds.add(record.entityId);pushQuarantine(quarantined,'domain.companyProfiles',record,reason);return[];}return[record];});
    domain.entities=(domain.entities||[]).filter(record=>{const reason=removedEntityIds.has(record&&record.id)?'foreign_or_preview_entity':recordBoundaryReason('domain.entities',record,index,uid,options);if(reason){if(record.id)removedEntityIds.add(record.id);pushQuarantine(quarantined,'domain.entities',record,reason);}return !reason;});
    let changed=true;while(changed){changed=false;for(const collection of DOMAIN_COLLECTIONS.filter(name=>!['companyProfiles','entities'].includes(name))){const list=domain[collection]||[],next=[];for(let record of list){const receipt=sanitiseReceiptReferences(record,uid);if(receipt.changed)pushQuarantine(quarantined,`domain.${collection}`,record,'foreign_receipt_reference');record=receipt.value;const reason=recordBoundaryReason(`domain.${collection}`,record,index,uid,options)||referencesAny(record,new Set([...removedEntityIds,...removedProfileIds]))&&'foreign_or_preview_dependency';if(reason){if(record&&record.id&&!removedEntityIds.has(record.id)){removedEntityIds.add(record.id);changed=true;}pushQuarantine(quarantined,`domain.${collection}`,record,reason);}else next.push(record);}domain[collection]=next;}}
    state.domain=domain;
    return{state,quarantined,changed:quarantined.length>0,removedBusinessIds:[...removedBusinessIds],removedEntityIds:[...removedEntityIds],previewGhost:quarantined.some(item=>item.reason==='founder_preview_fixture')};
  }
  function partitionRecords(records,options={}){
    const index=options.foreignIndex||{ids:new Set(),signatures:new Set()},uid=String(options.uid||''),collection=String(options.collection||'records'),accepted=[],quarantined=[];
    for(const original of records||[]){const record=clone(original),reason=recordBoundaryReason(collection,record,index,uid,options);if(reason){pushQuarantine(quarantined,collection,record,reason);continue;}if(record&&record.accountOwnerUid)delete record.accountOwnerUid;accepted.push(record);}
    return{accepted,quarantined,changed:quarantined.length>0};
  }
  function partitionCloudMeta(meta,options={}){
    const source=clone(meta||{}),uid=String(options.uid||'');
    if(source.accountOwnerUid&&String(source.accountOwnerUid)!==uid)return{meta:{},quarantined:[{collection:'cloud.meta',reason:'owner_mismatch',record:source}],changed:true,ownerMismatch:true};
    if(!source.accountOwnerUid&&!trustedServerClaim(options.trustedClaim,uid))return{meta:{},quarantined:[{collection:'cloud.meta',reason:'owner_missing',record:source}],changed:true,ownerMismatch:false,ownerMissing:true};
    delete source.accountOwnerUid;const result=partitionState(source,{...options,requireOwner:false});return{meta:result.state,quarantined:result.quarantined,changed:result.changed,ownerMismatch:false,ownerMissing:false,previewGhost:result.previewGhost};
  }
  function quarantine(storage,scope,items,options={}){
    if(!storage||!items||!items.length)return{status:'empty',count:0};
    const accountStorage=options.accountStorage;if(!accountStorage||!accountStorage.validScope(scope))throw new Error('A valid account scope is required for quarantine');
    const key=accountStorage.key(scope,QUARANTINE_SLOT),now=Number(options.now)||Date.now(),prior=(()=>{try{return JSON.parse(storage.getItem(key)||'null');}catch(_){return null;}})(),records=Array.isArray(prior&&prior.records)?prior.records:[],seen=new Set(records.map(item=>JSON.stringify(stable(item))));
    for(const item of items){const row={source:String(options.source||'account_boundary').replace(/[^a-z0-9_-]/gi,'_').slice(0,48)||'account_boundary',collection:String(item.collection||'unknown').slice(0,80),reason:String(item.reason||'foreign_record').replace(/[^a-z0-9_-]/gi,'_').slice(0,64),record:clone(item.record)},encoded=JSON.stringify(stable(row));if(!seen.has(encoded)){seen.add(encoded);records.push(row);}}
    const value={version:VERSION,status:'quarantined',updatedAt:now,records};storage.setItem(key,JSON.stringify(value));return{status:'quarantined',count:records.length,added:records.length-(prior&&Array.isArray(prior.records)?prior.records.length:0),key};
  }
  return Object.freeze({VERSION,QUARANTINE_SLOT,TOP_COLLECTIONS,DOMAIN_COLLECTIONS,receiptPath,receiptOwner,previewProfile,trustedServerClaim,stateIndex,foreignIndex,partitionState,partitionRecords,partitionCloudMeta,quarantine});
});

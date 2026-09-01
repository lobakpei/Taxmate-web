(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateAccountStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1,PREFIX='taxmateuk_account_v1',SESSION_PREFIX='taxmateuk_session_v1';
  const LEGACY_KEYS=Object.freeze([
    'taxmateuk_v1','taxmateuk_v1:atomic-pending','taxmateuk_sync_outbox_v1','taxmateuk_entitlement_cache',
    'taxmateuk_preimport_backup','taxmateuk_pre_ltd_v15_migration','taxmateuk_onboarding_draft_v1',
    'taxmateuk_ltd_ui_drafts_v1','tmOnboardDone'
  ]);
  const ASSOCIATION_SLOTS=Object.freeze(['canonical','onboarding-draft','onboarding-done','preimport-backup','pre-ltd-rollback','ltd-drafts']);
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function localScope(){return Object.freeze({kind:'local'});}
  function firebaseScope(uid){const value=String(uid||'');if(!value||value.length>128)throw new Error('A valid Firebase UID is required');return Object.freeze({kind:'firebase',uid:value});}
  function validScope(scope){return !!scope&&(scope.kind==='local'||(scope.kind==='firebase'&&typeof scope.uid==='string'&&scope.uid.length>0&&scope.uid.length<=128));}
  function token(scope){if(!validScope(scope))throw new Error('An active account scope is required');return scope.kind==='local'?'local':`firebase:${encodeURIComponent(scope.uid)}`;}
  function slotName(slot){const value=String(slot||'');if(!value||value.length>180||!/^[a-z0-9][a-z0-9:._-]*$/i.test(value))throw new Error('Invalid account storage slot');return value;}
  function key(scope,slot){return `${PREFIX}:${token(scope)}:${slotName(slot)}`;}
  function sessionKey(scope,slot){return `${SESSION_PREFIX}:${token(scope)}:${slotName(slot)}`;}
  function sameScope(a,b){return validScope(a)&&validScope(b)&&a.kind===b.kind&&(a.kind==='local'||a.uid===b.uid);}
  function activeUidMatches(scope,uid){return validScope(scope)&&scope.kind==='firebase'&&scope.uid===String(uid||'');}
  function receiptPathOwner(path){const match=/^receipts\/([^/]+)\//.exec(String(path||''));return match?match[1]:null;}
  function ownsReceiptPath(path,uid){const owner=receiptPathOwner(path);return !!owner&&owner===String(uid||'');}
  function read(storage,scope,slot){return storage.getItem(key(scope,slot));}
  function write(storage,scope,slot,value){storage.setItem(key(scope,slot),String(value));return true;}
  function remove(storage,scope,slot){storage.removeItem(key(scope,slot));}
  function accountKeys(storage,scope){const prefix=`${PREFIX}:${token(scope)}:`,rows=[];for(let i=0;i<storage.length;i++){const value=storage.key(i);if(value&&value.startsWith(prefix))rows.push(value);}return rows.sort();}
  function stateHasAccountData(state){
    const value=state&&typeof state==='object'?state:{},domain=value.domain&&typeof value.domain==='object'?value.domain:{};
    if(['businesses','entries','folders','tombstones','businessTombstones','folderTombstones'].some(name=>Array.isArray(value[name])&&value[name].length))return true;
    return ['entities','companyProfiles','projects','paymentAccounts','economicEvents','companyTaxPeriods','companyLossRecords','salaryRecords','dividendDeclarations','personalIncomeLinks'].some(name=>Array.isArray(domain[name])&&domain[name].length);
  }
  function legacyEntries(storage){
    const names=new Set(LEGACY_KEYS);for(let i=0;i<storage.length;i++){const value=storage.key(i);if(value&&value.startsWith('taxmateuk_notice_'))names.add(value);}
    return [...names].sort().flatMap(name=>{const value=storage.getItem(name);return value==null?[]:[{key:name,value}];});
  }
  function quarantineLegacy(storage,options={}){
    const marker='taxmateuk_legacy_quarantine_v1:complete';if(storage.getItem(marker))return{status:'already-quarantined',count:0};
    const entries=legacyEntries(storage);if(!entries.length){storage.setItem(marker,JSON.stringify({version:VERSION,status:'none-found'}));return{status:'none-found',count:0};}
    const now=Number(options.now)||Date.now(),nonce=String(options.nonce||now).replace(/[^a-z0-9_-]/gi,'').slice(0,80)||String(now),recordKey=`taxmateuk_legacy_quarantine_v1:${now}:${nonce}`;
    const record={version:VERSION,status:'quarantined',reason:'legacy-owner-unknown',createdAt:now,entries};
    storage.setItem(recordKey,JSON.stringify(record));storage.setItem(marker,JSON.stringify({version:VERSION,status:'quarantined',recordKey,count:entries.length}));
    for(const entry of entries)storage.removeItem(entry.key);
    return{status:'quarantined',count:entries.length,recordKey};
  }
  function associationMarkerKey(){return'taxmateuk_local_association_v1:pending';}
  function prepareLocalAssociation(storage,options={}){const marker={version:VERSION,status:'pending',source:'local',createdAt:Number(options.now)||Date.now()};storage.setItem(associationMarkerKey(),JSON.stringify(marker));return clone(marker);}
  function clearLocalAssociation(storage){storage.removeItem(associationMarkerKey());}
  function localAssociationPending(storage){try{const value=JSON.parse(storage.getItem(associationMarkerKey())||'null');return !!value&&value.version===VERSION&&value.status==='pending'&&value.source==='local';}catch(_){return false;}}
  function associateLocal(storage,targetScope,options={}){
    if(!validScope(targetScope)||targetScope.kind!=='firebase')throw new Error('A Firebase target scope is required');
    if(!localAssociationPending(storage))return{status:'not-pending'};
    const source=localScope(),canonical=read(storage,source,'canonical');
    if(read(storage,targetScope,'canonical')!=null){clearLocalAssociation(storage);return{status:'target-exists'};}
    const entries=ASSOCIATION_SLOTS.flatMap(slot=>{const value=read(storage,source,slot);return value==null?[]:[{slot,value}];});
    if(!entries.length){clearLocalAssociation(storage);return{status:'empty-local'};}
    const now=Number(options.now)||Date.now(),backupKey=`taxmateuk_local_association_backup_v1:${encodeURIComponent(targetScope.uid)}:${now}`;
    storage.setItem(backupKey,JSON.stringify({version:VERSION,status:'associated',createdAt:now,entries}));
    for(const entry of entries)write(storage,targetScope,entry.slot,entry.value);
    for(const entry of entries)remove(storage,source,entry.slot);
    clearLocalAssociation(storage);
    return{status:'associated',canonical,backupKey,copiedSlots:entries.map(entry=>entry.slot)};
  }
  return Object.freeze({VERSION,PREFIX,SESSION_PREFIX,LEGACY_KEYS,localScope,firebaseScope,validScope,token,key,sessionKey,sameScope,activeUidMatches,receiptPathOwner,ownsReceiptPath,read,write,remove,accountKeys,stateHasAccountData,quarantineLegacy,prepareLocalAssociation,clearLocalAssociation,localAssociationPending,associateLocal});
});

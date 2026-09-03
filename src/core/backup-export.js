(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateBackupExport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CATEGORIES=Object.freeze({
    AUTH_CONNECTIVITY:'auth_connectivity_unavailable',
    STORAGE_LIST:'storage_list_failure',
    FOREIGN_REFERENCE:'foreign_receipt_reference',
    REFERENCED_RECEIPT:'referenced_receipt_unavailable',
    RECEIPT_DOWNLOAD:'receipt_download_failure',
    SIZE_LIMIT:'receipt_size_limit',
    ZIP_RUNTIME:'zip_runtime_unavailable',
    ARCHIVE_VALIDATION:'state_archive_validation_failure',
    BROWSER_DOWNLOAD:'browser_download_failure',
    TIMEOUT:'backup_timeout',
    CANCELLED:'backup_cancelled',
    UNKNOWN:'unknown'
  });
  const CODES=Object.freeze({
    [CATEGORIES.AUTH_CONNECTIVITY]:'BACKUP_AUTH_CONNECTIVITY_UNAVAILABLE',
    [CATEGORIES.STORAGE_LIST]:'BACKUP_STORAGE_LIST_FAILED',
    [CATEGORIES.FOREIGN_REFERENCE]:'BACKUP_FOREIGN_RECEIPT_BLOCKED',
    [CATEGORIES.REFERENCED_RECEIPT]:'BACKUP_REFERENCED_RECEIPT_UNAVAILABLE',
    [CATEGORIES.RECEIPT_DOWNLOAD]:'BACKUP_RECEIPT_DOWNLOAD_FAILED',
    [CATEGORIES.SIZE_LIMIT]:'BACKUP_RECEIPT_SIZE_LIMIT',
    [CATEGORIES.ZIP_RUNTIME]:'BACKUP_ZIP_RUNTIME_UNAVAILABLE',
    [CATEGORIES.ARCHIVE_VALIDATION]:'BACKUP_ARCHIVE_VALIDATION_FAILED',
    [CATEGORIES.BROWSER_DOWNLOAD]:'BACKUP_BROWSER_DOWNLOAD_FAILED',
    [CATEGORIES.TIMEOUT]:'BACKUP_TIMEOUT',
    [CATEGORIES.CANCELLED]:'BACKUP_CANCELLED',
    [CATEGORIES.UNKNOWN]:'BACKUP_UNKNOWN'
  });
  const KNOWN=new Set(Object.values(CATEGORIES)),http=value=>/^https?:\/\//i.test(String(value||'')),safeStage=value=>/^[a-z][a-z0-9_-]{0,63}$/.test(String(value||''))?String(value):null;
  const firebaseCode=error=>String(error&&error.code||'').toLowerCase().replace(/^storage\//,'');
  const safeErrorClass=error=>{const code=firebaseCode(error);if(/^(?:unauthorized|unauthenticated|object-not-found|network-request-failed|retry-limit-exceeded|quota-exceeded)$/.test(code))return`storage_${code.replace(/-/g,'_')}`;const status=Number(error&&error.status||error&&error.statusCode);if(Number.isInteger(status)&&status>=100&&status<=599)return`http_${status}`;const name=String(error&&error.name||'').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,48);return name||null;};
  const fallbackResolutionError=error=>/^(?:unauthorized|unauthenticated|object-not-found)$/.test(firebaseCode(error));
  const receiptPath=value=>{const source=String(value||'');if(/^receipts\/[^/]+\//.test(source))return source;if(!http(source))return null;try{const url=new URL(source),match=/\/o\/([^?#]+)/.exec(url.pathname);if(match){const decoded=decodeURIComponent(match[1]);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}const name=url.searchParams.get('name');if(name){const decoded=decodeURIComponent(name);if(/^receipts\/[^/]+\//.test(decoded))return decoded;}}catch(_){}return null;};
  const receiptOwner=value=>{const match=/^receipts\/([^/]+)\//.exec(receiptPath(value)||'');return match?match[1]:null;};
  const safeRecordId=value=>/^[A-Za-z0-9_.:-]{1,180}$/.test(String(value||''))?String(value):null;
  const safeReceiptPath=value=>{const owned=receiptPath(value);if(owned&&/^receipts\/[^\s?#]+$/.test(owned)&&owned.length<=500)return owned;if(http(value))try{const url=new URL(String(value));const safe=url.origin+url.pathname;return safe.length<=500?safe:null;}catch(_){}return null;};
  function failure(category,options={}){
    const safeCategory=KNOWN.has(category)?category:CATEGORIES.UNKNOWN,error=new Error(CODES[safeCategory]);
    error.name='TaxMateBackupExportError';error.backupCategory=safeCategory;error.safeCode=CODES[safeCategory];
    if(Number.isSafeInteger(options.count)&&options.count>0)error.safeCount=options.count;
    const stage=safeStage(options.stage),errorClass=String(options.errorClass||safeErrorClass(options.cause)||'');if(stage)error.backupStage=stage;if(/^[a-z][a-z0-9_-]{0,63}$/.test(errorClass))error.backupErrorClass=errorClass;
    const status=Number(options.httpStatus||options.cause&&options.cause.status||options.cause&&options.cause.statusCode);if(Number.isInteger(status)&&status>=100&&status<=599)error.backupHttpStatus=status;
    const correlation=String(options.correlation||'');if(/^[A-Za-z0-9_-]{8,80}$/.test(correlation))error.backupCorrelation=correlation;
    const recordId=safeRecordId(options.recordId),path=safeReceiptPath(options.path);if(recordId)error.backupRecordId=recordId;if(path)error.backupPath=path;
    if(options.cause!==undefined)Object.defineProperty(error,'cause',{value:options.cause,enumerable:false});
    return error;
  }
  function classify(error){
    if(error&&KNOWN.has(error.backupCategory))return error;
    const source=[error&&error.code,error&&error.name,error&&error.message].filter(Boolean).join(' ').toLowerCase();
    if(/zip support is unavailable|jszip|zip runtime/.test(source))return failure(CATEGORIES.ZIP_RUNTIME,{cause:error});
    if(/receipt count exceeds|receipt payload exceeds|portable-backup limit|invalid size|too large|size limit|quota-exceeded/.test(source))return failure(CATEGORIES.SIZE_LIMIT,{cause:error});
    if(/object-not-found|referenced receipt.*missing|receipt is referenced but unavailable/.test(source))return failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,cause:error});
    if(/foreign-receipt|account-owner-mismatch/.test(source))return failure(CATEGORIES.FOREIGN_REFERENCE,{count:1,cause:error});
    if(/unauth|network-request-failed|offline|failed to fetch|networkerror|connectivity/.test(source))return failure(CATEGORIES.AUTH_CONNECTIVITY,{cause:error});
    if(/receipt.*download/.test(source))return failure(CATEGORIES.RECEIPT_DOWNLOAD,{count:1,cause:error});
    if(/state|archive|manifest|association|schema|integrity|validation|corrupt|unsafe|duplicate receipt/.test(source))return failure(CATEGORIES.ARCHIVE_VALIDATION,{cause:error});
    return failure(CATEGORIES.UNKNOWN,{cause:error});
  }
  function diagnostic(error){const value=classify(error),result={category:value.backupCategory,code:value.safeCode,count:value.safeCount||null};if(value.backupStage)result.stage=value.backupStage;if(value.backupErrorClass)result.errorClass=value.backupErrorClass;if(value.backupHttpStatus)result.httpStatus=value.backupHttpStatus;if(value.backupCorrelation)result.correlation=value.backupCorrelation;if(value.backupRecordId)result.recordId=value.backupRecordId;if(value.backupPath)result.path=value.backupPath;return Object.freeze(result);}
  function message(error){
    const value=diagnostic(error),count=value.count||1,receipt=`${count} receipt${count===1?'':'s'}`;
    const copy={
      [CATEGORIES.AUTH_CONNECTIVITY]:'Sign in and reconnect to the internet, then try Full Backup again. Your data was not changed.',
      [CATEGORIES.STORAGE_LIST]:"TaxMate couldn't check your receipt files. Check your connection and try again. Your data was not changed.",
      [CATEGORIES.FOREIGN_REFERENCE]:'TaxMate found a receipt reference that does not belong to this account. Full Backup stopped safely and your data was not changed.',
      [CATEGORIES.REFERENCED_RECEIPT]:`${receipt} referenced by your records could not be found. Full Backup stopped so nothing was omitted. Your data was not changed.`,
      [CATEGORIES.RECEIPT_DOWNLOAD]:`${receipt} could not be downloaded. Check your connection and try again. Your data was not changed.`,
      [CATEGORIES.SIZE_LIMIT]:'Your receipt files exceed the Full Backup size limit. Your data was not changed. Contact support before trying again.',
      [CATEGORIES.ZIP_RUNTIME]:'The ZIP backup component is unavailable. Close and reopen TaxMate, then try again. Your data was not changed.',
      [CATEGORIES.ARCHIVE_VALIDATION]:'TaxMate could not validate a complete backup archive, so no ZIP was downloaded. Your data was not changed.',
      [CATEGORIES.BROWSER_DOWNLOAD]:'Your browser did not start the ZIP download. Check download permission and available storage, then try again. Your data was not changed.',
      [CATEGORIES.TIMEOUT]:'Full Backup timed out while reading your files. Nothing was omitted and your data was not changed.',
      [CATEGORIES.CANCELLED]:'Full Backup was cancelled. Your data was not changed.',
      [CATEGORIES.UNKNOWN]:"A full backup couldn't be created. Your data was not changed."
    };
    const details=[value.recordId&&`Record ID: ${value.recordId}`,value.path&&`Path: ${value.path}`].filter(Boolean).join('\n');return copy[value.category]+(details?'\n\n'+details:'');
  }
  async function bounded(operation,options={}){
    const stage=options.stage||'backup_operation',correlation=options.correlation,recordId=options.recordId,path=options.path,outer=options.signal;
    if(outer&&outer.aborted)throw failure(CATEGORIES.CANCELLED,{stage,correlation,recordId,path});
    const configured=Number(options.timeoutMs),deadline=Number(options.deadlineAt),remaining=Number.isFinite(deadline)?deadline-Date.now():Infinity;if(remaining<=0)throw failure(CATEGORIES.TIMEOUT,{stage,correlation,recordId,path});const timeoutMs=Math.max(1,Math.min(Number.isFinite(configured)&&configured>0?configured:15000,remaining));
    const controller=typeof AbortController==='function'?new AbortController():null;let timer=null,onAbort=null;
    const cancel=new Promise((_,reject)=>{if(!outer)return;onAbort=()=>{if(controller)controller.abort();reject(failure(CATEGORIES.CANCELLED,{stage,correlation,recordId,path}));};outer.addEventListener('abort',onAbort,{once:true});});
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{if(controller)controller.abort();reject(failure(CATEGORIES.TIMEOUT,{stage,correlation,recordId,path}));},timeoutMs);});
    try{return await Promise.race([Promise.resolve().then(()=>operation(controller?controller.signal:outer)),timeout,cancel]);}
    finally{if(timer)clearTimeout(timer);if(outer&&onAbort)outer.removeEventListener('abort',onAbort);}
  }
  async function firstDownload(urls,download,options={}){
    let lastError=null;
    for(const url of urls){try{return await bounded(signal=>download(url,{signal}),options);}catch(error){lastError=error;if(classify(error).backupCategory===CATEGORIES.CANCELLED)throw error;}}
    const category=classify(lastError).backupCategory;if([CATEGORIES.AUTH_CONNECTIVITY,CATEGORIES.TIMEOUT,CATEGORIES.CANCELLED].includes(category))throw lastError;
    throw failure(CATEGORIES.RECEIPT_DOWNLOAD,{count:1,cause:lastError,stage:options.stage||'receipt_download',correlation:options.correlation,recordId:options.recordId,path:options.path});
  }
  async function collectReceipts(input){
    const state=input&&input.state||{},download=input&&input.download,correlation=input&&input.correlation,activeUid=String(input&&input.activeUid||''),stateOwnerUid=String(input&&input.stateOwnerUid||''),signal=input&&input.signal,timeoutMs=input&&input.timeoutMs,deadlineAt=input&&input.deadlineAt,onProgress=input&&input.onProgress;
    if(typeof download!=='function')throw failure(CATEGORIES.RECEIPT_DOWNLOAD,{stage:'receipt_download',correlation});
    let storageItems=null,uid='';
    if(input&&input.user){
      uid=String(input.user.uid||'');if(!uid||activeUid!==uid||stateOwnerUid!==uid)throw failure(CATEGORIES.FOREIGN_REFERENCE,{count:1,stage:'state_owner',correlation});
    }
    const byPath=new Map(),add=(source,association,fallback)=>{if(!source)return;const group=byPath.get(source)||{associations:[],fallbackUrls:[]};group.associations.push(association);if(http(fallback)&&fallback!==source&&!group.fallbackUrls.includes(fallback))group.fallbackUrls.push(fallback);byPath.set(source,group);};
    for(const item of input&&input.evidenceAssociations||[])add(item.originalPath,item,null);
    for(const entry of state.entries||[]){const source=entry.receiptPath||entry.receiptUrl;if(source)add(source,{recordType:'legacy_entry',recordId:entry.id,originalPath:source},entry.receiptUrl);}
    const context=(group,source)=>{const item=group&&group.associations&&group.associations[0];return{recordId:item&&item.recordId||'unlinked',path:source};};
    const progress=value=>{if(typeof onProgress==='function')onProgress(Object.freeze({...value}));};
    let skippedForeignCount=0,skippedUnavailableCount=0;
    if(input&&input.user){
      if(typeof input.listStorage!=='function')throw failure(CATEGORIES.STORAGE_LIST,{stage:'storage_list',correlation});
      progress({stage:'storage_list',completed:0,total:0});
      try{storageItems=await bounded(childSignal=>input.listStorage(uid,{signal:childSignal}),{signal,timeoutMs,deadlineAt,stage:'storage_list',correlation});}catch(error){if([CATEGORIES.TIMEOUT,CATEGORIES.CANCELLED].includes(classify(error).backupCategory))throw error;throw failure(CATEGORIES.STORAGE_LIST,{cause:error,stage:'storage_list',correlation});}
      if(!Array.isArray(storageItems))throw failure(CATEGORIES.STORAGE_LIST,{stage:'storage_list',correlation});
      const storagePaths=new Set(storageItems.map(item=>item&&item.fullPath).filter(Boolean));
      for(const [source,group] of [...byPath]){
        const foreign=[source,...group.fallbackUrls].find(reference=>{const owner=receiptOwner(reference);return owner&&owner!==uid;});
        if(!foreign)continue;
        const path=receiptPath(source),filename=path&&path.slice(path.lastIndexOf('/')+1),dot=filename&&filename.lastIndexOf('.'),stem=dot>0?filename.slice(0,dot):'',extension=dot>0?filename.slice(dot+1):'';
        const exactLegacyRecord=!!filename&&/^(?:jpe?g|png|webp|heic|heif)$/i.test(extension)&&group.associations.length>0&&group.associations.every(item=>item&&item.recordType==='legacy_entry'&&String(item.recordId||'')===stem);
        const ownedFallbackPath=exactLegacyRecord?`receipts/${uid}/${filename}`:'';
        if(ownedFallbackPath&&storagePaths.has(ownedFallbackPath)){group.ownedFallbackPath=ownedFallbackPath;group.fallbackUrls=[];continue;}
        skippedForeignCount++;if(typeof input.onForeignReference==='function')input.onForeignReference({kind:http(foreign)?'receipt_url':'receipt_path'});throw failure(CATEGORIES.FOREIGN_REFERENCE,{count:1,stage:'receipt_owner',correlation,...context(group,source)});
      }
    }
    const result=[],seen=new Set(),linkedPaths=new Set([...byPath.keys(),...[...byPath.values()].map(group=>group.ownedFallbackPath).filter(Boolean)]);
    let completed=0;const total=byPath.size+(input&&input.user?storageItems.filter(item=>item&&item.fullPath&&!linkedPaths.has(item.fullPath)).length:0);progress({stage:'receipt_download',completed,total});
    for(const [source,group] of byPath){
      const downloadSource=group.ownedFallbackPath||source;
      let urls=http(downloadSource)?[downloadSource]:[];
      if(!urls.length){
        if(!input.user||typeof input.storageUrl!=='function')throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,stage:'receipt_resolve',correlation,...context(group,downloadSource)});
        const owned=receiptOwner(downloadSource)===uid&&activeUid===uid&&stateOwnerUid===uid;
        if(!owned){skippedForeignCount++;if(typeof input.onForeignReference==='function')input.onForeignReference({kind:'receipt_path'});throw failure(CATEGORIES.FOREIGN_REFERENCE,{count:1,stage:'receipt_owner',correlation,...context(group,downloadSource)});}
        try{const resolved=await bounded(childSignal=>input.storageUrl(downloadSource,{signal:childSignal}),{signal,timeoutMs,deadlineAt,stage:'receipt_resolve',correlation,...context(group,downloadSource)});if(resolved)urls.push(resolved);}catch(error){const category=classify(error).backupCategory;if(group.fallbackUrls.length&&fallbackResolutionError(error)){}else if([CATEGORIES.AUTH_CONNECTIVITY,CATEGORIES.TIMEOUT,CATEGORIES.CANCELLED].includes(category))throw error;else if(!group.fallbackUrls.length)throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,cause:error,stage:'receipt_resolve',correlation,...context(group,downloadSource)});}
      }
      urls=urls.concat(group.fallbackUrls).filter((value,index,list)=>http(value)&&list.indexOf(value)===index);
      if(!urls.length)throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,stage:'receipt_resolve',correlation,...context(group,downloadSource)});
      const binary=await firstDownload(urls,download,{signal,timeoutMs,deadlineAt,stage:'receipt_download',correlation,...context(group,downloadSource)});
      const legacy=group.associations.filter(item=>item.recordType==='legacy_entry');
      result.push({entryId:group.associations.length===1&&legacy.length===1?legacy[0].recordId:null,originalPath:source,associations:group.associations,...binary});
      if(!http(downloadSource))seen.add(downloadSource);
      completed++;progress({stage:'receipt_download',completed,total,...context(group,downloadSource)});
    }
    if(input.user){
      for(const item of storageItems){
        if(!item||!item.fullPath||seen.has(item.fullPath)||linkedPaths.has(item.fullPath))continue;
        if(receiptOwner(item.fullPath)!==String(input.user.uid||'')){skippedForeignCount++;if(typeof input.onForeignReference==='function')input.onForeignReference({kind:'orphan_path'});throw failure(CATEGORIES.FOREIGN_REFERENCE,{count:1,stage:'orphan_owner',correlation,recordId:'unlinked',path:item.fullPath});}
        let url;try{url=await bounded(childSignal=>typeof item.getDownloadURL==='function'?item.getDownloadURL({signal:childSignal}):input.storageUrl(item.fullPath,{signal:childSignal}),{signal,timeoutMs,deadlineAt,stage:'orphan_resolve',correlation,recordId:'unlinked',path:item.fullPath});}catch(error){const category=classify(error).backupCategory;if([CATEGORIES.AUTH_CONNECTIVITY,CATEGORIES.TIMEOUT,CATEGORIES.CANCELLED].includes(category))throw error;throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,cause:error,stage:'orphan_resolve',correlation,recordId:'unlinked',path:item.fullPath});}
        const binary=await firstDownload([url],download,{signal,timeoutMs,deadlineAt,stage:'orphan_download',correlation,recordId:'unlinked',path:item.fullPath});result.push({entryId:null,originalPath:item.fullPath,...binary});completed++;progress({stage:'orphan_download',completed,total,recordId:'unlinked',path:item.fullPath});
      }
    }
    Object.defineProperties(result,{skippedForeignCount:{value:skippedForeignCount,enumerable:false},skippedUnavailableCount:{value:skippedUnavailableCount,enumerable:false}});return result;
  }
  return Object.freeze({CATEGORIES,CODES,failure,classify,diagnostic,message,bounded,collectReceipts,receiptPath,receiptOwner,fallbackResolutionError});
});

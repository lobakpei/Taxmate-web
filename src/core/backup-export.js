(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateBackupExport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CATEGORIES=Object.freeze({
    AUTH_CONNECTIVITY:'auth_connectivity_unavailable',
    STORAGE_LIST:'storage_list_failure',
    REFERENCED_RECEIPT:'referenced_receipt_unavailable',
    RECEIPT_DOWNLOAD:'receipt_download_failure',
    SIZE_LIMIT:'receipt_size_limit',
    ZIP_RUNTIME:'zip_runtime_unavailable',
    ARCHIVE_VALIDATION:'state_archive_validation_failure',
    BROWSER_DOWNLOAD:'browser_download_failure',
    UNKNOWN:'unknown'
  });
  const CODES=Object.freeze({
    [CATEGORIES.AUTH_CONNECTIVITY]:'BACKUP_AUTH_CONNECTIVITY_UNAVAILABLE',
    [CATEGORIES.STORAGE_LIST]:'BACKUP_STORAGE_LIST_FAILED',
    [CATEGORIES.REFERENCED_RECEIPT]:'BACKUP_REFERENCED_RECEIPT_UNAVAILABLE',
    [CATEGORIES.RECEIPT_DOWNLOAD]:'BACKUP_RECEIPT_DOWNLOAD_FAILED',
    [CATEGORIES.SIZE_LIMIT]:'BACKUP_RECEIPT_SIZE_LIMIT',
    [CATEGORIES.ZIP_RUNTIME]:'BACKUP_ZIP_RUNTIME_UNAVAILABLE',
    [CATEGORIES.ARCHIVE_VALIDATION]:'BACKUP_ARCHIVE_VALIDATION_FAILED',
    [CATEGORIES.BROWSER_DOWNLOAD]:'BACKUP_BROWSER_DOWNLOAD_FAILED',
    [CATEGORIES.UNKNOWN]:'BACKUP_UNKNOWN'
  });
  const KNOWN=new Set(Object.values(CATEGORIES)),http=value=>/^https?:\/\//i.test(String(value||''));
  function failure(category,options={}){
    const safeCategory=KNOWN.has(category)?category:CATEGORIES.UNKNOWN,error=new Error(CODES[safeCategory]);
    error.name='TaxMateBackupExportError';error.backupCategory=safeCategory;error.safeCode=CODES[safeCategory];
    if(Number.isSafeInteger(options.count)&&options.count>0)error.safeCount=options.count;
    if(options.cause!==undefined)Object.defineProperty(error,'cause',{value:options.cause,enumerable:false});
    return error;
  }
  function classify(error){
    if(error&&KNOWN.has(error.backupCategory))return error;
    const source=[error&&error.code,error&&error.name,error&&error.message].filter(Boolean).join(' ').toLowerCase();
    if(/zip support is unavailable|jszip|zip runtime/.test(source))return failure(CATEGORIES.ZIP_RUNTIME,{cause:error});
    if(/receipt count exceeds|receipt payload exceeds|portable-backup limit|invalid size|too large|size limit|quota-exceeded/.test(source))return failure(CATEGORIES.SIZE_LIMIT,{cause:error});
    if(/unauth|network-request-failed|offline|failed to fetch|networkerror|connectivity/.test(source))return failure(CATEGORIES.AUTH_CONNECTIVITY,{cause:error});
    if(/object-not-found|referenced receipt.*missing|receipt is referenced but unavailable/.test(source))return failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,cause:error});
    if(/receipt.*download/.test(source))return failure(CATEGORIES.RECEIPT_DOWNLOAD,{count:1,cause:error});
    if(/state|archive|manifest|association|schema|integrity|validation|corrupt|unsafe|duplicate receipt/.test(source))return failure(CATEGORIES.ARCHIVE_VALIDATION,{cause:error});
    return failure(CATEGORIES.UNKNOWN,{cause:error});
  }
  function diagnostic(error){const value=classify(error);return Object.freeze({category:value.backupCategory,code:value.safeCode,count:value.safeCount||null});}
  function message(error){
    const value=diagnostic(error),count=value.count||1,receipt=`${count} receipt${count===1?'':'s'}`;
    const copy={
      [CATEGORIES.AUTH_CONNECTIVITY]:'Sign in and reconnect to the internet, then try Full Backup again. Your data was not changed.',
      [CATEGORIES.STORAGE_LIST]:"TaxMate couldn't check your receipt files. Check your connection and try again. Your data was not changed.",
      [CATEGORIES.REFERENCED_RECEIPT]:`${receipt} referenced by your records could not be found. Full Backup stopped so nothing was omitted. Your data was not changed.`,
      [CATEGORIES.RECEIPT_DOWNLOAD]:`${receipt} could not be downloaded. Check your connection and try again. Your data was not changed.`,
      [CATEGORIES.SIZE_LIMIT]:'Your receipt files exceed the Full Backup size limit. Your data was not changed. Contact support before trying again.',
      [CATEGORIES.ZIP_RUNTIME]:'The ZIP backup component is unavailable. Close and reopen TaxMate, then try again. Your data was not changed.',
      [CATEGORIES.ARCHIVE_VALIDATION]:'TaxMate could not validate a complete backup archive, so no ZIP was downloaded. Your data was not changed.',
      [CATEGORIES.BROWSER_DOWNLOAD]:'Your browser did not start the ZIP download. Check download permission and available storage, then try again. Your data was not changed.',
      [CATEGORIES.UNKNOWN]:"A full backup couldn't be created. Your data was not changed."
    };
    return copy[value.category];
  }
  async function firstDownload(urls,download){
    let lastError=null;
    for(const url of urls){try{return await download(url);}catch(error){lastError=error;}}
    if(classify(lastError).backupCategory===CATEGORIES.AUTH_CONNECTIVITY)throw failure(CATEGORIES.AUTH_CONNECTIVITY,{cause:lastError});
    throw failure(CATEGORIES.RECEIPT_DOWNLOAD,{count:1,cause:lastError});
  }
  async function collectReceipts(input){
    const state=input&&input.state||{},download=input&&input.download;
    if(typeof download!=='function')throw failure(CATEGORIES.RECEIPT_DOWNLOAD);
    let storageItems=null;
    if(input&&input.user){
      if(typeof input.listStorage!=='function')throw failure(CATEGORIES.STORAGE_LIST);
      try{storageItems=await input.listStorage(input.user.uid);}catch(error){throw failure(CATEGORIES.STORAGE_LIST,{cause:error});}
      if(!Array.isArray(storageItems))throw failure(CATEGORIES.STORAGE_LIST);
    }
    const byPath=new Map(),add=(source,association,fallback)=>{if(!source)return;const group=byPath.get(source)||{associations:[],fallbackUrls:[]};group.associations.push(association);if(http(fallback)&&fallback!==source&&!group.fallbackUrls.includes(fallback))group.fallbackUrls.push(fallback);byPath.set(source,group);};
    for(const item of input&&input.evidenceAssociations||[])add(item.originalPath,item,null);
    for(const entry of state.entries||[]){const source=entry.receiptPath||entry.receiptUrl;if(source)add(source,{recordType:'legacy_entry',recordId:entry.id,originalPath:source},entry.receiptUrl);}
    const result=[],seen=new Set(),linkedPaths=new Set(byPath.keys());
    for(const [source,group] of byPath){
      let urls=http(source)?[source]:[];
      if(!urls.length){
        if(!input.user||typeof input.storageUrl!=='function')throw failure(CATEGORIES.AUTH_CONNECTIVITY);
        try{const resolved=await input.storageUrl(source);if(resolved)urls.push(resolved);}catch(error){if(classify(error).backupCategory===CATEGORIES.AUTH_CONNECTIVITY)throw failure(CATEGORIES.AUTH_CONNECTIVITY,{cause:error});if(!group.fallbackUrls.length)throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1,cause:error});}
      }
      urls=urls.concat(group.fallbackUrls).filter((value,index,list)=>http(value)&&list.indexOf(value)===index);
      if(!urls.length)throw failure(CATEGORIES.REFERENCED_RECEIPT,{count:1});
      const binary=await firstDownload(urls,download),legacy=group.associations.filter(item=>item.recordType==='legacy_entry');
      result.push({entryId:group.associations.length===1&&legacy.length===1?legacy[0].recordId:null,originalPath:source,associations:group.associations,...binary});
      if(!http(source))seen.add(source);
    }
    if(input.user){
      for(const item of storageItems){
        if(!item||!item.fullPath||seen.has(item.fullPath)||linkedPaths.has(item.fullPath))continue;
        let url;try{url=typeof item.getDownloadURL==='function'?await item.getDownloadURL():await input.storageUrl(item.fullPath);}catch(error){if(classify(error).backupCategory===CATEGORIES.AUTH_CONNECTIVITY)throw failure(CATEGORIES.AUTH_CONNECTIVITY,{cause:error});throw failure(CATEGORIES.RECEIPT_DOWNLOAD,{count:1,cause:error});}
        const binary=await firstDownload([url],download);result.push({entryId:null,originalPath:item.fullPath,...binary});
      }
    }
    return result;
  }
  return Object.freeze({CATEGORIES,CODES,failure,classify,diagnostic,message,collectReceipts});
});

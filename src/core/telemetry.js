(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateTelemetry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EVENTS=new Set(['onboarding_complete','business_created','income_added','expense_added','receipt_added','tax_estimate_viewed','quarterly_summary_viewed','backup_exported','backup_export_failed','cloud_connected','sync_error','upgrade_viewed','pwa_install_prompt_viewed','pwa_install_clicked','pwa_install_dismissed','pwa_install_completed']);
  const BACKUP_FAILURE_CATEGORIES=new Set(['auth_connectivity_unavailable','storage_list_failure','referenced_receipt_unavailable','receipt_download_failure','receipt_size_limit','zip_runtime_unavailable','state_archive_validation_failure','browser_download_failure','unknown']);
  function scrubFrame(frame){return{filename:String(frame&&frame.filename||'').split('?')[0],function:String(frame&&frame.function||'').slice(0,120),lineno:Number(frame&&frame.lineno)||undefined,colno:Number(frame&&frame.colno)||undefined};}
  function safeIdentity(value,max=160){const text=String(value||'');return text.length>0&&text.length<=max&&/^[A-Za-z0-9@._:-]+$/.test(text)?text:undefined;}
  function scrubSentryEvent(event){
    const source=JSON.parse(JSON.stringify(event||{}));
    const clean={event_id:source.event_id,platform:source.platform||'javascript',level:source.level||'error'};
    if(source.environment==='production')clean.environment='production';
    const release=safeIdentity(source.release),dist=safeIdentity(source.dist);if(release&&/^taxmate-web@\d+\.\d+\.\d+$/.test(release))clean.release=release;if(dist)clean.dist=dist;
    const tags=source.tags||{},safeTags={};for(const key of ['app_version','build_id','pwa_cache']){const value=safeIdentity(tags[key]);if(value)safeTags[key]=value;}if(Object.keys(safeTags).length)clean.tags=safeTags;
    const values=source.exception&&Array.isArray(source.exception.values)?source.exception.values:[];
    if(values.length)clean.exception={values:values.slice(0,3).map(value=>({type:String(value&&value.type||'Error').slice(0,80),value:'Application error',stacktrace:value&&value.stacktrace&&Array.isArray(value.stacktrace.frames)?{frames:value.stacktrace.frames.slice(-30).map(scrubFrame)}:undefined}))};
    return clean;
  }
  function analyticsEvent(name,values){
    if(!EVENTS.has(name))throw new Error('Unapproved analytics event');const params={app_surface:'web'};
    if(name==='backup_export_failed'){
      const category=String(values&&values.category||''),errorCode=String(values&&values.code||'');
      if(!BACKUP_FAILURE_CATEGORIES.has(category)||!/^BACKUP_[A-Z_]+$/.test(errorCode))throw new Error('Unsafe backup diagnostic');
      params.failure_category=category;params.error_code=errorCode;
    }
    return{name,params};
  }
  return{EVENTS,BACKUP_FAILURE_CATEGORIES,scrubSentryEvent,analyticsEvent};
});

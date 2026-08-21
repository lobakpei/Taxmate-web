(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateTelemetry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EVENTS=new Set(['onboarding_complete','business_created','income_added','expense_added','receipt_added','tax_estimate_viewed','quarterly_summary_viewed','backup_exported','cloud_connected','sync_error','upgrade_viewed','pwa_install_prompt_viewed','pwa_install_clicked','pwa_install_dismissed','pwa_install_completed']);
  function scrubFrame(frame){return{filename:String(frame&&frame.filename||'').split('?')[0],function:String(frame&&frame.function||'').slice(0,120),lineno:Number(frame&&frame.lineno)||undefined,colno:Number(frame&&frame.colno)||undefined};}
  function scrubSentryEvent(event){
    const source=JSON.parse(JSON.stringify(event||{}));
    const clean={event_id:source.event_id,platform:source.platform||'javascript',level:source.level||'error'};
    const values=source.exception&&Array.isArray(source.exception.values)?source.exception.values:[];
    if(values.length)clean.exception={values:values.slice(0,3).map(value=>({type:String(value&&value.type||'Error').slice(0,80),value:'Application error',stacktrace:value&&value.stacktrace&&Array.isArray(value.stacktrace.frames)?{frames:value.stacktrace.frames.slice(-30).map(scrubFrame)}:undefined}))};
    return clean;
  }
  function analyticsEvent(name){if(!EVENTS.has(name))throw new Error('Unapproved analytics event');return{name,params:{app_surface:'web'}};}
  return{EVENTS,scrubSentryEvent,analyticsEvent};
});

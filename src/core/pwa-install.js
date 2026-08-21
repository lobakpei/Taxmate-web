(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMatePwaInstall=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DISMISSAL_WINDOW_MS=14*24*60*60*1000;
  const KEYS=Object.freeze({
    dismissedAt:'taxmateuk_pwa_install_dismissed_at',
    installed:'taxmateuk_pwa_installed',
    proactiveShown:'taxmateuk_pwa_proactive_shown'
  });
  function hasMeaningfulData(state){
    const businesses=state&&Array.isArray(state.businesses)?state.businesses:[];
    const entries=state&&Array.isArray(state.entries)?state.entries:[];
    return businesses.length>0||entries.some(entry=>entry&&(entry.kind==='income'||entry.kind==='expense'));
  }
  function dismissalIsActive(dismissedAt,now){
    const timestamp=Number(dismissedAt),current=Number(now);
    if(!Number.isFinite(timestamp)||timestamp<=0||!Number.isFinite(current))return false;
    return current<timestamp+DISMISSAL_WINDOW_MS;
  }
  function isInstalled({displayModeStandalone=false,navigatorStandalone=false,persistedInstalled=false}={}){
    return displayModeStandalone===true||navigatorStandalone===true||persistedInstalled===true;
  }
  function supportsMeaningfulPath({hasDeferredPrompt=false,isIOSSafari=false}={}){
    return hasDeferredPrompt===true||isIOSSafari===true;
  }
  function canPromote({state,now=Date.now(),dismissedAt=null,displayModeStandalone=false,navigatorStandalone=false,persistedInstalled=false,hasDeferredPrompt=false,isIOSSafari=false}={}){
    return hasMeaningfulData(state)
      &&supportsMeaningfulPath({hasDeferredPrompt,isIOSSafari})
      &&!isInstalled({displayModeStandalone,navigatorStandalone,persistedInstalled})
      &&!dismissalIsActive(dismissedAt,now);
  }
  function canPromptProactively(options={}){
    return options.proactiveShown!==true&&canPromote(options);
  }
  return Object.freeze({DISMISSAL_WINDOW_MS,KEYS,hasMeaningfulData,dismissalIsActive,isInstalled,supportsMeaningfulPath,canPromote,canPromptProactively});
});

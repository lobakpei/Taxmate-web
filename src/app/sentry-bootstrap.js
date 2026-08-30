'use strict';
(function(root){
  const state={enabled:false,reason:'not_started',sdkRequested:false};
  function productionRuntime(){
    const environment=root.TAXMATE_FIREBASE_ENVIRONMENT||{},sentry=environment.sentry||{},hosts=new Set(Array.isArray(environment.hosts)?environment.hosts.map(value=>String(value).toLowerCase()):[]),host=String(root.location&&root.location.hostname||'').toLowerCase();
    if(root.navigator&&root.navigator.webdriver===true)return{allowed:false,reason:'automated_browser'};
    if(!hosts.has(host))return{allowed:false,reason:'non_production_host'};
    if(sentry.enabled!==true||sentry.environment!=='production'||!/^https:\/\/js-de\.sentry-cdn\.com\/[a-f0-9]+\.min\.js$/.test(String(sentry.loaderUrl||''))||environment.functionsOrigin||environment.emulators)return{allowed:false,reason:'non_production_environment'};
    return{allowed:true,reason:'production',loaderUrl:sentry.loaderUrl};
  }
  function sentryOptions(){
    const versions=root.TaxMateCore&&root.TaxMateCore.VERSIONS||{},appVersion=String(versions.APP_VERSION||'unknown'),buildId=String(versions.BUILD_ID||'unknown'),cacheVersion=String(versions.PWA_CACHE_VERSION||'unknown');
    return{sendDefaultPii:false,maxBreadcrumbs:0,environment:'production',release:`taxmate-web@${appVersion}`,dist:buildId,initialScope:{tags:{app_version:appVersion,build_id:buildId,pwa_cache:cacheVersion}},beforeSend:root.TaxMateTelemetry.scrubSentryEvent};
  }
  function start(){
    const decision=productionRuntime();state.reason=decision.reason;
    if(!decision.allowed){root.__TAXMATE_SENTRY_STATE__=Object.freeze({...state});return false;}
    root.sentryOnLoad=function(){root.Sentry.init(sentryOptions());state.enabled=true;state.reason='production';root.__TAXMATE_SENTRY_STATE__=Object.freeze({...state});};
    const script=root.document.createElement('script');script.src=decision.loaderUrl;script.crossOrigin='anonymous';script.async=true;state.sdkRequested=true;root.__TAXMATE_SENTRY_STATE__=Object.freeze({...state});root.document.head.appendChild(script);return true;
  }
  root.TaxMateSentryRuntime=Object.freeze({productionRuntime,start});
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else root.queueMicrotask(start);
})(window);

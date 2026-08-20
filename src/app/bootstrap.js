'use strict';
(function(root){
  const CONSENT_KEY='taxmateuk_analytics_consent';
  const MEASUREMENT_ID='G-W1WWK7EVTR';
  let loaded=false;
  root.dataLayer=root.dataLayer||[];
  function gtag(){root.dataLayer.push(arguments);}
  root.gtag=gtag;
  function enabled(){try{return localStorage.getItem(CONSENT_KEY)==='granted';}catch(_){return false;}}
  function load(){
    if(loaded||!enabled())return;
    loaded=true;
    gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:0});
    gtag('js',new Date());
    gtag('config',MEASUREMENT_ID,{allow_google_signals:false,allow_ad_personalization_signals:false,client_storage:'none',send_page_view:false});
    const script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }
  function setConsent(value){
    try{if(value)localStorage.setItem(CONSENT_KEY,'granted');else localStorage.setItem(CONSENT_KEY,'denied');}catch(_){}
    gtag('consent','update',{analytics_storage:value?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if(value)load();
  }
  root.TaxMateAnalytics=Object.freeze({CONSENT_KEY,enabled,setConsent,load});
  if(enabled())load();
})(window);

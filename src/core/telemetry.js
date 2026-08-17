(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateTelemetry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';const EVENTS=new Set(['onboarding_complete','business_created','income_added','expense_added','receipt_added','tax_estimate_viewed','quarterly_summary_viewed','backup_exported','cloud_connected','sync_error','upgrade_viewed']);
  function scrubSentryEvent(event){const e=JSON.parse(JSON.stringify(event||{}));delete e.user;if(e.request){delete e.request.data;delete e.request.cookies;delete e.request.headers;if(e.request.url)e.request.url=e.request.url.split('?')[0];}if(Array.isArray(e.breadcrumbs))e.breadcrumbs=e.breadcrumbs.filter(b=>b.category!=='ui.input'&&!/firestore|storage/i.test(b.category||''));delete e.contexts;return e;}
  function analyticsEvent(name){if(!EVENTS.has(name))throw new Error('Unapproved analytics event');return{name,params:{app_surface:'web'}};}
  return{EVENTS,scrubSentryEvent,analyticsEvent};
});

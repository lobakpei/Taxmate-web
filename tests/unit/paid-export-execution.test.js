'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Entitlement=require('../../src/core/entitlement');
const app=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8');
function fn(name,next){return app.slice(app.indexOf(name),app.indexOf(next,app.indexOf(name)));}
test('paid export handlers reject Free before loading reports or touching data',async()=>{
  const denied=[],context=vm.createContext({hasFeature:()=>false,lockGuard:key=>denied.push(key)});
  vm.runInContext(fn('async function exportReceiptPack(){','/* ═══════════ PDF Report Engine'),context);
  vm.runInContext(fn('function generatePDF(){','/* ═══════════ Receipt photo engine'),context);
  await context.exportReceiptPack();context.generatePDF();assert.deepEqual(denied,['receiptPack','pdfReport']);
  for(const [name,feature]of [['generatePDF','pdfReport'],['exportReceiptPack','receiptPack']]){
    const source=fn((name==='exportReceiptPack'?'async ':'')+'function '+name+'(){',name==='exportReceiptPack'?'/* ═══════════ PDF Report Engine':'/* ═══════════ Receipt photo engine');
    assert.match(source,new RegExp("if\\(!hasFeature\\('"+feature+"'\\)\\)\\{lockGuard\\('"+feature+"'\\);return;\\}\\s*doc\\.save"));
  }
});
test('Manage subscription dispatch opens the account overview and plans without opening a payment session',()=>{
  const listeners={},context=vm.createContext({console,document:{addEventListener:(event,handler)=>listeners[event]=handler}});
  context.window=context;let prompts=0,calls=0,continued;const opened=[];
  Object.assign(context,{openBillingOverview:()=>opened.push('overview'),openBillingPlans:()=>opened.push('plans')});
  // The reminder is localised (six languages); the test resolves English copy through the app's own I18N table.
  const {I18N}=require('../../scripts/i18n-audit');
  Object.assign(context,{requireLoginForTier:()=>true,ENTITLEMENT:{snapshot:{subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:Date.UTC(2027,1,1)}},TaxMateEntitlement:Entitlement,locale:()=>'en-GB',t:(key,vars)=>{let s=I18N.en[key]||key;if(vars)for(const k in vars)s=s.split('{'+k+'}').join(vars[k]);return s;},confirmAction:(title,message,callback)=>{prompts++;assert.equal(title,I18N.en['ret.manageTitle']);assert.match(message,/Full Backup ZIP/);assert.match(message,/6 Apr 2027/);assert.match(message,/1 Feb 2027/);continued=callback;},startBillingAction:()=>calls++});
  const source=app.slice(app.indexOf('function retentionDateLabel(value){'),app.indexOf('\n}',app.indexOf('function openBillingPortal(){'))+2);
  vm.runInContext(source,context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/app/action-dispatch.js'),'utf8'),context);
  listeners.click({type:'click',target:{closest:()=>({getAttribute:()=> 'openBillingPortal()'})}});
  assert.deepEqual(opened,['overview','plans']);assert.equal(prompts,0);assert.equal(calls,0);
});
test('Receipt Pack rechecks entitlement after asynchronous image work, immediately before saving',async()=>{
  for(const expireDuringRender of [false,true]){
    let paid=true,saved=0,locked=0;
    const doc=new Proxy({save:()=>saved++},{get:(target,key)=>target[key]||(()=>{})});
    const context=vm.createContext({
      hasFeature:()=>paid,lockGuard:()=>locked++,t:key=>key,toast:()=>{},showNotice:()=>{},receiptDisplayUrl:value=>value,
      S:{year:'2026-27',entries:[{id:'e',bizId:'b',kind:'expense',date:'2026-08-20',amount:1,cat:'other',receiptUrl:'local:test'}]},
      inYear:()=>true,catById:()=>null,bizById:()=>({name:'Test'}),pdfSafe:String,I18N:{en:{}},
      Image:class{constructor(){this.width=1;this.height=1;}set src(_){Promise.resolve().then(()=>this.onload());}},
      document:{createElement:()=>({getContext:()=>({fillRect:()=>{},drawImage:()=>{}}),toDataURL:()=>{if(expireDuringRender)paid=false;return'data:image/jpeg;base64,dGVzdA==';}})}
    });
    context.window={jspdf:{jsPDF:function(){return doc;}}};
    vm.runInContext(fn('async function exportReceiptPack(){','/* ═══════════ PDF Report Engine'),context);
    await context.exportReceiptPack();
    assert.equal(saved,expireDuringRender?0:1);assert.equal(locked,expireDuringRender?1:0);
  }
});
test('annual cancellation reminder appears even 90 days before expiry and respects continuing paid grants',()=>{
  const now=Date.UTC(2026,8,5),snapshot={subscriptionStatus:'active',paidTier:'pro',cancelAtPeriodEnd:true,currentPeriodEnd:now+90*86400000};
  assert.match(Entitlement.notification(snapshot,now).message,/2027-04-06/);
  snapshot.promotions={PLUS:{status:'active',tier:'plus',startsAt:now-1,expiresAt:null,permanent:true}};
  assert.equal(Entitlement.paidAccessEnd(snapshot,now).status,'continuing');
  assert.doesNotMatch(Entitlement.notification(snapshot,now).message,/deleted on/);
});

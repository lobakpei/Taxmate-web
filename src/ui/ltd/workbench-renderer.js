/* ============================================================================
   TaxMate Ltd V1.5 — Founder-approved UI renderer
   Owner: TaxMate Web. Integrates the approved Fable visual implementation.
   Renders the approved TaxMate Ltd UI purely from facade snapshots
   and drives every state change through named window.TaxMateLtdUIFacade
   callbacks. No domain import, no tax/accounting/allocation/eligibility/route
   arithmetic, no hard-coded product copy — all copy comes from
   snapshot.informationCopy (Founder-approved six locales, zero English
   fallback). Exposes window.TaxMateLtdWorkbenchRenderer.render(mount,facade,
   snapshot) so the fixed harness boot and Codex binding stay unchanged.
   ============================================================================ */
(function attachTaxMateLtdUI(root){
  'use strict';

  /* ---- UI-only presentation state (NOT domain state) -------------------- */
  var UI = {
    locale:'en', theme:'light',
    production:false,
    cache:{},        // fieldKey -> live input text (smooth typing across local repaints)
    choices:{},      // choiceKey -> selected value (UI-local selections before submit)
    sheet:null,      // { kind, step, ctx } UI-local sheet layered over current route
    cal:null,        // fieldKey whose calendar popover is open
    calView:null,    // { y, m } month shown in calendar
    checkIdx:null,   // onboarding step-4: current setup-check index (one question per screen)
    ctIdx:0,         // Corporation Tax review: current factual topic
    disc:{},         // discKey -> open boolean
    errors:{},       // scopeId -> { fieldId: resolvedText }
    review:{},       // scopeId -> [reasonCode]
    toast:null,      // transient toast string
    focusError:false,
    // onDraftChanged emits synchronously in the production facade. Suppress
    // exactly that one subscription callback so a blur cannot replace the
    // button which is about to receive the same pointer click. No other emit
    // (including a canonical-state reload) is eligible for this suppression.
    skipNextDraftEmitRender:0,
    pendingRun:null, pendingDraftRuns:[], pendingRunTimer:null,
    lastRouteKey:null, mountedKey:null
  };
  var LAST = { mount:null, facade:null, snapshot:null };
  var LOCALES = [['en','EN'],['zh-HK','繁'],['pl','PL'],['ro','RO'],['es','ES'],['ur','اردو']];

  /* ---- DOM helper -------------------------------------------------------- */
  function h(tag, attrs, children){
    var n = document.createElement(tag);
    if(attrs) for(var k in attrs){
      var v = attrs[k];
      if(v==null || v===false) continue;
      if(k==='class') n.className = v;
      else if(k==='text') n.textContent = String(v);
      else if(k==='html') n.innerHTML = v;
      else if(k.slice(0,2)==='on') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if(k==='dataset'){ for(var d in v) n.dataset[d]=v[d]; }
      else n.setAttribute(k, v);
    }
    if(children!=null){
      if(!Array.isArray(children)) children=[children];
      children.forEach(function(c){ if(c==null||c===false) return;
        n.appendChild(typeof c==='string'||typeof c==='number' ? document.createTextNode(String(c)) : c); });
    }
    return n;
  }
  function frag(){ return document.createDocumentFragment(); }

  /* ---- i18n: copy strictly from snapshot.informationCopy ---------------- */
  function copyBook(){ return (LAST.snapshot && LAST.snapshot.informationCopy) || {canonical:{},design_scaffolding:{}}; }
  function dict(){
    var b = copyBook(), loc = UI.locale;
    var can = (b.canonical && (b.canonical[loc]||b.canonical.en)) || {};
    var des = (b.design_scaffolding && (b.design_scaffolding[loc]||b.design_scaffolding.en)) || {};
    return { can:can, des:des };
  }
  function interp(s, params){
    if(params) for(var k in params){ s = s.split('{'+k+'}').join(String(params[k])); }
    return s;
  }
  // t(key, params) -> resolved string; loud sentinel if a key is ever missing.
  function t(key, params){
    var d = dict();
    var s = (key in d.can) ? d.can[key] : (key in d.des ? d.des[key] : null);
    if(s==null) return '\u27E8'+key+'\u27E9';
    return interp(s, params);
  }
  function hasKey(key){ var d=dict(); return (key in d.can)||(key in d.des); }
  // G8 plural: Intl.PluralRules per locale -> tax.status_check_{one|few|many|other}
  function pluralChecks(count){
    var cat='other';
    try{ cat = new Intl.PluralRules(intlTag()).select(count); }catch(e){}
    var key='tax.status_check_'+cat;
    if(!hasKey(key)) key='tax.status_check_other';
    return t(key,{count:count});
  }
  function intlTag(){ return UI.locale==='zh-HK' ? 'zh-HK' : UI.locale; }
  function isRTL(){ return UI.locale==='ur'; }

  // Share-funding copy now lives in approved-copy.json (share.action/title/evidence_confirm),
  // delivered via snapshot.informationCopy in all six locales.
  function sfCopy(k){ return t('share.'+ (k==='action'?'action':k==='title'?'title':'evidence_confirm')); }

  /* ---- money & date presentation (UI formatting only) ------------------- */
  function fmtMoney(minor){
    if(minor==null||isNaN(minor)) return '';
    var neg = minor<0, abs=Math.abs(minor);
    var pounds = Math.floor(abs/100), pence = abs%100;
    var pp = String(pence).padStart(2,'0');
    var whole = String(pounds).replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return (neg?'-':'')+'\u00A3'+whole+'.'+pp;
  }
  function money(minor, cls){ return h('span',{class:'tm-num '+(cls||''), text:fmtMoney(minor)}); }
  // Display ISO YYYY-MM-DD as DD/MM/YYYY (UK numeric, locale-safe, bidi-isolated).
  function isoToDisplay(iso){
    if(!iso) return '';
    var p = String(iso).split('-'); if(p.length!==3) return iso;
    return p[2]+'/'+p[1]+'/'+p[0];
  }
  function displayToISO(s){
    if(!s) return '';
    var value=String(s).trim();if(/^\d{8}$/.test(value))value=value.slice(0,2)+'/'+value.slice(2,4)+'/'+value.slice(4);
    var m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!m) return null;
    var d=+m[1], mo=+m[2], y=+m[3];
    if(mo<1||mo>12||d<1||d>31) return null;
    var dt=new Date(Date.UTC(y,mo-1,d));
    if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d) return null;
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }

  /* ---- snapshot readers -------------------------------------------------- */
  function S(){ return LAST.snapshot; }
  function nav(){ return S().navigation || {routes:[],overlays:[],pendingDiscard:null}; }
  function route(){ var r=nav().routes; return r&&r.length ? r[r.length-1] : {screenId:'home',params:{}}; }
  function routeId(){ return route().screenId; }
  function overlays(){ return nav().overlays||[]; }
  function pendingDiscard(){ return nav().pendingDiscard; }
  function busy(){ return !!(S().busy && S().busy.active); }
  function schedulePendingRun(){
    if((!UI.pendingRun&&!UI.pendingDraftRuns.length)||UI.pendingRunTimer)return;
    UI.pendingRunTimer=setTimeout(function(){
      UI.pendingRunTimer=null;
      if(!UI.pendingRun&&!UI.pendingDraftRuns.length)return;
      if(busy()){schedulePendingRun();return;}
      var pending=UI.pendingDraftRuns.length?UI.pendingDraftRuns.shift():UI.pendingRun;
      if(pending===UI.pendingRun)UI.pendingRun=null;
      run(pending.cb,pending.input,pending.opts);
    },0);
  }
  function draftFields(sid){
    var dr = S().drafts && S().drafts.drafts && S().drafts.drafts[sid];
    var out={}; if(dr&&dr.fields) dr.fields.forEach(function(f){ out[f.id]=f.value; });
    return out;
  }

  /* ---- field value cache (smooth typing) -------------------------------- */
  function fkey(sid,fid){ return sid+'::'+fid; }
  function fieldVal(sid,fid,fallback){
    var k=fkey(sid,fid);
    if(k in UI.cache) return UI.cache[k];
    var df=draftFields(sid);
    if(fid in df && df[fid]!=null) return df[fid];
    return fallback!=null?fallback:'';
  }
  function setField(sid,fid,val){ UI.cache[fkey(sid,fid)]=val; }
  function flushActive(){
    var a=document.activeElement;
    if(a && a.dataset && a.dataset.fkey!=null && typeof a.value==='string') UI.cache[a.dataset.fkey]=a.value;
  }
  function choiceKey(scope,name){ return scope+'::choice::'+name; }
  function getChoice(scope,name,fallback){
    var k=choiceKey(scope,name);
    return (k in UI.choices)?UI.choices[k]:(fallback!=null?fallback:null);
  }
  function setChoice(scope,name,val){ UI.choices[choiceKey(scope,name)]=val; }

  /* ---- action runner: every state change goes through the facade -------- */
  function run(cb, input, opts){
    opts = opts||{};
    var f=LAST.facade;
    if(busy()){
      // Draft persistence can overlap a fast next tap. Collapse repeated submits,
      // but queue the latest different semantic action so it is never silently lost.
      var active=S().busy&&S().busy.action;
      if(cb==='onDraftChanged'){
        var field=input&&input.field||{},key=String(input&&input.screenId||'')+'::'+String(field.id||'');
        UI.pendingDraftRuns=UI.pendingDraftRuns.filter(function(item){return item.key!==key;});
        UI.pendingDraftRuns.push({key:key,cb:cb,input:input||{},opts:opts});schedulePendingRun();return;
      }
      if(cb===active)return;
      UI.pendingRun={cb:cb,input:input||{},opts:opts};schedulePendingRun();return;
    }
    Promise.resolve(f[cb](input||{})).then(function(r){
      r=r||{};
      var scope=opts.scope||routeId();
      if(r.status==='field_error'){
        UI.errors[scope]=mapErrors(r.fieldErrors);
        UI.review[scope]=null; UI.focusError=true; paintIfChanged();
      } else if(r.status==='review_required'){
        UI.review[scope]=r.reviewReasons||[]; UI.errors[scope]=null;
        if(opts.onReview) opts.onReview(r);
        paintIfChanged();
      } else if(r.status==='failure'){
        if(opts.onReview){ // fail closed: surface "Needs checking" rather than a bare error
          UI.review[scope]=['facade_failure']; UI.errors[scope]=null; opts.onReview(r); paintIfChanged();
        } else { UI.toast = t((r.error&&r.error.copyKey)||'error.fix_issue', r.error&&r.error.params); paintIfChanged(); scheduleToast(); }
      } else if(r.status==='ok'){
        UI.errors[scope]=null; UI.review[scope]=null;
        if(opts.onOk) opts.onOk(r);
        else if(!opts.skipPaint) paintIfChanged();
      } else { paintIfChanged(); }
    }).catch(function(){UI.toast=t('error.fix_issue');paintIfChanged();scheduleToast();}).finally(schedulePendingRun);
  }
  function mapErrors(list){
    var out={}; (list||[]).forEach(function(e){ out[e.field]=t(e.copyKey, e.params||{}); });
    return out;
  }
  function errFor(scope,field){ var e=UI.errors[scope]; return e&&e[field]; }
  function scheduleToast(){
    if(UI._toastT) clearTimeout(UI._toastT);
    UI._toastT=setTimeout(function(){ UI.toast=null; paint(); }, 2600);
  }
  function toast(msg){ UI.toast=msg; paint(); scheduleToast(); }

  /* ====================================================================== */
  /*  COMPONENTS                                                            */
  /* ====================================================================== */
  function infoTrigger(infoId){
    return h('button',{class:'tm-info', type:'button', 'aria-label':t('common.learn_more'),
      title:t('common.learn_more'), dataset:{info:infoId},
      onClick:function(ev){ ev.preventDefault(); ev.stopPropagation();
        run('onOpenInfo',{infoId:infoId,returnFocusId:infoId},{}); }
    },'i');
  }
  function btn(label, cls, onClick, opts){
    opts=opts||{};
    return h('button',{class:'tm-btn '+(cls||'p'), type:'button', disabled: opts.disabled||busy(),
      dataset:opts.dataset||null, onClick:onClick},[label]);
  }
  function labelRow(text, infoId, hint){
    var kids=[text];
    if(hint) kids.push(h('span',{class:'tm-fhint',text:hint}));
    if(infoId) kids.push(infoTrigger(infoId));
    return h('span',{class:'tm-flabel'},kids);
  }
  function errNode(scope, field){
    var m=errFor(scope,field); if(!m) return null;
    return h('div',{class:'tm-err'},[h('span',{class:'x',text:'!'}), m]);
  }
  // Text / money / percent share one geometry (G4).
  function textField(o){
    // o: {scope,label,fid,placeholder,infoId,hint,kind:'text'|'money'|'percent',inputmode,persist}
    var scope=o.scope, fid=o.fid, err=errFor(scope,fid);
    var wrapCls='tm-inwrap'+(err?' err':'');
    var affixPre = o.kind==='money' ? '\u00A3' : null;
    var affixSuf = o.kind==='percent' ? '%' : null;
    var input=h('input',{class:'tm-input'+(affixPre?' pre':'')+(affixSuf?' suf':''), type:'text',
      inputmode:o.inputmode||(o.kind==='text'?null:'decimal'),
      placeholder:o.placeholder||'', value:fieldVal(scope,fid,o.default||''),
      'aria-label':o.aria||stripTags(o.label), 'aria-invalid':err?'true':null,
      dataset:{fkey:fkey(scope,fid), field:fid},
      onInput:function(e){ setField(scope,fid,e.target.value); if(o.onInput)o.onInput(e.target.value); },
      onChange:function(e){ setField(scope,fid,e.target.value); if(o.kind==='percent'){ setTimeout(paint,0); } },
      onBlur:function(e){ if(o.persist!==false) persistDraft(scope,fid, o.type||'text', e.target.value); }
    });
    var inner=[input];
    if(affixPre) inner.push(h('span',{class:'tm-affix pre',text:affixPre}));
    if(affixSuf) inner.push(h('span',{class:'tm-affix suf',text:affixSuf}));
    return h('div',{class:'tm-field'},[
      labelRow(o.label,o.infoId,o.hint),
      h('div',{class:wrapCls},inner),
      errNode(scope,fid)
    ]);
  }
  function selectField(o){
    // o:{scope,label,fid,options:[[val,label]],infoId,default,persist}
    var scope=o.scope, fid=o.fid, err=errFor(scope,fid), cur=fieldVal(scope,fid,o.default||'');
    var sel=h('select',{class:'tm-input', 'aria-label':stripTags(o.label), 'aria-invalid':err?'true':null,
      dataset:{fkey:fkey(scope,fid), field:fid},
      onChange:function(e){ setField(scope,fid,e.target.value); if(o.persist!==false) persistDraft(scope,fid,'select-one',e.target.value); if(o.onChange)o.onChange(e.target.value); paint(); }
    }, o.options.map(function(op){ return h('option',{value:op[0], selected: String(cur)===String(op[0])?'selected':null},op[1]); }));
    return h('div',{class:'tm-field'},[
      labelRow(o.label,o.infoId,o.hint),
      h('div',{class:'tm-inwrap'},[sel, h('span',{class:'tm-selarrow',text:'\u25BC'})]),
      errNode(scope,fid)
    ]);
  }
  function dateField(o){
    // o:{scope,label,fid,infoId,persist}. Displays DD/MM/YYYY, stores ISO in cache under fid.
    var scope=o.scope, fid=o.fid, err=errFor(scope,fid);
    var iso=fieldVal(scope,fid,o.default||'');
    var disp = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? isoToDisplay(iso) : iso;
    var wrapCls='tm-inwrap'+(err?' err':'');
    var input=h('input',{class:'tm-input suf', type:'text', inputmode:'numeric',
      placeholder:t('design.date_hint'), value:disp, 'aria-label':stripTags(o.label), 'aria-invalid':err?'true':null,
      dataset:{fkey:fkey(scope,fid), field:fid, raw:'date'},
      onInput:function(e){ /* keep raw text; convert on blur */ UI.cache[fkey(scope,fid)+'#raw']=e.target.value; },
      onBlur:function(e){
        var v=e.target.value.trim();
        var isoV = /^\d{4}-\d{2}-\d{2}$/.test(v)? v : displayToISO(v);
        if(isoV){ setField(scope,fid,isoV); if(o.persist!==false) persistDraft(scope,fid,'date',isoV); if(o.onChange)o.onChange(isoV); }
        else { setField(scope,fid,v); } // keep invalid text; facade returns field error on submit
        delete UI.cache[fkey(scope,fid)+'#raw'];
      }
    });
    var openCal=function(){ flushActive(); UI.cal = UI.cal===fkey(scope,fid)?null:fkey(scope,fid);
      var base = /^\d{4}-\d{2}-\d{2}$/.test(iso)? iso : todayISO();
      var pp=base.split('-'); UI.calView={y:+pp[0], m:+pp[1]-1}; paint(); };
    var wrap=h('div',{class:wrapCls, onClick:function(e){ if(e.target===input) return; }},[
      input,
      h('button',{class:'tm-dateico',type:'button','aria-label':t('common.today'),
        onClick:function(e){ e.preventDefault(); openCal(); }},'\uD83D\uDCC5')
    ]);
    var kids=[labelRow(o.label,o.infoId,o.hint), wrap, errNode(scope,fid)];
    if(UI.cal===fkey(scope,fid)) kids.push(calendar(function(newIso){ setField(scope,fid,newIso); if(o.persist!==false) persistDraft(scope,fid,'date',newIso); UI.cal=null; if(o.onChange)o.onChange(newIso); paint(); }, iso));
    return h('div',{class:'tm-field'},kids);
  }
  function persistDraft(sid,fid,type,value){
    // only persist for facade-backed onboarding/edit screens (real screenIds), not ui.* sheets
    if(sid.indexOf('ui.')===0) return;
    UI.skipNextDraftEmitRender+=1;
    try{
      run('onDraftChanged',{screenId:sid, field:{id:fid, type:type||'text', value:value}},{skipPaint:true});
    } finally {
      // The local production facade consumes this counter synchronously. The
      // localhost HTTP facade intentionally emits nothing for onDraftChanged,
      // so clear any unconsumed token before an unrelated future emit arrives.
      if(UI.skipNextDraftEmitRender>0) UI.skipNextDraftEmitRender-=1;
    }
  }
  function choiceGroup(o){
    // o:{scope,name,options:[{v,title,body}],row,onPick,current}
    var cur = o.current!=null ? o.current : getChoice(o.scope,o.name);
    return h('div',{class:'tm-choices'+(o.row?' row':'')}, o.options.map(function(op){
      var on=String(cur)===String(op.v);
      var inner=[h('div',{class:'ct',text:op.title})];
      if(op.body) inner.push(h('div',{class:'cb',text:op.body}));
      return h('button',{class:'tm-choice'+(on?' on':''), type:'button', 'aria-pressed':on?'true':'false',
        onClick:function(){ setChoice(o.scope,o.name,op.v); if(o.onPick)o.onPick(op.v); paint(); }
      }, inner);
    }));
  }
  function checkControl(o){
    // o:{label, checked, onToggle}
    return h('button',{class:'tm-check'+(o.checked?' on':''), type:'button', 'aria-pressed':o.checked?'true':'false',
      onClick:function(){ o.onToggle(!o.checked); paint(); }},[
      h('span',{class:'bx',text:o.checked?'\u2713':''}),
      h('span',{class:'cl',text:o.label})
    ]);
  }
  function notice(tone, title, body, icon){
    var kids=[h('span',{class:'i',text:icon||(tone==='warn'?'\u26A0':tone==='ok'?'\u2713':'\u2139')})];
    var txt=[]; if(title) txt.push(h('b',{text:title})); if(body) txt.push(document.createTextNode(body));
    kids.push(h('div',{},txt));
    return h('div',{class:'tm-notice '+(tone||'info')},kids);
  }
  function summRows(pairs){
    return h('div',{class:'tm-summ'}, pairs.filter(Boolean).map(function(p){
      return h('div',{class:'r'},[h('span',{class:'k',text:p[0]}), h('span',{class:'val'},[p[1]])]);
    }));
  }
  function totalBar(label, value, ok){
    return h('div',{class:'tm-total'+(ok?'':' bad')},[h('span',{text:label}), h('span',{},[value])]);
  }
  function errSummary(scope){
    var e=UI.errors[scope]; if(!e) return null; var ks=Object.keys(e); if(!ks.length) return null;
    return h('div',{class:'tm-errsum'},[h('b',{text:t('common.review')}),
      h('ul',{}, ks.map(function(k){ return h('li',{text:e[k]}); }))]);
  }
  function stripTags(s){ return String(s||'').replace(/<[^>]*>/g,''); }
  function todayISO(){ return S().context&&S().context.currentDate||''; }

  /* ---- compact calendar (approved size, month/year nav, RTL shell) ------ */
  function localeMonths(){
    var out=[];
    try{ var f=new Intl.DateTimeFormat(intlTag(),{month:'short'});
      for(var i=0;i<12;i++) out.push(f.format(new Date(Date.UTC(2021,i,15)))); }
    catch(e){ out=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; }
    return out;
  }
  function localeWeekdays(){
    // Sunday-first single-character labels in the active locale. Where a locale's
    // narrow weekday falls back to Latin (e.g. Urdu) but its script is non-Latin,
    // use the first character of the localised short form so the label stays localised.
    var out=[];
    try{ var tag=intlTag();
      var fn=new Intl.DateTimeFormat(tag,{weekday:'narrow'});
      var fs=new Intl.DateTimeFormat(tag,{weekday:'short'});
      for(var i=0;i<7;i++){ var d=new Date(Date.UTC(2021,7,1+i)); // 2021-08-01 was a Sunday
        var n=fn.format(d), sh=fs.format(d);
        if(/^[A-Za-z]$/.test(n) && /[^\u0000-\u007F]/.test(sh)) n=Array.from(sh)[0];
        out.push(n);
      }
    }
    catch(e){ out=['S','M','T','W','T','F','S']; }
    return out;
  }
  function calendar(onPick, selIso){
    var v=UI.calView||{y:+todayISO().slice(0,4), m:+todayISO().slice(5,7)-1};
    var y=v.y, m=v.m;
    var first=new Date(Date.UTC(y,m,1)), startDow=first.getUTCDay();
    var days=new Date(Date.UTC(y,m+1,0)).getUTCDate();
    // F-06: locale-aware month and weekday names (Urdu inherits RTL from the app).
    var wd=localeWeekdays();
    var months=localeMonths();
    var monSel=h('select',{'aria-label':t('design.select_month'),
      onChange:function(e){ UI.calView={y:y,m:+e.target.value}; paint(); }},
      months.map(function(nm,i){ return h('option',{value:i, selected:i===m?'selected':null}, nm); }));
    var years=[]; for(var yy=y-8; yy<=y+2; yy++) years.push(yy);
    var yrSel=h('select',{'aria-label':t('design.select_year'),
      onChange:function(e){ UI.calView={y:+e.target.value,m:m}; paint(); }},
      years.map(function(yy){ return h('option',{value:yy, selected:yy===y?'selected':null}, String(yy)); }));
    var grid=[]; wd.forEach(function(d){ grid.push(h('div',{class:'tm-calwd',text:d})); });
    for(var i=0;i<startDow;i++) grid.push(h('div',{}));
    for(var day=1; day<=days; day++){
      (function(day){
        var iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        var on=selIso===iso;
        grid.push(h('button',{class:'tm-calday'+(on?' on':''),type:'button',
          onClick:function(){ onPick(iso); }}, String(day)));
      })(day);
    }
    return h('div',{class:'tm-cal', role:'dialog', 'aria-label':t('common.today')},[
      h('div',{class:'tm-calhead'},[
        h('button',{class:'tm-calnav',type:'button','aria-label':t('design.previous_month'),
          onClick:function(){ var nm=m-1,ny=y; if(nm<0){nm=11;ny--;} UI.calView={y:ny,m:nm}; paint(); }}, isRTL()?'\u203A':'\u2039'),
        h('div',{class:'tm-calsel'},[monSel,yrSel]),
        h('button',{class:'tm-calnav',type:'button','aria-label':t('design.next_month'),
          onClick:function(){ var nm=m+1,ny=y; if(nm>11){nm=0;ny++;} UI.calView={y:ny,m:nm}; paint(); }}, isRTL()?'\u2039':'\u203A')
      ]),
      h('div',{class:'tm-calgrid'},grid),
      h('button',{class:'tm-caltoday',type:'button',onClick:function(){ onPick(todayISO()); }}, t('common.today'))
    ]);
  }

  /* ---- sheet scaffold ---------------------------------------------------- */
  function sheet(o){
    // o:{kick,title,child,body:[nodes],foot:[nodes],onClose,progress:{n,total}}
    var head=[h('div',{class:'tm-grab'})];
    var body=[];
    if(o.progress) body.push(h('div',{class:'tm-progress'},[h('i',{},[]).cloneNode(false)]));
    if(o.progress){ var bar=body[body.length-1].firstChild||body[body.length-1]; }
    var bodyKids=[];
    if(o.kick) bodyKids.push(h('div',{class:'tm-kick',text:o.kick}));
    if(o.title) bodyKids.push(h('div',{class:'tm-stitle',text:o.title}));
    if(o.progress){
      var pr=h('div',{class:'tm-progress'},[]); var fill=h('i'); fill.style.width=Math.round(100*o.progress.n/o.progress.total)+'%'; pr.appendChild(fill);
      bodyKids.unshift(pr);
    }
    (o.body||[]).forEach(function(n){ if(n) bodyKids.push(n); });
    var sBody=h('div',{class:'tm-sbody'}, bodyKids);
    var parts=[h('div',{class:'tm-grab'}), sBody];
    if(o.foot&&o.foot.length) parts.push(h('div',{class:'tm-sfoot'}, o.foot.filter(Boolean)));
    var card=h('div',{class:'tm-sheet'+(o.child?' child':''), role:'dialog','aria-modal':'true',
      'aria-label':o.title||o.kick||'', onClick:function(e){ e.stopPropagation(); }}, parts);
    return h('div',{class:'tm-scrim', onClick:function(){ if(o.onClose)o.onClose(); }},[card]);
  }

  /* ====================================================================== */
  /*  INFORMATION SHEET (from navigation.overlays, facade-owned) ----------- */
  /* ====================================================================== */
  // Explicit info catalogue: 3-section (what/why/means) or G7 brief (1 section).
  var INFO_3 = {
    's1.ch':['s1.ch'], 's2.trading':['s2.trading'], 's2.periods':['s2.periods'],
    's2.ct_account':['s2.ct_account'], 's3.director':['s3.director'], 's3.shareholder':['s3.shareholder'],
    's4.q1':['s4.q1'], 's4.q2':['s4.q2'], 's4.q3':['s4.q3'], 's4.q4':['s4.q4'], 's4.q5':['s4.q5'], 's4.q6':['s4.q6']
  };
  var INFO_BRIEF = {
    's1.company_number':['s1.company_number','s1.company_number_info'],
    's3.legal_name':['s3.legal_name','s3.legal_name_info'],
    'money.lend':['money.lend','money.lend_info'],
    'money.repay':['money.repay','money.repay_info'],
    'records.working_pack':['records.working_pack','records.working_pack_info'],
    'tax.record_salary':['tax.record_salary','tax.record_salary_info'],
    'add.ltd':['add.ltd_title','add.ltd_body'],
    's5.learn':['s5.learn','s5.learn_info']
  };
  function infoSheet(ov){
    var id=ov.payload&&ov.payload.infoId || ov.id;
    var body=[];
    if(INFO_3[id]){
      var base=INFO_3[id][0];
      body.push(h('div',{class:'tm-infosec'},[h('h4',{text:t('info.what')}),h('p',{text:t(base+'_what')})]));
      body.push(h('div',{class:'tm-infosec'},[h('h4',{text:t('info.why')}),h('p',{text:t(base+'_why')})]));
      body.push(h('div',{class:'tm-infosec'},[h('h4',{text:t('info.means')}),h('p',{text:t(base+'_means')})]));
      var title=t(base+'_title');
    } else if(INFO_BRIEF[id]){
      var pair=INFO_BRIEF[id]; var title=t(pair[0]);
      body.push(h('div',{class:'tm-infosec'},[h('p',{text:t(pair[1])})]));
    } else {
      var title=t('common.learn_more');
      body.push(h('div',{class:'tm-infosec'},[h('p',{text:id})]));
    }
    return sheet({ child:true, kick:t('info.what'), title:title, body:body,
      foot:[ btn(t('common.got_it'),'p',function(){ run('onCloseInfo',{},{}); }) ],
      onClose:function(){ run('onCloseInfo',{},{}); } });
  }

  /* ---- discard confirmation (from navigation.pendingDiscard) ------------ */
  function discardSheet(){
    return sheet({ child:true, title:t('design.discard_title'),
      body:[ h('p',{class:'tm-muted',text:t('design.discard_body')}) ],
      foot:[
        btn(t('design.discard'),'d',function(){ run('onDiscardConfirmed',{},{onOk:function(){ UI.cache={}; UI.choices={}; UI.sheet=null; paint(); }}); }),
        btn(t('design.keep_editing'),'g',function(){ run('onDiscardCancelled',{},{}); })
      ],
      onClose:function(){ run('onDiscardCancelled',{},{}); } });
  }

  /* ====================================================================== */
  /*  SCREENS                                                               */
  /* ====================================================================== */
  function taxYearLabel(){
    // F-07: the year comes from canonical/semantic state, never a hard-coded literal.
    var s=S();
    if(s.context && s.context.taxYear) return s.context.taxYear;
    if(s.taxYear) return s.taxYear;
    var bl=s.businessList||[];
    for(var i=0;i<bl.length;i++){ if(bl[i].summary && bl[i].summary.taxYear) return bl[i].summary.taxYear; }
    return null;
  }
  function topBar(){
    var yr=taxYearLabel();
    return h('div',{class:'tm-top'},[
      h('div',{class:'tm-brand'},[h('span',{class:'mk',text:'T'}), h('span',{},['Tax',h('span',{class:'mk2',text:'Mate'})])]),
      yr? h('div',{class:'tm-year',text:yr}) : null
    ]);
  }

  function screenHome(){
    var s=S(); var wrap=frag();
    wrap.append(topBar());
    wrap.append(h('div',{class:'tm-h',text:t('design.your_businesses')}));
    var rows=h('div',{class:'tm-rows'});
    (s.businessList||[]).forEach(function(b){ rows.append(homeRow(b)); });
    wrap.append(rows);
    wrap.append(h('button',{class:'tm-add', type:'button',
      onClick:function(){ run('onAddBusiness',{},{}); }}, t('design.add_a_business')));
    return wrap;
  }
  function homeRow(b){
    var prim=b.actions&&b.actions.primary||{};
    var cb=prim.callback, isLtd=b.businessType==='limited_company',locked=isLtd&&prim.enabled===false;
    var sub, cta, avCls='', avTxt=(b.name||'?').slice(0,1).toUpperCase();
    var amt=b.summary&&b.summary.amountMinor;
    var neg = amt!=null && amt<0;
    if(locked){ sub=t('plan.ltd_pro_only'); cta=t('plan.pro_launch_price'); avCls='draft'; }
    else if(cb==='onResumeCompanyDraft'){ sub=t('design.ltd_setup_pending'); cta=t('design.finish_setup'); avCls='draft'; }
    else if(isLtd){ sub=t('workspace.ltd_subtitle',{percent:(b.share&&b.share.percent)||0}); cta=t('common.open'); }
    else { sub=b.structure==='partnership'?t('design.partnership'):t('design.sole_trader'); cta=null; }
    var attn=b.attention&&b.attention.count>0;
    if(attn){ avCls='attn'; }
    var right=h('div',{class:'rt'});
    if(amt!=null && cb!=='onResumeCompanyDraft') right.append(h('div',{class:'amt'+(neg?' neg':'')},[money(amt)]));
    if(attn) right.append(h('div',{class:'cta attn',text:t('design.needs_attention')}));
    else if(cta) right.append(h('div',{class:'cta',text:cta}));
    return h('button',{class:'tm-row', type:'button',disabled:locked,
      onClick:function(){ run(cb, prim.input||{}, {}); }},[
      h('div',{class:'av '+avCls, text:avTxt}),
      h('div',{},[h('div',{class:'nm',text:b.name}), h('div',{class:'mt',text:sub})]),
      right
    ]);
  }

  function screenCategory(){
    var scope='business.category-choice'; var wrap=frag();
    wrap.append(backBar(function(){ run('onBack',{},{}); }, t('add.title')));
    wrap.append(h('div',{class:'tm-question',text:t('add.stage1_question')}));
    wrap.append(h('div',{class:'tm-choices'},[
      bigChoice(t('add.self_employed_title'),t('add.self_employed_body'),null,function(){ run('onAddBusinessCategoryChosen',{category:'self_employed_business'},{}); }),
      bigChoice(t('add.ltd_title'),t('add.ltd_body'),'add.ltd',function(){ run('onAddBusinessCategoryChosen',{category:'limited_company'},{}); })
    ]));
    return wrap;
  }
  function screenSelfEmployed(){
    var wrap=frag();
    wrap.append(backBar(function(){ run('onBack',{},{}); }, t('add.stage2_title')));
    wrap.append(h('div',{class:'tm-question',text:t('add.stage2_question')}));
    wrap.append(h('div',{class:'tm-choices'},[
      bigChoice(t('add.just_me_title'),t('add.just_me_body'),null,function(){ run('onSelfEmployedStructureChosen',{structure:'just_me'},{}); }),
      bigChoice(t('add.partnership_title'),t('add.partnership_body'),null,function(){ run('onSelfEmployedStructureChosen',{structure:'partnership'},{}); })
    ]));
    return wrap;
  }
  function bigChoice(title, body, infoId, onClick){
    var head=[h('div',{class:'ct',text:title})];
    if(infoId) head.push(infoTrigger(infoId));
    return h('button',{class:'tm-choice', type:'button', onClick:onClick},[
      h('div',{},[h('div',{style:'display:flex;align-items:center',},head), h('div',{class:'cb',text:body})])
    ]);
  }
  function screenBusinessExisting(){
    var wrap=frag();
    wrap.append(backBar(function(){ run('onBack',{},{}); }, t('add.title')));
    wrap.append(notice('info', t('add.self_employed_title'), t('add.self_employed_body')));
    wrap.append(h('div',{class:'tm-notice neutral'},[h('span',{class:'i',text:'\u2192'}),
      h('div',{},[t('common.next_step')])]));
    wrap.append(h('div',{style:'margin-top:14px'},[ btn(t('common.back'),'g',function(){ run('onBack',{},{}); }) ]));
    return wrap;
  }
  function screenOneLtdLimit(){
    var existing=S().company&&S().company.profile||{};
    var wrap=frag();
    wrap.append(backBar(function(){ run('onBack',{},{}); }, t('add.ltd_title')));
    wrap.append(notice('info', t('add.ltd_title'), t('add.one_ltd_limit')));
    wrap.append(h('div',{style:'margin-top:14px'},[
      btn(t('add.open_existing'),'p',function(){
        var act=(S().companyLimit&&S().companyLimit.existingAction)||{callback:'onOpenExistingCompany',input:{}};
        run(act.callback||'onOpenExistingCompany', act.input||{}, {}); }),
      h('div',{class:'tm-spacer'}),
      btn(t('common.back'),'g',function(){ run('onBack',{},{}); })
    ]));
    return wrap;
  }
  function backBar(onBack, title){
    return h('div',{},[
      h('button',{class:'tm-wsback',type:'button',onClick:onBack},[isRTL()?'\u2192':'\u2190', ' ', t('common.back')]),
      title? h('div',{class:'tm-wstitle',style:'font-size:22px',text:title}) : null
    ]);
  }

  /* ---- ONBOARDING STEPS -------------------------------------------------- */
  function submitStep(step,screenId,values){
    flushActive();
    run('onContinueStep',{step:step,screenId:screenId,values:values},{scope:screenId,onReview:function(r){if(!r.nextRoute)toast(t('common.review_required'));}});
  }
  function stepShell(stepN, title, bodyNodes, footNodes){
    var wrap=frag();
    var pr=h('div',{class:'tm-progress'},[]); var fill=h('i'); fill.style.width=Math.round(100*stepN/5)+'%'; pr.appendChild(fill);
    wrap.append(h('div',{class:'tm-top'},[
      h('button',{class:'tm-wsback',type:'button',onClick:function(){ run('onBack',{},{}); }},[isRTL()?'\u2192':'\u2190',' ',t('common.back')]),
      h('button',{class:'tm-linkbtn',type:'button',onClick:function(){ run('onDismissRequested',{reason:'cancel'},{}); }}, t('common.cancel'))
    ]));
    wrap.append(pr);
    wrap.append(h('div',{class:'tm-kick',text:t('setup.step_of',{step:stepN,total:5})}));
    wrap.append(h('div',{class:'tm-wstitle',text:title}));
    var es=errSummary(routeId()); if(es) wrap.append(es);
    bodyNodes.forEach(function(n){ if(n) wrap.append(n); });
    wrap.append(h('div',{style:'margin-top:18px;display:flex;flex-direction:column;gap:9px'}, footNodes.filter(Boolean)));
    return wrap;
  }
  function step1(){
    var sid='ltd.onboarding.step1';
    var profile=S().company&&S().company.profile||{};
    var savedShortcut=profile.companyNumberStatus==='not_available'&&!!profile.incorporationDate;
    var reg=fieldVal(sid,'companyNumberStatus', getChoice(sid,'reg')||(savedShortcut?'provided':profile.companyNumberStatus)||'');
    var body=[
      h('div',{class:'tm-question',style:'display:flex;align-items:center'},[t('s1.registered_question'), infoTrigger('s1.ch')]),
      choiceGroup({scope:sid,name:'reg',row:true,current:reg,options:[
        {v:'provided',title:t('common.yes')},{v:'not_available',title:t('s2.not_yet')}
      ],onPick:function(v){ setField(sid,'companyNumberStatus',v); persistDraft(sid,'companyNumberStatus','select-one',v); }})
    ];
    if(reg==='provided'){
      body.push(h('div',{class:'tm-company-identity-stack'},[
        textField({scope:sid,fid:'companyNumber',label:t('s1.company_number'),infoId:'s1.company_number',placeholder:'12345678',type:'text',inputmode:'text',default:profile.companyNumber||(S().lookupStatus&&S().lookupStatus.inputAlias)||''}),
        h('div',{},[btn(t('s1.check_ch'),'s',function(){
          run('onLookupCompaniesHouse',{companyNumber:fieldVal(sid,'companyNumber','')},{scope:sid,onReview:function(){paint();},onOk:function(r){var co=r.data&&r.data.company||{};if(co.number){setField(sid,'companyNumber',co.number);persistDraft(sid,'companyNumber','text',co.number);}if(co.name){setField(sid,'legalName',co.name);persistDraft(sid,'legalName','text',co.name);}if(co.incorporationDate){setField(sid,'incorporationDate',co.incorporationDate);persistDraft(sid,'incorporationDate','date',co.incorporationDate);}paint();}});
        })]),
        lookupState(),
        textField({scope:sid,fid:'legalName',label:t('s1.registered_name'),placeholder:t('s1.registered_name'),type:'text',default:profile.legalName||''}),
        dateField({scope:sid,fid:'incorporationDate',label:t('s1.incorporation_date'),default:profile.incorporationDate||''})
      ]));
    } else if(reg==='not_available'){
      body.push(textField({scope:sid,fid:'legalName',label:t('s1.proposed_name'),placeholder:t('s1.proposed_name'),type:'text',default:profile.legalName||''}));
      body.push(notice('info',null,t('s1.draft_notice')));
    }
    var lookupCompany=S().lookupStatus&&S().lookupStatus.company||{};
    var foot=[ btn(t('common.continue'),'p',function(){ submitStep(1,sid,{
        legalName:fieldVal(sid,'legalName',profile.legalName||lookupCompany.name||''), companyNumberStatus:reg,
        companyNumber:fieldVal(sid,'companyNumber',profile.companyNumber||lookupCompany.number||''), incorporationDate:fieldVal(sid,'incorporationDate',profile.incorporationDate||lookupCompany.incorporationDate||'')
      }); }) ];
    if(reg==='not_available') foot.push(btn(t('s3.save_draft'),'g',function(){ run('onSaveCompanyDraft',{},{}); }));
    return stepShell(1, t('setup.title'), body, foot);
  }
  function lookupState(){
    var ls=S().lookupStatus||{}; var sid='ltd.onboarding.step1';
    if(!ls.status||ls.status==='idle') return null;
    if(ls.status==='loading') return notice('info',null,t('s1.checking'));
    if(ls.status==='found'){
      var co=ls.company||{};
      var n=notice(ls.verificationStatus==='verified'?'ok':'warn', co.name||t('s1.lookup_confirmed'), co.incorporationDate?isoToDisplay(co.incorporationDate):null);
      if(co.registryUrl)n.append(h('a',{class:'tm-linkbtn',href:co.registryUrl,target:'_blank',rel:'noopener noreferrer',style:'display:inline-block;margin-top:4px'},t('s1.public_record')));
      return n;
    }
    // Distinguish "couldn't find / invalid number" (failed) from "can't check right now" (offline/unavailable).
    if(ls.status==='field_error'||ls.status==='not_found') return notice('warn',null,t('s1.lookup_not_found'));
    return notice('info',null,t('s1.lookup_unavailable'));
  }
  function step2(){
    var sid='ltd.onboarding.step2';
    var profile=S().company&&S().company.profile||{};
    if(profile.companyNumberStatus==='not_available'&&!profile.incorporationDate){
      return stepShell(2,t('setup.title'),[notice('info',t('s2.unregistered_title'),t('s2.unregistered_body'))],[
        btn(t('common.continue'),'p',function(){submitStep(2,sid,{registrationDeferredAcknowledged:true});}),
        btn(t('s3.save_draft'),'g',function(){run('onSaveCompanyDraft',{},{});})
      ]);
    }
    var trading=fieldVal(sid,'tradingStatus', getChoice(sid,'trading')||profile.tradingStatus||'');
    var body=[
      h('div',{class:'tm-question',style:'display:flex;align-items:center'},[t('s2.started_question'), infoTrigger('s2.trading')]),
      choiceGroup({scope:sid,name:'trading',row:true,current:trading,options:[
        {v:'trading',title:t('common.yes')},{v:'not_started',title:t('s2.not_yet')}
      ],onPick:function(v){ setField(sid,'tradingStatus',v); persistDraft(sid,'tradingStatus','select-one',v); requestPeriodPlan(sid,v); }})
    ];
    if(trading==='trading') body.push(dateField({scope:sid,fid:'tradingStartDate',label:t('s2.start_date'),default:profile.tradingStartDate||'',onChange:function(){requestPeriodPlan(sid,'trading');}}));
    body.push(periodPlanCard());
    body.push(periodOverrideEntry(sid));
    var ctStatus=fieldVal(sid,'corporationTaxStatus', getChoice(sid,'ct')||profile.corporationTaxStatus||'');
    body.push(h('div',{class:'tm-question',style:'display:flex;align-items:center'},[t('s2.ct_account_question'), infoTrigger('s2.ct_account')]));
    body.push(choiceGroup({scope:sid,name:'ct',row:true,current:ctStatus,options:[
      {v:'registered',title:t('common.yes')},{v:'not_registered',title:t('s2.not_yet')},{v:'unknown',title:t('common.not_sure')}
    ],onPick:function(v){ setField(sid,'corporationTaxStatus',v); persistDraft(sid,'corporationTaxStatus','select-one',v); }}));
    var foot=[ btn(t('common.continue'),'p',function(){
      var pp=companyPeriod(sid);
      submitStep(2,sid,{ tradingStatus:trading, tradingStartDate:fieldVal(sid,'tradingStartDate',profile.tradingStartDate||''),
        accountingPeriod:{startDate:pp.start,endDate:pp.end,referenceDate:pp.ref},
        corporationTaxStatus:ctStatus });
    }, {disabled: !trading || !ctStatus}) ];
    return stepShell(2, t('setup.title'), body, foot);
  }
  function companyPeriod(sid){
    // Honour a user-entered official-date override if present, else the auto-derived plan.
    if(sid){ var os=fieldVal(sid,'ovStart',''), oe=fieldVal(sid,'ovEnd',''); if(os||oe) return os&&oe?{start:os,end:oe,ref:oe}:{start:'',end:'',ref:''}; }
    var pp=(S().company&&S().company.periodPlan&&S().company.periodPlan.accounts)||{};
    return {start:pp.startDate||'', end:pp.endDate||'', ref:pp.referenceDate||pp.endDate||''};
  }
  function requestPeriodPlan(sid,tradingOverride){
    var trading=tradingOverride||fieldVal(sid,'tradingStatus',getChoice(sid,'trading')||'');
    var start=fieldVal(sid,'tradingStartDate','');
    var os=fieldVal(sid,'ovStart',''), oe=fieldVal(sid,'ovEnd','');
    if(!trading || (trading==='trading'&&!start) || ((os||oe)&&!(os&&oe))) return;
    run('onPlanCompanyPeriods',{
      tradingStatus:trading,
      tradingStartDate:trading==='trading'?start:null,
      override:{enabled:!!(os&&oe),startDate:os||null,endDate:oe||null}
    },{scope:sid});
  }
  function periodOverrideEntry(sid){
    var open=!!UI.disc['s2.override'];
    var head=h('button',{class:'tm-linkbtn',type:'button',onClick:function(e){ e.preventDefault(); UI.disc['s2.override']=!open; paint(); }},[t('period.override_entry')]);
    if(!open) return head;
    return h('div',{},[head, h('div',{class:'tm-field'},[
      h('div',{class:'tm-flabel',text:t('period.override_title')}),
      dateField({scope:sid,fid:'ovStart',label:t('period.accounts_start'),onChange:function(){requestPeriodPlan(sid);}}),
      dateField({scope:sid,fid:'ovEnd',label:t('period.accounts_end'),onChange:function(){requestPeriodPlan(sid);}})
    ])]);
  }
  function periodPlanCard(){
    var plan=S().company&&S().company.periodPlan;
    if(!plan||!plan.accounts) return null;
    var kids=[h('div',{class:'tm-flabel',style:'display:flex;align-items:center'},[t('s2.periods_title'), infoTrigger('s2.periods')])];
    var rows=[[t('s2.accounts'), h('span',{class:'tm-num',text:isoToDisplay(plan.accounts.startDate)+' \u2013 '+isoToDisplay(plan.accounts.endDate)})]];
    (plan.corporationTaxPeriods||[]).forEach(function(p,i){
      rows.push([t('s2.ct_period',{number:i+1}), h('span',{class:'tm-num',text:isoToDisplay(p.startDate)+' \u2013 '+isoToDisplay(p.endDate)})]);
    });
    kids.push(summRows(rows));
    return h('div',{class:'tm-field'},kids);
  }
  function step3(){
    var sid='ltd.onboarding.step3';
    var profile=S().company&&S().company.profile||{},founderShortcutProfile=profile.legalName==='LOBAKPE FOUNDER PREVIEW LTD'&&profile.companyNumberStatus==='not_available'&&profile.incorporationDate==='2025-12-15',holders=profile.shareholders||[],accountHolder=holders.filter(function(item){return item.isAccountHolder;})[0]||{},otherHolder=holders.filter(function(item){return !item.isAccountHolder;})[0]||{};
    var onlyShareholder=fieldVal(sid,'onlyShareholder',getChoice(sid,'sole')||(holders.length?holders.length===1?'yes':'no':founderShortcutProfile?'yes':''));
    var director=fieldVal(sid,'directorAnswer', getChoice(sid,'director')||(profile.accountHolder?profile.accountHolder.isDirector===true?'yes':profile.accountHolder.isDirector===false?'no':'not_sure':founderShortcutProfile?'yes':''));
    var body=[
      textField({scope:sid,fid:'founderName',label:t('s3.legal_name'),infoId:'s3.legal_name',placeholder:t('s3.legal_name'),type:'text',default:accountHolder.name||(founderShortcutProfile?t('preview.founder_name'):'')}),
      h('div',{class:'tm-question',style:'display:flex;align-items:center'},[t('s3.director_question'), infoTrigger('s3.director')]),
      choiceGroup({scope:sid,name:'director',row:true,current:director,options:[
        {v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')},{v:'not_sure',title:t('common.not_sure')}
      ],onPick:function(v){ setField(sid,'directorAnswer',v); persistDraft(sid,'directorAnswer','select-one',v); }}),
      h('div',{class:'tm-question',style:'display:flex;align-items:center'},[t('s3.only_shareholder_question'), infoTrigger('s3.shareholder')]),
      choiceGroup({scope:sid,name:'sole',row:true,current:onlyShareholder,options:[
        {v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')}
      ],onPick:function(v){setField(sid,'onlyShareholder',v);persistDraft(sid,'onlyShareholder','select-one',v);}})
    ];
    if(onlyShareholder==='yes'){
      body.push(notice('ok', null, t('s3.owner_100')));
    } else if(onlyShareholder==='no'){
      body.push(textField({scope:sid,fid:'founderShares',label:t('s3.your_ownership'),kind:'percent',placeholder:'51',type:'number',default:accountHolder.shares||''}));
      body.push(textField({scope:sid,fid:'otherShareholderName',label:t('s3.other_name'),placeholder:t('s3.other_name'),type:'text',default:otherHolder.name||''}));
      body.push(textField({scope:sid,fid:'otherShares',label:t('s3.other_ownership'),kind:'percent',placeholder:'49',type:'number',default:otherHolder.shares||''}));
      var a=parseInt(fieldVal(sid,'founderShares','')||'0',10)||0, b=parseInt(fieldVal(sid,'otherShares','')||'0',10)||0;
      body.push(totalBar(t('s3.your_ownership'), h('span',{class:'tm-num',text:(a+b)+'%'}), (a+b)===100));
    }
    if(director==='no'||director==='not_sure') body.push(notice('warn',null,t('s3.director_draft_notice')));
    var directorBlocks = (director==='no'||director==='not_sure');
    var foot=[];
    if(!directorBlocks){
      foot.push(btn(t('common.continue'),'p',function(){
        var sole=onlyShareholder==='yes';
        submitStep(3,sid,{ founderName:fieldVal(sid,'founderName',accountHolder.name||(founderShortcutProfile?t('preview.founder_name'):'')),
          onlyShareholder:onlyShareholder,
          founderShares: sole?100:(parseInt(fieldVal(sid,'founderShares',accountHolder.shares||'')||'0',10)||0),
          otherShareholderName: sole?'':fieldVal(sid,'otherShareholderName',otherHolder.name||''),
          otherShares: sole?0:(parseInt(fieldVal(sid,'otherShares',otherHolder.shares||'')||'0',10)||0),
          directorAnswer:director });
      }, {disabled: !onlyShareholder || !director}));
    }
    if(directorBlocks) foot.push(btn(t('s3.save_draft'),'p',function(){ run('onSaveCompanyDraft',{},{}); }));
    return stepShell(3, t('setup.title'), body, foot);
  }
  function step4(){
    var sid='ltd.onboarding.step4';
    var profile=S().company&&S().company.profile||{};
    var qs=[['groupStructure','s4.q1'],['associatedCompanies','s4.q2'],['propertyOrInvestment','s4.q3'],['inventoryOrStock','s4.q4'],['fullVat','s4.q5'],['ordinaryServiceDigital','s4.q6']];
    function savedAnswer(name){var drafts=draftFields(sid);if(name in drafts)return drafts[name];var picked=getChoice(sid,name);if(picked!=null)return picked;if(name==='ordinaryServiceDigital')return profile.activityType==='service_digital'?'true':profile.activityType?'false':'';var value=profile.riskAnswers&&profile.riskAnswers[name];return value===true?'true':value===false?'false':value==='not_sure'?'not_sure':'';}
    // One question per screen (Founder UX): sub-index within the step, state persists to draft.
    if(UI.checkIdx==null){UI.checkIdx=qs.findIndex(function(q){return savedAnswer(q[0])==='';});if(UI.checkIdx<0)UI.checkIdx=qs.length-1;}
    var idx=UI.checkIdx; if(idx>=qs.length) idx=qs.length-1;
    var q=qs[idx], name=q[0], base=q[1], cur=savedAnswer(name);
    var body=[
      h('div',{class:'tm-kick',text:t('s4.progress',{n:idx+1,total:qs.length})}),
      idx===0? h('p',{class:'tm-muted',text:t('s4.intro')}) : null,
      h('div',{class:'tm-question',style:'display:flex;align-items:center;margin-top:8px'},[t(base), infoTrigger(base)]),
      choiceGroup({scope:sid,name:name,row:true,current:cur,options:[
        {v:'true',title:t('common.yes')},{v:'false',title:t('common.no')},{v:'not_sure',title:t('common.not_sure')}
      ],onPick:function(v){setField(sid,name,v);persistDraft(sid,name,'select-one',v);}}),
      (cur==='true'||cur==='not_sure')? notice('warn',null,t(base+'_means')) : null
    ];
    var last=idx===qs.length-1;
    var foot=[ btn(last?t('common.continue'):t('s4.next_question'),'p',function(){
      if(last){
        var risk={}; qs.slice(0,5).forEach(function(qq){ var v=savedAnswer(qq[0]); risk[qq[0]] = v==='true'?true:v==='false'?false:'not_sure'; });
        var activity=savedAnswer('ordinaryServiceDigital');UI.checkIdx=null;submitStep(4,sid,{ordinaryServiceDigital:activity==='true'?true:activity==='false'?false:'not_sure',riskAnswers:risk});
      } else { UI.checkIdx=idx+1; paint(); }
    },{disabled:cur==null}) ];
    foot.push(btn(t('common.back'),'g',function(){ if(idx>0){ UI.checkIdx=idx-1; paint(); } else { UI.checkIdx=null; run('onBack',{},{}); } }));
    return stepShell(4, t('s4.title'), body, foot);
  }
  function step5(){
    var sid='ltd.onboarding.step5';
    var prof=(S().company&&S().company.profile)||{};
    var elig=(S().company&&S().company.bookkeepingEligibility)||{allowed:true,reasons:[]};
    var confirmed=getChoice(sid,'confirm','')==='yes';
    var draft=(S().company&&S().company.draftState&&S().company.draftState.registrationStatus==='not_available');
    var body=[];
    body.push(notice(elig.allowed?'ok':'warn', draft?t('s5.draft_title'):t('s5.ready_title'), draft?t('s5.draft_body'):t('s5.ready_body')));
    var pp=(S().company&&S().company.periodPlan&&S().company.periodPlan.accounts)||{};
    var ctp=(S().company&&S().company.periodPlan&&S().company.periodPlan.corporationTaxPeriods)||[];
    var num=(prof.companyNumber)||((S().company&&S().company.entity&&S().company.entity.companyNumber));
    var tradingYes=(prof.tradingStatus)==='trading';
    var owners=(prof.shareholders||[]).map(function(sh){ return sh.name+' '+Math.round((sh.ownershipBasisPoints||0)/100)+'%'; }).join(' \u00B7 ');
    var srows=[ [t('s5.company'), h('span',{text:(S().company&&S().company.entity&&S().company.entity.name)||prof.legalName||''})] ];
    if(num) srows.push([t('records.company_number'), h('span',{class:'tm-num',text:num})]);
    srows.push([t('s5.trading_status'), h('span',{text: tradingYes?t('records.trading_yes'):t('records.trading_no')})]);
    if(tradingYes && prof.tradingStartDate) srows.push([t('s5.trading_since'), h('span',{class:'tm-num',text:isoToDisplay(prof.tradingStartDate)})]);
    if(pp.startDate) srows.push([t('s5.accounts_period'), h('span',{class:'tm-num',text:isoToDisplay(pp.startDate)+' \u2013 '+isoToDisplay(pp.endDate)})]);
    ctp.forEach(function(p,i){ srows.push([t('s5.ct_period',{number:i+1}), h('span',{class:'tm-num',text:isoToDisplay(p.startDate)+' \u2013 '+isoToDisplay(p.endDate)})]); });
    if(owners) srows.push([t('s5.ownership'), h('span',{text:owners})]);
    srows.push([t('s5.your_role'), h('span',{text:(S().company&&S().company.draftState&&S().company.draftState.directorAnswer==='yes')?t('term.director'):t('common.review')})]);
    body.push(summRows(srows));
    var reasons=(elig.reasons&&elig.reasons.length)?elig.reasons:(((S().company&&S().company.taxEstimateEligibility&&S().company.taxEstimateEligibility.status)==='review')?['review']:[]);
    if(reasons.length){
      reasons.forEach(function(rc){
        var line=reviewReasonLine(rc);
        if(line){ var nz=notice('warn', line, null); nz.append(h('button',{class:'tm-linkbtn',type:'button',style:'margin-top:4px',onClick:function(){ run('onFixCompanyFact',{reasonCode:rc},{scope:sid}); }},t('s5.fix'))); body.push(nz); }
        else body.push(notice('warn', t('common.review_required'), t('s5.review_notice')));
      });
    }
    body.push(h('div',{class:'tm-secondary-actions'},[
      btn(t('s5.review_answers'),'g sm',function(){ run('onBack',{},{}); }),
      btn(t('s5.learn'),'g sm',function(){ run('onOpenInfo',{infoId:'s5.learn'},{}); })
    ]));
    body.push(h('div',{class:'tm-step5-confirm'},[checkControl({label:t('s5.confirm'), checked:confirmed, onToggle:function(v){ setChoice(sid,'confirm', v?'yes':''); }})]));
    var foot=[ btn(draft?t('s5.save_draft'):t('s5.start'),'p',function(){
      submitStep(5,sid,{confirmed:true}); }, {disabled:!confirmed}) ];
    return stepShell(5, draft?t('s5.draft_title'):t('s5.ready_title'), body, foot);
  }
  function reviewReasonLine(code){
    var map={ 'company_registration_required_before_bookkeeping':'reason.registration',
      'company_registration_required':'reason.registration',
      'director_confirmation_required':'reason.director',
      'account_holder_director_confirmation_required':'reason.director',
      'ownership_incomplete':'reason.ownership' };
    return map[code] ? t(map[code]) : null;
  }
  function screenRegistrationPending(){
    var c=S().company||{}; var reasons=(S().lastResult&&S().lastResult.reviewReasons)||(c.reviewReasons)||[];
    var needsDirector=reasons.indexOf('director_confirmation_required')>=0 || (c.draftState&&c.draftState.directorAnswer!=='yes');
    var body=[ notice('warn', t('pending.title'), t('pending.body')) ];
    if(needsDirector) body.push(notice('info', null, t('pending.director_note')));
    var prof=c.profile||{}; var e=c.entity||{};
    body.push(summRows([
      [t('records.registered_name'), h('span',{text:e.name||prof.legalName||'\u2014'})],
      [t('s5.trading_status'), h('span',{text:t('reason.registration')})]
    ]));
    var foot=[ btn(t('s3.save_draft'),'p',function(){ run('onSaveCompanyDraft',{},{}); }),
      btn(t('common.back_to_setup'),'g',function(){ run('onBack',{},{}); }) ];
    return stepShell(3, t('pending.title'), body, foot);
  }
  function screenDirectorReview(){
    var body=[ notice('warn', t('director_review.title'), t('director_review.body')) ];
    var foot=[ btn(t('common.back_to_setup'),'p',function(){ run('onBack',{},{}); }),
      btn(t('s3.save_draft'),'g',function(){ run('onSaveCompanyDraft',{},{}); }) ];
    return stepShell(3, t('director_review.title'), body, foot);
  }

  function reasonText(){ return t('common.review_required'); }
  /* ---- WORKSPACE SHELL --------------------------------------------------- */
  function workspaceShell(area, inner){
    var s=S(); var comp=s.company&&s.company.entity; var pct=(companyRow()&&companyRow().share&&companyRow().share.percent)||founderPct();
    var pp=(s.company&&s.company.periodPlan&&s.company.periodPlan.accounts)||{};
    var wrap=frag();
    wrap.append(h('button',{class:'tm-wsback',type:'button',onClick:function(){ run('onOpenHome',{},{}); }},[isRTL()?'\u2192':'\u2190',' ',t('workspace.all_businesses')]));
    wrap.append(h('div',{class:'tm-wstitle',text:(comp&&comp.name)||''}));
    wrap.append(h('div',{class:'tm-wsmeta',text:t('workspace.ltd_subtitle',{percent:pct})}));
    if(pp.startDate) wrap.append(h('div',{class:'tm-wsperiod',text:t('workspace.company_period',{start:isoToDisplay(pp.startDate),end:isoToDisplay(pp.endDate)})}));
    var tabs=[['overview','workspace.overview'],['money','workspace.money'],['tax','workspace.tax'],['records','workspace.records']];
    wrap.append(h('div',{class:'tm-tabs', role:'tablist'}, tabs.map(function(tb){
      return h('button',{class:(area===tb[0]?'on':''),type:'button',role:'tab','aria-selected':area===tb[0]?'true':'false',
        onClick:function(){ run('onSetWorkspaceArea',{area:tb[0]},{}); }}, t(tb[1]));
    })));
    inner.forEach(function(n){ if(n) wrap.append(n); });
    return wrap;
  }
  function companyRow(){ return (S().businessList||[]).filter(function(b){return b.businessType==='limited_company';})[0]; }
  function founderPct(){ var sh=(S().company&&S().company.profile&&S().company.profile.shareholders)||[]; var me=sh.filter(function(x){return x.isAccountHolder;})[0]; return me?Math.round((me.ownershipBasisPoints||0)/100):100; }
  function metric(id){ var p=S().workspace&&S().workspace.projection; return (p&&p.metrics&&p.metrics[id])||{amountMinor:0,status:'none'}; }

  function areaOverview(){
    var ap=metric('accountingProfit'), ct=metric('corporationTax'), cash=metric('companyCash'), loan=metric('directorLoan');
    var rev=metric('revenue'), cost=metric('allowableRunningExpenses');
    var loss = ap.amountMinor<0;
    var hero=h('div',{class:'tm-hero'+(loss?' loss':'')},[
      h('div',{class:'lbl',text:loss?'':t('overview.profit_title',{amount:''})}),
      h('div',{class:'big'},[money(Math.abs(ap.amountMinor))]),
      h('div',{class:'hi',text: loss? t('overview.loss_title',{amount:''}).replace('{amount}','').trim() : t('overview.profit_title',{amount:''}).replace('{amount}','').trim() }),
      h('div',{class:'strip'},[ h('span',{text: ct.amountMinor>0? t('overview.ct_estimate',{amount:''}).replace('{amount}','').trim() : t('overview.no_ct')}),
        ct.amountMinor>0? money(ct.amountMinor): h('span',{class:'tm-num',text:fmtMoney(0)}) ])
    ]);
    var metrics=h('div',{class:'tm-metrics'},[
      metricCell('revenue', t('overview.money_in'), rev.amountMinor, 'pos'),
      metricCell('allowableRunningExpenses', t('overview.company_costs'), cost.amountMinor, ''),
      metricCell('companyCash', t('overview.company_cash'), cash.amountMinor, cash.amountMinor<0?'neg':'pos'),
      metricCell('corporationTax', t('overview.corporation_tax'), ct.amountMinor, '')
    ]);
    var nodes=[hero, metrics];
    if(loan.amountMinor>0){
      nodes.push(notice('info', t('overview.personal_money_title',{amount:fmtMoney(loan.amountMinor)}), t('overview.personal_money_body')));
    }
    var nextTip = loss? t('overview.next_keep') : t('overview.next_pay');
    nodes.push(h('div',{class:'tm-h',text:t('common.next_step')}));
    nodes.push(notice('neutral', null, nextTip, '\u2192'));
    return workspaceShell('overview', nodes);
  }
  function metricCell(id,label,amt,cls){
    var m=metric(id);
    var statusTxt='';
    if(id==='corporationTax'){ statusTxt = m.status==='supported_estimate'?t('tax.status_ready'):''; }
    return h('button',{class:'tm-metric',type:'button',onClick:function(){ run('onOpenMetric',{metricId:id},{}); }},[
      h('div',{class:'l',text:label}),
      h('div',{class:'v '+(amt<0?'neg':cls)},[money(amt)]),
      statusTxt? h('div',{class:'st',text:statusTxt}):null
    ]);
  }

  function areaMoney(){
    var events=(S().workspace&&S().workspace.events)||[];
    var nodes=[
      h('p',{class:'tm-muted',style:'margin-top:14px',text:t('money.intro')}),
      h('div',{class:'tm-pair'},[
        btn(t('money.add_income'),'p',function(){ openSheet('income'); }),
        btn(t('money.add_expense'),'s',function(){ openSheet('expense'); })
      ]),
      disclosure('money.other', t('money.other_movements'), [
        moneyMoveRow(t('money.lend'),'money.lend',function(){ openSheet('lend'); }),
        moneyMoveRow(t('money.repay'),'money.repay',function(){ openSheet('repay'); })
      ]),
      h('div',{class:'tm-h',text:t('money.recent')})
    ];
    if(!events.length){ nodes.push(h('div',{class:'tm-empty'},[h('div',{class:'e',text:t('design.no_records_yet')}), t('design.no_records_body')])); }
    else { var recs=h('div',{class:'tm-recs'}); events.forEach(function(ev){ recs.append(eventRow(ev)); }); nodes.push(recs); }
    return workspaceShell('money', nodes);
  }
  function moneyMoveRow(label, infoId, onClick){
    return h('div',{class:'tm-rec', onClick:onClick},[
      h('div',{},[h('span',{class:'rl',text:label}), infoTrigger(infoId)]),
      h('div',{class:'rv',text:isRTL()?'\u2039':'\u203A'})
    ]);
  }
  function eventRow(ev){
    var src=ev.sourceTransaction||{}; var st=ev.status;
    var neg = src.kind==='expense'||src.companyTransactionType==='company_expense'||(src.amountMinor&&src.kind==='expense');
    var pill = st==='committed'?['ok',t('design.posted')]: st==='reversed'?['rev',t('design.reversed')]:['warn',t('design.draft')];
    return h('button',{class:'tm-rec',type:'button',onClick:function(){ run('onOpenRecord',{eventId:ev.id},{}); }},[
      h('div',{},[h('div',{class:'rl',text:src.purpose||src.kind||'\u2014'}),
        h('div',{class:'rs',text:isoToDisplay(src.date)}),
        h('span',{class:'tm-pill '+pill[0],text:pill[1]})]),
      h('div',{class:'rv'+(neg?' neg':'')},[money((neg?-1:1)*(src.amountMinor||0))])
    ]);
  }

  function areaTax(){
    var ap=metric('accountingProfit'), ct=metric('corporationTax'), carried=metric('carriedForwardLoss');
    var elig=(S().company&&S().company.taxEstimateEligibility)||{status:'ready'};
    var reviewCount=((S().workspace&&S().workspace.projection&&S().workspace.projection.reviewItems)||[]).length;
    var statusTxt = elig.status==='ready'?t('tax.status_ready'): elig.status==='review'?pluralChecks(reviewCount||1): t('tax.status_unavailable');
    var nodes=[
      h('div',{class:'tm-h',text:t('tax.company_tax')}),
      summRows([
        [t('tax.accounting_profit_loss'), money(ap.amountMinor, ap.amountMinor<0?'neg':'')],
        [t('tax.ct_estimate'), ct.status==='supported_estimate'? money(ct.amountMinor): h('span',{class:'tm-muted',text:statusTxt})],
        carried.amountMinor>0?[t('tax.loss_carried'), money(carried.amountMinor)]:null
      ]),
      btn(t('tax.review_ct'),'p',function(){ openSheet('ct'); }),
      h('div',{class:'tm-h',text:t('tax.paying_yourself')})
    ];
    var pot=metric('potentialDividend');
    var hasProfitToDecide = (ap.amountMinor>0) || ((pot.amountMinor||0)>0) || dividendAvailable();
    if(!hasProfitToDecide){
      nodes.push(notice('neutral', t('tax.nothing_decide'), t('tax.nothing_decide_body')));
    } else {
      nodes.push(notice('neutral', t('tax.thinking'), null, '\uD83D\uDCA1'));
      nodes.push(btn(t('tax.compare'),'s',function(){ openSheet('scenario'); }));
    }
    // Salary and dividend records: collapsed by default (disclosure), with the record-specific rows inside.
    nodes.push(disclosure('tax.records', t('records.salary_dividend'), salaryDividendRecordsBody()));
    // Recording actions (payroll already run / declaration) live under the collapsed section header actions.
    nodes.push(h('div',{style:'display:flex;gap:8px;margin-top:2px'},[
      btn(t('tax.record_salary'),'g sm',function(){ openSheet('salary'); }),
      dividendAvailable()? btn(t('tax.record_declaration'),'g sm',function(){ openSheet('dividend'); }) : null
    ]));
    if(!dividendAvailable()) nodes.push(notice('warn', t('tax.dividends_unavailable'), t('tax.dividends_unavailable_body')));
    return workspaceShell('tax', nodes);
  }
  function dividendAvailable(){
    var pd=metric('potentialDividend');
    return pd && pd.amountMinor!=null && pd.amountMinor>0 && (!pd.status || String(pd.status).indexOf('review')<0);
  }

  function ownershipSummaryCard(){
    var hist=(S().workspace&&S().workspace.ownershipHistory)||[];
    var cur=hist.filter(function(v){return v.effectiveTo==null;})[0]||hist[0];
    var sh=(cur&&cur.shareholders)||[];
    if(!sh.length) return null;
    var yours=sh.filter(function(x){return x.isAccountHolder;})[0]||sh[0];
    return h('div',{class:'tm-ownership-card'},[
      h('div',{class:'tm-h',text:t('records.ownership')}),
      summRows([[t('records.your_share'), h('span',{class:'tm-num',text:Math.round((yours.ownershipBasisPoints||0)/100)+'%'})]]
        .concat(sh.length>1?[[t('design.shareholders'), h('span',{text:sh.map(function(x){return x.name+' '+Math.round((x.ownershipBasisPoints||0)/100)+'%';}).join(' \u00B7 ')})]]:[]))
    ]);
  }
  function areaRecords(){
    var nodes=[
      companyDetailsCard(),
      ownershipSummaryCard(),
      h('div',{class:'tm-record-actions'},[recRow(t('records.ownership'), function(){ run('onOpenOwnershipChange',{},{}); })]),
      periodsInline(),
      salaryDividendSection(),
      h('div',{class:'tm-record-actions'},[recRow(t('records.working_pack'), function(){ run('onDownloadWorkingPack',{},{}); }, 'records.working_pack')]),
      h('div',{style:'margin-top:16px'},[ btn(t('design.remove_action'),'coral-soft',function(){ openSheet('remove'); }) ])
    ];
    return workspaceShell('records', nodes);
  }
  // Item 20: real, visible company details in the approved structure (not merely a button).
  function companyDetailsCard(){
    var c=S().company||{}; var e=c.entity||{}; var prof=c.profile||{};
    var num=e.companyNumber||prof.companyNumber; var inc=e.incorporationDate||prof.incorporationDate;
    var registry=prof.registryVerification||null;
    var trading=(prof.tradingStatus||e.tradingStatus)==='trading';
    var rows=[[t('records.registered_name'), h('span',{text:e.name||'\u2014'})]];
    if(num) rows.push([t('records.company_number'), h('span',{class:'tm-num',text:num})]);
    if(inc) rows.push([t('records.incorporation_date'), h('span',{class:'tm-num',text:isoToDisplay(inc)})]);
    if(registry){
      var registryText=registry.status==='verified'?t('s1.lookup_confirmed'):registry.status==='manual_unverified'?t('s1.lookup_manual'):registry.status==='needs_checking'?t('s1.lookup_needs_checking'):registry.status==='not_registered'?t('s2.unregistered_title'):registry.status==='not_found'?t('s1.lookup_not_found'):registry.status==='unavailable'?t('s1.lookup_unavailable'):t('common.review_required');
      rows.push([t('term.companies_house'),h('span',{text:registryText})]);
    }
    rows.push([t('records.trading_status'), h('span',{text: trading?t('records.trading_yes'):t('records.trading_no')})]);
    var tstart=prof.tradingStartDate||e.tradingStartDate;
    if(trading && tstart) rows.push([t('s5.trading_since'), h('span',{class:'tm-num',text:isoToDisplay(tstart)})]);
    return h('div',{},[
      h('div',{class:'tm-h',text:t('records.company_details')}),
      summRows(rows),
      h('div',{style:'margin-top:8px'},[
        btn(t('records.record_change'),'g sm',function(){ run('onOpenCompanyEdit',{},{}); }),
        registry&&registry.companyNumber?btn(t('s1.check_ch'),'g sm',function(){run('onRecheckCompaniesHouse',{companyNumber:registry.companyNumber},{onReview:function(){paint();},onOk:function(){paint();}});}):null
      ].filter(Boolean))
    ]);
  }
  // F-05: Salary & dividends — real recorded states with progressive disclosure.
  function salaryRecordDetailRows(r){
    var rti=r.payeReportingStatus||(r.salary&&r.salary.payeReportingStatus);
    var rtiLabel = rti==='reported_rti'?t('salary.status_reported') : rti==='pending_rti'?t('salary.status_pending') : t('common.review_required');
    var gross=r.grossSalaryMinor||r.grossMinor||0; var erni=r.employerNiMinor||0;
    var rows=[
      [t('salary.gross'), money(gross)],
      [t('salary.payment_date'), h('span',{class:'tm-num',text:isoToDisplay(r.payDate||r.date)})],
      [t('salary.rti_status'), h('span',{text:rtiLabel})]
    ];
    if(r.payeWithheldMinor!=null) rows.push([t('salary.paye'), money(r.payeWithheldMinor)]);
    if(r.employeeNiMinor!=null) rows.push([t('salary.employee_ni'), money(r.employeeNiMinor)]);
    if(erni!=null) rows.push([t('salary.employer_ni'), money(erni)]);
    var ev=(r.evidenceRefs&&r.evidenceRefs.length)?r.evidenceRefs.join(', '):t('detail.none');
    rows.push([t('detail.evidence'), h('span',{text:ev})]);
    rows.push([t('salary.company_effect'), money(-(gross+erni), 'neg')]);
    return summRows(rows);
  }
  function dividendRecordDetailRows(dv){
    var rows=[
      [t('dividend.declare_title'), money(dv.totalDividendMinor||dv.totalMinor||0)],
      [t('design.date'), h('span',{class:'tm-num',text:isoToDisplay(dv.declarationDate)})],
      [t('detail.tax_status'), h('span',{text: dv.status==='paid'?t('tax.dividend_paid'):t('tax.declared_unpaid')})]
    ];
    var out=[summRows(rows)];
    var allocs=dv.allocations||[];
    if(allocs.length){
      out.push(h('div',{class:'tm-h',text:t('dividend.allocation')}));
      out.push(summRows(allocs.map(function(a){ return [ (a.isAccountHolder?t('records.your_share'):(a.shareholderName||a.shareholderId||'\u2014')), money(a.amountMinor||0) ]; })));
      out.push(notice('neutral', null, t('dividend.share_basis')));
    }
    var dev=(dv.evidenceRefs&&dv.evidenceRefs.length)?dv.evidenceRefs.join(', '):t('detail.none');
    out.push(summRows([[t('detail.evidence'), h('span',{text:dev})]]));
    return h('div',{},out);
  }
  function salaryDividendRecordsBody(){
    var sals=(S().workspace&&S().workspace.salaryRecords)||[];
    var decls=(S().workspace&&S().workspace.dividendDeclarations)||[];
    var body=[];
    if(!sals.length && !decls.length){
      body.push(h('p',{class:'tm-muted',style:'margin:2px 0 8px',text:t('tax.nothing_body')}));
      return body;
    }
    sals.forEach(function(r,i){
      var rti=r.payeReportingStatus||(r.salary&&r.salary.payeReportingStatus);
      var pill = rti==='reported_rti'?['ok',t('salary.status_reported')] : rti==='pending_rti'?['warn',t('salary.status_pending')] : ['warn',t('common.review_required')];
      var key='sal:'+i; var open=!!UI.disc[key];
      body.push(h('button',{class:'tm-rec',type:'button',onClick:function(){ UI.disc[key]=!open; paint(); }},[
        h('div',{},[h('div',{class:'rl',text:t('tax.record_salary')}), h('div',{class:'rs',text:isoToDisplay(r.payDate||r.date)}), h('span',{class:'tm-pill '+pill[0],text:pill[1]})]),
        h('div',{class:'rv'},[money(r.grossSalaryMinor||r.grossMinor||0), h('span',{class:'tm-muted',style:'margin-left:6px',text:open?'\u2013':'+'})])
      ]));
      if(open) body.push(h('div',{class:'dc'},[salaryRecordDetailRows(r)]));
    });
    decls.forEach(function(dv,i){
      var paid=dv.status==='paid'; var key='dv:'+(dv.id||dv.recordId||i); var open=!!UI.disc[key];
      body.push(h('button',{class:'tm-rec',type:'button',onClick:function(){ UI.disc[key]=!open; paint(); }},[
        h('div',{},[h('div',{class:'rl',text:t('dividend.declare_title')}), h('div',{class:'rs',text:isoToDisplay(dv.declarationDate)}), h('span',{class:'tm-pill '+(paid?'ok':'warn'),text:paid?t('tax.dividend_paid'):t('tax.declared_unpaid')})]),
        h('div',{class:'rv'},[money(dv.totalDividendMinor||dv.totalMinor||0), h('span',{class:'tm-muted',style:'margin-left:6px',text:open?'\u2013':'+'})])
      ]));
      if(open){
        body.push(h('div',{class:'dc'},[dividendRecordDetailRows(dv)]));
        if(!paid) body.push(h('div',{style:'margin:6px 0 4px'},[ btn(t('tax.record_payment'),'sm s',function(){ openSheet('dividendPayment',{declarationId:dv.id||dv.recordId, allocations:dv.allocations||[]}); }) ]));
      }
    });
    return body;
  }
  function salaryDividendSection(){
    return h('div',{},[h('div',{class:'tm-h',text:t('records.salary_dividend')})].concat(salaryDividendRecordsBody()));
  }
  function recItem(label, sub, valNode, pill){
    return h('div',{class:'tm-rec'},[
      h('div',{},[h('div',{class:'rl',text:label}), sub?h('div',{class:'rs',text:sub}):null,
        pill?h('span',{class:'tm-pill '+pill[0],text:pill[1]}):null]),
      h('div',{class:'rv'},[valNode])
    ]);
  }
  function recRow(label, onClick, infoId){
    return h('button',{class:'tm-rec',type:'button',onClick:onClick},[
      h('div',{},[h('span',{class:'rl',text:label}), infoId?infoTrigger(infoId):null]),
      h('div',{class:'rv',text:isRTL()?'\u2039':'\u203A'})
    ]);
  }
  function periodsInline(){
    var pp=(S().company&&S().company.periodPlan)||{};
    if(!pp.accounts) return null;
    var rows=[[t('s2.accounts'), h('span',{class:'tm-num',text:isoToDisplay(pp.accounts.startDate)+' \u2013 '+isoToDisplay(pp.accounts.endDate)})]];
    (pp.corporationTaxPeriods||[]).forEach(function(p,i){ rows.push([t('s2.ct_period',{number:i+1}), h('span',{class:'tm-num',text:isoToDisplay(p.startDate)+' \u2013 '+isoToDisplay(p.endDate)})]); });
    return h('div',{},[h('div',{class:'tm-h',text:t('records.periods')}), summRows(rows)]);
  }

  /* ---- ROUTE SCREENS: metric detail, record detail, results ------------- */
  function screenMetricDetail(){
    var mid=(route().params&&route().params.metricId)||'revenue';
    var m=metric(mid); var dd=m.drilldown||{}; var evs=dd.sourceEvents||[];
    var label={revenue:t('overview.money_in'),allowableRunningExpenses:t('overview.company_costs'),
      companyCash:t('overview.company_cash'),corporationTax:t('overview.corporation_tax'),
      accountingProfit:t('tax.accounting_profit_loss'),directorLoan:t('term.company_owes_you')}[mid]||mid;
    var nodes=[backBar(function(){ run('onBack',{},{}); }, label),
      h('div',{class:'tm-hero'+(m.amountMinor<0?' loss':'')},[h('div',{class:'lbl',text:label}), h('div',{class:'big'},[money(Math.abs(m.amountMinor))])]),
      h('div',{class:'tm-h',text:t('design.source_records')})];
    if(!evs.length) nodes.push(h('p',{class:'tm-muted',text:t('design.no_records_body')}));
    else { var recs=h('div',{class:'tm-recs'}); evs.forEach(function(ev){
        recs.append(h('button',{class:'tm-rec',type:'button',onClick:function(){ run('onOpenRecord',{eventId:ev.id},{}); }},[
          h('div',{},[h('div',{class:'rl',text:ev.purpose||ev.kind||'\u2014'}), h('div',{class:'rs',text:isoToDisplay(ev.date)})]),
          h('div',{class:'rv'},[money(ev.amountMinor||0)])
        ])); }); nodes.push(recs); }
    return workspaceBack(nodes);
  }
  function workspaceBack(nodes){ var w=frag(); nodes.forEach(function(n){ if(n) w.append(n); }); return w; }

  function screenRecordDetail(){
    var ev=(S().lastResult&&S().lastResult.data&&S().lastResult.data.event)||null;
    var view=(S().lastResult&&S().lastResult.data&&S().lastResult.data.recordView)||null;
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('money.record_detail'))];
    if(!ev){ nodes.push(h('p',{class:'tm-muted',text:'\u2014'})); return workspaceBack(nodes); }
    var src=ev.sourceTransaction||{}; var tr=src.companyTaxTreatment||{};
    var st=ev.status;
    var pill = st==='committed'?['ok',t('design.posted')]: st==='reversed'?['rev',t('design.reversed')]:['warn',t('design.draft')];
    nodes.push(h('div',{style:'margin-top:6px'},[h('span',{class:'tm-pill '+pill[0],text:pill[1]})]));
    var reviewed = (tr.status==='review_required') || (tr.reasonCodes&&tr.reasonCodes.length);
    // Plain-language facts an ordinary user can read directly (item 19).
    var paidBy = view&&view.paidBy==='account_holder' ? t('detail.by_you') : t('detail.by_company');
    var shared = src.sharedExpense || (ev.sharedExpense);
    var allocs = view&&view.sharedAllocations || [];
    var entityId = (S().company&&S().company.entity&&S().company.entity.entityId) || (S().company&&S().company.profile&&S().company.profile.entityId);
    function allocAmt(a){ if(a.amountMinor!=null) return a.amountMinor; var pct=a.percent!=null?a.percent:(a.basisPoints!=null?a.basisPoints/100:0); return Math.round((src.amountMinor||0)*pct/100); }
    var splitRows=[];
    if(allocs.length){
      var companyMinor=0, privateMinor=0, named=[];
       allocs.forEach(function(a){ var amt=allocAmt(a); var isCo=a.entityId===entityId&&a.scope==='business';
         if(isCo) companyMinor+=amt; else privateMinor+=amt;
         if(a.label) named.push([a.label==='private_use'?t('money.private_use'):a.label, money(amt)]); });
      if(named.length) splitRows=named;
      else { if(companyMinor) splitRows.push([t('detail.split_company'), money(companyMinor)]); if(privateMinor) splitRows.push([t('detail.split_private'), money(privateMinor)]); }
    }
    var rows=[
      [t('design.what_for'), h('span',{text:src.purpose||'\u2014'})],
      [t('design.amount'), money(view?view.grossAmountMinor:(src.amountMinor||0))],
      [t('design.date'), h('span',{class:'tm-num',text:isoToDisplay(src.date)})],
      [t('detail.paid_by'), h('span',{text:paidBy})],
      [t('detail.tax_status'), h('span',{text: reviewed?t('common.review_required'):t('detail.status_ok')})],
      [t('detail.evidence'), h('span',{text:(src.evidenceRefs&&src.evidenceRefs.length)?src.evidenceRefs.join(', '):t('detail.none')})],
      [t('detail.company_effect'), money(view?view.companyCashEffectMinor:0,(view&&view.companyCashEffectMinor<0?'neg':''))]
    ];
    if(view&&view.directorLoanEffectMinor>0) rows.push([t('term.company_owes_you'), money(view.directorLoanEffectMinor)]);
    nodes.push(summRows(rows));
    if(splitRows.length){ nodes.push(h('div',{class:'tm-h',text:t('detail.split')})); nodes.push(summRows(splitRows)); }
    if(reviewed) nodes.push(notice('warn', t('common.review_required'), null));
    // journal drill-down (technical)
    if(ev.postings||src){ nodes.push(disclosure('rec.adv', t('design.advanced_details'), [
      h('pre',{style:'white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;color:var(--muted)',text:JSON.stringify(ev.postings||src,null,1)}) ])); }
    if(st==='committed') nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('money.correct_record'),'g',function(){ openSheet('correct',{eventId:ev.id}); }) ]));
    else if(st==='draft'||st==='review'){ nodes.push(h('div',{class:'tm-pair'},[
      btn(t('common.edit'),'p',function(){ run('onEditDraft',{eventId:ev.id},{}); }),
      btn(t('money.delete_draft'),'coral-soft',function(){ run('onDeleteDraft',{eventId:ev.id},{onOk:function(){ toast(t('money.delete_draft')); paint(); }}); })
    ])); }
    return workspaceBack(nodes);
  }
  function disclosure(key,label,body){
    var open=!!UI.disc[key];
    var d=h('details',{class:'tm-disc'}, [
      h('summary',{onClick:function(e){ e.preventDefault(); UI.disc[key]=!open; paint(); }},[label, h('span',{text:open?'\u2013':'+'})])
    ].concat(open?[h('div',{class:'dc'},body)]:[]));
    if(open) d.setAttribute('open','open');
    return d;
  }
  function screenDraftEdit(){
    var d=(S().lastResult&&S().lastResult.data)||{};
    var ev=d.event||{}; var sid='ltd.money.draft-edit';
    var src=ev.sourceTransaction||{};
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('common.edit')),
      textField({scope:sid,fid:'description',label:t('design.what_for'),default:src.purpose||'',type:'text',persist:false}),
      textField({scope:sid,fid:'amountMinor',label:t('design.amount'),kind:'money',default:src.amountMinor?String(src.amountMinor/100):'',type:'number',persist:false}),
      dateField({scope:sid,fid:'date',persist:false,label:t('design.date')}),
      h('div',{style:'margin-top:14px'},[ btn(t('common.save'),'p',function(){
        run('onSaveDraftEdit',{eventId:ev.id, changes:{ description:fieldVal(sid,'description',''), amountMinor:toMinor(fieldVal(sid,'amountMinor','')), date:fieldVal(sid,'date','') }},{scope:sid,onOk:function(){ toast(t('common.saved_for_review')); }}); }) ])
    ];
    return workspaceBack(nodes);
  }
  function toMinor(v){ if(v==null||v==='') return null; var n=parseFloat(String(v).replace(/,/g,'')); if(isNaN(n)) return null; return Math.round(n*100); }

  function screenCtReview(){
    var lr=S().lastResult||{}, d=lr.data||{};
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('ct_review.result'))];
    nodes.push(summRows([
      d.accountsStartDate?[t('s2.accounts'), h('span',{class:'tm-num',text:isoToDisplay(d.accountsStartDate)+' \u2013 '+isoToDisplay(d.accountsEndDate)})]:null,
      d.accountingProfitMinor!=null?[t('tax.accounting_profit_loss'), money(d.accountingProfitMinor, d.accountingProfitMinor<0?'neg':'')]:null,
      d.corporationTaxEstimateMinor!=null?[t('ct_review.result'), money(d.corporationTaxEstimateMinor)]:null
    ]));
    (d.periodResults||d.periodDefinitions||[]).forEach(function(result,i){
      var p=result.periodRecord||result;
      nodes.push(summRows([[t('s2.ct_period',{number:i+1}), h('span',{class:'tm-num',text:isoToDisplay(p.startDate)+' \u2013 '+isoToDisplay(p.endDate)})]]));
    });
    if(lr.status==='review_required'||d.noCalculation||(d.reasons&&d.reasons.length)) nodes.push(notice('warn', t('common.review_required'), null));
    nodes.push(notice('neutral', null, t('ct_review.estimate_notice')));
    return workspaceBack(nodes);
  }
  function screenScenarioResults(){
    var d=(S().lastResult&&S().lastResult.data)||{};
    var results=d.results||[];
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('scenario.title'))];
    if(d.nonPosting) nodes.push(notice('info', null, t('tax.no_change')));
    function totalTax(r){ return (r.totalModelledTaxMinor!=null)?r.totalModelledTaxMinor:(r.totalTaxMinor!=null?r.totalTaxMinor:((r.corporationTaxEstimateMinor||r.corporationTaxMinor||r.companyTaxMinor||0)+(r.employerNiMinor||0)+(r.employeeNiMinor||0)+(r.personalIncomeTaxMinor||r.incomeTaxMinor||r.personalTaxMinor||0)+(r.personalDividendTaxMinor||r.dividendTaxMinor||0))); }
    var supported=results.filter(function(r){ return !(r.reasonCodes&&r.reasonCodes.length); });
    var best=null; supported.forEach(function(r){ if(best===null||totalTax(r)<totalTax(best)) best=r; });
    results.forEach(function(r){
      var isBest = best && r===best;
      var rows=[
        [t('scenario.company_tax'), money(r.corporationTaxEstimateMinor||r.corporationTaxMinor||r.companyTaxMinor||0)],
        [t('scenario.employer_ni'), money(r.employerNiMinor||0)],
        [t('scenario.employee_ni'), money(r.employeeNiMinor||0)],
        [t('scenario.personal_tax'), money(r.personalIncomeTaxMinor||r.incomeTaxMinor||r.personalTaxMinor||0)],
        [t('scenario.dividend_tax'), money(r.personalDividendTaxMinor||r.dividendTaxMinor||0)],
        [t('scenario.cash_received'), money(r.userCashReceivedMinor||r.personalCashMinor||r.cashReceivedMinor||0)],
        [t('scenario.company_cash_left'), money(r.companyCashAfterMinor||r.companyCashMinor||0)]
      ];
      var scenarioKind=r.kind||(r.id==='retained'?'leave':r.id)||'salary';
      var head=h('div',{class:'tm-h',style:isBest?'display:flex;align-items:center;gap:6px':''},[ (t('scenario.'+scenarioKind)||r.label||'') ]);
      if(isBest) head.append(h('span',{class:'tm-pill ok',text:t('scenario.lowest_tax')}));
      nodes.push(head);
      nodes.push(summRows(rows));
      if(isBest) nodes.push(notice('ok', t('scenario.why'), t('scenario.lowest_tax')));
      if(r.reasonCodes&&r.reasonCodes.length) nodes.push(notice('warn', t('scenario.excluded'), null));
    });
    if(!results.length) nodes.push(notice('warn', t('common.review_required'), t('tax.status_unavailable')));
    return workspaceBack(nodes);
  }
  function screenSalaryRecord(){
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('salary.title')), notice('ok', null, t('salary.save'))];
    var recs=(S().workspace&&S().workspace.salaryRecords)||[];
    recs.forEach(function(r){ nodes.push(summRows([[t('salary.gross'), money(r.grossSalaryMinor||r.grossMinor||0)],[t('salary.payment_date'), h('span',{class:'tm-num',text:isoToDisplay(r.payDate||r.date)})]])); });
    return workspaceBack(nodes);
  }
  function screenDividendDetail(){
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('dividend.declare_title'))];
    var decls=(S().workspace&&S().workspace.dividendDeclarations)||[];
    if(!decls.length) nodes.push(notice('info', null, t('tax.declared_unpaid')));
    decls.forEach(function(dv){
      var paid=dv.status==='paid';
      nodes.push(h('div',{style:'margin-top:6px'},[h('span',{class:'tm-pill '+(paid?'ok':'warn'),text:paid?t('tax.dividend_paid'):t('tax.declared_unpaid')})]));
      nodes.push(summRows([[t('dividend.total'), money(dv.totalDividendMinor||dv.totalMinor||0)],[t('dividend.declaration_date'), h('span',{class:'tm-num',text:isoToDisplay(dv.declarationDate)})]]));
      if(!paid) nodes.push(btn(t('tax.record_payment'),'p',function(){ openSheet('dividendPayment',{declarationId:dv.id, allocations:dv.allocations||[]}); }));
    });
    return workspaceBack(nodes);
  }
  function screenCompanyEdit(){
    var sid='ltd.records.company-edit';
    var prof=(S().workspace&&S().workspace.projection&&S().workspace.projection.company)||{};
    var field=getChoice(sid,'field','legalName');
    var registry=(S().company&&S().company.profile&&S().company.profile.registryVerification)||null;
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('records.edit_company')),
      notice('info', t('records.correct_setup'), null),
      selectField({scope:sid,fid:'field',label:t('records.correct_setup'),persist:false,default:'legalName',options:[
        ['legalName',t('s1.registered_name')],['companyNumber',t('s1.company_number')],['incorporationDate',t('s1.incorporation_date')],
        ['tradingStartDate',t('s2.start_date')],['tradingStatus',t('term.trading_start')]
      ], onChange:function(v){ setChoice(sid,'field',v); }})
    ];
    if(registry){nodes.push(notice(registry.status==='verified'?'ok':'warn',t('term.companies_house'),registry.status==='verified'?t('s1.lookup_confirmed'):registry.status==='manual_unverified'?t('s1.lookup_manual'):registry.status==='needs_checking'?t('s1.lookup_needs_checking'):registry.status==='not_registered'?t('s2.unregistered_title'):registry.status==='not_found'?t('s1.lookup_not_found'):registry.status==='unavailable'?t('s1.lookup_unavailable'):t('common.review_required')));if(registry.companyNumber)nodes.push(btn(t('s1.check_ch'),'s',function(){run('onRecheckCompaniesHouse',{companyNumber:registry.companyNumber},{scope:sid,onReview:function(){paint();},onOk:function(){paint();}});}));}
    if(field==='incorporationDate'||field==='tradingStartDate') nodes.push(dateField({scope:sid,fid:'value',persist:false,label:t('design.corrected_detail')}));
    else nodes.push(textField({scope:sid,fid:'value',label:t('design.corrected_detail'),type:'text',persist:false}));
    nodes.push(textField({scope:sid,fid:'reason',label:t('records.reason'),type:'text',persist:false}));
    nodes.push(textField({scope:sid,fid:'evidence',label:t('records.evidence'),hint:t('common.optional'),type:'text',persist:false}));
    var evs=(S().workspace&&S().workspace.events)||[];
    nodes.push(h('div',{class:'tm-h',text:t('records.affected')}));
    if(evs.length){
      nodes.push(summRows(evs.slice(0,6).map(function(ev){ var src=ev.sourceTransaction||{}; return [ src.purpose||t('money.record_detail'), money(src.amountMinor||0) ]; })));
    } else {
      nodes.push(notice('neutral', null, t('records.affected_none')));
    }
    nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('common.save'),'p',function(){
      run('onEditCompany',{field:field, value:fieldVal(sid,'value',''), reason:fieldVal(sid,'reason',''), evidenceRefs:[fieldVal(sid,'evidence','')].filter(Boolean)},
        {scope:sid, onReview:function(r){ UI.review[sid]=r.reviewReasons||[]; paint(); }, onOk:function(){ toast(t('common.saved_for_review')); }}); }) ]));
    var rev=UI.review[sid];
    if(rev&&rev.length) nodes.push(notice('warn', t('records.impact'), t('common.review_required')));
    return workspaceBack(nodes);
  }
  function screenOwnership(){
    var sid='ltd.records.ownership';
    var hist=(S().workspace&&S().workspace.ownershipHistory)||[];
    var cur=hist.filter(function(v){return v.effectiveTo==null;})[0]||hist[0];
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('records.ownership'))];
    if(cur){ nodes.push(h('div',{class:'tm-h',text:t('records.current')}));
      nodes.push(summRows((cur.shareholders||[]).map(function(sh){ return [sh.name, h('span',{class:'tm-num',text:Math.round((sh.ownershipBasisPoints||0)/100)+'%'})]; }))); }
    if(hist.length>1){
      nodes.push(h('div',{class:'tm-h',text:t('records.history')}));
      hist.slice().sort(function(a,b){return String(b.effectiveFrom).localeCompare(String(a.effectiveFrom));}).forEach(function(v){
        var range=t('records.effective_from')+' '+isoToDisplay(v.effectiveFrom)+(v.effectiveTo?(' '+t('records.effective_to')+' '+isoToDisplay(v.effectiveTo)):' \u2013 '+t('records.current').toLowerCase());
        var who=(v.shareholders||[]).map(function(sh){return sh.name+' '+Math.round((sh.ownershipBasisPoints||0)/100)+'%';}).join(' \u00B7 ');
        nodes.push(recItem(who||t('records.ownership'), range, h('span',{class:'tm-num',text:'v'+(v.version||1)}), null));
      });
    }
    // F-02: share funding is reachable here as a clear, non-primary action, with
    // user-facing share-funding wording (interim copy, gap G-H). Distinct from the
    // director-loan action (money.lend).
    nodes.push(h('div',{style:'margin-top:12px'},[ btn(sfCopy('action'),'s',function(){ openSheet('share'); }) ]));
    nodes.push(h('div',{class:'tm-h',text:t('records.record_change')}));
    nodes.push(dateField({scope:sid,fid:'effectiveDate',persist:false,label:t('records.effective_date')}));
    (cur&&cur.shareholders||[]).forEach(function(sh,i){
      nodes.push(textField({scope:sid,fid:'sh'+i+'_pct',label:sh.name,kind:'percent',default:String(Math.round((sh.ownershipBasisPoints||0)/100)),type:'number',persist:false}));
    });
    nodes.push(textField({scope:sid,fid:'reason',label:t('records.reason'),type:'text',persist:false}));
    nodes.push(textField({scope:sid,fid:'evidence',label:t('design.evidence_reference'),type:'text',persist:false}));
    nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('common.save'),'p',function(){
      var shs=(cur&&cur.shareholders||[]).map(function(sh,i){ return {id:sh.id,name:sh.name,shareClassId:'ordinary',shares:parseInt(fieldVal(sid,'sh'+i+'_pct','')||'0',10)||0,isAccountHolder:!!sh.isAccountHolder}; });
      var ref=fieldVal(sid,'evidence','');
      run('onChangeOwnership',{effectiveDate:fieldVal(sid,'effectiveDate',''), shareholders:shs, reason:fieldVal(sid,'reason',''), evidenceRefs:[ref].filter(Boolean)},
        {scope:sid, onReview:function(r){ UI.review[sid]=r.reviewReasons||[]; paint(); }, onOk:function(){ toast(t('common.saved_for_review')); }}); }) ]));
    var rev=UI.review[sid];
    if(rev&&rev.length) nodes.push(notice('warn', t('records.impact'), t('common.review_required')));
    return workspaceBack(nodes);
  }
  function screenWorkingPack(){
    var d=(S().lastResult&&S().lastResult.data)||{};
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('term.working_pack')),
      notice('info', t('term.working_pack'), t('records.working_pack_info')),
      notice('neutral', null, t('records.backup_first'))];
    if(d.fileName){ nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('design.download'),'p',function(){ triggerDownload(d); }) ])); }
    return workspaceBack(nodes);
  }
  function triggerDownload(d){
    try{
      var blob=new Blob([typeof d.payload==='string'?d.payload:JSON.stringify(d.payload,null,2)],{type:d.mimeType||'application/json'});
      var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=d.fileName||'working-pack.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); },1000);
      toast(t('design.download'));
    }catch(e){ toast(t('error.fix_issue')); }
  }

  /* ====================================================================== */
  /*  UI-LOCAL SHEETS (input forms whose submit lands on a facade action)   */
  /* ====================================================================== */
  function openSheet(kind, ctx){ flushActive(); UI.sheet={kind:kind, step:1, ctx:ctx||{}}; if(kind==='ct')UI.ctIdx=0; UI.errors['ui.'+kind]=null; paint(); }
  function closeSheet(){ UI.sheet=null; clearSheetCache(); paint(); }
  function clearSheetCache(){ Object.keys(UI.cache).forEach(function(k){ if(k.indexOf('ui.')===0) delete UI.cache[k]; }); Object.keys(UI.choices).forEach(function(k){ if(k.indexOf('ui.')===0) delete UI.choices[k]; }); }
  function commonFields(sid){
    return [
      textField({scope:sid,fid:'amountMinor',label:t('design.amount'),kind:'money',placeholder:'0.00',type:'number',inputmode:'decimal',persist:false}),
      textField({scope:sid,fid:'description',label:t('design.what_for'),type:'text',persist:false}),
      dateField({scope:sid,fid:'date',persist:false,label:t('design.date')}),
      textField({scope:sid,fid:'evidence',label:t('design.evidence_reference'),hint:t('common.optional'),type:'text',persist:false})
    ];
  }
  function basePayload(sid){
    var p = { amountMinor:toMinor(fieldVal(sid,'amountMinor','')), date:fieldVal(sid,'date',''),
      description:fieldVal(sid,'description',''), evidenceRefs:[fieldVal(sid,'evidence','')].filter(Boolean) };
    // UI carries only semantic choices. The Codex-owned adapter performs all canonical treatment.
    var cat = fieldVal(sid,'category','');
    if(cat) p.category = cat;
    return p;
  }
  function sheetIncome(){ var sid='ui.income';
    var confirmed=getChoice(sid,'confirm','')==='yes';
    var category=getChoice(sid,'incomeCategory','');
    return sheet({ kick:t('money.add_income'), title:t('money.add_income'),
      body:[errSummary(sid)].concat(commonFields(sid)).concat([
        textField({scope:sid,fid:'invoicePartyId',label:t('income.invoice_party'),type:'text',persist:false}),
        h('div',{class:'tm-question',text:t('income.category_title')}),
        choiceGroup({scope:sid,name:'incomeCategory',options:[
          {v:'trading',title:t('income.category_trading')},{v:'non_trading',title:t('income.category_non_trading')},{v:'asset_disposal',title:t('income.category_asset')},{v:'other',title:t('income.category_other')}
        ]}),
        checkControl({label:t('income.confirm'), checked:confirmed, onToggle:function(v){ setChoice(sid,'confirm', v?'yes':''); }}) ]),
      foot:[ btn(t('common.save'),'p',function(){ flushActive();var payload=basePayload(sid);payload.invoicePartyId=fieldVal(sid,'invoicePartyId','');payload.companyIncomeCategory=category;run('onAddIncome',payload,{scope:sid,onReview:function(){toast(t('common.saved_for_review'));closeSheet();},onOk:function(){ toast(t('money.income_added')); closeSheet(); }}); }, {disabled:!confirmed||!category}),
        btn(t('common.cancel'),'g',function(){ requestClose(sid); }) ],
      onClose:function(){ requestClose(sid); } });
  }
  // F-01: guided Add Expense — basics -> who paid (3 options) -> shared use -> tax facts -> submit.
  function expenseAllocTargets(){
    // Businesses that can share the cost: the Ltd + the user's other businesses, plus private use.
    var s=S(); var comp=s.company&&s.company.entity; var out=[];
    if(comp) out.push({id:comp.entityId||comp.id, name:comp.name});
    (s.businessList||[]).forEach(function(b){ if(b.businessType!=='limited_company') out.push({id:b.id, name:b.name}); });
    out.push({id:'private-use', name:t('money.private_use')});
    return out;
  }
  function sheetExpense(){ var sid='ui.expense'; var step=UI.sheet.step||1;
    var who=getChoice(sid,'who');
    var onlyThis=getChoice(sid,'only');           // 'yes' | 'no'
    var targets=expenseAllocTargets();
    var expCat=getChoice(sid,'cat');
    if(step===1){
      return sheet({ kick:t('design.step_basics'), title:t('money.add_expense'), progress:{n:1,total:4},
        body:[errSummary(sid)].concat(commonFields(sid)).concat([
          h('div',{class:'tm-question',text:t('expense_category.title')}),
          choiceGroup({scope:sid,name:'cat',options:[
            {v:'day_to_day',title:t('expense_category.day_to_day')},
            {v:'formation',title:t('expense_category.formation')},
            {v:'equipment',title:t('expense_category.equipment')},
            {v:'software_dev',title:t('expense_category.software_dev')},
            {v:'stock',title:t('expense_category.stock')},
            {v:'other',title:t('expense_category.other')}
          ]})
        ]),
        foot:[ btn(t('common.continue'),'p',function(){ flushActive(); UI.sheet.step=2; paint(); },{disabled:!expCat}),
          btn(t('common.cancel'),'g',function(){ requestClose(sid); }) ], onClose:function(){ requestClose(sid); } });
    }
    if(step===2){
      return sheet({ kick:t('design.step_who_paid'), title:t('money.who_paid'), progress:{n:2,total:4},
        body:[ choiceGroup({scope:sid,name:'who',options:[
          {v:'company',title:t('money.company_paid')},
          {v:'personal',title:t('money.i_paid')},
          {v:'someone_else',title:t('money.someone_else')}
        ]}),
          who==='someone_else'? notice('warn', t('common.review_required'), t('money.expense_review_body')):null ],
        foot:[ btn(t('common.continue'),'p',function(){ UI.sheet.step=3; paint(); },{disabled:!who}),
          btn(t('common.back'),'g',function(){ UI.sheet.step=1; paint(); }) ], onClose:function(){ requestClose(sid); } });
    }
    if(step===3){
      var comp=S().company&&S().company.entity;
      var body=[ h('div',{class:'tm-question',text:t('money.only_company',{company:(comp&&comp.name)||''})}),
        choiceGroup({scope:sid,name:'only',row:true,options:[
          {v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')}
        ]}) ];
      if(onlyThis==='no'){
        var gross=toMinor(fieldVal(sid,'amountMinor',''))||0;
        body.push(h('div',{class:'tm-h',text:t('money.which_businesses')}));
        var sum=0;
        targets.forEach(function(tg,i){
          var pct=parseInt(fieldVal(sid,'alloc_'+i,'')||'0',10)||0; sum+=pct;
          body.push(textField({scope:sid,fid:'alloc_'+i,label:tg.name,kind:'percent',placeholder:'0',type:'number',persist:false}));
        });
        body.push(totalBar(t('records.impact'), h('span',{class:'tm-num',text:sum+'%'}), sum===100));
        if(sum!==100) body.push(notice('warn', null, t('error.allocation_total')));
      }
      return sheet({ kick:t('design.step_shared'), title:t('design.step_shared'), progress:{n:3,total:4},
        body:body,
        foot:[ btn(t('common.continue'),'p',function(){ flushActive(); if(onlyThis==='no'&&allocSum(sid,targets)!==100){paint();return;} UI.sheet.step=4; paint(); },{disabled:!onlyThis}),
          btn(t('common.back'),'g',function(){ UI.sheet.step=2; paint(); }) ], onClose:function(){ requestClose(sid); } });
    }
    // step 4 — tax facts, then submit
    var capital=getChoice(sid,'capital'); var unsure=getChoice(sid,'unsure'); var special=getChoice(sid,'special');var invoice=getChoice(sid,'invoice');
    var body4=[ h('p',{class:'tm-muted',text:t('ct_review.intro')}),
      h('div',{class:'tm-question',text:t('money.use_over_year')}),
      choiceGroup({scope:sid,name:'capital',row:true,options:[{v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')},{v:'not_sure',title:t('common.not_sure')}]}),
      h('div',{class:'tm-question',style:'margin-top:16px',text:t('expense_special.title')}),
      choiceGroup({scope:sid,name:'special',row:true,options:[{v:'no',title:t('common.no')},{v:'yes',title:t('common.yes')},{v:'not_sure',title:t('common.not_sure')}]}),
      h('div',{class:'tm-question',style:'margin-top:16px',text:t('expense.invoice_question')}),
      choiceGroup({scope:sid,name:'invoice',row:true,options:[{v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')},{v:'not_sure',title:t('common.not_sure')}]}),
      checkControl({label:t('money.unsure_treatment'), checked:unsure==='yes', onToggle:function(v){ setChoice(sid,'unsure',v?'yes':''); }})
    ];
    if(who==='personal') body4.push(notice('info', t('term.company_owes_you'), t('overview.personal_money_body')));
    var canSave = !!capital && !!special && !!invoice;
    return sheet({ kick:t('design.step_review'), title:t('design.step_review'), progress:{n:4,total:4},
      body:body4,
      foot:[ btn(t('common.save'),'p',function(){ flushActive();
          var base=basePayload(sid);
          var taxFacts={capitalUseOverOneYear:(capital||undefined),specialCost:(special||undefined),invoiceToCompany:(invoice||undefined),companyUseScope:onlyThis==='yes'?'only_company':onlyThis==='no'?'not_only_company':'unknown',unsureTreatment:unsure==='yes'};
          var catFacts={ companyExpenseCategory: expCat, taxFacts:taxFacts };
          // The unsupported third-party payer must NEVER reach a posting callback — resolved
          // FIRST via payerAction(), before the shared/company/personal branches, so a shared
          // expense cannot coerce it into company-paid semantics. No posting; review only.
          var action=payerAction(who, onlyThis);
          if(action===null){
            UI.review[sid]=['third_party_payer_not_supported']; toast(t('common.review_required')); paint();
          } else if(action==='onAddSharedExpense'){
            // shared allocation: convert percentages to exact minor amounts summing to gross;
            // carry the category + treatment facts so the source expense keeps its classification.
            var gross=base.amountMinor||0; var allocs=buildAllocations(sid,targets,gross);
            run('onAddSharedExpense',{ paidPersonally: who==='personal', amountMinor:gross, date:base.date, description:base.description,
              evidenceRefs:base.evidenceRefs, sharedAllocations:allocs, companyExpenseCategory:expCat, taxFacts:taxFacts },
              {scope:sid,onReview:function(){ toast(t('money.expense_review')); closeSheet(); },onOk:function(){ toast(t('money.expense_added')); closeSheet(); }});
          } else if(action==='onAddPersonallyPaidExpense'){
            run('onAddPersonallyPaidExpense', Object.assign({},base,catFacts),
              {scope:sid,onReview:function(){ toast(t('money.expense_review')); closeSheet(); },onOk:function(){ toast(t('money.expense_added')); closeSheet(); }});
          } else {
            run('onAddExpense', Object.assign({},base,catFacts),
              {scope:sid,onReview:function(){ toast(t('money.expense_review')); closeSheet(); },onOk:function(){ toast(t('money.expense_added')); closeSheet(); }});
          }
        }, {disabled:!canSave}),
        btn(t('common.back'),'g',function(){ UI.sheet.step=3; paint(); }) ], onClose:function(){ requestClose(sid); } });
  }
  function allocSum(sid,targets){ var s=0; targets.forEach(function(tg,i){ s+=parseInt(fieldVal(sid,'alloc_'+i,'')||'0',10)||0; }); return s; }
  // Deterministic exact-sum percentage -> minor-unit allocation (largest-remainder /
  // Hamilton). Preserves every penny: sum of emitted positive legs === gross for any
  // set of percentages that total 100. Never negative; a 0% row receives nothing
  // (its fractional part is 0 and sorts last, and leftover <= count of nonzero-frac
  // rows). Deterministic and idempotent: ties break by row index. Pure conversion only
  // — no tax/accounting arithmetic.
  function allocateByPercent(ids, pcts, gross){
    gross = Math.max(0, Math.round(gross) || 0);
    var n = ids.length, floors = [], fr = [], sumFloor = 0, i;
    for(i=0;i<n;i++){
      var p = pcts[i] || 0;
      var exact = gross * p / 100;
      var fl = Math.floor(exact);
      floors.push(fl); sumFloor += fl;
      fr.push({ i:i, frac: exact - fl, pct: p });
    }
    var leftover = gross - sumFloor; // integer >= 0, <= number of rows with a nonzero fraction
    fr.sort(function(a,b){ return (b.frac - a.frac) || (a.i - b.i); });
    for(var k=0;k<leftover && k<n;k++){ floors[fr[k].i] += 1; }
    var out = [];
    for(var j=0;j<n;j++){ if(floors[j] > 0) out.push({ id: ids[j], amountMinor: floors[j] }); }
    return out;
  }
  // Which posting callback a payer/shared-use combination resolves to (no side effects).
  // 'someone_else' is unsupported and resolves to review with NO posting, shared or not.
  function payerAction(who, onlyThis){
    if(who==='someone_else') return null;               // review-required, no posting callback
    if(onlyThis==='no') return 'onAddSharedExpense';
    if(who==='personal') return 'onAddPersonallyPaidExpense';
    return 'onAddExpense';
  }
  function buildAllocations(sid,targets,gross){
    var ids=targets.map(function(tg){ return tg.id; });
    var pcts=targets.map(function(tg,i){ return parseInt(fieldVal(sid,'alloc_'+i,'')||'0',10)||0; });
    return allocateByPercent(ids,pcts,gross);
  }
  function sheetMovement(kind){ var sid='ui.'+kind; var lend=kind==='lend';
    var loan=metric('directorLoan'); var cash=metric('companyCash');
    var body=[errSummary(sid)];
    if(!lend){
      body.push(notice('info', t('design.company_owes_you_now'), fmtMoney(loan.amountMinor||0)));
      body.push(notice('neutral', t('design.company_cash_now'), fmtMoney(cash.amountMinor||0)));
    }
    body=body.concat([
      textField({scope:sid,fid:'amountMinor',label: lend?t('design.amount_you_paid_in'):t('design.repayment_amount'),kind:'money',placeholder:'0.00',type:'number',persist:false}),
      textField({scope:sid,fid:'description',label:t('design.what_for'),type:'text',persist:false}),
      dateField({scope:sid,fid:'date',persist:false,label:t('design.date')})
    ]);
    var amt=toMinor(fieldVal(sid,'amountMinor',''))||0;
    if(!lend && amt>(loan.amountMinor||0)) body.push(notice('warn', t('repay.over_limit'), null));
    var confirmed = lend ? (getChoice(sid,'confirm','')==='yes') : true;
    if(lend) body.push(checkControl({label:t('lend.confirm'), checked:confirmed, onToggle:function(v){ setChoice(sid,'confirm', v?'yes':''); }}));
    return sheet({ kick: lend?t('money.lend'):t('money.repay'), title: lend?t('money.lend'):t('money.repay'),
      body:body,
      foot:[ btn(t('common.save'),'p',function(){ flushActive(); var p=basePayload(sid);
          if(lend) run('onAddDirectorLoanFunding',p,{scope:sid,onOk:function(){ toast(t('common.done')); closeSheet(); }});
          else run('onRecordDirectorLoanRepayment',p,{scope:sid,onReview:function(){ toast(t('common.review_required')); closeSheet(); },onOk:function(){ toast(t('common.done')); closeSheet(); }});
        }, {disabled:!confirmed}),
        btn(t('common.cancel'),'g',function(){ requestClose(sid); }) ], onClose:function(){ requestClose(sid); } });
  }
  function sheetCt(){ var sid='ui.ct';
    var advanced=getChoice(sid,'loss','max');
    var topics=[
      {name:'recCheck',label:'ct_review.records_q',simple:true},
      {name:'perCheck',label:'ct_review.periods_q',simple:true},
      {name:'lossCheck',label:'ct_review.losses_q',simple:true},
      {name:'ukResident',label:'ct_review.uk_resident_q'},
      {name:'ringFence',label:'ct_review.ring_fence_q'},
      {name:'investmentHolding',label:'ct_review.investment_holding_q'},
      {name:'associatedNone',label:'ct_review.associated_none_q'},
      {name:'qualifyingDistributions',label:'ct_review.qualifying_distributions_q'},
      {name:'sameTrade',label:'ct_review.same_trade_q'}
    ];
    var idx=Math.max(0,Math.min(UI.ctIdx||0,topics.length-1)), topic=topics[idx], current=getChoice(sid,topic.name,'');
    var options=topic.simple?[{v:'yes',title:t('common.yes')},{v:'not_sure',title:t('common.not_sure')}]:[{v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')},{v:'not_sure',title:t('common.not_sure')}];
    var body=[ h('p',{class:'tm-muted',text:t('ct_review.intro')}), h('div',{class:'tm-kick',text:t('s4.progress',{n:idx+1,total:topics.length})}), h('div',{class:'tm-question',text:t(topic.label)}), choiceGroup({scope:sid,name:topic.name,row:true,current:current,options:options}) ];
    if(current==='not_sure')body.push(notice('warn',t('common.review_required'),null));
    var last=idx===topics.length-1;
    if(last){
      body=body.concat([h('div',{class:'tm-question',text:t('ct_review.use_max_loss')}),choiceGroup({scope:sid,name:'loss',current:advanced,options:[{v:'max',title:t('ct_review.use_max_loss')},{v:'custom',title:t('ct_review.choose_loss')} ]})]);
      if(advanced==='custom') body.push(textField({scope:sid,fid:'lossAmount',label:t('ct_review.choose_loss'),kind:'money',type:'number',persist:false}));
    }
    var q1=getChoice(sid,'recCheck',''), q2=getChoice(sid,'perCheck',''), q3=getChoice(sid,'lossCheck','');
    return sheet({ kick:t('ct_review.title'), title:t('ct_review.title'), body:body,
      foot:[ btn(last?t('ct_review.calculate'):t('s4.next_question'),'p',function(){
          if(!last){UI.ctIdx=idx+1;paint();return;}flushActive();
          var lossUse = advanced==='custom' ? [toMinor(fieldVal(sid,'lossAmount',''))||0] : [];
          var values={ukResident:getChoice(sid,'ukResident',''),ringFence:getChoice(sid,'ringFence',''),investmentHolding:getChoice(sid,'investmentHolding',''),associatedNone:getChoice(sid,'associatedNone',''),qualifyingDistributions:getChoice(sid,'qualifyingDistributions',''),sameTrade:getChoice(sid,'sameTrade','')};
          run('onRunCtEstimate',{reviewTopics:{records:q1,periods:q2,losses:q3},ctFacts:{ukResidentConfirmed:values.ukResident==='yes',ringFenceProfits:values.ringFence==='yes'?true:values.ringFence==='no'?false:null,closeInvestmentHoldingCompany:values.investmentHolding==='yes'?true:values.investmentHolding==='no'?false:null,associatedCompaniesConfirmedNone:values.associatedNone==='yes',qualifyingDistributionsMinor:values.qualifyingDistributions==='no'?0:null,accountsCompleteConfirmed:q1==='yes',sameTradeContinues:values.sameTrade==='yes'}, lossUseMinorByPeriod:lossUse, asOfDate:todayISO()},{scope:sid,onReview:function(){ UI.ctIdx=0;closeSheet(); },onOk:function(){ UI.ctIdx=0;closeSheet(); }});
        },{disabled:!current}),
        btn(idx>0?t('common.back'):t('common.cancel'),'g',function(){ if(idx>0){UI.ctIdx=idx-1;paint();}else closeSheet(); }) ], onClose:closeSheet });
  }
  function checkRow(label){ return h('div',{class:'tm-notice ok'},[h('span',{class:'i',text:'\u2713'}), h('div',{},[label])]); }
  function sheetScenario(){ var sid='ui.scenario';
    var body=[
      notice('neutral', null, t('scenario.compare_intro')),
      textField({scope:sid,fid:'amountMinor',label:t('scenario.amount_question'),kind:'money',type:'number',persist:false,onInput:function(value){
        var submit=document.querySelector('[data-action="scenario-compare"]');
        if(submit)submit.disabled=(toMinor(value)||0)<=0||busy();
      }}),
      dateField({scope:sid,fid:'when',persist:false,label:t('scenario.when')})
    ];
    return sheet({ kick:t('scenario.title'), title:t('scenario.title'), body:body,
      foot:[ btn(t('tax.compare'),'p',function(){ flushActive();
          var amt=toMinor(fieldVal(sid,'amountMinor',''))||0,when=fieldVal(sid,'when','')||todayISO();
          run('onRunScenario',{ordinaryFacts:{amountMinor:amt,when:when},asOfDate:when},{scope:sid,onReview:function(){ closeSheet(); },onOk:function(){ closeSheet(); }});
        }, {disabled:(toMinor(fieldVal(sid,'amountMinor',''))||0)<=0,dataset:{action:'scenario-compare'}}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  function sheetSalary(){ var sid='ui.salary';
    var body=[errSummary(sid),
      dateField({scope:sid,fid:'payDate',persist:false,label:t('salary.payment_date')}),
      textField({scope:sid,fid:'gross',label:t('salary.gross'),kind:'money',type:'number',persist:false}),
      textField({scope:sid,fid:'paye',label:t('salary.paye'),kind:'money',type:'number',persist:false}),
      textField({scope:sid,fid:'eeNi',label:t('salary.employee_ni'),kind:'money',type:'number',persist:false}),
      textField({scope:sid,fid:'erNi',label:t('salary.employer_ni'),kind:'money',type:'number',persist:false}),
      textField({scope:sid,fid:'evidence',label:t('salary.evidence'),type:'text',persist:false}),
      h('div',{class:'tm-question',text:t('salary.rti_status')}),
      choiceGroup({scope:sid,name:'rti',options:[
        {v:'reported_rti',title:t('salary.rti_reported')},
        {v:'pending_rti',title:t('salary.rti_pending')}
      ]})
    ];
    var rti=getChoice(sid,'rti');
    var salConfirmed=getChoice(sid,'confirm','')==='yes';
    var payrollConfirmed=getChoice(sid,'payroll','')==='yes',servicesConfirmed=getChoice(sid,'services','')==='yes',ordinaryConfirmed=getChoice(sid,'ordinary','')==='yes',simpleConfirmed=getChoice(sid,'simple','')==='yes',payeRegistered=getChoice(sid,'payeRegistered','')==='yes';
    body.push(checkControl({label:t('salary.confirm'), checked:salConfirmed, onToggle:function(v){ setChoice(sid,'confirm', v?'yes':''); }}));
    body.push(checkControl({label:t('salary.payroll_confirm'),checked:payrollConfirmed,onToggle:function(v){setChoice(sid,'payroll',v?'yes':'');}}));
    body.push(checkControl({label:t('salary.services_confirm'),checked:servicesConfirmed,onToggle:function(v){setChoice(sid,'services',v?'yes':'');}}));
    body.push(checkControl({label:t('salary.ordinary_confirm'),checked:ordinaryConfirmed,onToggle:function(v){setChoice(sid,'ordinary',v?'yes':'');}}));
    body.push(checkControl({label:t('salary.simple_confirm'),checked:simpleConfirmed,onToggle:function(v){setChoice(sid,'simple',v?'yes':'');}}));
    body.push(checkControl({label:t('salary.paye_registered_confirm'),checked:payeRegistered,onToggle:function(v){setChoice(sid,'payeRegistered',v?'yes':'');}}));
    return sheet({ kick:t('salary.title'), title:t('salary.title'),
      body:[notice('neutral', null, t('salary.no_paye_note'))].concat(body),
      foot:[ btn(t('salary.save'),'p',function(){ flushActive();
          run('onRecordSalary',{salary:{ payDate:fieldVal(sid,'payDate',''), grossSalaryMinor:toMinor(fieldVal(sid,'gross','')),
            payeWithheldMinor:toMinor(fieldVal(sid,'paye','')), employeeNiMinor:toMinor(fieldVal(sid,'eeNi','')), employerNiMinor:toMinor(fieldVal(sid,'erNi','')),
             payeReportingStatus:rti,
             evidenceRefs:[fieldVal(sid,'evidence','')].filter(Boolean),payrollResultConfirmed:payrollConfirmed,payeRegistrationConfirmed:payeRegistered,paidWithinNineMonthsConfirmed:salConfirmed,directorServicesConfirmed:servicesConfirmed,ordinaryRemunerationConfirmed:ordinaryConfirmed,noBenefitsSalarySacrificeOrTerminationPayment:simpleConfirmed}},{scope:sid,onReview:function(){ toast(t('common.saved_for_review')); closeSheet(); },onOk:function(){ toast(t('common.done')); closeSheet(); }});
        },{disabled:!rti||!salConfirmed||!payrollConfirmed||!servicesConfirmed||!ordinaryConfirmed||!simpleConfirmed||!payeRegistered}),
        btn(t('common.cancel'),'g',function(){ requestClose(sid); }) ], onClose:function(){ requestClose(sid); } });
  }
  function sheetDividend(){ var sid='ui.dividend';
    var confirmed=getChoice(sid,'confirm','')==='yes';
    var body=[errSummary(sid),
      dateField({scope:sid,fid:'declDate',persist:false,label:t('dividend.declaration_date')}),
      dateField({scope:sid,fid:'payDate',persist:false,label:t('dividend.payment_date')}),
      textField({scope:sid,fid:'total',label:t('dividend.total'),kind:'money',type:'number',persist:false}),
      // Independently confirmed distributable profit amount + confirmation (never the CT estimate).
      textField({scope:sid,fid:'distributable',label:t('dividend.confirmed_profit'),kind:'money',type:'number',persist:false}),
      checkControl({label:t('dividend.confirmed_profit'), checked:confirmed, onToggle:function(v){ setChoice(sid,'confirm',v?'yes':''); }}),
      textField({scope:sid,fid:'accounts',label:t('dividend.accounts_evidence'),type:'text',persist:false}),
      textField({scope:sid,fid:'board',label:t('dividend.board_reference'),type:'text',persist:false}),
      textField({scope:sid,fid:'minutes',label:t('dividend.minutes_reference'),type:'text',persist:false})
    ];
    return sheet({ kick:t('dividend.declare_title'), title:t('dividend.declare_title'), body:body,
      foot:[ btn(t('dividend.save_declaration'),'p',function(){ flushActive();
          run('onDeclareDividend',{dividend:{
            declarationDate:fieldVal(sid,'declDate',''), paymentDate:fieldVal(sid,'payDate',''),
            totalMinor:toMinor(fieldVal(sid,'total','')),
            confirmedDistributableProfitMinor:toMinor(fieldVal(sid,'distributable','')),
            independentAccountsConfirmation:confirmed, corporationTaxEstimateOnly:false,
            distributableProfitEvidenceRefs:[fieldVal(sid,'accounts','')].filter(Boolean),
            boardApprovalEvidenceRef:fieldVal(sid,'board',''), minutesArtifactRef:fieldVal(sid,'minutes','')
          }},{scope:sid,onReview:function(){ toast(t('common.saved_for_review')); closeSheet(); },onOk:function(){ toast(t('common.done')); closeSheet(); }});
        },{disabled:!confirmed}),
        btn(t('common.cancel'),'g',function(){ requestClose(sid); }) ], onClose:function(){ requestClose(sid); } });
  }
  function sheetDividendPayment(){ var sid='ui.dividendPayment'; var ctx=UI.sheet.ctx||{};
    var allocs=ctx.allocations||[{id:'a1'}];
    var body=[errSummary(sid), h('p',{class:'tm-muted',text:t('dividend.voucher_references')})];
    allocs.forEach(function(al,i){ body.push(textField({scope:sid,fid:'v'+i,label:t('dividend.voucher_references')+' '+(i+1),type:'text',persist:false})); });
    return sheet({ kick:t('dividend.payment_title'), title:t('dividend.payment_title'), body:body,
      foot:[ btn(t('dividend.save_payment'),'p',function(){ flushActive();
          var vs=allocs.map(function(al,i){ return fieldVal(sid,'v'+i,''); }).filter(Boolean);
          run('onRecordDividendPayment',{declarationId:ctx.declarationId, voucherArtifactRefs:vs},{scope:sid,onReview:function(){ closeSheet(); },onOk:function(){ closeSheet(); }});
        }),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  function sheetShare(){ var sid='ui.share';
    var confirmed=getChoice(sid,'ev','')==='yes';
    var body=[errSummary(sid),
      textField({scope:sid,fid:'amountMinor',label:t('design.amount_you_paid_in'),kind:'money',type:'number',persist:false}),
      dateField({scope:sid,fid:'date',persist:false,label:t('design.date')}),
      // Real evidence reference — never a silent empty list presented as fully supported.
      textField({scope:sid,fid:'evidence',label:t('design.evidence_reference'),type:'text',persist:false}),
      // Confirmation describes what the user is actually confirming (share capital paid in),
      // not reused dividend/accounts copy.
      checkControl({label:sfCopy('confirm'), checked:confirmed, onToggle:function(v){ setChoice(sid,'ev',v?'yes':''); }})
    ];
    return sheet({ kick:sfCopy('title'), title:sfCopy('title'), body:body,
      foot:[ btn(t('common.save'),'p',function(){ flushActive();
          var ref=fieldVal(sid,'evidence','');
          run('onRecordShareFunding',{amountMinor:toMinor(fieldVal(sid,'amountMinor','')), date:fieldVal(sid,'date',''),
            description:sfCopy('title'), evidenceRefs:[ref].filter(Boolean), shareCapitalEvidenceConfirmed:confirmed},
            {scope:sid,onReview:function(){ toast(t('common.saved_for_review')); closeSheet(); },onOk:function(){ toast(t('common.done')); closeSheet(); }});
        },{disabled:!confirmed}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  function sheetCorrect(){ var sid='ui.correct'; var ctx=UI.sheet.ctx||{};
    var body=[errSummary(sid),
      textField({scope:sid,fid:'reason',label:t('records.reason'),type:'text',persist:false}),
      textField({scope:sid,fid:'amountMinor',label:t('design.amount'),kind:'money',hint:t('common.optional'),type:'number',persist:false}),
      dateField({scope:sid,fid:'date',persist:false,label:t('design.date')}),
      textField({scope:sid,fid:'description',label:t('design.what_for'),hint:t('common.optional'),type:'text',persist:false}),
      textField({scope:sid,fid:'evidenceRef',label:t('records.evidence'),hint:t('common.optional'),type:'text',persist:false})
    ];
    var reason=fieldVal(sid,'reason','');
    return sheet({ kick:t('money.correct_record'), title:t('money.correct_record'), body:body,
      foot:[ btn(t('common.save'),'p',function(){ flushActive();
          var repl={}; var a=toMinor(fieldVal(sid,'amountMinor','')); if(a!=null) repl.amountMinor=a;
          var dt=fieldVal(sid,'date',''); if(dt) repl.date=dt; var ds=fieldVal(sid,'description',''); if(ds) repl.description=ds;
          var ev=fieldVal(sid,'evidenceRef',''); if(ev) repl.evidenceRefs=[ev];
          run('onCorrectRecord',{eventId:ctx.eventId, reasonCode:fieldVal(sid,'reason',''), replacement:repl},{scope:sid,onReview:function(){ closeSheet(); },onOk:function(){ toast(t('common.saved_for_review')); closeSheet(); }});
        }, {disabled:!reason}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  function sheetRemove(){ var sid='ui.remove';
    var body=[ notice('warn', t('design.remove_action'), t('records.remove_warning')),
      notice('neutral', null, t('records.backup_first')),
      checkControl({label:t('design.remove_confirm'), checked:getChoice(sid,'confirm','')==='yes', onToggle:function(v){ setChoice(sid,'confirm',v?'yes':''); }}) ];
    return sheet({ child:true, kick:t('design.remove_action'), title:t('design.remove_action'), body:body,
      foot:[ btn(t('design.remove_action'),'d',function(){ run('onRemoveCompany',{confirmed:true},{scope:sid,onOk:function(){ UI.sheet=null; toast(t('common.done')); paint(); }}); }, {disabled:getChoice(sid,'confirm','')!=='yes'}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  // Cancel with dirty check for input sheets: if any field touched -> discard confirm via facade dirty flow is onboarding-only;
  // for UI-local sheets we simply confirm inline by closing (no facade draft). Keep it simple + safe.
  function requestClose(sid){ closeSheet(); }

  function renderSheet(){
    switch(UI.sheet.kind){
      case 'income': return sheetIncome();
      case 'expense': return sheetExpense();
      case 'lend': return sheetMovement('lend');
      case 'repay': return sheetMovement('repay');
      case 'ct': return sheetCt();
      case 'scenario': return sheetScenario();
      case 'salary': return sheetSalary();
      case 'dividend': return sheetDividend();
      case 'dividendPayment': return sheetDividendPayment();
      case 'share': return sheetShare();
      case 'correct': return sheetCorrect();
      case 'remove': return sheetRemove();
      default: return null;
    }
  }

  /* ====================================================================== */
  /*  DEV BAR (locale/theme/reset) — Fable owns locale layout; production   */
  /*  binds these to app settings.                                          */
  /* ====================================================================== */
  function devbar(){
    var locSel=h('select',{'aria-label':'Locale', onChange:function(e){ UI.locale=e.target.value; UI.mountedKey=null; paint(); }},
      LOCALES.map(function(l){ return h('option',{value:l[0], selected:UI.locale===l[0]?'selected':null}, l[1]); }));
    var thSel=h('select',{'aria-label':'Theme', onChange:function(e){ UI.theme=e.target.value; UI.mountedKey=null; paint(); }},
      [['light','Light'],['dark','Dark']].map(function(x){ return h('option',{value:x[0], selected:UI.theme===x[0]?'selected':null}, x[1]); }));
    return h('div',{class:'tm-devbar'},[
      h('b',{},['TaxMate ', h('span',{text:'Ltd'})]),
      locSel, thSel,
      h('button',{class:'tm-linkbtn',type:'button',style:'font-size:11.5px',onClick:function(){ UI.cache={};UI.choices={};UI.sheet=null;UI.errors={};UI.review={}; run('onResetPreview',{},{onOk:function(){ paint(); }}); }},'Reset')
    ]);
  }

  /* ====================================================================== */
  /*  ORCHESTRATION                                                         */
  /* ====================================================================== */
  function screenFor(id){
    switch(id){
      case 'home': return screenHome();
      case 'business.category-choice': return screenCategory();
      case 'business.self-employed-structure': return screenSelfEmployed();
      case 'business.existing': case 'business.existing.edit': return screenBusinessExisting();
      case 'ltd.one-company-limit': return screenOneLtdLimit();
      case 'ltd.onboarding.step1': case 'ltd.onboarding.registration-details': return step1();
      case 'ltd.onboarding.registration-pending': return screenRegistrationPending();
      case 'ltd.onboarding.director-review': return screenDirectorReview();
      case 'ltd.onboarding.step2': return step2();
      case 'ltd.onboarding.step3': return step3();
      case 'ltd.onboarding.step4': return step4();
      case 'ltd.onboarding.step5': return step5();
      case 'ltd.workspace.overview': return areaOverview();
      case 'ltd.workspace.money': return areaMoney();
      case 'ltd.workspace.tax': return areaTax();
      case 'ltd.workspace.records': return areaRecords();
      case 'ltd.workspace.metric-detail': return screenMetricDetail();
      case 'ltd.money.record-detail': return screenRecordDetail();
      case 'ltd.money.draft-edit': return screenDraftEdit();
      case 'ltd.tax.ct-review': return screenCtReview();
      case 'ltd.tax.scenario-results': return screenScenarioResults();
      case 'ltd.tax.salary-record': return screenSalaryRecord();
      case 'ltd.tax.dividend-detail': return screenDividendDetail();
      case 'ltd.records.company-edit': return screenCompanyEdit();
      case 'ltd.records.ownership': return screenOwnership();
      case 'ltd.records.working-pack': return screenWorkingPack();
      default: return screenUnknownRoute(id);
    }
  }
  function screenUnknownRoute(id){
    var wrap=frag();wrap.append(backBar(function(){run('onBack',{},{});},t('unknown.title')));wrap.append(notice('warn',t('unknown.title'),t('unknown.body')));wrap.append(h('div',{style:'margin-top:14px'},[btn(t('workspace.all_businesses'),'g',function(){run('onOpenHome',{},{});})]));return wrap;
  }

  function renderKey(){
    var ov=overlays().map(function(o){return o.id;}).join(',');
    var pd=pendingDiscard()?('pd:'+pendingDiscard().screenId):'';
    var sh=UI.sheet?('sheet:'+UI.sheet.kind+UI.sheet.step):'';
    var er=Object.keys(UI.errors).map(function(k){ return UI.errors[k]?k+Object.keys(UI.errors[k]).length:''; }).join('|');
    var rv=Object.keys(UI.review).map(function(k){ return UI.review[k]&&UI.review[k].length?k:''; }).join('|');
    var res=S().lastResult?((S().lastResult.status||'')+(S().lastResult.nextRoute||'')):'';
    return [S().mode, routeId(), JSON.stringify(route().params||{}), ov, pd, sh, UI.locale, UI.theme, busy(), UI.toast||'', er, rv, res,
      UI.cal||'', UI.calView?(UI.calView.y+'-'+UI.calView.m):'', JSON.stringify(UI.disc), JSON.stringify(UI.choices)].join('#');
  }
  function paintIfChanged(){ if(UI.mountedKey!==renderKey()) paint(); }

  // Public entry (subscribed). Every facade emit repaints except the explicit,
  // one-shot synchronous onDraftChanged emit armed by persistDraft above.
  function render(mount, facade, snapshot){
    LAST.mount=mount; LAST.facade=facade; LAST.snapshot=snapshot;
    if(!snapshot){ mount.replaceChildren(h('div',{style:'padding:24px',text:'\u2026'})); return; }
    var rId=routeId();
    if(UI.lastRouteKey!==rId){ // arrived at a new screen: clear field cache so it seeds from snapshot draft
      UI.cache={}; UI.cal=null;if(rId==='ltd.onboarding.step4')UI.checkIdx=null; UI.lastRouteKey=rId;
    }
    if(UI.skipNextDraftEmitRender>0){
      UI.skipNextDraftEmitRender-=1;
      return; // consume only the draft persistence emit; preserve blur-to-click
    }
    paint();
  }

  function paint(){
    var mount=LAST.mount; if(!mount||!LAST.snapshot) return;
    flushActive();
    var app=h('div',{class:'tm-app', 'data-theme':UI.theme, dir:isRTL()?'rtl':'ltr',lang:UI.locale});
    if(!UI.production) app.append(devbar());
    var col=h('div',{class:'tm-col'});
    col.append(screenFor(routeId()));
    app.append(col);
    // overlays: info sheet(s) from facade nav
    overlays().forEach(function(ov){ if(ov.type==='information') app.append(infoSheet(ov)); });
    // dirty discard confirmation
    if(pendingDiscard()) app.append(discardSheet());
    // UI-local sheet
    if(UI.sheet){ var sh=renderSheet(); if(sh) app.append(sh); }
    // toast
    if(UI.toast) app.append(h('div',{class:'tm-toast'},[h('div',{class:'b'},[UI.toast])]));
    mount.replaceChildren(app);
    UI.mountedKey=renderKey();
    // focus first error field
    if(UI.focusError){ UI.focusError=false;
      var first=mount.querySelector('.tm-inwrap.err .tm-input'); if(first){ try{ first.focus(); }catch(e){} }
    }
  }

  root.TaxMateLtdWorkbenchRenderer = Object.freeze({
    render: render,
    // optional hooks so a production shell can drive locale/theme from app settings
    setLocale: function(l){ UI.locale=l; UI.mountedKey=null; paint(); },
    setTheme: function(th){ UI.theme=th; UI.mountedKey=null; paint(); },
    setProductionMode: function(on){ UI.production=on===true; UI.mountedKey=null; paint(); },
    // pure, side-effect-free helpers exposed for source-level acceptance tests
    _allocateByPercent: allocateByPercent,
    _payerAction: payerAction
  });
})(typeof globalThis!=='undefined'?globalThis:this);

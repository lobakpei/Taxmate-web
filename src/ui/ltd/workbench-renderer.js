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
    lastRouteKey:null, mountedKey:null, webHomeBaseline:null, webHomeDiscard:false
  };
  var LAST = { mount:null, facade:null, snapshot:null };
  var LOCALES = [['en','EN'],['zh-HK','繁'],['pl','PL'],['ro','RO'],['es','ES'],['ur','اردو']];

  /* ---- DOM helper -------------------------------------------------------- */
  // SVG elements must be created in the SVG namespace; document.createElement('svg')
  // yields an HTMLUnknownElement that never paints its paths (UI-04).
  var SVG_NS='http://www.w3.org/2000/svg', SVG_TAGS={svg:1,path:1,rect:1,circle:1,line:1,polyline:1,polygon:1,g:1};
  function h(tag, attrs, children){
    var isSvg=!!SVG_TAGS[tag];
    var n = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    if(attrs) for(var k in attrs){
      var v = attrs[k];
      if(v==null || v===false) continue;
      if(k==='class'){ if(isSvg) n.setAttribute('class', v); else n.className = v; }
      else if(k==='text') n.textContent = String(v);
      else if(k==='html') n.innerHTML = v;
      else if(k.slice(0,2)==='on'){var event=k.slice(2).toLowerCase();n.addEventListener(event,v);if(!n.taxmateHandlers)n.taxmateHandlers={};n.taxmateHandlers[event]=v;}
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
  // The four approved Direction A workspace icons (overview / money / tax / records).
  var NAV_ICON_SHAPES={
    overview:[['path',{d:'M3 11l9-8 9 8'}],['path',{d:'M5 10v10h14V10'}]],
    money:[['rect',{x:'3',y:'6',width:'18',height:'12',rx:'3'}],['circle',{cx:'12',cy:'12',r:'2.6'}],['path',{d:'M6.5 9.5h.01M17.5 14.5h.01'}]],
    tax:[['rect',{x:'3',y:'5',width:'18',height:'16',rx:'3'}],['path',{d:'M3 10h18M8 3v4M16 3v4'}]],
    records:[['path',{d:'M6 3h9l4 4v14H6z'}],['path',{d:'M14 3v5h5M9 13h6M9 17h6'}]],
    pay:[['circle',{cx:'12',cy:'7',r:'3'}],['path',{d:'M5 21v-3a7 7 0 0 1 14 0v3'}]]
  };
  function directionNavIcon(name){
    var shapes=NAV_ICON_SHAPES[name]||NAV_ICON_SHAPES.overview;
    return h('svg',{class:'tm-navicon',viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false',dataset:{icon:name}},
      shapes.map(function(s){ return h(s[0], s[1]); }));
  }

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
  // Money semantics (UI-02). role: 'in' = income column (green when >0), 'out' = explicit
  // cost / tax / liability column (red whenever non-zero, whatever the stored sign),
  // 'signed' = by sign (profit, cash, balances), 'neutral' = ink. Zero stays neutral and
  // an unknown value is "Please check", never £0.00. Values and signs are never changed.
  function moneyClass(minor, role){
    // An explicit cost / tax / liability column stays in the expense colour whatever the
    // stored sign, zero included, so a column always reads as money out. Ordinary values
    // follow their sign; a neutral column and an ordinary zero stay ink.
    if(role==='out') return 'neg';
    if(role==='in'||role==='signed') return minor>0?'pos':minor<0?'neg':'';
    return '';
  }
  function moneyRole(minor, role){
    if(!isKnownMinor(minor)) return h('span',{class:'tm-muted tm-check-needed',text:t('statutory.needs_checking')});
    return money(minor, moneyClass(minor, role));
  }
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
    if(a && a.dataset && a.dataset.fkey!=null && typeof a.value==='string'){
      var value=a.value;
      if(a.dataset.raw==='date')value=/^\d{4}-\d{2}-\d{2}$/.test(value)?value:displayToISO(value.trim())||value;
      UI.cache[a.dataset.fkey]=value;
      if(a.dataset.raw==='date'&&a.dataset.scope&&a.dataset.persist!=='false'&&draftFields(a.dataset.scope)[a.dataset.field]!==value)persistDraft(a.dataset.scope,a.dataset.field,'date',value);
    }
  }
  function preserveStep2DateClick(event){
    var active=document.activeElement;
    // Keep the date field from repainting the pressed control before its click.
    // The click flushes the ISO value and performs the normal semantic action.
    if(routeId()==='ltd.onboarding.step2'&&event.button===0&&active&&active.dataset.raw==='date')event.preventDefault();
  }
  function choiceKey(scope,name){ return scope+'::choice::'+name; }
  function getChoice(scope,name,fallback){
    var k=choiceKey(scope,name);
    return (k in UI.choices)?UI.choices[k]:(fallback!=null?fallback:null);
  }
  function setChoice(scope,name,val){ UI.choices[choiceKey(scope,name)]=val; }
  function clearScope(scope){var prefix=scope+'::';Object.keys(UI.cache).forEach(function(key){if(key.indexOf(prefix)===0)delete UI.cache[key];});Object.keys(UI.choices).forEach(function(key){if(key.indexOf(prefix)===0)delete UI.choices[key];});delete UI.errors[scope];delete UI.review[scope];}

  /* ---- action runner: every state change goes through the facade -------- */
  function run(cb, input, opts){
    if(cb==='onSaveCompanyDraft')captureSetupInputs();
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
        if(['onEditCompany','onSaveDraftEdit','onChangeOwnership'].indexOf(cb)>=0)UI.webHomeBaseline=null;
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
    UI._toastT=setTimeout(function(){ UI._toastT=null; UI.toast=null; paint(); }, 2600);
  }
  function toast(msg){ UI.toast=msg; paint(); scheduleToast(); }
  // A confirmation from the previous action never survives into the next sheet or
  // screen (UI-09): cleared on sheet open and on every route change.
  function clearToast(){ if(UI._toastT) clearTimeout(UI._toastT); UI._toastT=null; UI.toast=null; }

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
      dataset:opts.dataset||null, onPointerDown:preserveStep2DateClick, onClick:onClick},[label]);
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
    var scope=o.scope, fid=o.fid, err=errFor(scope,fid), kind=o.kind||'text';
    var wrapCls='tm-inwrap'+(err?' err':'');
    var affixPre = kind==='money' ? '\u00A3' : null;
    var affixSuf = kind==='percent' ? '%' : null;
    var input=h('input',{class:'tm-input'+(affixPre?' pre':'')+(affixSuf?' suf':''), type:'text',
      inputmode:o.inputmode||(kind==='text'?'text':'decimal'),
      placeholder:o.placeholder||'', value:fieldVal(scope,fid,o.default||''),
      'aria-label':o.aria||stripTags(o.label), 'aria-invalid':err?'true':null,
      dataset:{fkey:fkey(scope,fid), field:fid},
      onInput:function(e){ setField(scope,fid,e.target.value); if(o.onInput)o.onInput(e.target.value); },
      onChange:function(e){ setField(scope,fid,e.target.value); if(kind==='percent'){ setTimeout(paint,0); } },
      onBlur:function(e){ if(o.persist!==false) persistDraft(scope,fid, o.type||'text', e.target.value); }
    });
    var inner=[input];
    if(affixPre) inner.push(h('span',{class:'tm-affix pre',text:affixPre}));
    if(affixSuf) inner.push(h('span',{class:'tm-affix suf',text:affixSuf}));
    return h('div',{class:'tm-field','data-field-container':fkey(scope,fid)},[
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
    return h('div',{class:'tm-field','data-field-container':fkey(scope,fid)},[
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
      dataset:{fkey:fkey(scope,fid), field:fid, scope:scope, persist:o.persist===false?'false':'true', raw:'date'},
      onInput:function(e){ var value=e.target.value;UI.cache[fkey(scope,fid)+'#raw']=value;setField(scope,fid,/^\d{4}-\d{2}-\d{2}$/.test(value)?value:displayToISO(value.trim())||value); },
      onBlur:function(e){
        var v=e.target.value.trim();
        var isoV = /^\d{4}-\d{2}-\d{2}$/.test(v)? v : displayToISO(v);
        if(isoV){ e.target.value=isoToDisplay(isoV); setField(scope,fid,isoV); if(o.persist!==false) persistDraft(scope,fid,'date',isoV); if(o.onChange)o.onChange(isoV); }
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
    return h('div',{class:'tm-field','data-field-container':fkey(scope,fid)},kids);
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
      if(op.amount!=null) inner.push(h('div',{class:'tm-choice-amount'},[moneyRole(op.amount,op.role||'signed')]));
      return h('button',{class:'tm-choice'+(on?' on':''), type:'button', 'aria-pressed':on?'true':'false',
        onPointerDown:preserveStep2DateClick,
        onClick:function(){ if(o.scope==='ltd.onboarding.step2')flushActive();setChoice(o.scope,o.name,op.v); if(o.onPick)o.onPick(op.v); paint(); }
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
    if(o.progress){
      var pr=h('div',{class:'tm-progress'},[]); var fill=h('i'); fill.style.width=Math.round(100*o.progress.n/o.progress.total)+'%'; pr.appendChild(fill);
      bodyKids.unshift(pr);
    }
    (o.body||[]).forEach(function(n){ if(n) bodyKids.push(n); });
    var sBody=h('div',{class:'tm-sbody'}, bodyKids);
    var parts=[h('div',{class:'tm-grab'}),h('div',{class:'tm-dialog-head'},[
      h('div',{class:'tm-stitle',text:o.title||o.kick||''}),
      h('button',{class:'tm-dialog-close',type:'button','aria-label':t('common.close'),onClick:function(){if(o.onClose)o.onClose();}},'×')
    ]),sBody];
    if(o.foot&&o.foot.length) parts.push(h('div',{class:'tm-sfoot'}, o.foot.filter(Boolean)));
    var card=h('div',{class:'tm-sheet'+(o.child?' child':''), role:'dialog','aria-modal':'true',
      'aria-label':o.title||o.kick||'',tabindex:'-1',onKeydown:function(e){
        if(e.key==='Escape'){e.preventDefault();if(o.onClose)o.onClose();}
        if(e.key==='Tab'){var fields=Array.from(card.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')).filter(function(n){return n.getClientRects().length;});var first=fields[0],last=fields[fields.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
      },onClick:function(e){ e.stopPropagation(); }}, parts);
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
  function discardSheet(webHome){
    if(!webHome&&S().setupExit){
      var state=S().setupExit,reason=state.status==='completed'?'setup.completed':state.status==='legacy'?'setup.legacy_slot':state.status==='has_records'?'setup.has_records':state.status==='loading'?'setup.checking':state.reason==='setup_changed_review_again'?'setup.changed':state.reason==='setup_discard_uncertain'?'setup.uncertain':state.status==='unavailable'?'setup.unavailable':null;
      return sheet({child:true,title:t('setup.exit_title'),body:[h('p',{class:'tm-muted',text:t('setup.exit_body')}),h('p',{class:'tm-muted',text:t('setup.remove_consequence')}),reason?notice('neutral',null,t(reason)):null],foot:[
        btn(t('setup.keep_exit'),'p',function(){run('onSaveCompanyDraft',{},{onOk:function(){UI.sheet=null;paint();}});},{disabled:state.reason==='setup_discard_uncertain'}),
        btn(t('setup.remove_draft'),'d',function(){run('onDiscardCompanySetup',{},{onOk:function(){UI.cache={};UI.choices={};UI.sheet=null;paint();}});},{disabled:!state.canDiscard}),
        btn(t('design.keep_editing'),'g',function(){run('onDiscardCancelled',{},{});})],onClose:function(){run('onDiscardCancelled',{},{});}});
    }
    var result=sheet({ child:true, title:t('design.discard_title'),
      body:[ h('p',{class:'tm-muted',text:t('design.discard_body')}) ],
      foot:[
        btn(t('design.discard'),'d',function(){ if(webHome)return webHome.confirm();run('onDiscardConfirmed',{},{onOk:function(){ UI.cache={}; UI.choices={}; UI.sheet=null; paint(); }}); }),
        btn(t('design.keep_editing'),'g',function(){ if(webHome)return webHome.cancel();run('onDiscardCancelled',{},{}); })
      ],
      onClose:function(){ if(webHome)return webHome.cancel();run('onDiscardCancelled',{},{}); } });
    if(webHome)result.setAttribute('data-web-home-discard','');return result;
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
  function webFormSnapshot(container){
    var shell=container&&container.querySelector('.tm-workspace-shell');
    return JSON.stringify(shell?Array.from(shell.querySelectorAll('input,select,textarea')).map(function(n){return[n.dataset.fkey||n.name,n.type==='checkbox'||n.type==='radio'?n.checked:n.value];}):[]);
  }
  function webBrandHome(children,className,location){
    return h('button',{class:className+' web-brand-home',type:'button','aria-label':t('web.logo_home'),dataset:{webBrandHome:location||'home',webBrandRoute:routeId()},onClick:function(){
      if(UI.sheet||overlays().length||pendingDiscard()||UI.webHomeDiscard||busy())return;
      flushActive();
      if(/^ltd\.onboarding\./.test(routeId())){captureSetupInputs();run('onDismissRequested',{reason:'home'},{});return;}
      if(UI.webHomeBaseline!==null&&webFormSnapshot(LAST.mount)!==UI.webHomeBaseline){UI.webHomeDiscard=true;paint();return;}
      run('onOpenHome',{},{});
    }},children);
  }
  function webLogo(location){return webBrandHome(h('img',{src:'/assets/brand/derived/taxmate-brand-logo-dark.svg',alt:'TaxMate'}),'tm-logo',location);}
  function topBar(){
    var yr=taxYearLabel();
    return h('div',{class:'tm-summary-sheet slim'},[h('div',{class:'tm-top'},[
      webBrandHome([h('span',{class:'mk',text:'T'}), h('span',{},['Tax',h('span',{class:'mk2',text:'Mate'})])],'tm-brand'),
      yr? h('div',{class:'tm-year',text:yr}) : null
    ])]);
  }

  function screenHome(){
    var s=S(); var wrap=frag();
    wrap.append(topBar());
    wrap.append(h('div',{class:'tm-h',text:t('design.your_businesses')}));
    var rows=h('div',{class:'tm-rows'});
    (s.businessList||[]).forEach(function(b){ rows.append(homeRow(b)); });
    // Retained/blocked company: the driver withholds the row itself, but the account
    // still holds an active company slot. Say why it is unavailable (engine reason) —
    // never invent figures or a name for it.
    var lim=s.companyLimit||{};
    if(lim.activeCompanyId&&!(s.businessList||[]).some(function(b){return b.businessType==='limited_company';})&&lim.reason&&lim.reason!=='one_active_ltd_limit'){
      var why=lim.reason==='company_slot_retained_after_removal'?t('error.company_slot_retained'):lim.reason==='tax_year_retention_ended'?t('plan.ltd_retention_ended'):lim.reason==='tax_year_retention_date_required'?t('plan.ltd_retention_date_required'):t('plan.ltd_pro_only');
      rows.append(h('div',{class:'tm-row tm-row-locked',dataset:{lockedCompany:lim.reason}},[h('div',{class:'av draft',text:'L'}),h('div',{},[h('div',{class:'nm',text:t('add.ltd_title')}),h('div',{class:'mt',text:why}),lim.reason==='company_slot_retained_after_removal'?null:priceLine()]),h('div',{class:'rt'})]));
    }
    wrap.append(rows);
    wrap.append(h('button',{class:'tm-add', type:'button',
      onClick:function(){ run('onAddBusiness',{},{}); }}, t('design.add_a_business')));
    return wrap;
  }
  function priceLine(){
    return h('div',{class:'cta tm-price'},[h('s',{class:'tm-price-standard',text:t('plan.pro_standard_price')}),' ',h('span',{text:t('plan.pro_launch_price')})]);
  }
  function homeRow(b){
    var prim=b.actions&&b.actions.primary||{};
    var cb=prim.callback, isLtd=b.businessType==='limited_company',locked=isLtd&&prim.enabled===false;
    var sub, cta, avCls='', avTxt=(b.name||'?').slice(0,1).toUpperCase();
    var amt=b.summary&&b.summary.amountMinor;
    var neg = amt!=null && amt<0;
    if(locked){ var why=prim.disabledReason; sub=why==='tax_year_retention_ended'?t('plan.ltd_retention_ended'):why==='tax_year_retention_date_required'?t('plan.ltd_retention_date_required'):t('plan.ltd_pro_only'); cta=t('plan.pro_launch_price'); avCls='draft'; }
    else if(cb==='onResumeCompanyDraft'){ sub=t('design.ltd_setup_pending'); cta=t('design.finish_setup'); avCls='draft'; }
    else if(isLtd){ sub=t('workspace.ltd_subtitle',{percent:(b.share&&b.share.percent)||0}); cta=t('common.open'); }
    else { sub=b.structure==='partnership'?t('design.partnership'):t('design.sole_trader'); cta=null; }
    var attn=b.attention&&b.attention.count>0;
    if(attn){ avCls='attn'; }
    var right=h('div',{class:'rt'});
    if(amt!=null && cb!=='onResumeCompanyDraft') right.append(h('div',{class:'amt '+moneyClass(amt,'signed')},[money(amt)]));
    if(attn) right.append(h('div',{class:'cta attn',text:t('design.needs_attention')}));
    else if(cta&&!locked) right.append(h('div',{class:'cta',text:cta}));
    // Locked Pro row: the two prices sit under the subtitle (full row width) so the
    // name column is never squeezed on 360px screens.
    var mid=[h('div',{class:'nm',text:b.name}), h('div',{class:'mt',text:sub})];
    if(locked) mid.push(priceLine());
    return h('button',{class:'tm-row'+(locked?' tm-row-locked':''), type:'button',disabled:locked,
      onClick:function(){ run(cb, prim.input||{}, {}); }},[
      h('div',{class:'av '+avCls, text:avTxt}),
      h('div',{},mid),
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
    var removedSlot=S().companyLimit&&S().companyLimit.reason==='company_slot_retained_after_removal';
    wrap.append(notice('info', t('add.ltd_title'), t(removedSlot?'error.company_slot_retained':'add.one_ltd_limit')));
    wrap.append(h('div',{style:'margin-top:14px'},[
      removedSlot?null:btn(t('add.open_existing'),'p',function(){
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
      h('button',{class:'tm-wsback',type:'button',onPointerDown:preserveStep2DateClick,onClick:function(){captureSetupInputs();run('onBack',{},{});}},[isRTL()?'\u2192':'\u2190',' ',t('common.back')]),
      h('button',{class:'tm-linkbtn',type:'button',onPointerDown:preserveStep2DateClick,onClick:function(){captureSetupInputs();run('onDismissRequested',{reason:'cancel'},{});}}, t('common.cancel'))
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
    ],onPick:function(v){ setField(sid,'corporationTaxStatus',v); persistDraft(sid,'corporationTaxStatus','select-one',v); requestPeriodPlan(sid); }}));
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
  function selectWorkspace(area){run('onSetWorkspaceArea',area==='pay'?{area:'tax',view:'pay'}:{area:area},{});}
  function workspaceShell(area, inner, opts){
    opts=opts||{};
    var s=S(); var comp=s.company&&s.company.entity; var pct=(companyRow()&&companyRow().share&&companyRow().share.percent)||founderPct();
    var pp=(s.company&&s.company.periodPlan&&s.company.periodPlan.accounts)||{};
    var tabs=[['overview','review01.today'],['money','workspace.money'],['pay','review01.pay'],['tax','review01.tax']];
    var active=area==='records'?'tax':area;
    var header=h('div',{class:'tm-summary-sheet'+(area==='overview'?'':' slim')});
    header.append(h('div',{class:'tm-top'},[
      h('button',{class:'tm-wsback',type:'button',onClick:function(){ run(opts.detail?'onBack':'onOpenHome',{},{}); }},[isRTL()?'\u2192':'\u2190',' ',t('common.back')]),
      webLogo('header')
    ]));
    var titles={money:'review01.money',pay:'review01.pay',tax:'review01.year',records:'workspace.records'};
    header.append(h('div',{class:'tm-wstitle',text:opts.title||(area==='overview'?(comp&&comp.name)||'':t(titles[area]))}));
    header.append(h('div',{class:'tm-wsmeta'},[
      area==='overview'?null:h('span',{text:(comp&&comp.name)||''}),
      pp.startDate?h('span',{class:'tm-num',text:isoToDisplay(pp.startDate)+' – '+isoToDisplay(pp.endDate)}):null
    ]));
    var content=inner.slice();
    if(area==='overview'&&content[0]&&content[0].classList&&content[0].classList.contains('tm-hero')) header.append(content.shift());
    var tabBar=h('div',{class:'tm-tabs', role:'tablist'}, tabs.map(function(tb){
      return h('button',{class:(active===tb[0]?'on':''),type:'button',role:'tab','aria-selected':active===tb[0]?'true':'false',
        onClick:function(){ selectWorkspace(tb[0]); }}, t(tb[1]));
    }));
    var mainCol=h('div',{class:'tm-col'},[header,tabBar]);
    content.forEach(function(n){ if(n) mainCol.append(n); });
    var rail=h('aside',{class:'rail'},[
      webLogo('rail'),
      h('div',{class:'nav-d'},tabs.map(function(tb){return h('button',{class:active===tb[0]?'on':'',type:'button',dataset:{area:tb[0]},onClick:function(){selectWorkspace(tb[0]);}},[directionNavIcon(tb[0]),t(tb[1])]);})),
      h('button',{class:'tm-wsback back-d',type:'button',onClick:function(){run('onOpenHome',{},{});}},[isRTL()?'\u2192':'\u2190',' ',t('workspace.all_businesses')])
    ]);
    var side=h('aside',{class:'side'},[h('div',{class:'card'},[
      h('div',{class:'ct',text:(comp&&comp.name)||''}),
      h('div',{class:'cs',text:pp.startDate?t('workspace.company_period',{start:isoToDisplay(pp.startDate),end:isoToDisplay(pp.endDate)}):''})
    ])]);
    var bottom=h('nav',{class:'tm-bottom-nav','aria-label':t('nav.company_sections')},tabs.map(function(tb){return h('button',{class:active===tb[0]?'on':'',type:'button','aria-current':active===tb[0]?'page':null,dataset:{area:tb[0]},onClick:function(){selectWorkspace(tb[0]);}},[directionNavIcon(tb[0]),h('span',{text:t(tb[1])})]);}));
    return h('div',{class:'tm-workspace-shell'},[rail,h('div',{class:'main'},[mainCol]),side,bottom]);
  }
  function companyRow(){ return (S().businessList||[]).filter(function(b){return b.businessType==='limited_company';})[0]; }
  function founderPct(){ var sh=(S().company&&S().company.profile&&S().company.profile.shareholders)||[]; var me=sh.filter(function(x){return x.isAccountHolder;})[0]; return me?Math.round((me.ownershipBasisPoints||0)/100):100; }
  function metric(id){ var p=S().workspace&&S().workspace.projection; return (p&&p.metrics&&p.metrics[id])||{amountMinor:null,status:'none'}; }
  function currentFigureReasons(){
    var w=S().workspace||{},p=w.projection||{};
    return [].concat(w.companyYearFigures&&w.companyYearFigures.reasonCodes||[],(p.reviewItems||[]).map(function(item){return item.reasonCode;}),(p.periods||[]).flatMap(function(period){return period.reasonCodes||[];}));
  }
  function captureSetupInputs(){
    flushActive();var sid=routeId();if(!/^ltd\.onboarding\./.test(sid)||!LAST.mount)return;
    var values=Array.from(LAST.mount.querySelectorAll('input[data-field],textarea[data-field],select[data-field]')).filter(function(input){return input.dataset.fkey&&input.dataset.fkey.indexOf(sid+'::')===0&&input.dataset.persist!=='false';}).map(function(input){var type=input.dataset.raw==='date'?'date':input.type==='checkbox'?'checkbox':'text',value=input.type==='checkbox'?input.checked:input.value;if(type==='date')value=/^\d{4}-\d{2}-\d{2}$/.test(value)?value:displayToISO(value.trim())||value;return{id:input.dataset.field,type:type,value:value};});
    values.forEach(function(field){persistDraft(sid,field.id,field.type,field.value);});
  }
  function taxDisplayState(){
    var p=S().workspace&&S().workspace.projection,ct=metric('corporationTax'),codes=currentFigureReasons();
    if(codes.indexOf('retention_history_incomplete')>=0)return 'history_missing';
    if(codes.indexOf('company_tax_estimate_refresh_required')>=0||codes.indexOf('corporation_tax_calculation_out_of_date')>=0)return 'out_of_date';
    if(ct.status==='supported_estimate'&&Number.isSafeInteger(ct.amountMinor))return 'calculated';
    if(p&&Array.isArray(p.periods)&&p.periods.length===0)return 'not_calculated';
    return p?'needs_review':'unavailable';
  }
  function taxDisplayLabel(){return t('tax.state.'+taxDisplayState());}
  function openTaxCalculation(){if(can('create_period'))openSheet('ct');else run('onOpenMetric',{metricId:'corporationTax'},{});}
  function dividendNotice(){
    if(dividendAvailable())return null;
    var pd=metric('potentialDividend'),retained=metric('provisionalRetained'),cash=metric('companyCash'),known=Number.isSafeInteger(pd.amountMinor)&&String(pd.status).indexOf('review')<0,state;
    if(known&&pd.amountMinor<=0){
      state=Number.isSafeInteger(retained.amountMinor)&&retained.amountMinor<=0?'no_profit':Number.isSafeInteger(cash.amountMinor)&&cash.amountMinor<=0?'no_cash':'no_amount';
      return h('div',{dataset:{dividendState:state}},[notice('neutral',null,t('pay.'+state))]);
    }
    state=taxDisplayState();
    var p=S().workspace&&S().workspace.projection||{},codes=[].concat((p.periods||[]).flatMap(function(period){return period.reasonCodes||[];}),(p.reviewItems||[]).filter(function(item){return ['corporation_tax_period','company_transaction','company_profile','retention'].indexOf(item.kind)>=0;}).map(function(item){return item.reasonCode;}));
    var nodes=[notice('neutral',t('pay.amount_unknown'),taxDisplayLabel())],items=todoItems({codes:codes}).filter(function(item){return item.id!=='ct';});
    if(items.length)nodes.push(todoList(items));
    if(state!=='history_missing'&&state!=='unavailable')nodes.push(btn(t(state==='not_calculated'?'tax.calculate':'tax.review_calculation'),'s',openTaxCalculation,{dataset:{action:'dividend-tax-next'}}));
    else nodes.push(reviewLink(t('workspace.records'),function(){selectWorkspace('records');},null,{dataset:{action:'dividend-records-next'}}));
    return h('div',{dataset:{dividendState:state}},nodes);
  }

  /* ---- entitlement-aware visibility (handlers + backend checks unchanged) ---- */
  // A control is shown only when the facade snapshot says the semantic action is
  // allowed. The driver still re-checks every call (fail closed); hiding is never
  // the permission boundary.
  function can(action){
    var ent=S().entitlement, acts=ent&&ent.actions;
    if(!acts||!acts[action]) return true;
    return acts[action].allowed!==false;
  }
  function retentionInfo(){ var r=S().retention; return r&&typeof r==='object'?r:null; }
  function readOnlyReason(){
    var ent=S().entitlement, acts=ent&&ent.actions, ev=acts&&acts.create_event;
    if(!ev||ev.allowed!==false) return null;
    return ev.reason||'pro_required';
  }
  // Read-only / retention notice for retained (non-Pro) company access: the state, the
  // dates that matter and the one action, with the longer explanation on demand. Dates
  // come from the canonical retention decision; nothing is inferred from the calendar.
  // Rendered at most once per screen so the same notice is not repeated down a page.
  function readOnlyNotice(){
    var reason=readOnlyReason(); if(!reason||UI.roShown) return null;
    UI.roShown=true;
    var r=retentionInfo(), dates=null;
    if(r&&r.state==='retained_read_only'&&r.retainThroughDate&&r.deleteOnDate) dates=t('plan.retained_until',{date:isoToDisplay(r.retainThroughDate),deleteOn:isoToDisplay(r.deleteOnDate)});
    else if(r&&r.state==='retention_unknown') dates=t('plan.ltd_retention_date_required');
    else if(r&&r.state==='active') dates=t('plan.retained_active');
    var body=[h('b',{text:t('plan.read_only_title')})];
    if(dates) body.push(document.createTextNode(dates+' '));
    body.push(document.createTextNode(t('plan.download_reminder')));
    var wrap=h('div',{class:'tm-readonly'},[
      h('div',{class:'tm-notice info',dataset:{readOnly:reason}},[h('span',{class:'i',text:'\u2139'}),h('div',{},body)]),
      disclosure('plan.read_only', t('todo.details'), [h('p',{class:'tm-muted',text:t('plan.read_only_body')})], {action:'open-read-only-details'})
    ]);
    return wrap;
  }

  /* ---- statutory checklist & company-year presentation (engine output only) ---- */
  function statutory(){ return S().statutory||null; }
  function checklist(){ var st=statutory(); return st&&st.checklist||null; }
  function checklistItems(){ var c=checklist(); return (c&&c.items)||[]; }
  function readiness(){ var st=statutory(); return st&&st.readiness||{figuresReady:false,statutoryObligationsComplete:false,officialSubmissionVerified:false}; }
  // Engine display rule: a safe integer is a known figure (legitimate 0 -> 0.00);
  // null/undefined/anything else is "Please check", never £0.00.
  function isKnownMinor(v){ return typeof v==='number' && isFinite(v) && Math.floor(v)===v && Math.abs(v)<=9007199254740991; }
  function figNode(minor, role){ return moneyRole(minor, role||'signed'); }
  function displayNode(d, role){
    // engine `display` objects: {status:'known',valueMinor} | {status:'needs_checking',copyKey}
    if(d&&d.status==='known'&&isKnownMinor(d.valueMinor)) return money(d.valueMinor, moneyClass(d.valueMinor, role||'signed'));
    return h('span',{class:'tm-muted tm-check-needed',text:t((d&&d.copyKey&&hasKey(d.copyKey))?d.copyKey:'statutory.needs_checking')});
  }
  function statusKey(status){ return hasKey('statutory.status.'+status)?'statutory.status.'+status:'statutory.status.needs_checking'; }
  function statusPill(status){
    var cls = status==='completed'?'ok': status==='not_applicable'?'rev': status==='outstanding'?'warn': status==='unsupported'?'rev': 'warn';
    return h('span',{class:'tm-pill '+cls+' st-'+status, dataset:{status:status}, text:t(statusKey(status))});
  }
  function deadlineText(dl){
    if(!dl||typeof dl!=='object') return t('statutory.needs_checking');
    if(dl.status==='known'&&dl.date) return isoToDisplay(dl.date);
    return t((dl.copyKey&&hasKey(dl.copyKey))?dl.copyKey:'statutory.needs_checking');
  }
  function urgencyPill(dl){
    if(!dl||dl.status!=='known'||!dl.urgency) return null;
    var key='statutory.'+dl.urgency; if(!hasKey(key)) return null;
    return h('span',{class:'tm-pill '+(dl.urgency==='overdue'?'warn':dl.urgency==='due_today'?'warn':'rev'),text:t(key)});
  }
  function deadlineRow(label, dl, basisKey){
    var kids=[h('span',{class:'k',text:label}), h('span',{class:'val'},[h('span',{class:'tm-num',text:deadlineText(dl)}), urgencyPill(dl)])];
    var row=h('div',{class:'r'},kids);
    var basis=basisKey&&hasKey(basisKey)?t(basisKey):null;
    if(basis) return h('div',{},[row, h('div',{class:'tm-fhint tm-basis',text:basis})]);
    return row;
  }
  function itemTitle(it){ var k='statutory.item.'+it.id+'.title'; return hasKey(k)?t(k):(it.title||it.id); }
  function itemBody(it){
    if(it.id==='companies_house_accounts'&&it.route&&it.route.selected==='commercial_ixbrl'&&hasKey('statutory.item.companies_house_accounts.body_software')) return t('statutory.item.companies_house_accounts.body_software');
    var k='statutory.item.'+it.id+'.body'; return hasKey(k)?t(k):(it.plainEnglish||'');
  }
  function itemBasisKey(it){ var k='statutory.item.'+it.id+'.basis'; return hasKey(k)?k:null; }
  function triggerText(code, it){
    if(code==='statutory_guidance_review_expired') return t('statutory.guidance_expired');
    var m=/^(.*)_(completed|outstanding|not_applicable|unsupported|needs_checking)$/.exec(code||'');
    if(m&&it&&m[1]===it.id) return t('statutory.trigger_status',{status:t(statusKey(m[2]))});
    return t('statutory.trigger_other',{code:code});
  }
  function linkList(links){
    var wrap=h('div',{class:'tm-links'});
    (links||[]).forEach(function(l){ if(!l||!l.url) return; var k='statutory.link.'+String(l.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
      wrap.append(h('a',{class:'tm-linkbtn tm-extlink',href:l.url,target:'_blank',rel:'noopener noreferrer',text:(hasKey(k)?t(k):(l.title||l.url))+' ↗'})); });
    return wrap;
  }
  function sourceList(it){
    var recs=it.sourceRecords||[]; if(!recs.length) return null;
    return h('ul',{class:'tm-sources'}, recs.map(function(r){ return h('li',{class:'tm-num',text:(r.recordId||'')+(r.revision?':'+r.revision:'')+' · '+(r.field||'')}); }));
  }
  function itemExtras(it){
    var out=[];
    if(it.roleDeadlines&&it.roleDeadlines.length){
      out.push(h('div',{class:'tm-h sm',text:t('statutory.roles')}));
      out.push(h('div',{class:'tm-summ'}, it.roleDeadlines.map(function(r){ return deadlineRow(t('statutory.role.'+r.role)+' · '+t(statusKey(r.status)), r.deadline, 'statutory.role.'+r.role+'.basis'); })));
    }
    if(it.periods&&it.periods.length){
      out.push(h('div',{class:'tm-h sm',text:t('statutory.ct_periods')}));
      it.periods.forEach(function(p,i){
        out.push(h('div',{class:'tm-summ'},[
          h('div',{class:'r'},[h('span',{class:'k',text:t('s2.ct_period',{number:i+1})}), h('span',{class:'val'},[statusPill(p.status)])]),
          deadlineRow(t('statutory.ct600.filing'), p.deadline, 'statutory.ct600.filing_basis'),
          h('div',{class:'r'},[h('span',{class:'k',text:t('statutory.ct600.payment')}), h('span',{class:'val'},[statusPill(p.payment&&p.payment.status)])]),
          deadlineRow(t('statutory.ct600.payment_deadline'), p.payment&&p.payment.deadline, 'statutory.ct600.payment_basis')
        ]));
      });
    }
    if(it.automaticReview){
      var v=it.automaticReview;
      var rows=[
        [t('statutory.vat.window'), h('span',{class:'tm-num',text:isoToDisplay(v.startDate)+' – '+isoToDisplay(v.endDate)})],
        [t('statutory.vat.known'), figNode(v.knownTaxableTurnoverMinor)],
        [t('statutory.vat.threshold'), money(v.thresholdMinor)],
        [t('statutory.vat.early'), money(v.earlyWarningThresholdMinor)],
        [t('statutory.vat.next30'), figNode(v.next30DaysMinor)],
        [t('statutory.vat.review'), h('span',{text:v.complete?t('statutory.vat.complete'):t('statutory.vat.incomplete')})]
      ];
      out.push(h('div',{class:'tm-h sm',text:t('statutory.vat.title')}));
      out.push(summRows(rows));
      if(v.unknownSaleIds&&v.unknownSaleIds.length) out.push(notice('warn',null,t('statutory.vat.unknown_sales',{count:v.unknownSaleIds.length})));
      if(v.earlyWarning&&!v.exceeded) out.push(notice('warn',null,t('statutory.vat.early_warning')));
      (v.crossings||[]).forEach(function(c){
        var txt = c.kind==='rolling_12_months'? t('statutory.vat.crossing',{date:isoToDisplay(c.monthEnd),due:isoToDisplay(c.dueDate)}) : t('statutory.vat.future',{date:isoToDisplay(c.knownOn),due:isoToDisplay(c.dueDate)});
        out.push(notice(c.resolved?'ok':'warn', c.resolved?t('statutory.vat.resolved'):null, txt));
      });
    }
    if(it.unknownFieldIds&&it.unknownFieldIds.length){
      out.push(notice('warn',null,t('statutory.figures.unknown',{count:it.unknownFieldIds.length})));
      out.push(h('ul',{class:'tm-sources'}, it.unknownFieldIds.map(function(id){ var k='pack.line.'+id; return h('li',{text:hasKey(k)?t(k):id}); })));
    }
    if(it.eligibilityGuidance){ out.push(notice('neutral',null,t('statutory.item.companies_house_accounts.eligibility'))); if(it.eligibilityGuidance.url) out.push(linkList([{title:'micro-entity',url:it.eligibilityGuidance.url}])); }
    if(it.route&&it.route.softwareOnlyFrom) out.push(h('div',{class:'tm-fhint',text:t('statutory.item.companies_house_accounts.software_from',{date:isoToDisplay(it.route.softwareOnlyFrom)})}));
    if(it.completionMeaning) out.push(h('div',{class:'tm-fhint',text:t('statutory.item.record_retention.completion')}));
    if(it.blankTemplates){
      out.push(h('div',{class:'tm-h sm',text:t('statutory.dividend.templates')}));
      out.push(notice('neutral',t('statutory.dividend.draft_for_review'),t('statutory.dividend.templates_note')));
      out.push(h('div',{class:'tm-fhint',text:t('statutory.dividend.minutes_fields')}));
      out.push(h('ul',{class:'tm-sources'}, (it.blankTemplates.minutes||[]).map(function(f,i){ var k='statutory.dividend.minutes_field_'+(i+1); return h('li',{text:hasKey(k)?t(k):f}); })));
      out.push(h('div',{class:'tm-fhint',text:t('statutory.dividend.voucher_fields')}));
      out.push(h('ul',{class:'tm-sources'}, (it.blankTemplates.voucher||[]).map(function(f,i){ var k='statutory.dividend.voucher_field_'+(i+1); return h('li',{text:hasKey(k)?t(k):f}); })));
    }
    if(it.templates&&it.templates.length){
      it.templates.forEach(function(tp){
        var kids=[h('div',{class:'r'},[h('span',{class:'k',text:t('dividend.declaration_date')}), h('span',{class:'val'},[h('span',{class:'tm-num',text:isoToDisplay(tp.minutes&&tp.minutes.date)})])]),
          h('div',{class:'r'},[h('span',{class:'k',text:t('dividend.total')}), h('span',{class:'val'},[displayNode(tp.minutes&&tp.minutes.totalDividend)])]),
          h('div',{class:'r'},[h('span',{class:'k',text:t('statutory.dividend.minutes_ref')}), h('span',{class:'val'},[h('span',{text:(tp.minutes&&tp.minutes.existingArtifactRef)||t('detail.none')})])])];
        (tp.vouchers||[]).forEach(function(vc,i){ kids.push(h('div',{class:'r'},[h('span',{class:'k',text:t('statutory.dividend.voucher_n',{n:i+1})+' · '+(vc.shareholderId||'')}), h('span',{class:'val'},[displayNode(vc.dividend)])])); });
        out.push(h('div',{class:'tm-summ'},[h('div',{class:'r'},[h('span',{class:'k',text:t('statutory.dividend.declaration')}), h('span',{class:'val'},[h('span',{class:'tm-pill warn',text:t('statutory.dividend.draft_for_review')})])])].concat(kids)));
      });
    }
    return out;
  }
  function checklistItemCard(it, idx){
    var key='stat:'+it.id; var open=!!UI.disc[key];
    var head=h('button',{class:'tm-rec tm-statitem',type:'button','aria-expanded':open?'true':'false',dataset:{statutoryItem:it.id,status:it.status},onClick:function(){ UI.disc[key]=!open; paint(); }},[
      h('div',{},[h('div',{class:'rl',text:(idx+1)+'. '+itemTitle(it)}), h('div',{class:'rs'},[h('span',{text:t('statutory.deadline')+': '}), h('span',{class:'tm-num',text:deadlineText(it.deadline)}), urgencyPill(it.deadline)]), statusPill(it.status)]),
      h('div',{class:'rv',text:open?'–':'+'})
    ]);
    var card=h('div',{class:'tm-statcard'+(open?' open':'')},[head]);
    if(open){
      var body=[h('p',{class:'tm-muted',text:itemBody(it)})];
      body.push(h('div',{class:'tm-summ'},[deadlineRow(t('statutory.deadline'), it.deadline, itemBasisKey(it))]));
      body=body.concat(itemExtras(it));
      body.push(h('div',{class:'tm-h sm',text:t('statutory.why')}));
      body.push(h('ul',{class:'tm-sources'}, (it.triggerReasons||[]).map(function(c){ return h('li',{text:triggerText(c,it)}); })));
      if(it.officialLinks&&it.officialLinks.length){ body.push(h('div',{class:'tm-h sm',text:t('statutory.official_links')})); body.push(linkList(it.officialLinks)); }
      var src=sourceList(it); if(src){ body.push(disclosure('statsrc:'+it.id, t('statutory.sources')+' ('+(it.sourceRecords||[]).length+')', [src])); }
      card.append(h('div',{class:'dc'},body));
    }
    return card;
  }
  // Full checklist block (12 engine items). Shown inside a collapsed disclosure so the
  // main layer stays short; every status, deadline and reason still comes from the engine.
  function statutorySection(opts){
    opts=opts||{};
    var st=statutory(), c=checklist(), nodes=[];
    if(!opts.noTitle) nodes.push(h('div',{class:'tm-h',text:t('statutory.title')}));
    if(!st){ nodes.push(notice('neutral',null,t('statutory.unavailable'))); return nodes; }
    if(!c||st.status==='needs_checking'){ nodes.push(notice('warn',t('statutory.needs_checking'),t('statutory.summary_checking'))); return nodes; }
    var items=c.items||[];
    var counts={}; items.forEach(function(it){ counts[it.status]=(counts[it.status]||0)+1; });
    nodes.push(h('div',{class:'tm-statcounts'}, ['outstanding','needs_checking','unsupported','completed','not_applicable'].filter(function(s){return counts[s];}).map(function(s){ return h('span',{class:'tm-statcount'},[statusPill(s), h('span',{class:'tm-num',text:String(counts[s])})]); })));
    // One line of necessary context: where statuses come from + the review position.
    var rev=c.reviewStatus==='current'? t('statutory.review_recorded',{revision:c.reviewRevision}) : c.reviewStatus==='stale_or_invalid'? t('statutory.review_stale') : t('statutory.review_none');
    nodes.push(h('div',{class:'tm-fhint',text:t('statutory.checklist_hint')+' '+rev}));
    if(c.reviewStatus==='stale_or_invalid') nodes.push(notice('warn',null,t('statutory.review_stale')));
    if(items.some(function(it){ return (it.triggerReasons||[]).indexOf('statutory_guidance_review_expired')>=0; })) nodes.push(notice('warn',null,t('statutory.guidance_expired')));
    var list=h('div',{class:'tm-recs tm-statlist',dataset:{statutoryCount:String(items.length)}});
    items.forEach(function(it,i){ list.append(checklistItemCard(it,i)); });
    nodes.push(list);
    nodes.push(h('div',{class:'tm-fhint',text:t('statutory.ruleset',{verified:isoToDisplay(c.verifiedAt),review:isoToDisplay(c.reviewBy)})}));
    return nodes;
  }
  // Collapsed checklist entry point used by the Tax area and the year screens.
  function statutoryDisclosure(opts){
    return disclosure('tax.statutory', t('statutory.title'), statutorySection({noTitle:true,hideActions:opts&&opts.hideActions}), {action:'open-checklist'});
  }
  /* ---- To-do: engine reason codes merged into a few actionable items (UI-06) ---- */
  var DIRECTOR_CHECK_CODES={micro_entity_eligibility_confirmation_required:'microEntityEligibilityConfirmed',unsupported_balance_sheet_items_confirmation_required:'noUnsupportedBalancesConfirmed',comparative_accounts_figures_check_required:'comparativeFiguresChecked',director_accounts_approval_required:'directorApprovalConfirmed'};
  var BANK_UNMATCHED_CODES={bank_statement_lines_not_matched:1,company_bank_entries_not_matched:1,bank_match_needs_checking:1};
  var BANK_BALANCE_CODES={bank_statement_total_does_not_match:1,bank_closing_balance_does_not_match_books:1};
  var TAX_REVIEW_LABELS={uk_company_residence_confirmation_required:'ct_review.uk_resident_q',ring_fence_profit_review_required:'ct_review.ring_fence_q',close_investment_holding_company_review_required:'ct_review.investment_holding_q',associated_company_review_required:'ct_review.associated_none_q',qualifying_distribution_review_required:'ct_review.qualifying_distributions_q',company_accounts_completeness_confirmation_required:'ct_review.records_q',company_trade_continuity_review_required:'ct_review.same_trade_q',corporation_tax_records_review_required:'ct_review.records_q',corporation_tax_periods_review_required:'ct_review.periods_q',corporation_tax_losses_review_required:'ct_review.losses_q'};
  function todoItems(opts){
    opts=opts||{};
    var codes=(opts.codes||[]).filter(function(c,i,a){ return a.indexOf(c)===i; });
    var items=[], other=[], fig=yearFigures();
    var director=0, directorFacts=[], bankUnmatched=false, bankBalance=false;
    codes.forEach(function(c){
      if(DIRECTOR_CHECK_CODES[c]) { director++; directorFacts.push(DIRECTOR_CHECK_CODES[c]); }
      else if(TAX_REVIEW_LABELS[c])items.push({id:'tax-fact:'+c,text:t('todo.check_detail',{detail:t(TAX_REVIEW_LABELS[c])}),action:'ct'});
      else if(/^statutory_/.test(c)){var item=checklistItems().filter(function(it){return 'statutory_'+it.id===c;})[0];if(item)items.push({id:'statutory:'+item.id,text:itemTitle(item),action:'checklist',itemId:item.id});else other.push(c);}
      else if(c==='year_end_bank_statement_not_reconciled') items.push({id:'bank',text:t('todo.bank_not_reconciled'),action:'bank'});
      else if(c==='year_end_bank_statement_out_of_date') items.push({id:'bank_out',text:t('todo.bank_out_of_date'),action:'bank'});
      else if(BANK_UNMATCHED_CODES[c]) bankUnmatched=true;
      else if(BANK_BALANCE_CODES[c]) bankBalance=true;
      else if(c==='company_year_not_finished') { /* Date status, not actionable work. Shown beside the company year. */ }
      else if(c==='company_records_still_need_checking') items.push({id:'drafts',text:t('todo.drafts'),action:'money'});
      else if(c==='company_event_tax_treatment_unassessed')items.push({id:'tax-treatment',text:t('todo.tax_treatment'),action:'money'});
      else if(c==='corporation_tax_calculation_not_ready'||c==='corporation_tax_calculation_out_of_date'||c==='company_tax_estimate_refresh_required') items.push({id:'ct',text:taxDisplayState()==='not_calculated'?t('tax.calculate'):taxDisplayLabel(),action:'ct'});
      else if(c==='retention_history_incomplete') items.push({id:'history',text:t('todo.history_gap'),action:null});
      else other.push(c);
    });
    if(bankUnmatched||bankBalance){ var rec=opts.bank||latestReconciliation(); var n=rec?((rec.unmatchedStatementLineIds||[]).length+(rec.unmatchedBookEventIds||[]).length):0; items.push({id:'bank_match',text:bankUnmatched&&n?t('todo.bank_unmatched',{count:n}):bankUnmatched?t('todo.bank_not_reconciled'):t('todo.bank_balance'),action:'match'}); }
    if(director) items.push({id:'director',text:t('todo.director_checks',{count:director}),action:'checks',factKeys:directorFacts});
    other.forEach(function(code){items.push({id:'reason:'+code,text:reasonText(code),action:'details',codes:[code]});});
    // Distinct engine reasons can describe the same user action (for example
    // an unavailable and an out-of-date CT estimate). Show that work once.
    return items.filter(function(item,index,all){var key=item.action==='bank'?'bank':item.id;return all.findIndex(function(other){return (other.action==='bank'?'bank':other.id)===key;})===index;});
  }
  function todoAction(item,asRow){
    var label=null, fn=null;
    switch(item.action){
      case 'bank': if(can('create_event')){ label=t('todo.go_match'); fn=function(){ openSheet('bank'); }; } break;
      case 'match': if(can('create_event')){ label=t('todo.go_match'); fn=function(){ var rec=latestReconciliation(); if(rec&&rec.status!=='voided') openSheet('bankMatch',{recordId:rec.id}); else openSheet('bank'); }; } break;
      case 'checks': if(can('edit_company')){ label=t('todo.record_checks'); fn=function(){ openSheet('statutory',{factKeys:item.factKeys}); }; } break;
      case 'checklist': label=t('todo.view_checklist'); fn=function(){ UI.disc['tax.statutory']=true;if(item.itemId)UI.disc['stat:'+item.itemId]=true; if(routeId()==='ltd.workspace.tax'||routeId()==='ltd.tax.company-year'||routeId()==='ltd.tax.self-filing-pack') paint(); else run('onSetWorkspaceArea',{area:'tax'},{}); }; break;
      case 'money': label=t('todo.view'); fn=function(){ run('onSetWorkspaceArea',{area:'money'},{}); }; break;
      case 'ct': label=t('tax.review_calculation'); fn=openTaxCalculation; break;
      case 'details': label=t('todo.details'); fn=function(){run('onPrepareCompanyYear',{},{scope:'ltd.tax.company-year',onReview:paint,onOk:paint});}; break;
    }
    if(asRow)return fn?reviewLink(item.text,fn,null,{dataset:{todo:item.id,todoAction:item.id}}):h('div',{class:'tm-rec',dataset:{todo:item.id},text:item.text});
    return label?btn(label,'g sm',fn,{dataset:{todoAction:item.id}}):null;
  }
  function todoList(items){
    var list=h('div',{class:'tm-todo-list tm-review-links',dataset:{todoCount:String(items.length)}});
    items.forEach(function(it){
      list.append(todoAction(it,true));
    });
    return list;
  }
  // What the engine says about the company year right now: figure reasons + statutory blockers.
  function yearTodoCodes(){
    var codes=currentFigureReasons();
    var c=checklist(); if(c) codes=codes.concat((c.blockingItemIds||[]).map(function(id){ return 'statutory_'+id; }));
    return codes;
  }
  function todoBlock(opts){
    opts=opts||{}; var items=todoItems({codes:opts.codes||yearTodoCodes()}).filter(function(it){return it.id!=='statutory';});
    var nodes=[];
    if(opts.title!==false) nodes.push(h('div',{class:'tm-h sm',text:t('todo.title')}));
    if(!items.length){ nodes.push(h('div',{class:'tm-fhint',dataset:{todoCount:'0'},text:t('todo.none')})); return nodes; }
    // One shared work list; never add a second aggregate count above fact counts.
    nodes.push(todoList(items));
    return nodes;
  }

  function reviewLink(label,fn,sub,attrs){
    return h('button',Object.assign({class:'tm-rec',type:'button',onClick:fn},attrs||{}),[
      h('div',{},[h('div',{class:'rl',text:label}),sub?h('div',{class:'rs',text:sub}):null]),
      h('div',{class:'rv',text:isRTL()?'‹':'›'})]);
  }
  function bankEntry(){
    var rec=latestReconciliation();
    if(!can('create_event'))openSheet('bankRead');
    else if(rec&&rec.status!=='voided') openSheet('bankMatch',{recordId:rec.id});
    else if(can('create_event')) openSheet('bank');
  }
  function areaOverview(){
    var ap=metric('accountingProfit'),ct=metric('corporationTax'),rev=metric('revenue'),cost=metric('allowableRunningExpenses');
    var ready=ct.status==='supported_estimate';
    var summary=h('div',{class:'tm-review-summary'},[
      h('button',{class:'tm-metric tm-review-tax',type:'button',dataset:{metric:'corporationTax',role:'out',taxState:taxDisplayState()},onClick:function(){if(ready)run('onOpenMetric',{metricId:'corporationTax'},{});else openTaxCalculation();}},[
        h('div',{class:'l',text:t('tax.ct_estimate')}),
        h('div',{class:'v'},[ready?moneyRole(ct.amountMinor,'out'):h('span',{text:taxDisplayLabel()})]),!ready?h('div',{class:'st',text:t(taxDisplayState()==='not_calculated'?'tax.calculate':'tax.review_calculation')}):null]),
      metricCell('accountingProfit',t('tax.accounting_profit_loss'),ap.amountMinor,'signed'),
      metricCell('revenue',t('overview.money_in'),rev.amountMinor,'in'),
      metricCell('allowableRunningExpenses',t('overview.company_costs'),cost.amountMinor,'out')
    ]);
    var nodes=[summary],ro=readOnlyNotice();if(ro)nodes.push(ro);
    if(can('create_event')) nodes.push(h('div',{class:'tm-pair'},[
      btn(t('money.add_income'),'p',function(){openSheet('income');}),
      btn(t('money.add_expense'),'s',function(){openSheet('expense');})]));
    var items=todoItems({codes:yearTodoCodes()});
    if(items.length){nodes.push(h('div',{class:'tm-h sm',text:t('todo.title')}));nodes.push(todoList(items.slice(0,3)));if(items.length>3)nodes.push(reviewLink(t('todo.more',{count:items.length-3}),function(){selectWorkspace('tax');},null,{dataset:{action:'open-remaining-todo'}}));}
    nodes.push(h('div',{class:'tm-review-links'},[
      reviewLink(t('review01.year'),function(){selectWorkspace('tax');},null,{dataset:{action:'open-todo'}}),
      reviewLink(t('bank.title'),bankEntry,null,{dataset:{action:'open-bank'}}),
      reviewLink(t('review01.pay'),function(){selectWorkspace('pay');})
    ]));
    nodes.push(disclosure('overview.more',t('year.view_details'),[
      metricCell('companyCash',t('overview.company_cash'),metric('companyCash').amountMinor,'signed'),
      metricCell('directorLoan',t('term.company_owes_you'),metric('directorLoan').amountMinor,'signed')
    ],{action:'open-overview-details'}));
    return workspaceShell('overview',nodes);
  }
  function metricCell(id,label,amt,role){
    var m=metric(id),taxUnavailable=id==='corporationTax'&&taxDisplayState()!=='calculated';
    var statusTxt='';
    if(id==='corporationTax'){ statusTxt = m.status==='supported_estimate'?t('tax.state.calculated'):taxDisplayLabel(); }
    return h('button',{class:'tm-metric',type:'button',dataset:{metric:id,role:role},onClick:function(){if(taxUnavailable)openTaxCalculation();else run('onOpenMetric',{metricId:id},{});}},[
      h('div',{class:'l',text:label}),
      h('div',{class:'v '+moneyClass(amt,role)},[taxUnavailable?h('span',{text:taxDisplayLabel()}):money(amt, moneyClass(amt,role))]),
      statusTxt? h('div',{class:'st',text:statusTxt}):null
    ]);
  }

  function areaMoney(){
    var events=(S().workspace&&S().workspace.events)||[];
    var nodes=[h('div',{class:'tm-review-summary'},[
      metricCell('revenue',t('overview.money_in'),metric('revenue').amountMinor,'in'),
      metricCell('allowableRunningExpenses',t('overview.company_costs'),metric('allowableRunningExpenses').amountMinor,'out'),
      metricCell('accountingProfit',t('tax.accounting_profit_loss'),metric('accountingProfit').amountMinor,'signed')
    ]),h('div',{class:'tm-h',text:t('money.recent')})];
    if(!events.length)nodes.push(h('div',{class:'tm-empty'},[h('div',{class:'e',text:t('design.no_records_yet')}),t('design.no_records_body')]));
    else{var recs=h('div',{class:'tm-recs tm-review-links'});events.forEach(function(ev){recs.append(eventRow(ev));});nodes.push(recs);}
    if(can('create_event')) nodes.push(h('div',{class:'tm-pair'},[
      btn(t('money.add_income'),'p',function(){openSheet('income');}),
      btn(t('money.add_expense'),'s',function(){openSheet('expense');})]));
    else{var ro=readOnlyNotice();if(ro)nodes.push(ro);}
    nodes.push(h('div',{class:'tm-review-links'},[reviewLink(t('bank.title'),bankEntry)]));
    return workspaceShell('money',nodes);
  }
  function moneyMoveRow(label, infoId, onClick){
    return h('div',{class:'tm-rec', onClick:onClick},[
      h('div',{},[h('span',{class:'rl',text:label}), infoTrigger(infoId)]),
      h('div',{class:'rv',text:isRTL()?'\u2039':'\u203A'})
    ]);
  }
  // Money direction of a company transaction for display (never changes the stored value).
  var MONEY_IN_TYPES={company_income:1,director_loan_funding:1,share_capital_funding:1,sales_invoice_payment:1};
  function eventRole(src){
    src=src||{}; var type=src.companyTransactionType||'';
    if(MONEY_IN_TYPES[type]) return 'in';
    if(type) return 'out';
    return src.kind==='expense'?'out':'in';
  }
  // Human label for a transaction: the user's own purpose text, else the approved type name
  // (never the raw kind / type enum).
  function eventTitle(src){
    src=src||{}; if(src.purpose) return src.purpose;
    var tk='bank.type.'+(src.companyTransactionType||''); if(hasKey(tk)) return t(tk);
    return src.kind==='expense'?t('design.kind_expense'):t('design.kind_income');
  }
  function eventAmountNode(src){
    src=src||{}; var role=eventRole(src), amt=Number.isSafeInteger(src.amountMinor)?src.amountMinor:null, shown=amt==null?null:role==='out'?-Math.abs(amt):Math.abs(amt);
    return money(shown,moneyClass(shown,role));
  }
  function eventRow(ev){
    var src=ev.sourceTransaction||{}; var st=ev.status;
    var pill = st==='committed'?['ok',t('design.posted')]: st==='reversed'?['rev',t('design.reversed')]:['warn',t('design.draft')];
    return h('button',{class:'tm-rec',type:'button',dataset:{eventRole:eventRole(src)},onClick:function(){ run('onOpenRecord',{eventId:ev.id},{}); }},[
      h('div',{},[h('div',{class:'rl',text:eventTitle(src)}),
        h('div',{class:'rs',text:isoToDisplay(src.date)}),
        h('span',{class:'tm-pill '+pill[0],text:pill[1]})]),
      h('div',{class:'rv'},[eventAmountNode(src)])
    ]);
  }

  function areaPay(){
    var ap=metric('accountingProfit'),pot=metric('potentialDividend'),nodes=[],actions=[];
    if(can('create_scenario')&&(ap.amountMinor>0||pot.amountMinor>0))actions.push(btn(t('tax.compare'),'p',function(){openSheet('scenario');}));
    if(can('confirm_salary'))actions.push(btn(t('tax.record_salary'),'s',function(){openSheet('salary');}));
    if(dividendAvailable()&&can('declare_dividend'))actions.push(btn(t('tax.record_declaration'),'s',function(){openSheet('dividend');}));
    if(actions.length)nodes.push(h('div',{class:'tm-record-actions col'},actions));
    var dividendStateNotice=dividendNotice();if(dividendStateNotice)nodes.push(dividendStateNotice);
    nodes.push(disclosure('tax.records',t('records.salary_dividend'),salaryDividendRecordsBody(),{action:'open-salary-dividends'}));
    nodes.push(h('div',{class:'tm-review-links'},[
      reviewLink(t('term.company_owes_you'),function(){run('onOpenMetric',{metricId:'directorLoan'},{});})
    ]));
    if(can('create_event'))nodes.push(h('div',{class:'tm-review-links'},[
      reviewLink(t('money.lend'),function(){openSheet('lend');}),
      reviewLink(t('money.repay'),function(){openSheet('repay');})
    ]));
    var ro=readOnlyNotice();if(ro)nodes.push(ro);
    return workspaceShell('pay',nodes);
  }
  function areaTax(){
    var nodes=[],items=todoItems({codes:yearTodoCodes()});
    if(can('generate_working_pack'))nodes.push(h('div',{class:'tm-review-summary'},[
      h('div',{class:'tm-wstitle',text:t('pack.title')}),
      h('div',{class:'tm-fhint',text:items.length?t('year.statutory_not_complete'):t('todo.none')}),
      btn(t('pack.download'),'p',function(){run('onDownloadSelfFilingPack',{},{scope:'ltd.tax.self-filing-pack',onReview:paint,onOk:paint});},{dataset:{action:'download-self-filing-pack'}})
    ]));
    else{var ro=readOnlyNotice();if(ro)nodes.push(ro);}
    nodes.push(h('div',{class:'tm-review-links'},[
      reviewLink(t('year.title'),function(){run('onPrepareCompanyYear',{},{scope:'ltd.tax.company-year',onReview:paint,onOk:paint});},null,{dataset:{action:'prepare-company-year'}}),
      reviewLink(t('workspace.records'),function(){selectWorkspace('records');},null,{dataset:{action:'open-records'}})
    ]));
    nodes=nodes.concat(todoBlock({}));
    nodes.push(statutoryDisclosure());
    if(can('edit_company'))nodes.push(disclosure('tax.confirmations',t('statutory.record_checks'),[
      btn(t('statutory.record_checks'),'s',function(){openSheet('statutory');},{dataset:{action:'statutory-record-checks'}})
    ],{action:'open-all-confirmations'}));
    if(can('create_period'))nodes.push(disclosure('tax.calculation',t('tax.company_tax'),[
      btn(t('tax.review_ct'),'s',function(){openSheet('ct');}),
      metricCell('corporationTax',t('tax.ct_estimate'),metric('corporationTax').amountMinor,'out'),
      metricCell('carriedForwardLoss',t('tax.loss_carried'),metric('carriedForwardLoss').amountMinor,'out')
    ]));
    return workspaceShell('tax',nodes);
  }
  function dividendAvailable(){
    var pd=metric('potentialDividend');
    return pd && pd.amountMinor!=null && pd.amountMinor>0 && (!pd.status || String(pd.status).indexOf('review')<0);
  }

  /* ---- company year-end (figures + readiness + statutory), Tax area ------ */
  function yearFigures(){ var w=S().workspace; return (w&&w.companyYearFigures)||null; }
  function readinessRows(){
    var r=readiness();
    return h('div',{class:'tm-summ tm-readiness'},[
      h('div',{class:'r'},[h('span',{class:'k',text:t('year.figures_status')}), h('span',{class:'val'},[h('span',{class:'tm-pill '+(r.figuresReady?'ok':'warn'),dataset:{readiness:'figures',value:String(!!r.figuresReady)},text:r.figuresReady?t('year.figures_ready'):t('year.figures_not_ready')})])]),
      h('div',{class:'r'},[h('span',{class:'k',text:t('year.statutory_status')}), h('span',{class:'val'},[h('span',{class:'tm-pill '+(r.statutoryObligationsComplete?'ok':'warn'),dataset:{readiness:'statutory',value:String(!!r.statutoryObligationsComplete)},text:r.statutoryObligationsComplete?t('year.statutory_complete'):t('year.statutory_not_complete')})])]),
      h('div',{class:'r'},[h('span',{class:'k',text:t('year.official_status')}), h('span',{class:'val'},[h('span',{class:'tm-pill rev',dataset:{readiness:'official',value:'false'},text:t('year.official_not_verified')})])])
    ]);
  }
  function figuresPill(fig){
    var r=readiness();
    if(fig&&fig.status) return h('span',{class:'tm-pill '+(fig.status==='ready_for_director_check'?'ok':'warn'),dataset:{figuresStatus:fig.status},text:t(hasKey('year.status.'+fig.status)?'year.status.'+fig.status:'year.status.needs_attention')});
    return h('span',{class:'tm-pill '+(r.figuresReady?'ok':'warn'),dataset:{readiness:'figures',value:String(!!r.figuresReady)},text:r.figuresReady?t('year.figures_ready'):t('year.figures_not_ready')});
  }
  function yearActions(opts){
    opts=opts||{}; var actions=[];
    if(can('generate_working_pack')){
      if(!opts.noPrepare) actions.push(btn(t('year.prepare'),'p',function(){ run('onPrepareCompanyYear',{},{scope:'ltd.tax.company-year',onReview:function(){ paint(); },onOk:function(){ paint(); }}); },{dataset:{action:'prepare-company-year'}}));
      actions.push(btn(t('year.download_pack'),opts.noPrepare?'p':'s',function(){ run('onDownloadSelfFilingPack',{},{scope:'ltd.tax.self-filing-pack',onReview:function(){ paint(); },onOk:function(){ paint(); }}); },{dataset:{action:'download-self-filing-pack'}}));
    }
    return actions;
  }
  // Tax area: the year in three lines — figures status, what still needs doing, the actions.
  // Full checklist and readiness detail stay one tap away in the collapsed disclosure.
  function yearEndSection(){
    var nodes=[h('div',{class:'tm-h',text:t('year.section_title')})];
    var fig=yearFigures(), err=S().workspace&&S().workspace.companyYearError;
    if(fig) nodes.push(h('div',{class:'tm-fhint',text:t('year.period',{start:isoToDisplay(fig.startDate),end:isoToDisplay(fig.endDate)})}));
    if(err) nodes.push(notice('warn',t('common.review_required'),t('year.figures_error')));
    nodes.push(h('div',{class:'tm-summ tm-readiness'},[h('div',{class:'r'},[h('span',{class:'k',text:t('year.figures_status')}), h('span',{class:'val'},[figuresPill(fig)])])]));
    nodes=nodes.concat(todoBlock({compact:true,key:'tax.todo'}));
    var actions=yearActions();
    if(actions.length) nodes.push(h('div',{class:'tm-record-actions col'},actions));
    else { var ro=readOnlyNotice(); if(ro) nodes.push(ro); }
    nodes.push(statutoryDisclosure());
    return nodes;
  }
  // Localised reason text for pack/figures reason codes; unknown codes keep the
  // stable code visible so nothing is silently swallowed.
  function reasonText(code){
    if(/^statutory_/.test(code)){ var id=code.slice(10); var it=checklistItems().filter(function(x){return x.id===id;})[0]; return t('year.reason.statutory_item',{title:it?itemTitle(it):id}); }
    var k='year.reason.'+code; if(hasKey(k)) return t(k);
    k='bank.reason.'+code; if(hasKey(k)) return t(k);
    return t('common.review_required'); // Stable code stays in data-reason diagnostics, never as product copy.
  }
  function reasonList(codes){
    var list=(codes||[]).filter(function(c,i,a){ return a.indexOf(c)===i; });
    if(!list.length) return null;
    return h('ul',{class:'tm-reasons'}, list.map(function(c){ return h('li',{dataset:{reason:c}},[document.createTextNode(reasonText(c))]); }));
  }
  // [field, copy key, money role] — role: in / out / signed (see moneyRole)
  var PL_ROWS=[['turnoverMinor','year.pl.turnover','in'],['operatingCostsMinor','year.pl.operating_costs','out'],['directorSalaryMinor','year.pl.director_salary','out'],['employerNiMinor','year.pl.employer_ni','out'],['depreciationMinor','year.pl.depreciation','out'],['profitBeforeTaxMinor','year.pl.profit_before_tax','signed'],['corporationTaxMinor','year.pl.corporation_tax','out'],['profitAfterTaxMinor','year.pl.profit_after_tax','signed']];
  var BS_ROWS=[['companyBankMinor','year.bs.company_bank','signed'],['customersOweCompanyMinor','year.bs.customers_owe','signed'],['fixedAssetsCostMinor','year.bs.fixed_assets_cost','signed'],['accumulatedDepreciationMinor','year.bs.accumulated_depreciation','out'],['fixedAssetsNetMinor','year.bs.fixed_assets_net','signed'],['currentAssetsMinor','year.bs.current_assets','signed'],['supplierBillsDueMinor','year.bs.supplier_bills_due','out'],['payeAndNiDueMinor','year.bs.paye_ni_due','out'],['dividendsDueMinor','year.bs.dividends_due','out'],['directorLoanDueMinor','year.bs.director_loan_due','out'],['corporationTaxDueMinor','year.bs.corporation_tax_due','out'],['currentLiabilitiesMinor','year.bs.current_liabilities','out'],['netAssetsMinor','year.bs.net_assets','signed'],['shareCapitalMinor','year.bs.share_capital','neutral'],['profitAndLossReserveMinor','year.bs.pl_reserve','signed'],['shareholdersFundsMinor','year.bs.shareholders_funds','signed']];
  var KEY_ROWS=[['turnoverMinor','year.pl.turnover','in'],['operatingCostsMinor','year.pl.operating_costs','out'],['profitBeforeTaxMinor','year.pl.profit_before_tax','signed'],['corporationTaxMinor','year.pl.corporation_tax','out']];
  function figRows(fig, rows, section){ return summRows(rows.map(function(r){ return [t(r[1]), figNode(fig[section]&&fig[section][r[0]], r[2])]; })); }
  // Key figures (income, costs, profit/loss) on the main layer; everything else on demand.
  function figuresTable(fig){
    var out=[];
    if(!fig){ out.push(notice('warn',t('statutory.needs_checking'),t('year.figures_missing'))); return out; }
    if(fig.historyIncomplete) out.push(notice('warn',t('year.history_gap_title'),t('year.history_gap_body')));
    out.push(h('div',{class:'tm-keyfigures'},[figRows(fig,KEY_ROWS,'profitAndLoss')]));
    var rc=fig.recordCounts||{};
    out.push(disclosure('year.details', t('year.view_details'), [
      h('div',{class:'tm-h sm',text:t('year.readiness')}), readinessRows(),
      h('div',{class:'tm-fhint',text:t('year.ready_not_complete')}),
      h('div',{class:'tm-h sm',text:t('year.pl')}), figRows(fig,PL_ROWS,'profitAndLoss'),
      h('div',{class:'tm-h sm',text:t('year.bs')}), figRows(fig,BS_ROWS,'balanceSheet'),
      h('div',{class:'tm-fhint',text:t('year.record_counts',{invoices:rc.salesInvoices||0,bills:rc.supplierBills||0,assets:rc.fixedAssets||0,bank:rc.bankReconciliations||0})}),
      h('p',{class:'tm-fhint',text:t('year.figures_note')})
    ], {action:'open-year-details'}));
    return out;
  }
  function lastPrepareReasons(){
    var lr=S().lastResult||{};
    if(lr.data&&(lr.data.figures||lr.data.payload)&&lr.reviewReasons) return lr.reviewReasons;
    return null;
  }
  function screenCompanyYear(){
    var fig=yearFigures(); var lr=S().lastResult||{};
    // The route is entered through onPrepareCompanyYear; figures come from the
    // canonical snapshot (same engine output), so a re-emit never blanks the page.
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('year.title'))];
    var head=[];
    head.push(figuresPill(fig));
    nodes.push(h('div',{class:'tm-yearhead'},head));
    if(fig&&(fig.reasonCodes||[]).indexOf('company_year_not_finished')>=0) nodes.push(h('div',{class:'tm-fhint',dataset:{yearDateStatus:'not-finished'},text:t('todo.year_not_finished',{date:isoToDisplay(fig.endDate)})}));
    if(UI.review['ltd.tax.company-year']&&UI.review['ltd.tax.company-year'].indexOf('statutory_review_source_changed')>=0) nodes.push(notice('warn',null,t('statutory.source_changed')));
    var figureNodes=figuresTable(fig);nodes.push(figureNodes.shift());
    nodes=nodes.concat(todoBlock({}));
    var actions=yearActions({noPrepare:true});
    if(actions.length) nodes.push(h('div',{class:'tm-record-actions col'},actions));
    nodes=nodes.concat(figureNodes);
    nodes.push(statutoryDisclosure());
    return workspaceBack(nodes);
  }
  var CT600_BOX_KEYS={145:'pack.ct600.box145',155:'pack.ct600.box155',160:'pack.ct600.box160',165:'pack.ct600.box165',315:'pack.ct600.box315',430:'pack.ct600.box430',435:'pack.ct600.box435',440:'pack.ct600.box440',475:'pack.ct600.box475',525:'pack.ct600.box525',690:'pack.ct600.box690'};
  function lineLabel(prefix, line){ var k=prefix+(line.id||''); return hasKey(k)?t(k):(line.label||line.id||''); }
  var PACK_MONEY_ROLES={turnover:'in',otherIncome:'in',costOfRawMaterialsAndConsumables:'out',staffCosts:'out',depreciationAndOtherAmountsWrittenOffAssets:'out',otherCharges:'out',tax:'out',creditorsDueWithinOneYear:'out',creditorsDueAfterOneYear:'out',provisionsForLiabilities:'out',accrualsAndDeferredIncome:'out',calledUpShareCapital:'neutral',addBackNonDeductibleCosts:'out',deductAnnualInvestmentAllowance:'out',currentTradingLoss:'out',deductEarlierTradingLosses:'out',corporationTax:'out'};
  function packLineRole(line){return PACK_MONEY_ROLES[line.id]||'signed';}
  function ct600Role(box){return [430,440,475,525].indexOf(box)>=0?'out':box===435?'in':'signed';}
  // Preparation pack: what it is, whether it can be downloaded, one download button.
  // Filing route, steps, boundaries, the mapped lines and CT600 boxes stay on demand.
  function screenSelfFilingPack(){
    var lr=S().lastResult||{}, d=lr.data||{}, p=d.payload||null;
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('pack.title'))];
    if(!p){
      nodes.push(notice('warn',t('common.review_required'),t('pack.unavailable')));
      nodes=nodes.concat(todoBlock({codes:(lr.reviewReasons||[]).concat(yearTodoCodes())}));
      nodes.push(statutoryDisclosure({hideActions:true}));
      return workspaceBack(nodes);
    }
    var ready=!!d.fileName;
    nodes.push(h('div',{class:'tm-review-summary'},[
      h('div',{class:'tm-wstitle',dataset:{packStatus:p.status,packReady:String(ready)},text:ready?t('pack.ready'):t('pack.not_ready')}),
      h('p',{class:'tm-fhint',text:t('pack.not_submission_short')}),
      ready?btn(t('pack.download'),'p',function(){ triggerDownload(d); },{dataset:{action:'download-pack-file'}}):null
    ]));
    nodes=nodes.concat(todoBlock({compact:true,key:'pack.todo',codes:(p.reasonCodes||[]).concat((checklist()&&checklist().blockingItemIds||[]).map(function(id){return 'statutory_'+id;}))}));
    // Filing guidance on demand: route facts, the official steps and what the pack does not do.
    var sr=p.submissionRoute||{}, guidance=[];
    if(ready)guidance.push(h('div',{class:'tm-fhint tm-num',dataset:{packFile:d.fileName},text:t('pack.file',{name:d.fileName})}));
    guidance.push(h('p',{class:'tm-muted',text:t('pack.not_submission')}));
    guidance.push(summRows([
      [t('pack.route.direct_filing'), h('span',{text:sr.directFiling?t('common.yes'):t('common.no')})],
      [t('pack.route.accounts_service'), h('span',{text:sr.separateAccountsFilingRequired?t('common.yes'):t('common.no')})],
      [t('pack.route.ct_software'), h('span',{text:sr.separateCorporationTaxSoftwareRequired?t('common.yes'):t('common.no')})],
      [t('pack.route.director_check'), h('span',{text:sr.directorMustCheckAndConfirm?t('common.yes'):t('common.no')})]
    ]));
    if(p.steps&&p.steps.length){
      guidance.push(h('div',{class:'tm-h sm',text:t('pack.steps')}));
      var recs=h('div',{class:'tm-recs'});
      p.steps.forEach(function(st){
        var base=String(st.id||'').split(':')[0]; var tk='pack.step.'+base, sk='pack.step_status.'+st.status;
        var dl=st.deadline&&st.deadline.dueDate? isoToDisplay(st.deadline.dueDate) : t('statutory.needs_checking');
        recs.append(h('div',{class:'tm-rec'},[h('div',{},[h('div',{class:'rl',text:st.step+'. '+(hasKey(tk)?t(tk):st.title)}), h('div',{class:'rs',text:(hasKey(sk)?t(sk):st.status)}), h('div',{class:'rs'},[h('span',{text:t('statutory.deadline')+': '}), h('span',{class:'tm-num',text:dl})])])]));
      });
      guidance.push(recs);
    }
    if(p.mvpBoundaries&&p.mvpBoundaries.length){
      guidance.push(h('div',{class:'tm-h sm',text:t('pack.boundaries')}));
      guidance.push(h('ul',{class:'tm-sources'}, p.mvpBoundaries.map(function(bd){ var k='pack.boundary.'+bd.id; return h('li',{text:(hasKey(k)?t(k):bd.plainEnglish)}); })));
    }
    guidance.push(h('div',{class:'tm-fhint',text:t('records.backup_first')}));
    nodes.push(disclosure('pack.guidance', t('pack.guidance'), guidance, {action:'open-pack-guidance'}));
    // Mapped figures and CT600 boxes on demand (engine display values only).
    var af=p.accountsFiling||{}, detail=[];
    detail.push(h('div',{class:'tm-h sm',text:t('pack.accounts_lines')}));
    if(af.filingDestination) detail.push(h('div',{class:'tm-fhint',text:t('pack.accounts_destination')}));
    detail.push(summRows((af.profitAndLossLines||[]).map(function(l){ return [lineLabel('pack.line.',l), displayNode(l.display,packLineRole(l))]; })));
    detail.push(summRows((af.balanceSheetLines||[]).map(function(l){ return [lineLabel('pack.line.',l), displayNode(l.display,packLineRole(l))]; })));
    var el=af.eligibility||{};
    detail.push(h('div',{class:'tm-h sm',text:t('statutory.group.filing_confirmations')}));
    detail.push(summRows(['microEntityEligibilityConfirmed','noUnsupportedBalancesConfirmed','comparativeFiguresChecked','directorApprovalConfirmed'].map(function(k){ return [t('statutory.fact.'+k), h('span',{class:'tm-pill '+(el[k]===true?'ok':'warn'),text:el[k]===true?t('statutory.fact_yes'):t('statutory.fact_unanswered')})]; })));
    (p.corporationTaxReturns||[]).forEach(function(r,i){
      detail.push(h('div',{class:'tm-h sm',text:t('pack.ct600')+' \u00B7 '+t('s2.ct_period',{number:i+1})}));
      detail.push(h('div',{class:'tm-fhint tm-num',text:isoToDisplay(r.startDate)+' \u2013 '+isoToDisplay(r.endDate)}));
      detail.push(summRows((r.boxDetails||[]).map(function(bx){ var k=CT600_BOX_KEYS[bx.boxNumber]; return [t('pack.box',{n:bx.boxNumber})+' \u00B7 '+(k&&hasKey(k)?t(k):(bx.label||'')), displayNode(bx.display,ct600Role(bx.boxNumber))]; })));
    });
    var tc=p.taxComputation;
    if(tc&&tc.periods&&tc.periods.length){
      detail.push(h('div',{class:'tm-h sm',text:t('pack.tax_computation')}));
      tc.periods.forEach(function(pr,i){
        detail.push(h('div',{class:'tm-fhint',text:t('s2.ct_period',{number:i+1})+' \u00B7 '+t(hasKey('year.status.'+pr.status)?'year.status.'+pr.status:'year.status.needs_attention')}));
        detail.push(summRows((pr.lines||[]).map(function(l){ return [lineLabel('pack.tc.',l), displayNode(l.display,packLineRole(l))]; })));
      });
    }
    nodes.push(disclosure('pack.detail', t('pack.details'), detail, {action:'open-pack-details'}));
    nodes.push(statutoryDisclosure({hideActions:true}));
    return workspaceBack(nodes);
  }
  /* ---- bank statement matching (year-end reconciliation) ------------------ */
  function latestReconciliation(){
    var lr=S().lastResult||{}, recs=(S().workspace&&S().workspace.bankReconciliations)||[];
    var id=lr.data&&lr.data.record&&lr.data.record.kind==='bank_reconciliation'?lr.data.record.id:(UI.bankId||null);
    var found=id?recs.filter(function(r){return r.id===id;})[0]:null;
    if(found) return found;
    return recs.slice().sort(function(a,b){ return (b.updatedAt||0)-(a.updatedAt||0); })[0]||null;
  }
  function eventById(id){ return ((S().workspace&&S().workspace.events)||[]).filter(function(e){return e.id===id;})[0]||null; }
  // Parts of a company record for the match list: the name wraps, the date and the full
  // amount stay on their own line, so nothing is truncated at 360px in any locale (UI-07).
  function eventParts(ev){
    if(!ev) return {title:t('detail.none'),meta:'',amount:null,role:'in'};
    var src=ev.sourceTransaction||{}, tk='bank.type.'+(src.companyTransactionType||'');
    return {title:eventTitle(src), meta:isoToDisplay(src.date)+(hasKey(tk)?' \u00B7 '+t(tk):''), amount:src.amountMinor||0, role:eventRole(src), src:src};
  }
  function eventLabel(ev){ if(!ev) return '\u2014'; var pp=eventParts(ev); return pp.title+' \u00B7 '+pp.meta+' \u00B7 '+fmtMoney(pp.amount); }
  // Result screen: a short status, then the statement lines as ordinary record rows.
  function screenBankMatching(){
    var rec=latestReconciliation();
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('bank.title'))];
    if(!rec){ nodes.push(notice('neutral',null,t('bank.none_yet'))); if(can('create_event')) nodes.push(btn(t('bank.match_action'),'p',function(){ openSheet('bank'); },{dataset:{action:'bank-statement'}})); return workspaceBack(nodes); }
    UI.bankId=rec.id;
    var ok=rec.status==='reconciled';
    var lines=rec.statementLines||[], matches=rec.matches||[];
    var unmatchedLines=(rec.unmatchedStatementLineIds||[]).length;
    nodes.push(h('div',{class:'tm-yearhead'},[
      h('span',{class:'tm-num',text:isoToDisplay(rec.startDate)+' \u2013 '+isoToDisplay(rec.endDate)}),
      h('span',{class:'tm-pill '+(ok?'ok':rec.status==='voided'?'rev':'warn'),dataset:{bankStatus:rec.status},text:t('bank.status.'+rec.status)})
    ]));
    nodes.push(h('div',{class:'tm-fhint',dataset:{bankSummary:ok?'matched':'unmatched'},text:ok?t('bank.summary_all_matched'):unmatchedLines?t('bank.summary_unmatched',{count:unmatchedLines}):t('todo.count',{count:(rec.reasonCodes||[]).length})}));
    // Statement lines as normal records: description, date, matched record, amount.
    var recs=h('div',{class:'tm-recs'});
    lines.forEach(function(l){
      var m=matches.filter(function(x){return x.statementLineId===l.id;})[0];
      var unmatched=(rec.unmatchedStatementLineIds||[]).indexOf(l.id)>=0;
      var matched=!unmatched&&m?eventParts(eventById(m.bookEventId)):null;
      var left=[h('div',{class:'rl',text:l.description||'\u2014'}), h('div',{class:'rs tm-num',text:isoToDisplay(l.date)}),
        h('span',{class:'tm-pill '+(unmatched?'warn':'ok'),dataset:{lineMatch:unmatched?'none':'matched'},text:unmatched?t('bank.unmatched_short'):t('bank.matched')})];
      if(matched) left.push(h('div',{class:'rs match',text:t('bank.record_line')+': '+matched.title+' \u00B7 '+matched.meta}));
      recs.append(h('div',{class:'tm-rec',dataset:{statementLine:l.id}},[h('div',{},left), h('div',{class:'rv'},[moneyRole(l.amountMinor,'signed')])]));
    });
    nodes.push(recs);
    var actions=[];
    if(rec.status!=='voided'&&can('create_event')) actions.push(btn(ok?t('bank.edit'):t('bank.continue_matching'),'p',function(){ openSheet('bankMatch',{recordId:rec.id}); },{dataset:{action:'bank-continue'}}));
    if(rec.status!=='voided'&&can('correct_event')) actions.push(btn(t('bank.delete'),'coral-soft',function(){ openSheet('bankDelete',{recordId:rec.id}); },{dataset:{action:'bank-delete'}}));
    if(actions.length) nodes.push(h('div',{class:'tm-record-actions col'},actions));
    // Balances, evidence, unmatched company records and any engine reasons: on demand.
    var detail=[summRows([
      [t('bank.opening'), moneyRole(rec.openingBalanceMinor,'signed')],
      [t('bank.closing'), moneyRole(rec.closingBalanceMinor,'signed')],
      [t('bank.calculated_closing'), figNode(rec.calculatedClosingBalanceMinor,'signed')],
      [t('detail.evidence'), h('span',{text:(rec.evidenceRefs||[]).join(', ')||t('detail.none')})]
    ])];
    if(rec.unmatchedBookEventIds&&rec.unmatchedBookEventIds.length){
      detail.push(h('div',{class:'tm-h sm',text:t('bank.unmatched_book')+' ('+rec.unmatchedBookEventIds.length+')'}));
      var un=h('div',{class:'tm-recs'});
      rec.unmatchedBookEventIds.forEach(function(id){ var pp=eventParts(eventById(id));
        un.append(h('div',{class:'tm-rec'},[h('div',{},[h('div',{class:'rl',text:pp.title}), h('div',{class:'rs tm-num',text:pp.meta})]), h('div',{class:'rv'},[moneyRole(pp.amount,pp.role)])])); });
      detail.push(un);
    }
    if(rec.reasonCodes&&rec.reasonCodes.length){ detail.push(h('div',{class:'tm-h sm',text:t('year.review_reasons')})); detail.push(reasonList(rec.reasonCodes)); }
    nodes.push(disclosure('bank.detail', t('todo.details'), detail, {action:'open-bank-details'}));
    return workspaceBack(nodes);
  }

  function ownershipSummaryCard(){
    var hist=(S().workspace&&S().workspace.ownershipHistory)||[];
    var today=S().context&&S().context.currentDate;
    var cur=hist.filter(function(v){return v.effectiveFrom<=today&&(v.effectiveTo==null||today<v.effectiveTo);})[0]||null;
    var sh=(cur&&cur.shareholders)||[];
    if(!sh.length) return h('div',{class:'tm-ownership-card'},[h('div',{class:'tm-h',text:t('records.ownership')}),notice('warn',null,t('common.review_required'))]);
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
      can('change_ownership')? h('div',{class:'tm-record-actions'},[recRow(t('records.ownership'), function(){ run('onOpenOwnershipChange',{},{}); })]) : null,
      periodsInline(),
      salaryDividendSection(),
      can('generate_working_pack')? h('div',{class:'tm-record-actions'},[
        recRow(t('records.working_pack'), function(){ run('onDownloadWorkingPack',{},{}); }, 'records.working_pack'),
        recRow(t('year.download_pack'), function(){ run('onDownloadSelfFilingPack',{},{scope:'ltd.tax.self-filing-pack',onReview:function(){ paint(); },onOk:function(){ paint(); }}); }, 'year.download_pack')
      ]) : readOnlyNotice(),
      can('remove_company')? h('div',{style:'margin-top:16px'},[ btn(t('design.remove_action'),'coral-soft',function(){ openSheet('remove'); }) ]) : null
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
        can('edit_company')?btn(t('records.record_change'),'g sm',function(){ run('onOpenCompanyEdit',{},{}); }):null,
        registry&&registry.companyNumber&&can('companies_house_lookup')?btn(t('s1.check_ch'),'g sm',function(){run('onRecheckCompaniesHouse',{companyNumber:registry.companyNumber},{onReview:function(){paint();},onOk:function(){paint();}});}):null
      ].filter(Boolean))
    ]);
  }
  // F-05: Salary & dividends — real recorded states with progressive disclosure.
  // Latest RTI position: the revisioned payrollReporting evidence wins; the original
  // financial posting's payeReportingStatus is only the fallback for older records.
  function rtiStatus(r){ return (r.payrollReporting&&r.payrollReporting.status)||r.payeReportingStatus||(r.salary&&r.salary.payeReportingStatus)||null; }
  function rtiLabelFor(status){ return status==='reported_rti'?t('salary.status_reported') : status==='pending_rti'?t('salary.status_pending') : t('common.review_required'); }
  function salaryRecordDetailRows(r){
    var rti=rtiStatus(r), pr=r.payrollReporting||null;
    var gross=r.grossSalaryMinor||r.grossMinor||0; var erni=r.employerNiMinor||0;
    var rows=[
      [t('salary.gross'), moneyRole(gross,'out')],
      [t('salary.payment_date'), h('span',{class:'tm-num',text:isoToDisplay(r.payDate||r.date)})],
      [t('salary.rti_status'), h('span',{dataset:{rtiStatus:rti||''},text:rtiLabelFor(rti)})]
    ];
    if(pr){ rows.push([t('rti.reported_on'), h('span',{class:'tm-num',text:isoToDisplay(pr.reportedOn)})]); rows.push([t('rti.revision'), h('span',{class:'tm-num',text:String(pr.revision||0)})]); rows.push([t('rti.evidence'), h('span',{text:(pr.evidenceRefs||[]).join(', ')||t('detail.none')})]); }
    if(r.payeWithheldMinor!=null) rows.push([t('salary.paye'), moneyRole(r.payeWithheldMinor,'out')]);
    if(r.employeeNiMinor!=null) rows.push([t('salary.employee_ni'), moneyRole(r.employeeNiMinor,'out')]);
    if(erni!=null) rows.push([t('salary.employer_ni'), moneyRole(erni,'out')]);
    var ev=(r.evidenceRefs&&r.evidenceRefs.length)?r.evidenceRefs.join(', '):t('detail.none');
    rows.push([t('detail.evidence'), h('span',{text:ev})]);
    rows.push([t('salary.company_effect'), moneyRole(-(gross+erni),'out')]);
    var out=[summRows(rows)];
    var hist=(r.payrollReportingHistory||[]);
    if(hist.length) out.push(disclosure('rtihist:'+r.id, t('rti.history')+' ('+hist.length+')', [h('ul',{class:'tm-sources'}, hist.map(function(x){ return h('li',{text:t('rti.revision')+' '+x.revision+' · '+rtiLabelFor(x.status)+' · '+isoToDisplay(x.reportedOn)}); }))]));
    if(can('confirm_salary')) out.push(h('div',{style:'margin:6px 0 4px'},[ btn(t('rti.update'),'sm s',function(){ openSheet('rti',{recordId:r.id}); },{dataset:{action:'rti-update'}}) ]));
    return h('div',{},out);
  }
  function dividendRecordDetailRows(dv){
    var rows=[
      [t('dividend.declare_title'), moneyRole(dv.totalDividendMinor||dv.totalMinor||0,'out')],
      [t('design.date'), h('span',{class:'tm-num',text:isoToDisplay(dv.declarationDate)})],
      [t('detail.tax_status'), h('span',{text: dv.status==='paid'?t('tax.dividend_paid'):t('tax.declared_unpaid')})]
    ];
    var out=[summRows(rows)];
    var allocs=dv.allocations||[];
    if(allocs.length){
      out.push(h('div',{class:'tm-h',text:t('dividend.allocation')}));
      out.push(summRows(allocs.map(function(a){ return [ (a.isAccountHolder?t('records.your_share'):(a.shareholderName||a.shareholderId||'\u2014')), moneyRole(a.amountMinor||0,'out') ]; })));
      out.push(h('div',{class:'tm-fhint',text:t('dividend.share_basis')}));
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
      var rti=rtiStatus(r);
      var pill = rti==='reported_rti'?['ok',t('salary.status_reported')] : rti==='pending_rti'?['warn',t('salary.status_pending')] : ['warn',t('common.review_required')];
      var key='sal:'+i; var open=!!UI.disc[key];
      body.push(h('button',{class:'tm-rec',type:'button',onClick:function(){ UI.disc[key]=!open; paint(); }},[
        h('div',{},[h('div',{class:'rl',text:t('tax.record_salary')}), h('div',{class:'rs',text:isoToDisplay(r.payDate||r.date)}), h('span',{class:'tm-pill '+pill[0],text:pill[1]})]),
        h('div',{class:'rv'},[moneyRole(r.grossSalaryMinor||r.grossMinor||0,'out'), h('span',{class:'tm-muted',style:'margin-left:6px',text:open?'\u2013':'+'})])
      ]));
      if(open) body.push(h('div',{class:'dc'},[salaryRecordDetailRows(r)]));
    });
    decls.forEach(function(dv,i){
      var paid=dv.status==='paid'; var key='dv:'+(dv.id||dv.recordId||i); var open=!!UI.disc[key];
      body.push(h('button',{class:'tm-rec',type:'button',onClick:function(){ UI.disc[key]=!open; paint(); }},[
        h('div',{},[h('div',{class:'rl',text:t('dividend.declare_title')}), h('div',{class:'rs',text:isoToDisplay(dv.declarationDate)}), h('span',{class:'tm-pill '+(paid?'ok':'warn'),text:paid?t('tax.dividend_paid'):t('tax.declared_unpaid')})]),
        h('div',{class:'rv'},[moneyRole(dv.totalDividendMinor||dv.totalMinor||0,'out'), h('span',{class:'tm-muted',style:'margin-left:6px',text:open?'\u2013':'+'})])
      ]));
      if(open){
        body.push(h('div',{class:'dc'},[dividendRecordDetailRows(dv)]));
        if(!paid&&can('record_dividend_payment')) body.push(h('div',{style:'margin:6px 0 4px'},[ btn(t('tax.record_payment'),'sm s',function(){ openSheet('dividendPayment',{declarationId:dv.id||dv.recordId, allocations:dv.allocations||[]}); }) ]));
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
      h('div',{class:'tm-hero'+(m.amountMinor<0?' loss':'')},[h('div',{class:'lbl',text:label}), h('div',{class:'big'},[moneyRole(m.amountMinor,['allowableRunningExpenses','corporationTax'].indexOf(mid)>=0?'out':'signed')])]),
      h('div',{class:'tm-h',text:t('design.source_records')})];
    if(!evs.length) nodes.push(h('p',{class:'tm-muted',text:t('design.no_records_body')}));
    else { var recs=h('div',{class:'tm-recs'}); evs.forEach(function(ev){
        recs.append(h('button',{class:'tm-rec',type:'button',onClick:function(){ run('onOpenRecord',{eventId:ev.id},{}); }},[
          h('div',{},[h('div',{class:'rl',text:eventTitle(ev)}), h('div',{class:'rs tm-num',text:isoToDisplay(ev.date)})]),
          h('div',{class:'rv'},[moneyRole(ev.amountMinor||0, eventRole(ev))])
        ])); }); nodes.push(recs); }
    return workspaceBack(nodes);
  }
  function workspaceBack(nodes){
    var first=nodes[0], title=first&&first.querySelector&&first.querySelector('.tm-wstitle');
    var id=routeId(), area=/salary|dividend|scenario/.test(id)?'pay':/record-detail|metric-detail|draft-edit/.test(id)?'money':'tax';
    return workspaceShell(area,title?nodes.slice(1):nodes,{detail:true,title:title?title.textContent:t('review01.tax')});
  }

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
         if(a.label) named.push([a.label==='private_use'?t('money.private_use'):a.label, moneyRole(amt, eventRole(src))]); });
      if(named.length) splitRows=named;
      else { if(companyMinor) splitRows.push([t('detail.split_company'), moneyRole(companyMinor, eventRole(src))]); if(privateMinor) splitRows.push([t('detail.split_private'), moneyRole(privateMinor, eventRole(src))]); }
    }
    var rows=[
      [t('design.what_for'), h('span',{text:eventTitle(src)})],
      [t('design.amount'), moneyRole(view?view.grossAmountMinor:(src.amountMinor||0), eventRole(src))],
      [t('design.date'), h('span',{class:'tm-num',text:isoToDisplay(src.date)})],
      [t('detail.paid_by'), h('span',{text:paidBy})],
      [t('detail.tax_status'), h('span',{text: reviewed?t('common.review_required'):t('detail.status_ok')})],
      [t('detail.evidence'), h('span',{text:(src.evidenceRefs&&src.evidenceRefs.length)?src.evidenceRefs.join(', '):t('detail.none')})],
      [t('detail.company_effect'), moneyRole(view?view.companyCashEffectMinor:0,'signed')]
    ];
    if(view&&view.directorLoanEffectMinor>0) rows.push([t('term.company_owes_you'), moneyRole(view.directorLoanEffectMinor,'out')]);
    nodes.push(summRows(rows));
    if(splitRows.length){ nodes.push(h('div',{class:'tm-h',text:t('detail.split')})); nodes.push(summRows(splitRows)); }
    if(reviewed) nodes.push(notice('warn', t('common.review_required'), null));
    // journal drill-down (technical)
    if(ev.postings||src){ nodes.push(disclosure('rec.adv', t('design.advanced_details'), [
      h('pre',{style:'white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;color:var(--muted)',text:JSON.stringify(ev.postings||src,null,1)}) ])); }
    // Correct / edit / delete controls appear only with the matching semantic permission;
    // the driver re-checks on every call.
    if(st==='committed'&&can('correct_event')) nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('money.correct_record'),'g',function(){ openSheet('correct',{eventId:ev.id}); }) ]));
    else if((st==='draft'||st==='review')&&can('edit_draft_event')){ nodes.push(h('div',{class:'tm-pair'},[
      btn(t('common.edit'),'p',function(){ run('onEditDraft',{eventId:ev.id},{}); }),
      btn(t('money.delete_draft'),'coral-soft',function(){ run('onDeleteDraft',{eventId:ev.id},{onOk:function(){ toast(t('money.delete_draft')); paint(); }}); })
    ])); }
    else if(readOnlyReason()){ var ro=readOnlyNotice(); if(ro) nodes.push(ro); }
    return workspaceBack(nodes);
  }
  function disclosure(key,label,body,opts){
    opts=opts||{};
    var open=!!UI.disc[key];
    var d=h('details',{class:'tm-disc'}, [
      h('summary',{dataset:opts.action?{action:opts.action,open:String(open)}:null,
        onClick:function(e){ e.preventDefault(); UI.disc[key]=!open; paint(); }},[label, h('span',{text:open?'\u2013':'+'})])
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
      d.accountingProfitMinor!=null?[t('tax.accounting_profit_loss'), moneyRole(d.accountingProfitMinor,'signed')]:null,
      d.corporationTaxEstimateMinor!=null?[t('ct_review.result'), moneyRole(d.corporationTaxEstimateMinor,'out')]:null
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
        [t('scenario.company_tax'), moneyRole(r.corporationTaxEstimateMinor||r.corporationTaxMinor||r.companyTaxMinor||0,'out')],
        [t('scenario.employer_ni'), moneyRole(r.employerNiMinor||0,'out')],
        [t('scenario.employee_ni'), moneyRole(r.employeeNiMinor||0,'out')],
        [t('scenario.personal_tax'), moneyRole(r.personalIncomeTaxMinor||r.incomeTaxMinor||r.personalTaxMinor||0,'out')],
        [t('scenario.dividend_tax'), moneyRole(r.personalDividendTaxMinor||r.dividendTaxMinor||0,'out')],
        [t('scenario.cash_received'), moneyRole(r.userCashReceivedMinor||r.personalCashMinor||r.cashReceivedMinor||0,'in')],
        [t('scenario.company_cash_left'), moneyRole(r.companyCashAfterMinor||r.companyCashMinor||0,'signed')]
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
    // Landing screen after onRecordSalary / onUpdatePayrollReporting: the full record
    // rows (including the revisioned RTI position) and the RTI update action.
    var lr=S().lastResult||{};
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('salary.title'))];
    if(lr.status==='review_required') nodes.push(notice('warn',null,t('common.saved_for_review')));
    var recs=(S().workspace&&S().workspace.salaryRecords)||[];
    if(!recs.length) nodes.push(h('p',{class:'tm-muted',text:t('tax.nothing_body')}));
    recs.forEach(function(r){ nodes.push(h('div',{class:'tm-h sm',text:t('tax.record_salary')+' · '+isoToDisplay(r.payDate||r.date)})); nodes.push(salaryRecordDetailRows(r)); });
    return workspaceBack(nodes);
  }
  function screenDividendDetail(){
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('dividend.declare_title'))];
    var decls=(S().workspace&&S().workspace.dividendDeclarations)||[];
    if(!decls.length) nodes.push(notice('info', null, t('tax.declared_unpaid')));
    decls.forEach(function(dv){
      var paid=dv.status==='paid';
      nodes.push(h('div',{style:'margin-top:6px'},[h('span',{class:'tm-pill '+(paid?'ok':'warn'),text:paid?t('tax.dividend_paid'):t('tax.declared_unpaid')})]));
      nodes.push(summRows([[t('dividend.total'), moneyRole(dv.totalDividendMinor||dv.totalMinor||0,'out')],[t('dividend.declaration_date'), h('span',{class:'tm-num',text:isoToDisplay(dv.declarationDate)})]]));
      if(!paid&&can('record_dividend_payment')) nodes.push(btn(t('tax.record_payment'),'p',function(){ openSheet('dividendPayment',{declarationId:dv.id, allocations:dv.allocations||[]}); }));
    });
    // Draft minutes/voucher templates come from the engine checklist (draft_for_review only).
    var dvItem=checklistItems().filter(function(x){return x.id==='dividend_documents';})[0];
    if(dvItem){ nodes.push(h('div',{class:'tm-h',text:t('statutory.item.dividend_documents.title')})); nodes.push(h('div',{style:'margin-top:6px'},[statusPill(dvItem.status)])); nodes=nodes.concat(itemExtras(dvItem)); }
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
      nodes.push(summRows(evs.slice(0,6).map(function(ev){ var src=ev.sourceTransaction||{}; return [ eventTitle(src), moneyRole(src.amountMinor||0, eventRole(src)) ]; })));
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
    var today=S().context&&S().context.currentDate;
    var cur=hist.filter(function(v){return v.effectiveFrom<=today&&(v.effectiveTo==null||today<v.effectiveTo);})[0]||null;
    var nodes=[backBar(function(){ run('onBack',{},{}); }, t('records.ownership'))];
    if(cur){ nodes.push(h('div',{class:'tm-h',text:t('records.current')}));
      nodes.push(summRows((cur.shareholders||[]).map(function(sh){ return [sh.name, h('span',{class:'tm-num',text:Math.round((sh.ownershipBasisPoints||0)/100)+'%'})]; }))); }
    else{nodes.push(notice('warn',t('records.current'),t('common.review_required')));return workspaceBack(nodes);}
    if(hist.length>1){
      nodes.push(h('div',{class:'tm-h',text:t('records.history')}));
      hist.slice().sort(function(a,b){return String(b.effectiveFrom).localeCompare(String(a.effectiveFrom));}).forEach(function(v){
        var range=t('records.effective_from')+' '+isoToDisplay(v.effectiveFrom)+(v.effectiveTo?(' '+t('records.effective_to')+' '+isoToDisplay(v.effectiveTo)):(v.effectiveFrom<=today?' \u2013 '+t('records.current').toLowerCase():''));
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
    var currentHolders=(cur&&cur.shareholders||[]), soleHolder=currentHolders.length===1;
    currentHolders.forEach(function(sh,i){
      nodes.push(textField({scope:sid,fid:'sh'+i+'_pct',label:sh.name,kind:'percent',default:String(Math.round((sh.ownershipBasisPoints||0)/100)),type:'number',persist:false,
        onInput:soleHolder&&i===0?function(value){if(!getChoice(sid,'other-pct-edited',false)){var amount=parseInt(value||'0',10)||0;setField(sid,'other_pct',String(Math.max(0,Math.min(100,100-amount))));}}:null}));
    });
    if(soleHolder){
      nodes.push(notice('info', t('s3.shareholder_title'), t('s3.shareholder_means')));
      nodes.push(textField({scope:sid,fid:'other_name',label:t('s3.other_name'),type:'text',persist:false}));
      nodes.push(textField({scope:sid,fid:'other_pct',label:t('s3.other_ownership'),kind:'percent',default:'0',type:'number',persist:false,onInput:function(){setChoice(sid,'other-pct-edited',true);}}));
    }
    function normalizedDraft(){
      var shareholders=currentHolders.map(function(sh,i){return{id:sh.id,name:sh.name,shareClassId:sh.shareClassId||'ordinary',shares:parseInt(fieldVal(sid,'sh'+i+'_pct',String(Math.round((sh.ownershipBasisPoints||0)/100)))||'0',10)||0,isAccountHolder:!!sh.isAccountHolder};});
      var otherPct=soleHolder?(parseInt(fieldVal(sid,'other_pct','0')||'0',10)||0):0,otherName=soleHolder?String(fieldVal(sid,'other_name','')||'').trim():'';
      if(soleHolder&&otherPct>0&&otherName)shareholders.push({id:'shareholder:other',name:otherName,shareClassId:'ordinary',shares:otherPct,isAccountHolder:false});
      return{shareholders:shareholders,otherPct:otherPct,otherName:otherName,total:shareholders.reduce(function(sum,sh){return sum+sh.shares;},0)};
    }
    var ownershipTotal=normalizedDraft().total;
    nodes.push(totalBar(t('records.ownership'),h('span',{class:'tm-num',text:ownershipTotal+'%'}),ownershipTotal===100));
    nodes.push(errNode(sid,'ownership'));
    if(soleHolder)nodes.push(errNode(sid,'other_name'));
    nodes.push(textField({scope:sid,fid:'reason',label:t('records.reason'),type:'text',persist:false}));
    nodes.push(textField({scope:sid,fid:'evidence',label:t('design.evidence_reference'),type:'text',persist:false}));
    nodes.push(h('div',{style:'margin-top:14px'},[ btn(t('common.save'),'p',function(){
      var draft=normalizedDraft(),localErrors={};
      if(draft.total!==100)localErrors.ownership=t('error.ownership_total',{total:draft.total});
      if(soleHolder&&draft.otherPct>0&&!draft.otherName)localErrors.other_name=t('error.other_name');
      if(Object.keys(localErrors).length){UI.errors[sid]=localErrors;UI.focusError=true;paintIfChanged();return;}
      var ref=fieldVal(sid,'evidence','');
      run('onChangeOwnership',{effectiveDate:fieldVal(sid,'effectiveDate',''), shareholders:draft.shareholders, reason:fieldVal(sid,'reason',''), evidenceRefs:[ref].filter(Boolean)},
        {scope:sid, onReview:function(r){ UI.review[sid]=r.reviewReasons||[]; paint(); }, onOk:function(){clearScope(sid);toast(t('common.saved_for_review'));}}); }) ]));
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
  function openSheet(kind, ctx){
    var active=document.activeElement;
    if(!UI.sheet&&active&&LAST.mount&&LAST.mount.contains(active)){
      UI.sheetReturnFocus={route:routeId(),text:active.textContent,attributes:{}};
      ['data-action','data-todo-action','data-metric'].forEach(function(k){if(active.hasAttribute(k))UI.sheetReturnFocus.attributes[k]=active.getAttribute(k);});
    }
    flushActive(); clearToast(); UI.sheet={kind:kind,step:1,ctx:ctx||{}};if(kind==='ct')UI.ctIdx=0;UI.errors['ui.'+kind]=null;paint();
  }
  function closeSheet(){
    var opener=UI.sheetReturnFocus;UI.sheetReturnFocus=null;UI.sheet=null;clearSheetCache();paint();
    if(!LAST.mount||!opener)return;
    var buttons=Array.prototype.slice.call(LAST.mount.querySelectorAll('button'));
    var target=opener.route===routeId()?buttons.filter(function(b){
      return b.getClientRects().length&&!b.disabled&&b.textContent===opener.text&&Object.keys(opener.attributes).every(function(k){return b.getAttribute(k)===opener.attributes[k];});
    })[0]:LAST.mount.querySelector('.main .tm-wsback');
    if(target)target.focus({preventScroll:true});
  }
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
  // Live enable/disable of a sheet's primary button while typing (no repaint).
  function syncSheetButton(action, disabled){ var b=document.querySelector('[data-action="'+action+'"]'); if(b) b.disabled=!!disabled||busy(); }
  /* ---- statutory review: evidenced facts -> onSaveStatutoryReview ---------- */
  // The UI collects sourced facts; every status is produced by the engine.
  var STAT_GROUPS=[
    {id:'registration', items:['utr'], bools:['utrReceived','corporationTaxRegistered']},
    {id:'accounts', items:['companies_house_accounts','figures_need_checking'], bools:['accountsSoftwareReady','accountsFiled','microEntityEligibilityConfirmed','noUnsupportedBalancesConfirmed','comparativeFiguresChecked','directorApprovalConfirmed']},
    {id:'hmrc', items:['hmrc_ixbrl'], bools:['hmrcSoftwareReady']},
    {id:'cs01', items:['cs01'], dates:['cs01ReviewDate'], bools:['cs01Filed']},
    {id:'identity', items:['director_psc_identity'], bools:['directorsVerified','pscsVerified'], dates:['directorIdentityDueDate','pscIdentityDueDate']},
    {id:'payroll', items:['paye_rti'], bools:['noPayroll']},
    {id:'dividends', items:['dividend_documents'], bools:['noDividends']},
    {id:'vat', items:['vat_rolling_threshold'], bools:['vatRegistered','vatOutsideBooksComplete','vatForecastConfirmed'], dates:['vatCoverageStart','vatCoverageEnd'], money:['vatNext30DaysMinor']},
    {id:'loan', items:['director_loan_s455'], bools:['noOverdrawnDirectorLoan']},
    {id:'retention', items:['record_retention'], bools:['recordsBackedUp','retentionExceptionsChecked']},
    {id:'ct600', items:['ct600_deadline'], bools:[]}
  ];
  function currentFacts(){
    var c=checklist(), p=S().company&&S().company.profile, rv=p&&p.statutoryReview;
    return (c&&c.reviewStatus==='current'&&rv&&rv.facts)?rv.facts:{};
  }
  function factChoice(sid,key,label,hint){
    var cur=getChoice(sid,'f:'+key,'');
    return h('div',{class:'tm-field tm-fact',dataset:{fact:key}},[
      h('div',{class:'tm-question sm',text:label}),
      hint?h('div',{class:'tm-fhint',text:hint}):null,
      choiceGroup({scope:sid,name:'f:'+key,row:true,current:cur,options:[{v:'yes',title:t('common.yes')},{v:'no',title:t('common.no')},{v:'',title:t('statutory.fact_skip')}]})
    ]);
  }
  function factLabel(key){ var k='statutory.fact.'+key; return hasKey(k)?t(k):key; }
  function factHint(key){ var k='statutory.fact.'+key+'.hint'; return hasKey(k)?t(k):null; }
  function factGroup(key){
    if(/^(vat|vatClassification:|vatTaxPoint:|vatOutsideSales:|vatException:)/.test(key)) return 'vat';
    if(/^(ct600Filed|corporationTaxPaid):/.test(key)) return 'ct600';
    for(var i=0;i<STAT_GROUPS.length;i++){ var g=STAT_GROUPS[i]; if((g.bools||[]).indexOf(key)>=0||(g.dates||[]).indexOf(key)>=0||(g.money||[]).indexOf(key)>=0) return g.id; }
    return null;
  }
  function seedStatutorySheet(sid){
    if(UI.sheet.seeded) return; UI.sheet.seeded=true;
    var facts=currentFacts(), evidence={};
    Object.keys(facts).forEach(function(key){
      var f=facts[key]; if(!f||!('value' in f)) return;
      if(typeof f.value==='boolean') setChoice(sid,'f:'+key,f.value?'yes':'no');
      else if(/^vatClassification:/.test(key)) setChoice(sid,'f:'+key,f.value);
      else if(/^vatException:/.test(key)) setChoice(sid,'f:'+key,'yes');
      else if(typeof f.value==='number') setField(sid,'m:'+key,String(f.value/100));
      else setField(sid,'d:'+key,String(f.value));
      // Evidence is seeded per section from the facts recorded in that section only.
      var gid=factGroup(key); if(gid&&f.evidenceRefs&&f.evidenceRefs.length&&!evidence[gid]&&!/^statutory-source:/.test(f.evidenceRefs[0])) evidence[gid]=f.evidenceRefs[0];
    });
    Object.keys(evidence).forEach(function(gid){ setField(sid,'ev:'+gid,evidence[gid]); });
    var vatItem=checklistItems().filter(function(x){return x.id==='vat_rolling_threshold';})[0], ar=vatItem&&vatItem.automaticReview;
    if(ar){ if(!fieldVal(sid,'d:vatWindowStart','')) setField(sid,'d:vatWindowStart',ar.startDate); if(!fieldVal(sid,'d:vatWindowEnd','')) setField(sid,'d:vatWindowEnd',ar.endDate); }
    // Tax point defaults to the recorded sale date; the classification itself is never pre-answered.
    incomeEvents().forEach(function(e){ var k='d:vatTaxPoint:'+e.id+':'+e.revision; if(!fieldVal(sid,k,'')&&e.sourceTransaction&&e.sourceTransaction.date) setField(sid,k,e.sourceTransaction.date); });
    UI.sheet.outsideRows=Object.keys(facts).filter(function(k){return /^vatOutsideSales:/.test(k);}).length;
    Object.keys(facts).filter(function(k){return /^vatOutsideSales:/.test(k);}).forEach(function(k,i){ setField(sid,'os:m'+i,k.slice(-7)); setField(sid,'os:a'+i,String(facts[k].value/100)); });
  }
  function collectFacts(sid){
    var facts={}, missing=[];
    function ev(gid){ return (fieldVal(sid,'ev:'+gid,'')||'').trim(); }
    function put(key,value,gid){ var ref=ev(gid); if(!ref){ missing.push(gid); return; } facts[key]={value:value,evidenceRefs:[ref]}; }
    STAT_GROUPS.forEach(function(g){
      (g.bools||[]).forEach(function(k){ var c=getChoice(sid,'f:'+k,''); if(c==='yes'||c==='no') put(k,c==='yes',g.id); });
      (g.dates||[]).forEach(function(k){ var v=fieldVal(sid,'d:'+k,''); if(v) put(k,v,g.id); });
      (g.money||[]).forEach(function(k){ var v=fieldVal(sid,'m:'+k,''); if(v!=='') { var m=toMinor(v); if(m!=null) put(k,m,g.id); } });
    });
    // VAT: per-sale classification + tax point, outside-book sales, exceptions, legacy window.
    var vatItem=checklistItems().filter(function(x){return x.id==='vat_rolling_threshold';})[0], ar=vatItem&&vatItem.automaticReview;
    incomeEvents().forEach(function(e){
      var suffix=e.id+':'+e.revision, cls=getChoice(sid,'f:vatClassification:'+suffix,''), tp=fieldVal(sid,'d:vatTaxPoint:'+suffix,'');
      if(cls){ put('vatClassification:'+suffix,cls,'vat'); if(tp) put('vatTaxPoint:'+suffix,tp,'vat'); }
    });
    for(var i=0;i<(UI.sheet.outsideRows||0);i++){ var mo=(fieldVal(sid,'os:m'+i,'')||'').trim(), am=fieldVal(sid,'os:a'+i,''); if(/^\d{4}-\d{2}$/.test(mo)&&am!==''){ var mm=toMinor(am); if(mm!=null) put('vatOutsideSales:'+mo,mm,'vat'); } }
    ((ar&&ar.crossings)||[]).forEach(function(c){ var d=c.kind==='rolling_12_months'?c.monthEnd:c.knownOn; if(getChoice(sid,'f:vatException:'+d,'')==='yes') put('vatException:'+d,true,'vat'); });
    ['vatWindowStart','vatWindowEnd'].forEach(function(k){ var v=fieldVal(sid,'d:'+k,''); if(v&&fieldVal(sid,'m:vatTaxableTurnoverMinor','')!=='') put(k,v,'vat'); });
    var legacy=fieldVal(sid,'m:vatTaxableTurnoverMinor',''); if(legacy!==''){ var lm=toMinor(legacy); if(lm!=null) put('vatTaxableTurnoverMinor',lm,'vat'); }
    if(historyGap()&&getChoice(sid,'f:vatDeletedHistoryReconstructed','')) put('vatDeletedHistoryReconstructed',getChoice(sid,'f:vatDeletedHistoryReconstructed','')==='yes','vat');
    // CT600 per period.
    var ctItem=checklistItems().filter(function(x){return x.id==='ct600_deadline';})[0];
    ((ctItem&&ctItem.periods)||[]).forEach(function(p){ ['ct600Filed:'+p.periodId,'corporationTaxPaid:'+p.periodId].forEach(function(k){ var c=getChoice(sid,'f:'+k,''); if(c==='yes'||c==='no') put(k,c==='yes','ct600'); }); });
    // Scoped editing must not erase other current, evidenced confirmations or
    // silently promote stale facts to this source fingerprint.
    var scope=UI.sheet.ctx&&UI.sheet.ctx.factKeys;
    if(scope&&UI.sheet.selectedFact)scope=[UI.sheet.selectedFact];
    var groupId=UI.sheet.ctx&&UI.sheet.ctx.groupId;
    if(scope||groupId){
      var preserved=Object.assign({},currentFacts());
      Object.keys(preserved).forEach(function(k){ if(scope?scope.indexOf(k)>=0:factGroup(k)===groupId) delete preserved[k]; });
      Object.keys(facts).forEach(function(k){ if(scope?scope.indexOf(k)>=0:factGroup(k)===groupId) preserved[k]=facts[k]; });
      facts=preserved;
      missing=missing.filter(function(g){return scope?scope.some(function(k){return factGroup(k)===g;}):g===groupId;});
    }
    return {facts:facts,missing:missing.filter(function(x,i,a){return a.indexOf(x)===i;})};
  }
  function incomeEvents(){ return ((S().workspace&&S().workspace.events)||[]).filter(function(e){ return e.status==='committed'&&e.sourceTransaction&&e.sourceTransaction.companyTransactionType==='company_income'; }); }
  function historyGap(){ var p=S().company&&S().company.profile; return !!(p&&p.retentionHistoryGap); }
  function groupBlock(sid,g){
    var kids=[h('div',{class:'tm-h sm',text:t('statutory.group.'+g.id)})];
    (g.items||[]).forEach(function(id){ var it=checklistItems().filter(function(x){return x.id===id;})[0]; if(it) kids.push(h('div',{class:'tm-fhint'},[document.createTextNode(itemTitle(it)+': '), statusPill(it.status)])); });
    (g.bools||[]).forEach(function(k){ kids.push(factChoice(sid,k,factLabel(k),factHint(k))); });
    (g.dates||[]).forEach(function(k){ kids.push(dateField({scope:sid,fid:'d:'+k,persist:false,label:factLabel(k),hint:factHint(k)})); });
    (g.money||[]).forEach(function(k){ kids.push(textField({scope:sid,fid:'m:'+k,label:factLabel(k),hint:factHint(k),kind:'money',type:'number',persist:false})); });
    if(g.id==='vat'){
      var vatItem=checklistItems().filter(function(x){return x.id==='vat_rolling_threshold';})[0], ar=vatItem&&vatItem.automaticReview;
      var sales=incomeEvents();
      if(sales.length){
        kids.push(h('div',{class:'tm-question sm',text:t('statutory.vat.classify_title')}));
        kids.push(h('div',{class:'tm-fhint',text:t('statutory.vat.classify_hint')}));
        sales.forEach(function(e){
          var suffix=e.id+':'+e.revision, src=e.sourceTransaction||{};
          kids.push(h('div',{class:'tm-fact',dataset:{sale:e.id}},[
            h('div',{class:'tm-fhint'},[h('b',{text:src.purpose||'—'}), document.createTextNode(' · '+isoToDisplay(src.date)+' · '+fmtMoney(src.amountMinor||0))]),
            choiceGroup({scope:sid,name:'f:vatClassification:'+suffix,row:true,options:[{v:'taxable',title:t('statutory.vat.taxable')},{v:'exempt',title:t('statutory.vat.exempt')},{v:'outside_scope',title:t('statutory.vat.outside_scope')}]}),
            dateField({scope:sid,fid:'d:vatTaxPoint:'+suffix,persist:false,label:t('statutory.vat.tax_point'),default:src.date||''})
          ]));
        });
      }
      kids.push(h('div',{class:'tm-question sm',text:t('statutory.vat.outside_title')}));
      kids.push(h('div',{class:'tm-fhint',text:t('statutory.vat.outside_hint')}));
      for(var i=0;i<(UI.sheet.outsideRows||0);i++){ kids.push(h('div',{class:'tm-pair'},[textField({scope:sid,fid:'os:m'+i,label:t('statutory.vat.month'),placeholder:'YYYY-MM',type:'text',persist:false}), textField({scope:sid,fid:'os:a'+i,label:t('statutory.vat.outside_amount'),kind:'money',type:'number',persist:false})])); }
      kids.push(btn(t('statutory.vat.add_outside'),'g sm',function(){ UI.sheet.outsideRows=(UI.sheet.outsideRows||0)+1; paint(); }));
      ((ar&&ar.crossings)||[]).forEach(function(c){ var d=c.kind==='rolling_12_months'?c.monthEnd:c.knownOn; kids.push(factChoice(sid,'vatException:'+d,t('statutory.vat.exception',{date:isoToDisplay(d)}),t('statutory.vat.exception_hint'))); });
      if(historyGap()) kids.push(factChoice(sid,'vatDeletedHistoryReconstructed',factLabel('vatDeletedHistoryReconstructed'),factHint('vatDeletedHistoryReconstructed')));
      if(!sales.length){
        kids.push(h('div',{class:'tm-question sm',text:t('statutory.vat.legacy_title')}));
        kids.push(h('div',{class:'tm-fhint',text:t('statutory.vat.legacy_hint')}));
        kids.push(dateField({scope:sid,fid:'d:vatWindowStart',persist:false,label:factLabel('vatWindowStart')}));
        kids.push(dateField({scope:sid,fid:'d:vatWindowEnd',persist:false,label:factLabel('vatWindowEnd')}));
        kids.push(textField({scope:sid,fid:'m:vatTaxableTurnoverMinor',label:factLabel('vatTaxableTurnoverMinor'),kind:'money',type:'number',persist:false}));
      }
    }
    if(g.id==='ct600'){
      var ctItem=checklistItems().filter(function(x){return x.id==='ct600_deadline';})[0];
      ((ctItem&&ctItem.periods)||[]).forEach(function(p,i){
        var pp=((S().company&&S().company.periodPlan&&S().company.periodPlan.confirmedTaxPeriods)||[]).filter(function(x){return x.id===p.periodId;})[0];
        kids.push(h('div',{class:'tm-fhint'},[h('b',{text:t('s2.ct_period',{number:i+1})}), pp?document.createTextNode(' · '+isoToDisplay(pp.startDate)+' – '+isoToDisplay(pp.endDate)):null]));
        kids.push(factChoice(sid,'ct600Filed:'+p.periodId,t('statutory.fact.ct600Filed'),null));
        kids.push(factChoice(sid,'corporationTaxPaid:'+p.periodId,t('statutory.fact.corporationTaxPaid'),null));
      });
    }
    kids.push(textField({scope:sid,fid:'ev:'+g.id,label:t('statutory.evidence_label'),hint:t('statutory.evidence_hint'),type:'text',persist:false,onInput:function(){ syncSheetButton('statutory-save', collectFacts(sid).missing.length>0); }}));
    return h('div',{class:'tm-statgroup',dataset:{group:g.id}},kids);
  }
  // A section is already done when every checklist item it covers is completed or not
  // applicable — those collapse, so the sheet opens on the work that is actually left.
  function groupSettled(g){
    var items=(g.items||[]).map(function(id){ return checklistItems().filter(function(x){return x.id===id;})[0]; }).filter(Boolean);
    return items.length>0&&items.every(function(it){ return it.status==='completed'||it.status==='not_applicable'; });
  }
  function sheetStatutory(){ var sid='ui.statutory'; seedStatutorySheet(sid);
    var c=checklist();
    var ctx=UI.sheet.ctx||{}, selected=UI.sheet.selectedFact;
    var body=[errSummary(sid)];
    if(selected||ctx.groupId){body.push(h('div',{class:'tm-fhint',text:t('statutory.evidence_short')}));body.push(h('div',{class:'tm-fhint',text:t('statutory.no_personal_codes')}));}
    if(c&&c.reviewStatus==='stale_or_invalid') body.push(notice('warn',null,t('statutory.review_stale')));
    if(UI.review[sid]&&UI.review[sid].indexOf('statutory_review_source_changed')>=0) body.push(notice('warn',null,t('statutory.source_changed')));
    if(ctx.factKeys&&ctx.factKeys.length){
      // Exactly the N requested facts, then one fact and its evidence. Not the
      // unrelated accounts/registration/VAT/CT600 questionnaire.
      if(!selected){
        body.push(h('div',{class:'tm-review-links'},ctx.factKeys.map(function(k){
          return reviewLink(t('review01.fact.'+k),function(){UI.sheet.selectedFact=k;paint();},null,{dataset:{reviewFact:k}});
        })));
      }
      if(selected&&ctx.factKeys.indexOf(selected)>=0){
        body.push(btn(t('common.back'),'g',function(){UI.sheet.selectedFact=null;paint();}));
        body.push(groupBlock(sid,{id:factGroup(selected),bools:[selected]}));
      }
    }else if(ctx.groupId){
      var group=STAT_GROUPS.filter(function(g){return g.id===ctx.groupId;})[0];
      if(group) body.push(groupBlock(sid,group));
    }else{
      STAT_GROUPS.forEach(function(g){body.push(btn(t('statutory.group.'+g.id),'s',function(){UI.sheet.ctx={groupId:g.id};paint();},{dataset:{reviewGroup:g.id}}));});
    }
    var collected=collectFacts(sid),missing=collected.missing;
    var hasScopedAnswer=selected?Object.prototype.hasOwnProperty.call(collected.facts,selected):Object.keys(collected.facts).some(function(k){return factGroup(k)===ctx.groupId;});
    if(missing.length) body.push(notice('warn',null,t('statutory.evidence_required',{groups:missing.map(function(g){return t('statutory.group.'+g);}).join(', ')})));
    return sheet({ title:t('review01.checks'), body:body,
      foot:[ (selected||ctx.groupId)?btn(t('statutory.save_checks'),'p',function(){ flushActive();
          var col=collectFacts(sid); if(col.missing.length){ paint(); return; }
          if(!c){ toast(t('statutory.unavailable')); return; }
          run('onSaveStatutoryReview',{expectedRevision:c.reviewRevision||0, sourceFingerprint:c.sourceFingerprint, facts:col.facts},{scope:sid,
            onReview:function(){ paint(); },
            onOk:function(){ toast(t('statutory.saved')); closeSheet(); }});
        },{disabled:!c||!hasScopedAnswer||missing.length>0,dataset:{action:'statutory-save'}}):null,
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  /* ---- RTI reporting evidence -> onUpdatePayrollReporting ------------------ */
  function newRequestId(prefix){ var r=''; try{ r=(root.crypto&&root.crypto.randomUUID)?root.crypto.randomUUID():''; }catch(e){} if(!r) r=String(Date.now())+'-'+Math.random().toString(36).slice(2,10); return prefix+':'+r; }
  function rtiIncomplete(sid){ return !getChoice(sid,'status','')||!fieldVal(sid,'evidence','')||!fieldVal(sid,'reason','')||!fieldVal(sid,'reportedOn',''); }
  function sheetRti(){ var sid='ui.rti'; var ctx=UI.sheet.ctx||{};
    var rec=((S().workspace&&S().workspace.salaryRecords)||[]).filter(function(r){return r.id===ctx.recordId;})[0];
    if(!rec) return sheet({child:true,title:t('rti.title'),body:[notice('warn',null,t('error.fix_issue'))],foot:[btn(t('common.cancel'),'g',closeSheet)],onClose:closeSheet});
    if(!UI.sheet.requestId){ UI.sheet.requestId=newRequestId('rti'); if(!fieldVal(sid,'reportedOn','')) setField(sid,'reportedOn',todayISO()); }
    var status=getChoice(sid,'status','');
    var body=[errSummary(sid),
      h('div',{class:'tm-fhint',text:t('rti.not_submission')}),
      summRows([[t('salary.payment_date'), h('span',{class:'tm-num',text:isoToDisplay(rec.payDate)})],[t('salary.gross'), moneyRole(rec.grossSalaryMinor||0,'out')],[t('salary.rti_status'), h('span',{text:rtiLabelFor(rtiStatus(rec))})]]),
      h('div',{class:'tm-question',text:t('rti.status')}),
      choiceGroup({scope:sid,name:'status',options:[{v:'reported_rti',title:t('salary.rti_reported')},{v:'pending_rti',title:t('salary.rti_pending')}]}),
      dateField({scope:sid,fid:'reportedOn',persist:false,label:t('rti.reported_on')}),
      textField({scope:sid,fid:'evidence',label:t('rti.evidence'),hint:t('rti.evidence_hint'),type:'text',persist:false,onInput:function(){ syncSheetButton('rti-save', rtiIncomplete(sid)); }}),
      textField({scope:sid,fid:'reason',label:t('rti.reason'),type:'text',persist:false,onInput:function(){ syncSheetButton('rti-save', rtiIncomplete(sid)); }})
    ];
    if(UI.review[sid]&&UI.review[sid].length) body.push(notice('warn',null,UI.review[sid].indexOf('payroll_reporting_source_changed')>=0?t('rti.source_changed'):UI.review[sid].indexOf('payroll_reporting_request_conflict')>=0?t('rti.conflict'):t('common.review_required')));
    var ready=!rtiIncomplete(sid);
    return sheet({ kick:t('salary.title'), title:t('rti.title'), body:body,
      foot:[ btn(t('rti.save'),'p',function(){ flushActive();
          run('onUpdatePayrollReporting',{recordId:rec.id, requestId:UI.sheet.requestId, sourceEventRevisionId:rec.sourceEventRevisionId, expectedReportingRevision:(rec.payrollReporting&&rec.payrollReporting.revision)||0, status:getChoice(sid,'status',''), reportedOn:fieldVal(sid,'reportedOn',''), evidenceRefs:[fieldVal(sid,'evidence','')].filter(Boolean), reason:fieldVal(sid,'reason','')},{scope:sid,onReview:function(){ paint(); },onOk:function(){ toast(t('rti.saved')); closeSheet(); }});
        },{disabled:!ready,dataset:{action:'rti-save'}}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  /* ---- year-end bank statement -> onMatchBankStatement ---------------------- */
  function accountingPeriod(){ var p=S().company&&S().company.profile; return (p&&p.accountingPeriod)||{}; }
  function bankLinesFromSheet(sid){
    var out=[]; for(var i=0;i<(UI.sheet.lineRows||0);i++){ if(getChoice(sid,'rm'+i,'')==='yes') continue; var d=fieldVal(sid,'l:d'+i,''), a=toMinor(fieldVal(sid,'l:a'+i,'')), ds=fieldVal(sid,'l:s'+i,''); if(!d&&a==null&&!ds) continue; out.push({id:(fieldVal(sid,'l:id'+i,'')||('statement-line:'+(i+1))),date:d,amountMinor:a==null?0:a,description:ds}); }
    return out;
  }
  function bankIncomplete(sid){ return !(bankLinesFromSheet(sid).length>0&&!!fieldVal(sid,'evidence','')&&fieldVal(sid,'opening','')!==''&&fieldVal(sid,'closing','')!==''); }
  function sheetBank(){ var sid='ui.bank'; var ctx=UI.sheet.ctx||{};
    if(!UI.sheet.seeded){ UI.sheet.seeded=true; var ap=accountingPeriod(), today=todayISO();
      var rec=ctx.recordId?latestReconciliation():null;
      if(rec){ setField(sid,'startDate',rec.startDate); setField(sid,'endDate',rec.endDate); setField(sid,'opening',String(rec.openingBalanceMinor/100)); setField(sid,'closing',String(rec.closingBalanceMinor/100)); setField(sid,'evidence',(rec.evidenceRefs||[])[0]||''); UI.sheet.lineRows=(rec.statementLines||[]).length; (rec.statementLines||[]).forEach(function(l,i){ setField(sid,'l:id'+i,l.id); setField(sid,'l:d'+i,l.date); setField(sid,'l:a'+i,String(l.amountMinor/100)); setField(sid,'l:s'+i,l.description||''); }); UI.sheet.statementId=rec.id; }
      else { setField(sid,'startDate',ap.startDate||''); setField(sid,'endDate',(ap.endDate&&today&&ap.endDate<=today)?ap.endDate:today); UI.sheet.lineRows=1; }
    }
    var body=[errSummary(sid),
      dateField({scope:sid,fid:'startDate',persist:false,label:t('bank.start')}),
      dateField({scope:sid,fid:'endDate',persist:false,label:t('bank.end'),hint:t('bank.end_hint')}),
      textField({scope:sid,fid:'opening',label:t('bank.opening'),kind:'money',type:'number',persist:false,onInput:function(){ syncSheetButton('bank-save', bankIncomplete(sid)); }}),
      textField({scope:sid,fid:'closing',label:t('bank.closing'),kind:'money',type:'number',persist:false,onInput:function(){ syncSheetButton('bank-save', bankIncomplete(sid)); }}),
      textField({scope:sid,fid:'evidence',label:t('bank.evidence'),hint:t('statutory.evidence_hint'),type:'text',persist:false,onInput:function(){ syncSheetButton('bank-save', bankIncomplete(sid)); }}),
      h('div',{class:'tm-h sm',text:t('bank.lines')}), h('div',{class:'tm-fhint',text:t('bank.lines_hint_short')})
    ];
    for(var i=0;i<(UI.sheet.lineRows||0);i++){ (function(i){ if(getChoice(sid,'rm'+i,'')==='yes') return;
      body.push(h('div',{class:'tm-bankline',dataset:{line:String(i)}},[
        dateField({scope:sid,fid:'l:d'+i,persist:false,label:t('bank.line_date')}),
        textField({scope:sid,fid:'l:a'+i,label:t('bank.line_amount'),hint:t('bank.amount_hint'),kind:'money',type:'number',persist:false,onInput:function(){ syncSheetButton('bank-save', bankIncomplete(sid)); }}),
        textField({scope:sid,fid:'l:s'+i,label:t('bank.line_description'),type:'text',persist:false}),
        btn(t('bank.remove_line'),'g sm',function(){ setChoice(sid,'rm'+i,'yes'); paint(); })
      ])); })(i); }
    body.push(btn(t('bank.add_line'),'g sm',function(){ UI.sheet.lineRows=(UI.sheet.lineRows||0)+1; paint(); },{dataset:{action:'bank-add-line'}}));
    var ready=!bankIncomplete(sid);
    return sheet({ kick:t('bank.title'), title:ctx.recordId?t('bank.edit'):t('bank.title'), body:body,
      foot:[ btn(t('bank.save'),'p',function(){ flushActive();
          var stmt={startDate:fieldVal(sid,'startDate',''),endDate:fieldVal(sid,'endDate',''),openingBalanceMinor:toMinor(fieldVal(sid,'opening','')),closingBalanceMinor:toMinor(fieldVal(sid,'closing','')),lines:bankLinesFromSheet(sid),matches:[],evidenceRefs:[fieldVal(sid,'evidence','')].filter(Boolean)};
          if(UI.sheet.statementId) stmt.id=UI.sheet.statementId;
          run('onMatchBankStatement',{statement:stmt},{scope:sid,onReview:function(r){ UI.bankId=r.data&&r.data.record&&r.data.record.id; closeSheet(); },onOk:function(r){ UI.bankId=r.data&&r.data.record&&r.data.record.id; toast(t('bank.saved')); closeSheet(); }});
        },{disabled:!ready,dataset:{action:'bank-save'}}),
        btn(t('common.cancel'),'g',function(){ closeSheet(); }) ], onClose:closeSheet });
  }
  function sheetBankRead(){
    var rec=latestReconciliation(),body=[readOnlyNotice()];
    if(!rec)body.push(h('p',{class:'tm-fhint',text:t('bank.none_yet')}));
    else{
      body.push(h('p',{class:'tm-fhint',text:t('bank.status.'+rec.status)}));
      body.push(h('p',{class:'tm-num',text:isoToDisplay(rec.startDate)+' – '+isoToDisplay(rec.endDate)}));
      (rec.statementLines||[]).forEach(function(line){body.push(h('div',{class:'tm-review-summary'},[
        h('div',{class:'rl',text:line.description||'—'}),h('div',{class:'tm-num',text:isoToDisplay(line.date)}),moneyRole(line.amountMinor,'signed')
      ]));});
    }
    return sheet({title:t('bank.title'),body:body,foot:[btn(t('common.back'),'g',closeSheet)],onClose:closeSheet});
  }
  function sheetBankMatch(){ var sid='ui.bankMatch'; var ctx=UI.sheet.ctx||{};
    var rec=latestReconciliation();
    if(!rec) return sheet({child:true,title:t('bank.match_title'),body:[notice('warn',null,t('bank.none_yet'))],foot:[btn(t('common.cancel'),'g',closeSheet)],onClose:closeSheet});
    if(!UI.sheet.seeded){ UI.sheet.seeded=true; (rec.matches||[]).forEach(function(m){ setChoice(sid,'m:'+m.statementLineId,m.bookEventId); }); }
    var lines=rec.statementLines||[];
    // Candidates are exactly the engine's unmatched company-bank movements plus the line's current match.
    var candidates=(rec.unmatchedBookEventIds||[]).slice(); (rec.matches||[]).forEach(function(m){ if(candidates.indexOf(m.bookEventId)<0) candidates.push(m.bookEventId); });
    var body=[errSummary(sid)];
    // One statement line at a time, each company record on its own row: the name can wrap
    // and the date and full amount stay readable at 360px in every locale (UI-07).
    lines.forEach(function(l){
      var cur=getChoice(sid,'m:'+l.id,'');
      var opts=[{v:'',title:t('bank.unmatched_short'),body:''}].concat(candidates.filter(function(id){
        var ev=eventById(id), amount=bankEventAmount(ev,rec);
        return amount===l.amountMinor&&!lines.some(function(other){return other.id!==l.id&&getChoice(sid,'m:'+other.id,'')===id;});
      }).map(function(id){ var pp=eventParts(eventById(id));
        return {v:id,title:pp.title,body:pp.meta,amount:bankEventAmount(eventById(id),rec),role:'signed'}; }));
      body.push(h('div',{class:'tm-field tm-matchline',dataset:{matchLine:l.id}},[
        h('div',{class:'tm-question sm',text:(l.description||'\u2014')}),
        h('div',{class:'tm-fhint tm-num',text:isoToDisplay(l.date)}),
        h('div',{class:'tm-match-amount'},[moneyRole(l.amountMinor,'signed')]),
        h('div',{class:'tm-flabel',text:t('bank.pick_record')}),
        choiceGroup({scope:sid,name:'m:'+l.id,current:cur,options:opts,onPick:function(v){ setChoice(sid,'m:'+l.id,v); }})
      ]));
    });
    body.push(disclosure('bank.match.options',t('todo.details'),[
      btn(t('bank.edit_lines'),'g sm',function(){ UI.sheet={kind:'bank',step:1,ctx:{recordId:rec.id}}; clearSheetCache(); paint(); },{dataset:{action:'bank-match-edit'}})
    ]));
    return sheet({ title:t('bank.match_title'), body:body,
      foot:[ btn(t('bank.save_matches'),'p',function(){ flushActive();
          var matches=[]; lines.forEach(function(l){ var v=getChoice(sid,'m:'+l.id,''); if(v) matches.push({statementLineId:l.id,bookEventId:v}); });
          var stmt={id:rec.id,startDate:rec.startDate,endDate:rec.endDate,openingBalanceMinor:rec.openingBalanceMinor,closingBalanceMinor:rec.closingBalanceMinor,lines:(rec.statementLines||[]).map(function(l){return {id:l.id,date:l.date,amountMinor:l.amountMinor,description:l.description};}),matches:matches,evidenceRefs:(rec.evidenceRefs||[]).slice()};
          run('onMatchBankStatement',{statement:stmt},{scope:sid,onReview:function(){ closeSheet(); },onOk:function(){ toast(t('bank.reconciled')); closeSheet(); }});
        },{dataset:{action:'bank-match-save'}}) ], onClose:closeSheet });
  }
  // Same COMPANY_BANK posting and period/entity gates used by the existing
  // reconcileBankStatement engine. Gross salary is not net bank movement.
  function bankEventAmount(ev,rec){
    var src=ev&&ev.sourceTransaction;
    if(!src||ev.status!=='committed'||src.beneficiaryEntityId!==rec.entityId||src.date<rec.startDate||src.date>rec.endDate)return null;
    var amount=null;
    (ev.journals||[]).forEach(function(g){(g.postings||[]).forEach(function(p){if(p.accountCode==='COMPANY_BANK')amount=p.debitMinor-p.creditMinor;});});
    return amount;
  }
  function sheetBankDelete(){ var sid='ui.bankDelete'; var ctx=UI.sheet.ctx||{};
    var incomplete=function(){return !fieldVal(sid,'reason','').trim()||!fieldVal(sid,'evidence','').trim();};
    var updateButton=function(){syncSheetButton('bank-delete-confirm',incomplete());};
    var body=[errSummary(sid), notice('warn',t('bank.delete'),t('bank.delete_warning')),
      textField({scope:sid,fid:'reason',label:t('records.reason'),type:'text',persist:false,onInput:updateButton}),
      textField({scope:sid,fid:'evidence',label:t('detail.evidence'),hint:t('statutory.evidence_hint'),type:'text',persist:false,onInput:updateButton})];
    return sheet({ child:true, kick:t('bank.title'), title:t('bank.delete'), body:body,
      foot:[ btn(t('bank.delete'),'d',function(){ flushActive(); if(incomplete())return; run('onDeleteBankReconciliation',{reconciliationId:ctx.recordId,reasonCode:fieldVal(sid,'reason','').trim(),evidenceRefs:[fieldVal(sid,'evidence','').trim()]},{scope:sid,onOk:function(){ toast(t('common.done')); closeSheet(); }}); },{disabled:incomplete(),dataset:{action:'bank-delete-confirm'}}),
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
      case 'statutory': return sheetStatutory();
      case 'rti': return sheetRti();
      case 'bank': return sheetBank();
      case 'bankRead': return sheetBankRead();
      case 'bankMatch': return sheetBankMatch();
      case 'bankDelete': return sheetBankDelete();
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
      case 'ltd.workspace.tax': return route().params&&route().params.view==='pay'?areaPay():areaTax();
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
      case 'ltd.tax.company-year': return screenCompanyYear();
      case 'ltd.tax.self-filing-pack': return screenSelfFilingPack();
      case 'ltd.money.bank-matching': return screenBankMatching();
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
  function render(mount, facade, snapshot, options){
    LAST.mount=mount; LAST.facade=facade; LAST.snapshot=snapshot;
    if(!snapshot){ mount.replaceChildren(h('div',{style:'padding:24px',text:'\u2026'})); return; }
    var rId=routeId();
    if(UI.lastRouteKey!==rId){ // arrived at a new screen: clear field cache so it seeds from snapshot draft
      UI.cache={}; UI.cal=null;UI.webHomeBaseline=null;UI.webHomeDiscard=false;if(rId==='ltd.onboarding.step4')UI.checkIdx=null; UI.lastRouteKey=rId; clearToast();
    }
    if(UI.skipNextDraftEmitRender>0){
      UI.skipNextDraftEmitRender-=1;
      return; // consume only the draft persistence emit; preserve blur-to-click
    }
    paint(options&&options.background===true);
  }

  function paint(background){
    var mount=LAST.mount; if(!mount||!LAST.snapshot) return;
    var focusedBrand=mount.contains(document.activeElement)&&document.activeElement.matches('[data-web-brand-home]')?document.activeElement:null;
    var keepBrandFocus=focusedBrand&&focusedBrand.dataset.webBrandRoute===routeId()&&!UI.sheet&&!overlays().length&&!pendingDiscard()&&!UI.webHomeDiscard?focusedBrand.dataset.webBrandHome:null;
    var focusedTask=mount.contains(document.activeElement)&&document.activeElement.matches('[data-todo-action]')?document.activeElement:null;
    var keepTaskFocus=focusedTask&&UI.lastRouteKey===routeId()&&!UI.sheet&&!overlays().length&&!pendingDiscard()&&!UI.webHomeDiscard?focusedTask.dataset.todoAction:null;
    var oldWebDiscard=mount.querySelector('[data-web-home-discard]'),discardFocus=oldWebDiscard?Array.from(oldWebDiscard.querySelectorAll('button')).indexOf(document.activeElement):-1;
    var scrollY=root.scrollY||0,oldSheet=mount.querySelector('.tm-sbody'),sheetScroll=oldSheet?oldSheet.scrollTop:0;
    var sheetKey=UI.sheet?UI.sheet.kind+':'+JSON.stringify(UI.sheet.ctx||{})+':'+(UI.sheet.selectedFact||''):'';
    flushActive();
    UI.roShown=false;
    var app=h('div',{class:'tm-app', 'data-theme':UI.theme, dir:isRTL()?'rtl':'ltr',lang:UI.locale});
    if(!UI.production) app.append(devbar());
    var screen=screenFor(routeId());
    var isWorkspace=screen&&screen.classList&&screen.classList.contains('tm-workspace-shell');
    var col=h('div',{class:'tm-col'+(isWorkspace?' workspace-host':'')});
    // Confirmation strip sits in the layout above the screen: it can never cover a
    // footer button, a cancel control or the next sheet (UI-09).
    if(UI.toast) col.append(h('div',{class:'tm-toast',role:'status','aria-live':'polite'},[h('div',{class:'b',text:UI.toast})]));
    col.append(screen);
    if(UI.sheet||overlays().length||UI.webHomeDiscard)col.setAttribute('inert','');
    app.append(col);
    // overlays: info sheet(s) from facade nav
    overlays().forEach(function(ov){ if(ov.type==='information') app.append(infoSheet(ov)); });
    // dirty discard confirmation
    if(pendingDiscard()) app.append(discardSheet());
    if(UI.webHomeDiscard)app.append(discardSheet({confirm:function(){UI.webHomeDiscard=false;UI.cache={};UI.choices={};run('onOpenHome',{},{});},cancel:function(){UI.webHomeDiscard=false;paint();}}));
    // UI-local sheet
    if(UI.sheet){ var sh=renderSheet(); if(sh) app.append(sh); }
    if(UI.webHomeBaseline===null&&!busy())UI.webHomeBaseline=webFormSnapshot(app);
    if(background&&root.TaxMateForegroundUI){var fragment=document.createDocumentFragment();fragment.append(app);root.TaxMateForegroundUI.update(mount,fragment);}else mount.replaceChildren(app);
    // A normal same-route data refresh must not drop the Web brand's focus.
    // Never carry it across navigation or steal focus from a modal/form.
    if(keepBrandFocus){var brand=mount.querySelector('[data-web-brand-home="'+keepBrandFocus+'"]');if(brand&&!brand.closest('[inert]'))brand.focus({preventScroll:true});}
    if(keepTaskFocus){var task=Array.from(mount.querySelectorAll('[data-todo-action]')).find(function(button){return button.dataset.todoAction===keepTaskFocus;});if(task&&!task.disabled&&!task.closest('[inert]'))task.focus({preventScroll:true});}
    if(UI.webHomeDiscard){var webDialog=mount.querySelector('[data-web-home-discard]');if(!oldWebDiscard||discardFocus>=0)webDialog.querySelectorAll('button')[Math.max(0,discardFocus)].focus({preventScroll:true});}
    if(typeof root.scrollTo==='function')root.scrollTo(0,scrollY);
    var newSheet=mount.querySelector('.tm-sbody');if(newSheet&&UI.lastSheetKey===sheetKey)newSheet.scrollTop=sheetScroll;
    if(sheetKey&&UI.lastSheetKey!==sheetKey){var close=mount.querySelector('.tm-dialog-close');if(close)close.focus({preventScroll:true});}
    UI.lastSheetKey=sheetKey;
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

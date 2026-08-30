(function attachCompanyStructuralState(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TaxMateCompanyStructuralState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function companyStructuralStateFactory(){
  'use strict';

  const VERSION=1;
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const cleanId=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(value)?value:null;

  function memoryStorage(){
    const values=new Map();
    return{
      getItem:key=>values.has(key)?values.get(key):null,
      setItem:(key,value)=>values.set(key,String(value)),
      removeItem:key=>values.delete(key)
    };
  }

  function normaliseField(field){
    if(!plain(field)||!cleanId(field.id))throw new Error('Draft field id is required');
    const type=['text','number','select-one','textarea','hidden','checkbox','radio','date'].includes(field.type)?field.type:'text';
    return{id:field.id,type,value:type==='checkbox'||type==='radio'?!!field.value:String(field.value==null?'':field.value)};
  }

  function normaliseDraft(draft){
    if(!plain(draft)||!cleanId(draft.screenId))throw new Error('Draft screen id is required');
    const fields=Array.isArray(draft.fields)?draft.fields.map(normaliseField):[];
    return{
      version:VERSION,
      screenId:draft.screenId,
      fields,
      dirty:!!draft.dirty,
      scrollTop:Number.isFinite(Number(draft.scrollTop))&&Number(draft.scrollTop)>=0?Number(draft.scrollTop):0,
      focusId:cleanId(draft.focusId)||null,
      validation:plain(draft.validation)?clone(draft.validation):{},
      updatedAt:Number.isFinite(Number(draft.updatedAt))?Number(draft.updatedAt):0
    };
  }

  function createDraftStore(options={}){
    const storage=options.storage||memoryStorage(),key=options.key||'taxmateuk_company_ui_drafts_v1',now=typeof options.now==='function'?options.now:Date.now;
    let envelope={version:VERSION,drafts:{},activeScreenId:null};
    try{
      const parsed=JSON.parse(storage.getItem(key)||'null');
      if(plain(parsed)&&parsed.version===VERSION&&plain(parsed.drafts)){
        envelope={version:VERSION,drafts:{},activeScreenId:cleanId(parsed.activeScreenId)||null};
        for(const [id,draft] of Object.entries(parsed.drafts)){
          if(cleanId(id))envelope.drafts[id]=normaliseDraft({...draft,screenId:id});
        }
      }
    }catch(_){ storage.removeItem(key); }
    const persist=()=>storage.setItem(key,JSON.stringify(envelope));
    return Object.freeze({
      key,
      get activeScreenId(){return envelope.activeScreenId;},
      get(screenId){const id=cleanId(screenId);return id&&envelope.drafts[id]?clone(envelope.drafts[id]):null;},
      save(screenId,input={}){
        const id=cleanId(screenId);if(!id)throw new Error('Draft screen id is required');
        const previous=envelope.drafts[id]||{screenId:id,fields:[],dirty:false,scrollTop:0,focusId:null,validation:{}};
        const next=normaliseDraft({...previous,...clone(input),screenId:id,updatedAt:now()});
        envelope.drafts[id]=next;envelope.activeScreenId=id;persist();return clone(next);
      },
      patchField(screenId,field){
        const id=cleanId(screenId),nextField=normaliseField(field),previous=this.get(id)||{screenId:id,fields:[],dirty:false,scrollTop:0,focusId:null,validation:{}};
        const fields=previous.fields.filter(item=>item.id!==nextField.id);fields.push(nextField);
        return this.save(id,{...previous,fields,dirty:true});
      },
      markClean(screenId){const previous=this.get(screenId);return previous?this.save(screenId,{...previous,dirty:false,validation:{}}):null;},
      clear(screenId){const id=cleanId(screenId);if(id)delete envelope.drafts[id];if(envelope.activeScreenId===id)envelope.activeScreenId=null;persist();},
      clearAll(){envelope={version:VERSION,drafts:{},activeScreenId:null};persist();},
      hasDirty(screenId){const draft=this.get(screenId);return!!(draft&&draft.dirty);},
      snapshot(){return clone(envelope);}
    });
  }

  function route(screenId,params={}){
    const id=cleanId(screenId);if(!id)throw new Error('Route screen id is required');
    return{screenId:id,params:plain(params)?clone(params):{}};
  }
  function overlay(id,type,parentScreenId,options={}){
    const overlayId=cleanId(id),screenId=cleanId(parentScreenId);
    if(!overlayId||!screenId)throw new Error('Overlay identity is required');
    return{id:overlayId,type:cleanId(type)||'information',parentScreenId:screenId,returnFocusId:cleanId(options.returnFocusId)||null,payload:plain(options.payload)?clone(options.payload):{}};
  }

  function createWorkflow(seed={}){
    let state={
      version:VERSION,
      routes:Array.isArray(seed.routes)&&seed.routes.length?seed.routes.map(item=>route(item.screenId,item.params)) : [],
      overlays:Array.isArray(seed.overlays)?seed.overlays.map(item=>overlay(item.id,item.type,item.parentScreenId,item)) : [],
      pendingDiscard:null
    };
    const api={
      snapshot:()=>clone(state),
      currentRoute:()=>state.routes.at(-1)||null,
      topOverlay:()=>state.overlays.at(-1)||null,
      enter(screenId,params={},options={}){
        const next=route(screenId,params),current=state.routes.at(-1);
        if(options.replace&&current)state.routes[state.routes.length-1]=next;
        else if(!current||current.screenId!==next.screenId||JSON.stringify(current.params)!==JSON.stringify(next.params))state.routes.push(next);
        state.overlays=[];state.pendingDiscard=null;return api.snapshot();
      },
      openOverlay(id,type,options={}){
        const current=state.routes.at(-1);if(!current)throw new Error('A parent screen is required before opening an overlay');
        state.overlays.push(overlay(id,type,current.screenId,options));state.pendingDiscard=null;return api.snapshot();
      },
      closeOverlay(){const closed=state.overlays.pop()||null;state.pendingDiscard=null;return clone(closed);},
      back(){
        if(state.overlays.length)return{kind:'overlay',closed:api.closeOverlay(),state:api.snapshot()};
        if(state.routes.length>1){const closed=state.routes.pop();state.pendingDiscard=null;return{kind:'route',closed:clone(closed),current:clone(state.routes.at(-1)),state:api.snapshot()};}
        return{kind:'exit',state:api.snapshot()};
      },
      requestDismiss(reason,isDirty){
        if(state.overlays.length)return{kind:'overlay',closed:api.closeOverlay(),state:api.snapshot()};
        if(isDirty){state.pendingDiscard={reason:String(reason||'dismiss'),screenId:state.routes.at(-1)?.screenId||null};return{kind:'confirm_discard',pending:clone(state.pendingDiscard),state:api.snapshot()};}
        state.pendingDiscard=null;return{kind:'dismiss',state:api.snapshot()};
      },
      confirmDiscard(){const pending=clone(state.pendingDiscard);state.pendingDiscard=null;return{kind:'dismiss',pending,state:api.snapshot()};},
      cancelDiscard(){const pending=clone(state.pendingDiscard);state.pendingDiscard=null;return{kind:'stay',pending,state:api.snapshot()};},
      reset(){state={version:VERSION,routes:[],overlays:[],pendingDiscard:null};return api.snapshot();}
    };
    return Object.freeze(api);
  }

  return Object.freeze({VERSION,memoryStorage,normaliseDraft,createDraftStore,createWorkflow});
});

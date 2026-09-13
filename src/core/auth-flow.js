(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TaxMateAuthFlow=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function error(code,stage){return Object.assign(new Error(code),{code,stage});}
  function create({timeoutMs=45000,signal,onStage=()=>{}}={}){
    const controller=new AbortController();
    const relay=()=>controller.abort(signal.reason||error('auth/cancelled-popup-request','cancelled'));
    if(signal){if(signal.aborted)relay();else signal.addEventListener('abort',relay,{once:true});}
    const timer=setTimeout(()=>controller.abort(error('auth/flow-timeout','total')),timeoutMs);
    function check(){if(controller.signal.aborted)throw controller.signal.reason;}
    function wait(task,stage,limitMs=timeoutMs){
      check();onStage(stage,'started');
      return new Promise((resolve,reject)=>{
        let settled=false;
        const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(limit);controller.signal.removeEventListener('abort',abort);fn(value);};
        const abort=()=>finish(reject,controller.signal.reason);
        const limit=setTimeout(()=>{const failure=error('auth/flow-timeout',stage);controller.abort(failure);finish(reject,failure);},limitMs);
        controller.signal.addEventListener('abort',abort,{once:true});
        Promise.resolve().then(()=>{check();return typeof task==='function'?task():task;}).then(value=>{if(settled)return;onStage(stage,'completed');finish(resolve,value);},failure=>finish(reject,failure));
      });
    }
    return {signal:controller.signal,check,wait,cancel:()=>controller.abort(error('auth/cancelled-popup-request','cancelled')),close(){clearTimeout(timer);if(signal)signal.removeEventListener('abort',relay);}};
  }
  return Object.freeze({create,error});
});

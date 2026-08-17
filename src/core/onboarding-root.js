(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.TaxMateOnboardingRoot=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function ensure(doc){const roots=doc.querySelectorAll('#ob-root');if(roots.length!==1)throw new Error('TaxMate requires exactly one onboarding root');return roots[0];}
  function open(doc){const node=ensure(doc);node.classList.add('active');node.setAttribute('aria-hidden','false');doc.body.style.overflow='hidden';return node;}
  function close(doc){const node=ensure(doc);node.classList.remove('active');node.setAttribute('aria-hidden','true');node.innerHTML='';doc.body.style.overflow='';return node;}
  function progress(state,screen,render){if(!state)throw new Error('Onboarding is not active');state.screen=screen;render();return state;}
  return{ensure,open,close,progress};
});

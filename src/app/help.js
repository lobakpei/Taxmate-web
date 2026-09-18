(function(root){
  'use strict';

  function faqRoot(node){return node&&node.closest?node.closest('[data-faq-root]'):null;}
  function normalise(value){return String(value||'').trim().toLocaleLowerCase('en-GB').replace(/\s+/g,' ');}

  function update(container){
    const scope=container&&container.matches&&container.matches('[data-faq-root]')?container:container&&container.querySelector?container.querySelector('[data-faq-root]'):null;
    if(!scope)return;
    const query=normalise(scope.querySelector('[data-faq-search]')?.value);
    const category=scope.dataset.faqCategory||'all';
    let visible=0;
    scope.querySelectorAll('[data-faq-group]').forEach(group=>{
      let groupVisible=0;
      group.querySelectorAll('[data-faq-item]').forEach(item=>{
        const categoryMatch=category==='all'||group.dataset.faqCategory===category;
        const queryMatch=!query||normalise(item.textContent).includes(query);
        const show=categoryMatch&&queryMatch;
        item.hidden=!show;
        if(show){visible++;groupVisible++;}
        else item.open=false;
      });
      group.hidden=groupVisible===0;
    });
    const empty=scope.querySelector('[data-faq-empty]');
    if(empty)empty.hidden=visible!==0;
    const popular=scope.querySelector('[data-faq-popular]');
    if(popular)popular.hidden=!!query||category!=='all';
    const clear=scope.querySelector('[data-faq-clear]');
    if(clear)clear.hidden=!query;
  }

  function selectCategory(scope,category){
    scope.dataset.faqCategory=category;
    scope.querySelectorAll('[data-faq-filter]').forEach(button=>{
      const active=button.dataset.faqFilter===category;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    update(scope);
  }

  function reset(container){
    const scope=container&&container.matches&&container.matches('[data-faq-root]')?container:container&&container.querySelector?container.querySelector('[data-faq-root]'):null;
    if(!scope)return;
    const input=scope.querySelector('[data-faq-search]');
    if(input)input.value='';
    scope.querySelectorAll('[data-faq-item]').forEach(item=>{item.hidden=false;item.open=false;});
    selectCategory(scope,'all');
  }

  document.addEventListener('input',event=>{
    if(!event.target.matches?.('[data-faq-search]'))return;
    update(faqRoot(event.target));
  });

  document.addEventListener('click',event=>{
    const filter=event.target.closest?.('[data-faq-filter]');
    if(filter){selectCategory(faqRoot(filter),filter.dataset.faqFilter||'all');return;}

    const clear=event.target.closest?.('[data-faq-clear]');
    if(clear){
      const scope=faqRoot(clear),input=scope?.querySelector('[data-faq-search]');
      if(input){input.value='';input.focus();}
      update(scope);
      return;
    }

    const popular=event.target.closest?.('[data-faq-open]');
    if(!popular)return;
    const scope=faqRoot(popular),target=scope?.querySelector('#'+popular.dataset.faqOpen);
    if(!scope||!target)return;
    const input=scope.querySelector('[data-faq-search]');
    if(input)input.value='';
    selectCategory(scope,'all');
    target.hidden=false;
    target.open=true;
    target.scrollIntoView({behavior:'smooth',block:'center'});
    target.querySelector('summary')?.focus({preventScroll:true});
  });

  root.TaxMateFAQ=Object.freeze({update,reset});
})(typeof globalThis!=='undefined'?globalThis:this);

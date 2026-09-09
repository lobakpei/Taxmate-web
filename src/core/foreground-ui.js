(function(root){
  'use strict';
  // Patch only a same-account, same-route background refresh. Actual navigation,
  // account switches and access/reset boundaries still replace their surfaces.
  const edited=new WeakSet();let interaction=0;
  for(const event of ['pointerdown','keydown','input','change'])document.addEventListener(event,e=>{if(e.isTrusted)interaction++;},true);
  for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.matches?.('input,textarea,select'))edited.add(e.target);},true);
  const key=node=>node.nodeType===1?(node.id||node.getAttribute('data-fkey')||node.getAttribute('data-field-container')||node.getAttribute('data-field')||node.getAttribute('data-tm-click')||''):'';
  const compatible=(a,b)=>a&&a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&key(a)===key(b)&&(a.nodeName!=='INPUT'||a.type===b.type);
  function children(target,source){
    let cursor=target.firstChild;
    for(const next of [...source.childNodes]){
      let current=cursor;
      if(!compatible(current,next)){current=key(next)?cursor:null;while(current&&!compatible(current,next))current=current.nextSibling;}
      if(!current){target.insertBefore(next,cursor);continue;}
      if(current!==cursor)target.insertBefore(current,cursor);
      patch(current,next);cursor=current.nextSibling;
    }
    while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
  }
  function patch(target,source){
    if(target.nodeType!==1){if(target.nodeValue!==source.nodeValue)target.nodeValue=source.nodeValue;return;}
    const control=target.matches('input,textarea,select'),keep=control&&(edited.has(target)||target===document.activeElement);
    const value=keep?target.value:source.value,checked=keep?target.checked:source.checked;
    const selection=keep&&typeof target.selectionStart==='number'?[target.selectionStart,target.selectionEnd,target.selectionDirection]:null;
    const open=target.nodeName==='DETAILS'?target.open:null,scroll=[target.scrollLeft,target.scrollTop];
    for(const attr of [...target.attributes])if(!source.hasAttribute(attr.name))target.removeAttribute(attr.name);
    for(const attr of [...source.attributes])if(target.getAttribute(attr.name)!==attr.value)target.setAttribute(attr.name,attr.value);
    // The LTD renderer builds native handlers. Replace closures with the new
    // snapshot's handlers while retaining the actual focused DOM control.
    for(const [event,handler]of Object.entries(target.taxmateHandlers||{}))target.removeEventListener(event,handler);
    target.taxmateHandlers=source.taxmateHandlers;
    for(const [event,handler]of Object.entries(source.taxmateHandlers||{}))target.addEventListener(event,handler);
    children(target,source);
    if(control){if(target.type!=='file'&&target.value!==value)target.value=value;if(typeof checked==='boolean')target.checked=checked;if(selection)try{target.setSelectionRange(...selection);}catch(_){}}
    if(open!==null)target.open=open;
    target.scrollLeft=scroll[0];target.scrollTop=scroll[1];
  }
  function update(target,source){const x=root.scrollX,y=root.scrollY;children(target,source);if(root.scrollX!==x||root.scrollY!==y)root.scrollTo(x,y);}
  function html(target,markup){const source=document.createElement('template');source.innerHTML=markup;update(target,source.content);}
  root.TaxMateForegroundUI=Object.freeze({update,html,interactionVersion:()=>interaction});
})(globalThis);

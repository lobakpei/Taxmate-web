(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./domain-schema'):root.TaxMateDomain);
  if(node)module.exports=api;root.TaxMateRevisionSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Domain){
  'use strict';
  if(!Domain)throw new Error('TaxMate domain engine is required');
  const clone=value=>JSON.parse(JSON.stringify(value));
  function canonical(value){if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
  function revisionId(event){return event.id+':'+event.revision;}
  function fingerprint(value){let hash=0x811c9dc5;const input=canonical(value);for(let index=0;index<input.length;index++){hash^=input.charCodeAt(index);hash=Math.imul(hash,0x01000193)>>>0;}return'fnv1a32-'+hash.toString(16).padStart(8,'0');}
  function validateRevisionTransition(previous,next){Domain.validateEconomicEventEnvelope(previous);Domain.validateEconomicEventEnvelope(next);if(previous.id!==next.id)throw new Error('Economic event identity cannot change');if(next.revision!==previous.revision+1)throw new Error('Economic event revision must increase by exactly one');if(next.previousRevisionId!==revisionId(previous))throw new Error('Economic event must reference the previous revision');if(previous.status==='reversed')throw new Error('A reversed economic event is immutable');return true;}
  function mergeEconomicEvents(local,remote){
    const byId=new Map(),conflicts=[];
    const add=(event,side)=>{Domain.validateEconomicEventEnvelope(event);const old=byId.get(event.id);if(!old||event.revision>old.event.revision){byId.set(event.id,{event:clone(event),side,canonical:canonical(event)});return;}if(event.revision<old.event.revision)return;const incoming=canonical(event);if(incoming===old.canonical)return;const candidates=[{side:old.side,event:old.event,canonical:old.canonical},{side,event:clone(event),canonical:incoming}].sort((a,b)=>a.canonical.localeCompare(b.canonical)),chosen=candidates[1];byId.set(event.id,{event:clone(chosen.event),side:chosen.side,canonical:chosen.canonical});conflicts.push({id:event.id+':'+event.revision,eventId:event.id,revision:event.revision,code:'same_revision_diverged',candidates:candidates.map((candidate,index)=>({candidate:index+1,event:clone(candidate.event)}))});};
    (local||[]).forEach(event=>add(event,'local'));(remote||[]).forEach(event=>add(event,'remote'));
    return{events:Array.from(byId.values()).map(item=>item.event).sort((a,b)=>a.id.localeCompare(b.id)),conflicts:conflicts.sort((a,b)=>a.id.localeCompare(b.id))};
  }
  const MAX_STORAGE_BYTES=900*1024;
  function storageBytes(value){return new TextEncoder().encode(JSON.stringify(value)).length;}
  function forStorage(event){Domain.validateEconomicEventEnvelope(event);const stored=Object.assign({schemaVersion:Domain.DOMAIN_SCHEMA_VERSION},clone(event));if(storageBytes(stored)>MAX_STORAGE_BYTES)throw new Error('Economic event envelope exceeds the safe Firestore document limit');return stored;}
  return{MAX_STORAGE_BYTES,canonical,revisionId,fingerprint,validateRevisionTransition,mergeEconomicEvents,forStorage};
});

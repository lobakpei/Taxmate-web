(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./entitlement'):root.TaxMateEntitlement,node?require('./domain-schema'):root.TaxMateDomain,node?require('./revision-sync'):root.TaxMateRevisionSync);
  if(node)module.exports=api;root.TaxMateCompanyAccess=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Entitlement,Domain,RevisionSync){
  'use strict';
  if(!Entitlement||!Domain||!RevisionSync)throw new Error('TaxMate company-access dependencies are required');
  const ACCESS_SCHEMA_VERSION=1,ARCHIVE_RETENTION_MONTHS=24;
  const ALWAYS_ALLOWED=new Set(['read','portable_backup','account_delete']);
  const PRO_ACTIONS=new Set(['create_company','create_event','create_period','create_scenario','confirm_salary','declare_dividend','add_evidence','generate_working_pack']);
  const RETAINED_ACTIONS=new Set(['correct_event','reverse_event']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=256)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;

  function addUtcMonths(timestamp,months){const source=new Date(Number(timestamp));if(!Number.isFinite(source.getTime()))throw new Error('Invalid retention timestamp');const day=source.getUTCDate(),target=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth()+months,1,source.getUTCHours(),source.getUTCMinutes(),source.getUTCSeconds(),source.getUTCMilliseconds())),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(day,lastDay));return target.getTime();}
  function latestAccessEnd(snapshot,now){const values=[snapshot&&snapshot.currentPeriodEnd,snapshot&&snapshot.graceUntil];const grants=snapshot&&snapshot.promotions&&typeof snapshot.promotions==='object'?Object.values(snapshot.promotions):[];for(const grant of grants)if(grant&&grant.expiresAt!=null)values.push(grant.expiresAt);return Math.max(Number(now)||Date.now(),...values.map(Number).filter(Number.isFinite));}
  function retention(snapshot,now,hasExistingLtdData){
    const at=Number(now)||Date.now(),access=Entitlement.resolve(snapshot,at,false);
    if(!hasExistingLtdData)return{state:'none',retainUntil:null,reminder:null};
    if(access.tier==='pro')return{state:'active',retainUntil:null,reminder:null};
    const archivedAt=Number(snapshot&&snapshot.ltdArchive&&snapshot.ltdArchive.startedAt)||latestAccessEnd(snapshot||{},at),retainUntil=Number(snapshot&&snapshot.ltdArchive&&snapshot.ltdArchive.deleteAfter)||addUtcMonths(archivedAt,ARCHIVE_RETENTION_MONTHS),days=Math.ceil((retainUntil-at)/86400000);
    let reminder=null;if(days<=0)reminder='archive_retention_ended';else if(days<=7)reminder='archive_delete_7_days';else if(days<=30)reminder='archive_delete_30_days';
    return{state:days<=0?'retention_ended':'archived',archivedAt,retainUntil,reminder};
  }
  function coreIdentityMatches(previous,next){return previous.id===next.id&&previous.createdAt===next.createdAt&&previous.origin==='company_v1_5'&&next.origin==='company_v1_5'&&previous.sourceTransaction.id===next.sourceTransaction.id&&previous.sourceTransaction.beneficiaryEntityId===next.sourceTransaction.beneficiaryEntityId&&previous.sourceTransaction.companyTransactionType===next.sourceTransaction.companyTransactionType;}
  function retainedTransition(previous,next,reasonCode){
    Domain.validateEconomicEventEnvelope(previous);Domain.validateEconomicEventEnvelope(next);
    if(!text(reasonCode,128)||!/^[a-z0-9][a-z0-9_-]*$/.test(reasonCode))throw new Error('A value-free correction reason code is required');
    if(previous.status==='reversed'||!coreIdentityMatches(previous,next))throw new Error('Retained correction cannot replace event identity');
    RevisionSync.validateRevisionTransition(previous,next);
    const action=next.status==='reversed'?'reversal':'correction';
    if(action==='correction'&&(previous.status!=='committed'||next.status!=='committed'))throw new Error('Downgrade correction must revise an existing committed event');
    const event=clone(next);event.accessDecision={schemaVersion:ACCESS_SCHEMA_VERSION,action,basis:'retained_after_downgrade',previousRevisionId:RevisionSync.revisionId(previous),previousFingerprint:RevisionSync.fingerprint(previous),previousSnapshot:clone(previous),reasonCode};Domain.validateEconomicEventEnvelope(event);return event;
  }
  function decide(input){
    const action=input&&input.action,at=Number(input&&input.now)||Date.now(),offline=input&&input.offline===true,access=Entitlement.resolve(input&&input.snapshot,at,offline),base={tier:access.tier,source:access.source};
    if(ALWAYS_ALLOWED.has(action))return{...base,allowed:true,mode:'retained'};
    if(PRO_ACTIONS.has(action))return access.tier==='pro'&&!offline?{...base,allowed:true,mode:'pro'}:{...base,allowed:false,mode:'blocked',reason:offline?'trusted_entitlement_offline':'pro_required'};
    if(RETAINED_ACTIONS.has(action)){
      if(offline)return{...base,allowed:false,mode:'blocked',reason:'retained_correction_requires_online'};
      if(access.tier==='pro')return{...base,allowed:true,mode:'pro'};
      try{return{...base,allowed:true,mode:'retained_correction',event:retainedTransition(input.previousEvent,input.nextEvent,input.reasonCode)};}catch(error){return{...base,allowed:false,mode:'blocked',reason:'invalid_retained_transition',detail:String(error&&error.message||error)};}
    }
    return{...base,allowed:false,mode:'blocked',reason:'unknown_company_action'};
  }
  return{ACCESS_SCHEMA_VERSION,ARCHIVE_RETENTION_MONTHS,ALWAYS_ALLOWED,PRO_ACTIONS,RETAINED_ACTIONS,addUtcMonths,retention,retainedTransition,decide};
});

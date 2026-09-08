(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./entitlement'):root.TaxMateEntitlement,node?require('./domain-schema'):root.TaxMateDomain,node?require('./revision-sync'):root.TaxMateRevisionSync);
  if(node)module.exports=api;root.TaxMateCompanyAccess=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Entitlement,Domain,RevisionSync){
  'use strict';
  if(!Entitlement||!Domain||!RevisionSync)throw new Error('TaxMate company-access dependencies are required');
  const ACCESS_SCHEMA_VERSION=4,UK_TAX_YEAR_START_MONTH=Entitlement.UK_TAX_YEAR_START_MONTH,UK_TAX_YEAR_START_DAY=Entitlement.UK_TAX_YEAR_START_DAY,DAY=86400000;
  const ALWAYS_ALLOWED=new Set(['account_delete','read_archived_access_status']);
  const RETAINED_DATA_ACTIONS=new Set(['read','portable_backup','full_backup','download_evidence']);
  const LTD_PRO_ACTIONS=new Set([
    'create_company','resume_company_draft','create_event','edit_draft_event','correct_event','reverse_event',
    'create_period','create_scenario','confirm_salary','declare_dividend','record_dividend_payment','add_evidence',
    'edit_company','change_ownership','companies_house_lookup','generate_working_pack','cloud_sync','portable_backup',
    'restore','remove_company'
  ]);
  const FOUNDER_APPROVED_LTD_PLAN_MAPPING=Object.freeze({
    status:'approved',version:'ltd-v1.5-pro-only.2026-08-29',oneActiveLtdIncluded:1,additionalLtdSupported:false,
    pricing:Object.freeze({currency:'GBP',monthly:Object.freeze({launchMinor:999,standardMinor:1199,copy:'Launch price £9.99/month',standardCopy:'Standard price £11.99/month'}),annual:Object.freeze({status:'founder_approved',amountMinor:9999,copy:'£99.99/year'}),existingUserMigration:false}),
    actions:Object.freeze(Object.fromEntries(Array.from(LTD_PRO_ACTIONS).map(action=>[action,'pro'])))
  });
  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=256)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;

  const ukDateParts=Entitlement.ukDateParts,taxYearRetentionBoundary=Entitlement.taxYearRetentionBoundary;
  function dateOrdinal(parts){return Date.UTC(parts.year,parts.month-1,parts.day);}
  function latestAccessEnd(snapshot={},now){
    const at=Number(now)||Date.now(),values=[snapshot.accountRetention?.paidAccessEndedAt,snapshot.currentPeriodEnd,snapshot.graceUntil,snapshot.promotionAccess?.plusExpiresAt,snapshot.promotionAccess?.proExpiresAt,snapshot.paidAccess?.plusExpiresAt,snapshot.paidAccess?.proExpiresAt];
    if(snapshot.subscriptionStatus==='refunded')values[1]=snapshot.refundedAt;
    const grants=snapshot.promotions&&typeof snapshot.promotions==='object'?Object.values(snapshot.promotions):snapshot.promotion?[snapshot.promotion]:[];
    for(const grant of grants)if(grant&&grant.expiresAt!=null&&['plus','pro'].includes(grant.tier))values.push(grant.expiresAt);
    const ended=values.map(Number).filter(value=>Number.isFinite(value)&&value>0&&value<=at);
    if(ended.length)return Math.max(...ended);
    const archivedAt=Number(snapshot.ltdArchive?.startedAt);
    return Number.isFinite(archivedAt)&&archivedAt>0&&archivedAt<=at?archivedAt:null;
    // Verification time is never evidence of paid access ending.
  }
  function retention(snapshot,now,hasExistingLtdData){
    const at=Number(now)||Date.now(),access=Entitlement.resolve(snapshot,at,false);
    if(!hasExistingLtdData)return{policy:'uk_tax_year_end',state:'none',retainUntil:null,retainThroughDate:null,deleteOnDate:null,reminder:null};
    if(access.tier==='pro'||access.tier==='plus')return{policy:'uk_tax_year_end',state:'active',retainUntil:null,retainThroughDate:null,deleteOnDate:null,reminder:null};
    const archivedAt=latestAccessEnd(snapshot||{},at);if(!archivedAt)return{policy:'uk_tax_year_end',state:'retention_unknown',retainUntil:null,retainThroughDate:null,deleteOnDate:null,reminder:'tax_year_retention_date_required'};
    const boundary=taxYearRetentionBoundary(archivedAt),today=ukDateParts(at),deleteOn=ukDateParts(boundary.retainUntil),days=Math.round((dateOrdinal(deleteOn)-dateOrdinal(today))/DAY),ended=days<=0;
    let reminder=null;if(ended)reminder='tax_year_retention_ended';else if(days<=7)reminder='tax_year_delete_7_days';else if(days<=30)reminder='tax_year_delete_30_days';
    return{policy:'uk_tax_year_end',state:ended?'retention_ended':'retained_read_only',archivedAt,retainUntil:boundary.retainUntil,retainThroughDate:boundary.retainThroughDate,deleteOnDate:boundary.deleteOnDate,reminder};
  }
  function coreIdentityMatches(previous,next){return previous.id===next.id&&previous.createdAt===next.createdAt&&previous.origin==='company_v1_5'&&next.origin==='company_v1_5'&&previous.sourceTransaction.id===next.sourceTransaction.id&&previous.sourceTransaction.beneficiaryEntityId===next.sourceTransaction.beneficiaryEntityId&&previous.sourceTransaction.companyTransactionType===next.sourceTransaction.companyTransactionType;}
  function retainedTransition(previous,next,reasonCode){
    Domain.validateEconomicEventEnvelope(previous);Domain.validateEconomicEventEnvelope(next);
    if(!text(reasonCode,128)||!/^[a-z0-9][a-z0-9_-]*$/.test(reasonCode))throw new Error('A value-free correction reason code is required');
    if(previous.status==='reversed'||!coreIdentityMatches(previous,next))throw new Error('Retained correction cannot replace event identity');
    RevisionSync.validateRevisionTransition(previous,next);
    const action=next.status==='reversed'?'reversal':'correction';
    if(action==='correction'&&(previous.status!=='committed'||next.status!=='committed'))throw new Error('Downgrade correction must revise an existing committed event');
    const event=clone(next);event.accessDecision={schemaVersion:1,action,basis:'retained_after_downgrade',previousRevisionId:RevisionSync.revisionId(previous),previousFingerprint:RevisionSync.fingerprint(previous),previousSnapshot:clone(previous),reasonCode};Domain.validateEconomicEventEnvelope(event);return event;
  }
  function approvedTierFor(action,mapping){
    if(!mapping||mapping.status!=='approved'||!text(mapping.version,64)||!mapping.actions||typeof mapping.actions!=='object')return null;
    const tier=mapping.actions[action];
    return tier==='free'||tier==='plus'||tier==='pro'?tier:null;
  }
  function decide(input){
    const action=input&&input.action,at=Number(input&&input.now)||Date.now(),offline=input&&input.offline===true,snapshot=input&&input.snapshot||{},access=Entitlement.resolve(snapshot,at,offline),hasRetentionContext=!!(input&&input.hasExistingLtdData===true||snapshot&&snapshot.ltdArchive||snapshot&&snapshot.lastPaidTier==='pro'||snapshot&&snapshot.paidTier==='pro'),retained=retention(snapshot,at,hasRetentionContext),base={tier:access.tier,source:access.source};
    if(ALWAYS_ALLOWED.has(action))return{...base,allowed:true,mode:'retained',retention:retained};
    if(action==='cloud_hydrate'){
      if(access.tier==='pro')return{...base,allowed:true,mode:'approved_mapping',requiredTier:'pro',writeAllowed:true,retention:retained};
      if(retained.state==='retained_read_only'||retained.state==='active')return{...base,allowed:true,mode:'retained_discovery_read',requiredTier:'pro',writeAllowed:false,retention:retained};
      const unknown=retained.state==='retention_unknown';return{...base,allowed:false,mode:unknown?'retention_unknown':'retention_ended',reason:unknown?'tax_year_retention_date_required':'tax_year_retention_ended',requiredTier:'pro',writeAllowed:false,retention:retained};
    }
    if(RETAINED_DATA_ACTIONS.has(action)){
      if(access.tier==='pro')return{...base,allowed:true,mode:offline?'approved_offline_entitlement':'approved_mapping',requiredTier:'pro',mappingVersion:(input&&input.planMapping||FOUNDER_APPROVED_LTD_PLAN_MAPPING).version};
      return hasRetentionContext&&['retained_read_only','active'].includes(retained.state)
        ?{...base,allowed:true,mode:'retained_read_export',requiredTier:'pro',writeAllowed:false,retention:retained}
        :hasRetentionContext&&retained.state==='retention_unknown'
          ?{...base,allowed:false,mode:'retention_unknown',reason:'tax_year_retention_date_required',requiredTier:'pro',writeAllowed:false,retention:retained}
          :hasRetentionContext
            ?{...base,allowed:false,mode:'retention_ended',reason:'tax_year_retention_ended',requiredTier:'pro',writeAllowed:false,retention:retained}
        :{...base,allowed:false,mode:'blocked',reason:'pro_required',requiredTier:'pro'};
    }
    if(LTD_PRO_ACTIONS.has(action)){
      const mapping=input&&input.planMapping||FOUNDER_APPROVED_LTD_PLAN_MAPPING,requiredTier=approvedTierFor(action,mapping);
      if(!requiredTier)return{...base,allowed:false,mode:'blocked',reason:'invalid_ltd_plan_mapping'};
      const rank={free:0,plus:1,pro:2};
      return rank[access.tier]>=rank[requiredTier]?{...base,allowed:true,mode:offline?'approved_offline_entitlement':'approved_mapping',requiredTier,mappingVersion:mapping.version}:{...base,allowed:false,mode:'blocked',reason:'pro_required',requiredTier,mappingVersion:mapping.version};
    }
    return{...base,allowed:false,mode:'blocked',reason:'unknown_company_action'};
  }
  return{ACCESS_SCHEMA_VERSION,UK_TAX_YEAR_START_MONTH,UK_TAX_YEAR_START_DAY,ALWAYS_ALLOWED,RETAINED_DATA_ACTIONS,LTD_PRO_ACTIONS,FOUNDER_APPROVED_LTD_PLAN_MAPPING,ukDateParts,taxYearRetentionBoundary,latestAccessEnd,retention,retainedTransition,approvedTierFor,decide};
});

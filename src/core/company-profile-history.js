(function attachCompanyProfileHistory(root,factory){
  const money=typeof module==='object'&&module.exports?require('./money'):root.TaxMateMoney;
  const domain=typeof module==='object'&&module.exports?require('./domain-schema'):root.TaxMateDomain;
  const api=factory(money,domain);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TaxMateCompanyProfileHistory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function companyProfileHistoryFactory(Money,Domain){
  'use strict';
  if(!Money||!Domain)throw new Error('Money and domain engines are required');
  const HISTORY_SCHEMA_VERSION=1;
  const CORRECTABLE_FIELDS=Object.freeze(['legalName','companyNumber','incorporationDate','tradingStatus','tradingStartDate','accountingPeriod','corporationTaxStatus']);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const auditValue=value=>value===undefined?null:clone(value);
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const text=(value,max=512)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
  const stamp=input=>Number(input&&input.now)||Date.now();
  const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  function assertEvidence(refs){if(!Array.isArray(refs)||!refs.length||refs.some(ref=>!text(ref,512)))throw new Error('Company correction evidence is required');return clone(refs);}
  function validateShareholders(shareholders){
    if(!Array.isArray(shareholders)||!shareholders.length)throw new Error('Ownership requires shareholders');
    const ids=new Set();for(const holder of shareholders){if(!plain(holder)||!text(holder.id,128)||ids.has(holder.id)||!text(holder.name,300)||!text(holder.shareClassId,128)||!Number.isSafeInteger(holder.shares)||holder.shares<=0||typeof holder.isAccountHolder!=='boolean')throw new Error('Invalid ownership shareholder');ids.add(holder.id);}
    const totalShares=Money.sumMinor(shareholders.map(holder=>holder.shares),'Ownership shares'),basis=Money.allocateMinor(10000,shareholders.map(holder=>holder.shares));
    return shareholders.map((holder,index)=>({...clone(holder),ownershipBasisPoints:basis[index],shares:holder.shares,totalShares}));
  }
  function seedOwnership(profile){
    const shareholders=validateShareholders(profile.shareholders).map(({totalShares,...holder})=>holder);
    return{schemaVersion:HISTORY_SCHEMA_VERSION,id:`${profile.id}:ownership:1`,entityId:profile.entityId,version:1,effectiveFrom:profile.incorporationDate,effectiveTo:null,shareClassId:profile.shareClasses[0].id,shareholders,evidenceRefs:[`company-profile:${profile.id}:confirmed`],sourceRevisionId:null,createdAt:profile.confirmedAt||profile.createdAt,updatedAt:profile.updatedAt,deviceId:profile.deviceId};
  }
  function ensureHistory(profile){
    Domain.validateCompanyProfile(profile);const next=clone(profile);
    next.profileRevisionHistory=Array.isArray(next.profileRevisionHistory)?next.profileRevisionHistory:[];
    next.ownershipHistory=Array.isArray(next.ownershipHistory)&&next.ownershipHistory.length?next.ownershipHistory:[seedOwnership(next)];
    return next;
  }
  function repairOwnershipHistory(profile){
    const source=clone(profile||{}),history=Array.isArray(source.ownershipHistory)?source.ownershipHistory.slice():[];
    if(!history.length||!Array.isArray(source.profileRevisionHistory)||!Array.isArray(source.shareholders)||!source.shareholders.length)return source;
    const normalizedProfile=validateShareholders(source.shareholders).map(({totalShares,...holder})=>holder);
    const ordered=history.slice().sort((a,b)=>String(a.effectiveFrom).localeCompare(String(b.effectiveFrom))||Number(a.version)-Number(b.version));
    const revisions=source.profileRevisionHistory.filter(item=>item&&item.kind==='effective_change'&&item.field==='ownership'&&item.status==='applied'&&Domain.isoDate(item.effectiveDate)&&Array.isArray(item.after)).slice().sort((a,b)=>Number(a.revision)-Number(b.revision));
    for(const revision of revisions){
      let shareholders;try{shareholders=validateShareholders(revision.after).map(({totalShares,...holder})=>holder);}catch(_){continue;}
      const linked=ordered.find(item=>item.sourceRevisionId===revision.id||item.effectiveFrom===revision.effectiveDate&&same(item.shareholders,shareholders));
      if(linked)continue;
      const prior=ordered.filter(item=>item.effectiveFrom<revision.effectiveDate).at(-1);
      if(!prior||ordered.some(item=>item.effectiveFrom>revision.effectiveDate))continue;
      const now=Number(revision.updatedAt)||Number(source.updatedAt)||Date.now();
      prior.effectiveTo=revision.effectiveDate;prior.updatedAt=now;prior.deviceId=revision.deviceId||source.deviceId;
      ordered.push({schemaVersion:HISTORY_SCHEMA_VERSION,id:`${source.id}:ownership:${Number(prior.version)+1}`,entityId:source.entityId,version:Number(prior.version)+1,effectiveFrom:revision.effectiveDate,effectiveTo:null,shareClassId:source.shareClasses[0].id,shareholders,evidenceRefs:clone(revision.evidenceRefs),sourceRevisionId:revision.id,createdAt:Number(revision.createdAt)||now,updatedAt:now,deviceId:revision.deviceId||source.deviceId});
      ordered.sort((a,b)=>String(a.effectiveFrom).localeCompare(String(b.effectiveFrom))||Number(a.version)-Number(b.version));
    }
    if(ordered.length>1)for(let index=0;index<ordered.length-1;index++){
      if(ordered[index].effectiveTo==null&&ordered[index+1].effectiveFrom>ordered[index].effectiveFrom){ordered[index].effectiveTo=ordered[index+1].effectiveFrom;ordered[index].updatedAt=Math.max(Number(ordered[index].updatedAt)||0,Number(ordered[index+1].updatedAt)||0);}
    }
    const open=ordered.at(-1);
    const applied=open&&revisions.find(item=>{if(item.id!==open.sourceRevisionId||item.effectiveDate!==open.effectiveFrom)return false;try{return same(validateShareholders(item.after).map(({totalShares,...holder})=>holder),open.shareholders);}catch(_){return false;}});
    if(open&&open.effectiveTo==null&&(same(open.shareholders,normalizedProfile)||applied)){
      source.ownershipHistory=ordered;source.shareholders=clone(open.shareholders);
      if(applied){source.updatedAt=Math.max(Number(source.updatedAt)||0,Number(open.updatedAt)||0,Number(applied.updatedAt)||0);source.deviceId=applied.deviceId||open.deviceId||source.deviceId;}
    }
    return source;
  }
  function recordsAffected(field,records={}){
    const all=[];for(const [kind,values] of Object.entries(records||{}))for(const item of Array.isArray(values)?values:[])if(item&&item.id)all.push({kind,id:item.id,date:item.declarationDate||item.payDate||item.startDate||item.sourceTransaction&&item.sourceTransaction.date||null});
    if(field==='legalName'||field==='companyNumber'||field==='corporationTaxStatus')return[];
    if(field==='tradingStatus'||field==='tradingStartDate')return all.filter(item=>['events','periods','losses'].includes(item.kind));
    return all;
  }
  function fieldStatus(profile,field,records={}){
    if(field==='ownership')return{field,status:'effective_change_required',reason:'ownership_is_time_dependent'};
    if(!CORRECTABLE_FIELDS.includes(field))return{field,status:'immutable',reason:'field_not_in_controlled_correction_contract'};
    const affected=recordsAffected(field,records);
    return{field,status:affected.length?'review_before_correction':'setup_correction_available',reason:affected.length?'dependent_records_exist':'no_dependent_records',affectedRecordIds:affected.map(item=>item.id)};
  }
  function nextRevision(profile,input){
    const history=profile.profileRevisionHistory||[],revision=history.length+1,now=stamp(input);
    return{schemaVersion:HISTORY_SCHEMA_VERSION,id:`${profile.id}:profile-revision:${revision}`,entityId:profile.entityId,revision,kind:input.kind,field:input.field,before:auditValue(input.before),after:auditValue(input.after),effectiveDate:input.effectiveDate||null,reason:String(input.reason||'').trim(),evidenceRefs:assertEvidence(input.evidenceRefs),impact:clone(input.impact||{status:'none',affectedRecordIds:[]}),status:input.status,createdAt:now,updatedAt:now,deviceId:input.deviceId||profile.deviceId};
  }
  function applySetupCorrection(input){
    const source=ensureHistory(input&&input.profile),field=input&&input.field;if(!CORRECTABLE_FIELDS.includes(field))throw new Error('Field is not available for setup correction');
    if(!text(input.reason,1000))throw new Error('Company correction reason is required');
    const affected=recordsAffected(field,input.records),impact={status:affected.length?'dependent_records_review_required':'safe_to_apply',affectedRecordIds:affected.map(item=>item.id),affectedRecords:affected};
    const status=affected.length?'review_required':'applied',revision=nextRevision(source,{...input,kind:'setup_correction',before:source[field],after:input.value,impact,status});
    source.profileRevisionHistory.push(revision);
    if(status==='applied'){source[field]=clone(input.value);source.updatedAt=revision.updatedAt;source.deviceId=revision.deviceId;}
    return{status,reasons:affected.length?['dependent_company_records_require_review']:[],profile:source,revision,impact};
  }
  function orderedHistory(profile){return ensureHistory(profile).ownershipHistory.slice().sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||a.version-b.version);}
  function ownershipAtDate(profile,date){
    if(!Domain.isoDate(date))throw new Error('Ownership lookup date is invalid');
    const candidates=orderedHistory(profile).filter(version=>version.effectiveFrom<=date&&(version.effectiveTo==null||date<version.effectiveTo));
    if(candidates.length!==1)throw new Error('Ownership history is missing or overlaps for the requested date');return clone(candidates[0]);
  }
  function verifiedOwnershipAtDate(profile,date){
    if(!profile||!Domain.isoDate(date)||!Array.isArray(profile.ownershipHistory))return null;
    const candidates=profile.ownershipHistory.filter(version=>{try{Domain.validateCompanyOwnershipVersion(version,profile);return version.effectiveFrom<=date&&(version.effectiveTo==null||date<version.effectiveTo);}catch(_){return false;}});
    return candidates.length===1?clone(candidates[0]):null;
  }
  function recordOwnershipChange(input){
    const source=ensureHistory(input&&input.profile),effectiveDate=input&&input.effectiveDate;if(!Domain.isoDate(effectiveDate)||effectiveDate<source.incorporationDate)throw new Error('Ownership effective date is invalid');
    if(!text(input.reason,1000))throw new Error('Ownership change reason is required');const evidenceRefs=assertEvidence(input.evidenceRefs),history=orderedHistory(source),current=history.at(-1);
    if(effectiveDate<=current.effectiveFrom)throw new Error('Ownership change must start after the current ownership version');
    const shareholders=validateShareholders(input.shareholders).map(({totalShares,...holder})=>holder),affected=(input.dividendDeclarations||[]).filter(record=>record&&record.declarationDate>=effectiveDate).map(record=>record.id);
    const impact={status:affected.length?'declared_dividend_review_required':'safe_to_apply',affectedRecordIds:affected};
    const revision=nextRevision(source,{...input,kind:'effective_change',field:'ownership',before:current.shareholders,after:shareholders,impact,status:affected.length?'review_required':'applied'});
    source.profileRevisionHistory.push(revision);
    if(affected.length)return{status:'review_required',reasons:['existing_dividend_uses_affected_ownership_date'],profile:source,revision,impact,ownershipVersion:null};
    const version={schemaVersion:HISTORY_SCHEMA_VERSION,id:`${source.id}:ownership:${current.version+1}`,entityId:source.entityId,version:current.version+1,effectiveFrom:effectiveDate,effectiveTo:null,shareClassId:source.shareClasses[0].id,shareholders,evidenceRefs,sourceRevisionId:revision.id,createdAt:revision.createdAt,updatedAt:revision.updatedAt,deviceId:revision.deviceId};
    source.ownershipHistory=history.map(item=>item.id===current.id?{...item,effectiveTo:effectiveDate,updatedAt:revision.updatedAt,deviceId:revision.deviceId}:item);source.ownershipHistory.push(version);source.shareholders=clone(shareholders);source.updatedAt=revision.updatedAt;source.deviceId=revision.deviceId;Domain.validateCompanyProfile(source);
    return{status:'applied',reasons:[],profile:source,revision,impact,ownershipVersion:clone(version)};
  }
  function profileAtDate(profile,date){const version=ownershipAtDate(profile,date);return{...clone(profile),shareholders:clone(version.shareholders)};}
  return Object.freeze({HISTORY_SCHEMA_VERSION,CORRECTABLE_FIELDS,ensureHistory,repairOwnershipHistory,fieldStatus,recordsAffected,applySetupCorrection,recordOwnershipChange,ownershipAtDate,verifiedOwnershipAtDate,profileAtDate,validateShareholders});
});

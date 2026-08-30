(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TaxMateAssistant=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA_VERSION=1;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
  const yearRange=taxYear=>{
    const start=Number(String(taxYear||'').slice(0,4));
    if(!Number.isInteger(start))return null;
    return{from:`${start}-04-06`,to:`${start+1}-04-05`};
  };
  const inYear=(date,taxYear)=>{const range=yearRange(taxYear);return!!range&&isoDate(date)&&date>=range.from&&date<=range.to;};
  const emptyState=()=>({schemaVersion:SCHEMA_VERSION,decisions:{},hiddenReminders:{}});
  function normalizeState(value){
    const source=plain(value)?value:{};
    return{schemaVersion:SCHEMA_VERSION,decisions:plain(source.decisions)?clone(source.decisions):{},hiddenReminders:plain(source.hiddenReminders)?clone(source.hiddenReminders):{}};
  }
  function deriveTasks(input={}){
    const state=plain(input.state)?input.state:{},taxYear=String(input.taxYear||''),assistant=normalizeState(input.assistantState),businesses=Array.isArray(state.businesses)?state.businesses:[],entries=Array.isArray(state.entries)?state.entries:[],profiles=state.domain&&Array.isArray(state.domain.companyProfiles)?state.domain.companyProfiles:[];
    const businessById=new Map(businesses.filter(item=>item&&item.id).map(item=>[item.id,item]));
    const tasks=[];
    const profile=profiles.find(item=>item&&item.deletedAt==null);
    if(profile&&profile.lifecycleStatus!=='confirmed')tasks.push({id:`ltd-setup:${profile.entityId||profile.id||'active'}`,category:'action_required',kind:'ltd_setup',companyId:profile.entityId||null,companyName:profile.legalName||'Limited company',reasonCode:'ltd_setup_incomplete',dismissible:false,actions:['resume_ltd_setup','remove_ltd_setup']});

    for(const entry of entries){
      if(!entry||entry.deletedAt!=null||!inYear(entry.date,taxYear))continue;
      const missing=[];
      if(!(Number(entry.amount)>0))missing.push('amount');
      if(!entry.bizId||!businessById.has(entry.bizId))missing.push('business');
      if(!entry.cat)missing.push('category');
      if(missing.length)tasks.push({id:`entry-required:${entry.id}`,category:'action_required',kind:'entry_required',entryId:entry.id,businessId:entry.bizId||null,businessName:businessById.get(entry.bizId)&&businessById.get(entry.bizId).name||null,entryKind:entry.kind,amount:Number(entry.amount)||0,description:entry.desc||'',reasonCode:'entry_required_fact_missing',fields:missing,dismissible:false,actions:['fix_entry']});
      const dateTaskId=`entry-date:${entry.id}`;
      if(!missing.length&&entry.dateTBC===true&&assistant.decisions[dateTaskId]!=='keep_estimated_date')tasks.push({id:dateTaskId,category:'needs_decision',kind:'entry_exact_date',entryId:entry.id,businessId:entry.bizId||null,businessName:businessById.get(entry.bizId)&&businessById.get(entry.bizId).name||null,entryKind:entry.kind,amount:Number(entry.amount)||0,description:entry.desc||'',reasonCode:'entry_exact_date_missing',dismissible:false,actions:['add_exact_date','keep_estimated_date']});
    }

    if(input.receiptReminders!==false){
      const groups=new Map();
      for(const entry of entries){
        if(!entry||entry.deletedAt!=null||entry.kind!=='expense'||!inYear(entry.date,taxYear)||entry.receiptPath||entry.receiptUrl)continue;
        if(!businessById.has(entry.bizId))continue;
        const list=groups.get(entry.bizId)||[];list.push(entry);groups.set(entry.bizId,list);
      }
      for(const [businessId,rows] of groups){
        const id=`receipt:${taxYear}:${businessId}`,business=businessById.get(businessId);
        tasks.push({id,category:'helpful_reminder',kind:'receipt_missing',businessId,businessName:business.name,taxYear,count:rows.length,entryIds:rows.map(row=>row.id).sort(),reasonCode:'receipt_photos_missing',dismissible:true,hidden:assistant.hiddenReminders[id]===true,actions:['open_receipts','dismiss_reminder']});
      }
    }
    const priority={action_required:0,needs_decision:1,helpful_reminder:2};
    return tasks.sort((a,b)=>priority[a.category]-priority[b.category]||a.id.localeCompare(b.id));
  }
  function visibleTasks(tasks){return(tasks||[]).filter(task=>task.hidden!==true);}
  function hiddenTasks(tasks){return(tasks||[]).filter(task=>task.hidden===true);}
  function taskById(tasks,id){return(tasks||[]).find(task=>task.id===id)||null;}
  return{SCHEMA_VERSION,emptyState,normalizeState,deriveTasks,visibleTasks,hiddenTasks,taskById,inYear};
});

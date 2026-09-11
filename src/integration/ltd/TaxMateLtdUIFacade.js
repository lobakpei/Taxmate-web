(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./company-structural-state'):root.TaxMateCompanyStructuralState);
  if(node)module.exports=api;
  root.TaxMateLtdUIFacadeModule=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Structural){
'use strict';

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const COPY_KEY_BY_REASON=Object.freeze({pro_required:'plan.ltd_pro_only',tax_year_retention_ended:'plan.ltd_retention_ended',tax_year_retention_date_required:'plan.ltd_retention_date_required',one_active_ltd_limit:'add.one_ltd_limit'});
const semanticError=(reasonCode='facade_failure',params={})=>({reasonCode,copyKey:COPY_KEY_BY_REASON[reasonCode]||'error.fix_issue',params:clone(params)});
const fieldError=(field,reasonCode,copyKey='error.fix_issue',params={})=>({field,reasonCode,copyKey,params:clone(params)});
const CALLBACKS=Object.freeze([
  'onDiscardCompanySetup',
  'onUpdatePayrollReporting','onSaveStatutoryReview',
  'onOpenHome','onAddBusiness','onAddBusinessCategoryChosen','onSelfEmployedStructureChosen','onOpenLegacyBusiness','onEditLegacyBusiness','onOpenExistingCompany','onResumeCompanyDraft','onSaveCompanyDraft','onContinueStep','onLookupCompaniesHouse','onRecheckCompaniesHouse','onPlanCompanyPeriods','onFixCompanyFact','onDraftChanged',
  'onOpenInfo','onCloseInfo','onBack','onDismissRequested','onDiscardConfirmed','onDiscardCancelled','onSetWorkspaceArea','onOpenMetric',
  'onAddIncome','onAddExpense','onAddSharedExpense','onAddPersonallyPaidExpense','onAddDirectorLoanFunding','onRecordDirectorLoanRepayment','onRecordShareFunding','onCreateSalesInvoice','onRecordSalesInvoicePayment','onCorrectSalesInvoice','onVoidSalesInvoice','onCreateSupplierBill','onRecordSupplierBillPayment','onCorrectSupplierBill','onVoidSupplierBill','onRegisterCompanyAsset','onRecordCompanyAssetPayment','onCorrectCompanyAsset','onVoidCompanyAsset','onRecordCompanyDepreciation','onReverseCompanyDepreciation','onReverseCompanyBookPayment','onMatchBankStatement','onDeleteBankReconciliation','onPrepareCompanyYear','onDownloadSelfFilingPack','onOpenRecord','onEditDraft','onSaveDraftEdit','onDeleteDraft','onCorrectRecord',
  'onRunCtEstimate','onRunScenario','onRecordSalary','onDeclareDividend','onRecordDividendPayment','onOpenCompanyEdit','onEditCompany','onOpenOwnershipChange','onChangeOwnership','onDownloadWorkingPack','onRemoveCompany','onResetPreview'
]);

class TaxMateLtdUIFacade{
  constructor(options={}){
    if(!options.driver)throw new Error('A canonical Ltd domain driver is required');
    this.driver=options.driver;
    this.drafts=Structural.createDraftStore({storage:options.storage||Structural.memoryStorage(),key:options.draftKey||`taxmate-ltd-fable-drafts-${this.driver.mode}`});
    const savedSetup=this.drafts.getSetup();if(savedSetup&&savedSetup.pending){try{this.driver.restorePendingSetup(savedSetup.pending);}catch(_){/* Invalid local drafts never replace canonical account state. */}}
    this.driver.persistPendingSetup=pending=>this.drafts.saveSetup({...this.drafts.getSetup(),schemaVersion:1,companyId:pending.entityId,resumeScreen:this.workflow.currentRoute()?.screenId,pending});
    this.setupExit=null;
    this.workflow=Structural.createWorkflow({routes:[{screenId:'home',params:{mode:this.driver.mode}}]});
    this.busy={active:false,action:null};
    this.prepareAction=typeof options.prepareAction==='function'?options.prepareAction:null;
    this.actionTimeoutMs=Math.max(100,Math.min(120000,Number(options.actionTimeoutMs)||30000));
    this.trace=typeof options.trace==='function'?options.trace:null;
    this.actionSequence=0;
    this.lastResult=null;
    this.listeners=new Set();
  }

  get callbackNames(){return CALLBACKS.slice();}
  subscribe(listener){if(typeof listener!=='function')throw new Error('Listener must be a function');this.listeners.add(listener);listener(this.getSnapshot());return()=>this.listeners.delete(listener);}
  emit(){const snapshot=this.getSnapshot();for(const listener of this.listeners)listener(snapshot);return snapshot;}
  getSnapshot(){return{...this.driver.readSnapshot(),navigation:this.workflow.snapshot(),drafts:this.drafts.snapshot(),setupExit:clone(this.setupExit),busy:clone(this.busy),lastResult:clone(this.lastResult),callbacks:this.callbackNames};}
  result(value={}){return{status:value.status||'ok',data:value.data==null?null:clone(value.data),fieldErrors:clone(value.fieldErrors||[]),reviewReasons:clone(value.reviewReasons||[]),busy:false,error:value.error?clone(value.error):null,nextRoute:value.nextRoute||null,snapshot:this.getSnapshot()};}
  fail(error){return this.result({status:'failure',error:semanticError(error&&error.code||'facade_failure')});}
  route(screenId,params={},replace=false){this.workflow.enter(screenId,params,{replace});return this.emit();}
  actionTrace(value){if(!this.trace)return;try{this.trace(Object.freeze({...value}));}catch(_){}}

  execute(action,input,handler){
    if(this.busy.active)return Promise.resolve(this.result({status:'busy',error:semanticError('action_in_progress',{action:this.busy.action})}));
    const startedAt=Date.now(),correlationId=`ltd-action-${++this.actionSequence}`,route=this.workflow.currentRoute(),routeId=route&&route.screenId||'unknown';
    this.busy={active:true,action};this.actionTrace({correlationId,action,route:routeId,result:'started'});this.emit();
    return new Promise(resolve=>{
      let settled=false;
      const finish=(kind,createPayload)=>{if(settled)return;settled=true;clearTimeout(timer);this.busy={active:false,action:null};this.actionTrace({correlationId,action,route:routeId,result:kind,durationMs:Math.max(0,Date.now()-startedAt)});this.emit();resolve(createPayload());};
      const timer=setTimeout(()=>{const error=Object.assign(new Error('Action timed out'),{code:'action_timeout'});this.lastResult={status:'failure',error:semanticError('action_timeout')};finish('timeout',()=>this.fail(error));},this.actionTimeoutMs);
      Promise.resolve().then(()=>this.prepareAction?this.prepareAction(action,clone(input||{})):null).then(()=>handler.call(this.driver,clone(input||{}))).then(raw=>{
        if(settled)return;const value=raw||{status:'ok'};this.lastResult=clone(value);if(value.nextRoute)this.workflow.enter(value.nextRoute,value.routeParams||{});finish(String(value.status||'ok').replace(/[^a-z0-9_-]/gi,'_').slice(0,32),()=>this.result(value));
      }).catch(error=>{if(settled)return;this.lastResult={status:'failure',error:semanticError(error&&error.code||'facade_failure')};finish('failure',()=>this.fail(error));});
    });
  }

  inCompanySetup(){const route=this.workflow.currentRoute(),profile=this.driver.activeProfile();return !!(route&&/^ltd\.onboarding\./.test(route.screenId)&&(profile&&profile.lifecycleStatus!=='confirmed'||this.drafts.getSetup()?.discardOperationId));}
  onOpenHome(){if(this.inCompanySetup())return this.onDismissRequested({reason:'home'});this.route('home',{mode:this.driver.mode});return Promise.resolve(this.result({status:'ok',nextRoute:'home'}));}
  onUpdatePayrollReporting(input){return this.execute('onUpdatePayrollReporting',input,this.driver.updatePayrollReporting);}
  onAddBusiness(){this.route('business.category-choice');return Promise.resolve(this.result({status:'ok',nextRoute:'business.category-choice'}));}
  onAddBusinessCategoryChosen(input){if(input?.category==='limited_company'&&this.driver.pendingSetup())return this.onResumeCompanyDraft();return this.execute('onAddBusinessCategoryChosen',input,this.driver.chooseBusinessCategory).then(result=>{const saved=this.drafts.getSetup(),profile=this.driver.activeProfile();if(result.status==='ok'&&profile&&saved&&saved.companyId!==profile.entityId)this.drafts.clearSetup();return result;});}
  onSelfEmployedStructureChosen(input){return this.execute('onSelfEmployedStructureChosen',input,this.driver.chooseSelfEmployedStructure);}
  onOpenLegacyBusiness(input){return this.execute('onOpenLegacyBusiness',input,this.driver.openLegacyBusiness);}
  onEditLegacyBusiness(input){return this.execute('onEditLegacyBusiness',input,this.driver.editLegacyBusiness);}
  onOpenExistingCompany(input){if(this.driver.activeProfile()?.lifecycleStatus==='draft')return this.onResumeCompanyDraft(input);return this.execute('onOpenExistingCompany',input,this.driver.openExistingCompany);}
  onResumeCompanyDraft(input){const saved=this.drafts.getSetup();return this.execute('onResumeCompanyDraft',input,function(){const result=this.resumeDraft();if(result.status==='ok'&&saved?.companyId===this.activeProfile()?.entityId&&/^ltd\.onboarding\./.test(saved.resumeScreen||''))result.nextRoute=saved.resumeScreen;return result;});}
  onSaveCompanyDraft(input){const facade=this,screenId=this.workflow.currentRoute()?.screenId;return this.execute('onSaveCompanyDraft',input,function(){this.requireAccess('resume_company_draft');if(facade.drafts.getSetup()?.discardOperationId)throw Object.assign(new Error('setup_discard_uncertain'),{code:'setup_discard_uncertain'});const profile=this.activeProfile();if(!profile||profile.lifecycleStatus==='confirmed')throw Object.assign(new Error('setup_not_unfinished'),{code:'setup_not_unfinished'});facade.drafts.saveSetup({schemaVersion:1,companyId:profile.entityId,resumeScreen:screenId,pending:this.pendingSetup()});const result=this.saveCompanyDraft();if(result.status==='ok'){facade.setupExit=null;facade.workflow.cancelDiscard();}return result;});}
  onLookupCompaniesHouse(input){return this.execute('onLookupCompaniesHouse',input,this.driver.lookupCompany);}
  onRecheckCompaniesHouse(input){return this.execute('onRecheckCompaniesHouse',input,this.driver.recheckCompany);}
  onPlanCompanyPeriods(input){return this.execute('onPlanCompanyPeriods',input,this.driver.planCompanyPeriods);}
  onFixCompanyFact(input){return this.execute('onFixCompanyFact',input,this.driver.fixCompanyFact);}
  onDraftChanged(input={}){if(!input.screenId||!input.field)return Promise.resolve(this.result({status:'field_error',fieldErrors:[fieldError('draft','screen_and_field_required')]}));this.drafts.patchField(input.screenId,input.field);this.emit();return Promise.resolve(this.result({status:'ok',data:{draft:this.drafts.get(input.screenId)}}));}
  onContinueStep(input={}){if(this.drafts.getSetup()?.discardOperationId)return this.onDismissRequested({reason:'pending_discard'});const route=this.workflow.currentRoute(),screenId=input.screenId||route&&route.screenId,draft=screenId?this.drafts.get(screenId):null,values=input.values||Object.fromEntries((draft&&draft.fields||[]).map(field=>[field.id,field.value]));return this.execute('onContinueStep',{...input,values},this.driver.continueStep).then(result=>{if(['ok','review_required'].includes(result.status)&&screenId){this.drafts.clear(screenId);if(this.driver.activeProfile()?.lifecycleStatus==='confirmed')this.drafts.clearSetup();else{const profile=this.driver.activeProfile();if(profile)this.drafts.saveSetup({schemaVersion:1,companyId:profile.entityId,resumeScreen:result.nextRoute||screenId,pending:this.driver.pendingSetup()});}}return result;});}

  onOpenInfo(input={}){const route=this.workflow.currentRoute();if(!route)return Promise.resolve(this.result({status:'failure',error:semanticError('parent_route_required')}));this.workflow.openOverlay(input.infoId||'ltd-info','information',{returnFocusId:input.returnFocusId||null,payload:{infoId:input.infoId||null}});this.emit();return Promise.resolve(this.result({status:'ok',data:{overlay:this.workflow.topOverlay()}}));}
  onCloseInfo(){const closed=this.workflow.closeOverlay();this.emit();return Promise.resolve(this.result({status:'ok',data:{closed}}));}
  onBack(){const routes=this.workflow.snapshot().routes,current=routes[routes.length-1],parent=routes[routes.length-2];if(this.inCompanySetup()&&!this.workflow.topOverlay()){const step=/^ltd\.onboarding\.step([1-5])$/.exec(current?.screenId||'');if(step&&Number(step[1])>1){const previous='ltd.onboarding.step'+(Number(step[1])-1);if(parent?.screenId===previous)this.workflow.back();else this.workflow.enter(previous,{}, {replace:true});this.emit();return Promise.resolve(this.result({status:'ok',nextRoute:previous}));}if(step||!/^ltd\.onboarding\./.test(parent?.screenId||''))return this.onDismissRequested({reason:'back'});}const outcome=this.workflow.back();this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome},nextRoute:this.workflow.currentRoute()&&this.workflow.currentRoute().screenId||null}));}
  async onDismissRequested(input={}){if(this.busy.active)return this.result({status:'busy'});if(this.inCompanySetup()&&!this.workflow.topOverlay()){
    const requestId=this.driver.newId('setup-exit');this.setupExit={requestId,status:'loading',canDiscard:false};this.workflow.requestDismiss('setup_exit',true);this.emit();
    try{const recovery=this.drafts.getSetup();const details=await this.driver.inspectSetupExit({companyId:recovery?.discardOperationId?recovery.companyId:null});if(this.setupExit?.requestId!==requestId)return this.result({status:'ok'});this.setupExit={requestId,...details};const saved=this.drafts.getSetup();if(saved?.discardOperationId&&saved.companyId===details.companyId&&(details.canDiscard||details.status==='discarded')){this.setupExit.operationId=saved.discardOperationId;this.setupExit.versionToken=saved.discardVersion;this.setupExit.canDiscard=true;return this.onDiscardCompanySetup();}}catch(error){if(this.setupExit?.requestId===requestId)this.setupExit={requestId,status:'unavailable',canDiscard:false,reason:this.drafts.getSetup()?.discardOperationId?'setup_discard_uncertain':error.details?.reason||error.code||'setup_check_unavailable'};}
    this.emit();return this.result({status:'review_required'});
  }const route=this.workflow.currentRoute(),dirty=route?this.drafts.hasDirty(route.screenId):false,outcome=this.workflow.requestDismiss(input.reason||'cancel',dirty);this.emit();return this.result({status:outcome.kind==='confirm_discard'?'review_required':'ok',reviewReasons:outcome.kind==='confirm_discard'?['unsaved_changes_confirmation_required']:[],data:{outcome}});}
  onDiscardCompanySetup(){const state=this.setupExit,facade=this;if(!state?.canDiscard)return Promise.resolve(this.result({status:'field_error',fieldErrors:[fieldError('draft','setup_discard_unavailable')]}));const saved=this.drafts.getSetup(),operationId=state.operationId||saved?.discardOperationId||this.driver.newId('discard-setup');return this.execute('onDiscardCompanySetup',{companyId:state.companyId,expectedVersion:state.versionToken,operationId,recovery:!!state.operationId},async function(input){facade.drafts.saveSetup({schemaVersion:1,companyId:input.companyId,resumeScreen:facade.workflow.currentRoute()?.screenId,pending:this.pendingSetup(),discardOperationId:operationId,discardVersion:input.expectedVersion||null});const result=await this.discardCompanySetup(input);if(result.status==='ok'){facade.drafts.clearSetup();facade.setupExit=null;facade.workflow.confirmDiscard();}return result;}).then(result=>{if(result.status!=='ok'&&facade.setupExit){const definite=['setup_changed_review_again','setup_already_completed','setup_has_bookkeeping','setup_not_unfinished','setup_legacy_slot'].includes(result.error?.reasonCode);if(definite){const draft=facade.drafts.getSetup();delete draft.discardOperationId;delete draft.discardVersion;facade.drafts.saveSetup(draft);}facade.setupExit={...facade.setupExit,status:'unavailable',canDiscard:false,reason:definite?'setup_changed_review_again':'setup_discard_uncertain'};facade.emit();}return result;});}
  onDiscardConfirmed(){if(this.inCompanySetup())return this.onDismissRequested({reason:'cancel'});const route=this.workflow.currentRoute();if(route)this.drafts.clear(route.screenId);const outcome=this.workflow.confirmDiscard();this.workflow.enter('home',{mode:this.driver.mode});this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome},nextRoute:'home'}));}
  onDiscardCancelled(){this.setupExit=null;const outcome=this.workflow.cancelDiscard();this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome}}));}
  onSetWorkspaceArea(input={}){const area=['overview','money','tax','records'].includes(input.area)?input.area:'overview',route=`ltd.workspace.${area}`;return this.execute('onSetWorkspaceArea',input,function(){return this.routeAccess('read',route,{area,...(area==='tax'&&input.view==='pay'?{view:'pay'}:{})});});}
  onOpenMetric(input={}){return this.execute('onOpenMetric',input,function(value){return this.routeAccess('read','ltd.workspace.metric-detail',{metricId:value.metricId||null});});}

  onAddIncome(input){return this.execute('onAddIncome',{...input,type:'company_income'},this.driver.transaction);}
  onAddExpense(input){return this.execute('onAddExpense',{...input,type:'company_expense'},this.driver.transaction);}
  onAddSharedExpense(input){return this.execute('onAddSharedExpense',{...input,type:input&&input.paidPersonally?'personally_paid_expense':'company_expense'},this.driver.transaction);}
  onAddPersonallyPaidExpense(input){return this.execute('onAddPersonallyPaidExpense',{...input,type:'personally_paid_expense'},this.driver.transaction);}
  onAddDirectorLoanFunding(input){return this.execute('onAddDirectorLoanFunding',{...input,type:'director_loan_funding'},this.driver.transaction);}
  onRecordDirectorLoanRepayment(input){return this.execute('onRecordDirectorLoanRepayment',{...input,type:'director_loan_repayment'},this.driver.transaction);}
  onRecordShareFunding(input){return this.execute('onRecordShareFunding',{...input,type:'share_capital_funding'},this.driver.transaction);}
  onCreateSalesInvoice(input){return this.execute('onCreateSalesInvoice',input,this.driver.createSalesInvoice);}
  onRecordSalesInvoicePayment(input){return this.execute('onRecordSalesInvoicePayment',input,this.driver.recordSalesInvoicePayment);}
  onCorrectSalesInvoice(input){return this.execute('onCorrectSalesInvoice',input,this.driver.correctSalesInvoice);}
  onVoidSalesInvoice(input){return this.execute('onVoidSalesInvoice',input,this.driver.voidSalesInvoice);}
  onCreateSupplierBill(input){return this.execute('onCreateSupplierBill',input,this.driver.createSupplierBill);}
  onRecordSupplierBillPayment(input){return this.execute('onRecordSupplierBillPayment',input,this.driver.recordSupplierBillPayment);}
  onCorrectSupplierBill(input){return this.execute('onCorrectSupplierBill',input,this.driver.correctSupplierBill);}
  onVoidSupplierBill(input){return this.execute('onVoidSupplierBill',input,this.driver.voidSupplierBill);}
  onRegisterCompanyAsset(input){return this.execute('onRegisterCompanyAsset',input,this.driver.registerCompanyAsset);}
  onRecordCompanyAssetPayment(input){return this.execute('onRecordCompanyAssetPayment',input,this.driver.recordCompanyAssetPayment);}
  onCorrectCompanyAsset(input){return this.execute('onCorrectCompanyAsset',input,this.driver.correctCompanyAsset);}
  onVoidCompanyAsset(input){return this.execute('onVoidCompanyAsset',input,this.driver.voidCompanyAsset);}
  onRecordCompanyDepreciation(input){return this.execute('onRecordCompanyDepreciation',input,this.driver.recordCompanyDepreciation);}
  onReverseCompanyDepreciation(input){return this.execute('onReverseCompanyDepreciation',input,this.driver.reverseCompanyDepreciation);}
  onReverseCompanyBookPayment(input){return this.execute('onReverseCompanyBookPayment',input,this.driver.reverseCompanyBookPayment);}
  onMatchBankStatement(input){return this.execute('onMatchBankStatement',input,this.driver.matchBankStatement);}
  onDeleteBankReconciliation(input){return this.execute('onDeleteBankReconciliation',input,this.driver.deleteBankReconciliation);}
  onPrepareCompanyYear(input){return this.execute('onPrepareCompanyYear',input,this.driver.prepareCompanyYear);}
  onSaveStatutoryReview(input){return this.execute('onSaveStatutoryReview',input,this.driver.saveStatutoryReview);}
  onDownloadSelfFilingPack(input){return this.execute('onDownloadSelfFilingPack',input,this.driver.selfFilingPack);}
  onOpenRecord(input){return this.execute('onOpenRecord',input,this.driver.openRecord);}
  onEditDraft(input){return this.execute('onEditDraft',input,this.driver.openDraftEdit);}
  onSaveDraftEdit(input){return this.execute('onSaveDraftEdit',input,this.driver.saveDraftEdit);}
  onDeleteDraft(input){return this.execute('onDeleteDraft',input,this.driver.deleteDraft);}
  onCorrectRecord(input){return this.execute('onCorrectRecord',input,this.driver.correctRecord);}
  onRunCtEstimate(input){return this.execute('onRunCtEstimate',input,this.driver.runCtEstimate);}
  onRunScenario(input){return this.execute('onRunScenario',input,this.driver.runScenario);}
  onRecordSalary(input){return this.execute('onRecordSalary',input,this.driver.recordSalary);}
  onDeclareDividend(input){return this.execute('onDeclareDividend',input,this.driver.declareDividend);}
  onRecordDividendPayment(input){return this.execute('onRecordDividendPayment',input,this.driver.payDividend);}
  onOpenCompanyEdit(){return this.execute('onOpenCompanyEdit',{},function(){return this.routeAccess('edit_company','ltd.records.company-edit');});}
  onEditCompany(input){return this.execute('onEditCompany',input,this.driver.editCompany);}
  onOpenOwnershipChange(){return this.execute('onOpenOwnershipChange',{},function(){return this.routeAccess('change_ownership','ltd.records.ownership');});}
  onChangeOwnership(input){return this.execute('onChangeOwnership',input,this.driver.changeOwnership);}
  onDownloadWorkingPack(input){return this.execute('onDownloadWorkingPack',input,this.driver.workingPack);}
  onRemoveCompany(input){return this.execute('onRemoveCompany',input,this.driver.removeCompany);}
  onResetPreview(){this.drafts.clearAll();this.workflow.reset();this.workflow.enter('home',{mode:this.driver.mode});return this.execute('onResetPreview',{},this.driver.reset);}

  async invoke(callback,input={}){if(!CALLBACKS.includes(callback)||typeof this[callback]!=='function')return this.result({status:'failure',error:semanticError('unknown_callback')});return this[callback](input);}
}

return{TaxMateLtdUIFacade,CALLBACKS};
});

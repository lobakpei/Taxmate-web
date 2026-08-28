(function(root,factory){
  const node=typeof module==='object'&&module.exports,api=factory(node?require('./company-structural-state'):root.TaxMateCompanyStructuralState);
  if(node)module.exports=api;
  root.TaxMateLtdUIFacadeModule=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Structural){
'use strict';

const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const COPY_KEY_BY_REASON=Object.freeze({pro_required:'plan.ltd_pro_only',one_active_ltd_limit:'add.one_ltd_limit'});
const semanticError=(reasonCode='facade_failure',params={})=>({reasonCode,copyKey:COPY_KEY_BY_REASON[reasonCode]||'error.fix_issue',params:clone(params)});
const fieldError=(field,reasonCode,copyKey='error.fix_issue',params={})=>({field,reasonCode,copyKey,params:clone(params)});
const CALLBACKS=Object.freeze([
  'onOpenHome','onAddBusiness','onAddBusinessCategoryChosen','onSelfEmployedStructureChosen','onOpenLegacyBusiness','onEditLegacyBusiness','onOpenExistingCompany','onResumeCompanyDraft','onSaveCompanyDraft','onContinueStep','onLookupCompaniesHouse','onRecheckCompaniesHouse','onPlanCompanyPeriods','onFixCompanyFact','onDraftChanged',
  'onOpenInfo','onCloseInfo','onBack','onDismissRequested','onDiscardConfirmed','onDiscardCancelled','onSetWorkspaceArea','onOpenMetric',
  'onAddIncome','onAddExpense','onAddSharedExpense','onAddPersonallyPaidExpense','onAddDirectorLoanFunding','onRecordDirectorLoanRepayment','onRecordShareFunding','onOpenRecord','onEditDraft','onSaveDraftEdit','onDeleteDraft','onCorrectRecord',
  'onRunCtEstimate','onRunScenario','onRecordSalary','onDeclareDividend','onRecordDividendPayment','onOpenCompanyEdit','onEditCompany','onOpenOwnershipChange','onChangeOwnership','onDownloadWorkingPack','onRemoveCompany','onResetPreview'
]);

class TaxMateLtdUIFacade{
  constructor(options={}){
    if(!options.driver)throw new Error('A canonical Ltd domain driver is required');
    this.driver=options.driver;
    this.drafts=Structural.createDraftStore({storage:options.storage||Structural.memoryStorage(),key:options.draftKey||`taxmate-ltd-fable-drafts-${this.driver.mode}`});
    this.workflow=Structural.createWorkflow({routes:[{screenId:'home',params:{mode:this.driver.mode}}]});
    this.busy={active:false,action:null};
    this.prepareAction=typeof options.prepareAction==='function'?options.prepareAction:null;
    this.lastResult=null;
    this.listeners=new Set();
  }

  get callbackNames(){return CALLBACKS.slice();}
  subscribe(listener){if(typeof listener!=='function')throw new Error('Listener must be a function');this.listeners.add(listener);listener(this.getSnapshot());return()=>this.listeners.delete(listener);}
  emit(){const snapshot=this.getSnapshot();for(const listener of this.listeners)listener(snapshot);return snapshot;}
  getSnapshot(){return{...this.driver.readSnapshot(),navigation:this.workflow.snapshot(),drafts:this.drafts.snapshot(),busy:clone(this.busy),lastResult:clone(this.lastResult),callbacks:this.callbackNames};}
  result(value={}){return{status:value.status||'ok',data:value.data==null?null:clone(value.data),fieldErrors:clone(value.fieldErrors||[]),reviewReasons:clone(value.reviewReasons||[]),busy:false,error:value.error?clone(value.error):null,nextRoute:value.nextRoute||null,snapshot:this.getSnapshot()};}
  fail(error){return this.result({status:'failure',error:semanticError(error&&error.code||'facade_failure')});}
  route(screenId,params={},replace=false){this.workflow.enter(screenId,params,{replace});return this.emit();}

  execute(action,input,handler){
    if(this.busy.active)return Promise.resolve(this.result({status:'busy',error:semanticError('action_in_progress',{action:this.busy.action})}));
    this.busy={active:true,action};this.emit();
    return Promise.resolve().then(()=>this.prepareAction?this.prepareAction(action,clone(input||{})):null).then(()=>handler.call(this.driver,clone(input||{}))).then(raw=>{
      const value=raw||{status:'ok'};this.lastResult=clone(value);if(value.nextRoute)this.workflow.enter(value.nextRoute,value.routeParams||{});this.busy={active:false,action:null};this.emit();return this.result(value);
    }).catch(error=>{this.lastResult={status:'failure',error:semanticError(error&&error.code||'facade_failure')};this.busy={active:false,action:null};this.emit();return this.fail(error);});
  }

  onOpenHome(){this.route('home',{mode:this.driver.mode});return Promise.resolve(this.result({status:'ok',nextRoute:'home'}));}
  onAddBusiness(){this.route('business.category-choice');return Promise.resolve(this.result({status:'ok',nextRoute:'business.category-choice'}));}
  onAddBusinessCategoryChosen(input){return this.execute('onAddBusinessCategoryChosen',input,this.driver.chooseBusinessCategory);}
  onSelfEmployedStructureChosen(input){return this.execute('onSelfEmployedStructureChosen',input,this.driver.chooseSelfEmployedStructure);}
  onOpenLegacyBusiness(input){return this.execute('onOpenLegacyBusiness',input,this.driver.openLegacyBusiness);}
  onEditLegacyBusiness(input){return this.execute('onEditLegacyBusiness',input,this.driver.editLegacyBusiness);}
  onOpenExistingCompany(input){return this.execute('onOpenExistingCompany',input,this.driver.openExistingCompany);}
  onResumeCompanyDraft(input){return this.execute('onResumeCompanyDraft',input,this.driver.resumeDraft);}
  onSaveCompanyDraft(input){return this.execute('onSaveCompanyDraft',input,this.driver.saveCompanyDraft);}
  onLookupCompaniesHouse(input){return this.execute('onLookupCompaniesHouse',input,this.driver.lookupCompany);}
  onRecheckCompaniesHouse(input){return this.execute('onRecheckCompaniesHouse',input,this.driver.recheckCompany);}
  onPlanCompanyPeriods(input){return this.execute('onPlanCompanyPeriods',input,this.driver.planCompanyPeriods);}
  onFixCompanyFact(input){return this.execute('onFixCompanyFact',input,this.driver.fixCompanyFact);}
  onDraftChanged(input={}){if(!input.screenId||!input.field)return Promise.resolve(this.result({status:'field_error',fieldErrors:[fieldError('draft','screen_and_field_required')]}));this.drafts.patchField(input.screenId,input.field);this.emit();return Promise.resolve(this.result({status:'ok',data:{draft:this.drafts.get(input.screenId)}}));}
  onContinueStep(input={}){const route=this.workflow.currentRoute(),screenId=input.screenId||route&&route.screenId,draft=screenId?this.drafts.get(screenId):null,values=input.values||Object.fromEntries((draft&&draft.fields||[]).map(field=>[field.id,field.value]));return this.execute('onContinueStep',{...input,values},this.driver.continueStep).then(result=>{if(['ok','review_required'].includes(result.status)&&screenId)this.drafts.clear(screenId);return result;});}

  onOpenInfo(input={}){const route=this.workflow.currentRoute();if(!route)return Promise.resolve(this.result({status:'failure',error:semanticError('parent_route_required')}));this.workflow.openOverlay(input.infoId||'ltd-info','information',{returnFocusId:input.returnFocusId||null,payload:{infoId:input.infoId||null}});this.emit();return Promise.resolve(this.result({status:'ok',data:{overlay:this.workflow.topOverlay()}}));}
  onCloseInfo(){const closed=this.workflow.closeOverlay();this.emit();return Promise.resolve(this.result({status:'ok',data:{closed}}));}
  onBack(){const outcome=this.workflow.back();this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome},nextRoute:this.workflow.currentRoute()&&this.workflow.currentRoute().screenId||null}));}
  onDismissRequested(input={}){const route=this.workflow.currentRoute(),dirty=route?this.drafts.hasDirty(route.screenId):false,outcome=this.workflow.requestDismiss(input.reason||'cancel',dirty);this.emit();return Promise.resolve(this.result({status:outcome.kind==='confirm_discard'?'review_required':'ok',reviewReasons:outcome.kind==='confirm_discard'?['unsaved_changes_confirmation_required']:[],data:{outcome}}));}
  onDiscardConfirmed(){const route=this.workflow.currentRoute();if(route)this.drafts.clear(route.screenId);const outcome=this.workflow.confirmDiscard();this.workflow.enter('home',{mode:this.driver.mode});this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome},nextRoute:'home'}));}
  onDiscardCancelled(){const outcome=this.workflow.cancelDiscard();this.emit();return Promise.resolve(this.result({status:'ok',data:{outcome}}));}
  onSetWorkspaceArea(input={}){const area=['overview','money','tax','records'].includes(input.area)?input.area:'overview',route=`ltd.workspace.${area}`;return this.execute('onSetWorkspaceArea',input,function(){return this.routeAccess('read',route,{area});});}
  onOpenMetric(input={}){return this.execute('onOpenMetric',input,function(value){return this.routeAccess('read','ltd.workspace.metric-detail',{metricId:value.metricId||null});});}

  onAddIncome(input){return this.execute('onAddIncome',{...input,type:'company_income'},this.driver.transaction);}
  onAddExpense(input){return this.execute('onAddExpense',{...input,type:'company_expense'},this.driver.transaction);}
  onAddSharedExpense(input){return this.execute('onAddSharedExpense',{...input,type:input&&input.paidPersonally?'personally_paid_expense':'company_expense'},this.driver.transaction);}
  onAddPersonallyPaidExpense(input){return this.execute('onAddPersonallyPaidExpense',{...input,type:'personally_paid_expense'},this.driver.transaction);}
  onAddDirectorLoanFunding(input){return this.execute('onAddDirectorLoanFunding',{...input,type:'director_loan_funding'},this.driver.transaction);}
  onRecordDirectorLoanRepayment(input){return this.execute('onRecordDirectorLoanRepayment',{...input,type:'director_loan_repayment'},this.driver.transaction);}
  onRecordShareFunding(input){return this.execute('onRecordShareFunding',{...input,type:'share_capital_funding'},this.driver.transaction);}
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

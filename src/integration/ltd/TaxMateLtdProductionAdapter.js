(function attachTaxMateLtdProductionAdapter(root){
  'use strict';

  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  let ready=null,driver=null,facade=null,snapshot=null,unsubscribe=null,canonicalListener=null;

  function bridge(){
    if(!root.TaxMateLtdProductionBridge)throw new Error('TaxMate Ltd production bridge is unavailable');
    return root.TaxMateLtdProductionBridge;
  }

  async function loadCopy(){
    const response=await fetch('src/integration/ltd/approved-copy.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Approved Ltd copy could not be loaded');
    return response.json();
  }

  function decorateProductionFacade(value){
    const leaveIfHome=async promise=>{const result=await promise;if(result&&result.nextRoute==='home')bridge().exitToBusinesses();return result;};
    const originalOpenHome=value.onOpenHome.bind(value);
    value.onOpenHome=async input=>{const result=await originalOpenHome(input);bridge().exitToBusinesses();return result;};
    const originalBack=value.onBack.bind(value);
    value.onBack=input=>leaveIfHome(originalBack(input));
    const originalSave=value.onSaveCompanyDraft.bind(value);
    value.onSaveCompanyDraft=input=>leaveIfHome(originalSave(input));
    const originalRemove=value.onRemoveCompany.bind(value);
    value.onRemoveCompany=input=>leaveIfHome(originalRemove(input));
    const originalStructure=value.onSelfEmployedStructureChosen.bind(value);
    value.onSelfEmployedStructureChosen=async input=>{const result=await originalStructure(input);if(result.status==='ok'){bridge().exitToLegacyBusiness(input&&input.structure==='partnership'?'partnership':'sole');}return result;};
    const originalOpenLegacy=value.onOpenLegacyBusiness.bind(value);
    value.onOpenLegacyBusiness=async input=>{const result=await originalOpenLegacy(input);if(result.status==='ok')bridge().exitToLegacyBusiness(null,input.businessId);return result;};
    const originalEditLegacy=value.onEditLegacyBusiness.bind(value);
    value.onEditLegacyBusiness=async input=>{const result=await originalEditLegacy(input);if(result.status==='ok')bridge().exitToLegacyBusiness(null,input.businessId);return result;};
    const originalPack=value.onDownloadWorkingPack.bind(value);
    value.onDownloadWorkingPack=async input=>{const result=await originalPack(input);if(result.status==='ok'&&result.data)bridge().downloadWorkingPack(result.data);return result;};
    return value;
  }

  async function initialise(){
    if(ready)return ready;
    ready=(async()=>{
      const required=['TaxMateCanonicalCompanyDriver','TaxMateCompanyStateRepository','TaxMateLtdUIFacadeModule','TaxMateLtdWorkbenchRenderer'];
      for(const name of required)if(!root[name])throw new Error(`Missing Ltd runtime module: ${name}`);
      const copy=await loadCopy(),b=bridge();if(!b.accountReady())throw new Error('TaxMate account scope is not ready');
      const canonicalRepository=root.TaxMateCompanyStateRepository.externalRepository({kind:'taxmate-production-state',load:()=>b.loadState(),replace:next=>b.replaceState(next),rollbackSnapshot:()=>b.rollbackSnapshot()});
      const fixtureKey=b.fixtureSessionKey(),fixtureRepository=initial=>root.TaxMateCompanyStateRepository.externalRepository({
        kind:'taxmate-founder-fixture-session',
        load(){const raw=root.sessionStorage.getItem(fixtureKey);return raw?JSON.parse(raw):clone(initial);},
        replace(next){root.sessionStorage.setItem(fixtureKey,JSON.stringify(next));return clone(next);},
        rollbackSnapshot(){return null;}
      });
      const repository=root.sessionStorage.getItem(fixtureKey)?fixtureRepository(b.loadState()):canonicalRepository;
      const versions=root.TaxMateCore&&root.TaxMateCore.VERSIONS||{},networkProvider=root.TaxMateCompaniesHouseProvider.createCallableProvider(data=>b.callTrusted('lookupCompaniesHouse',{...data,clientVersion:versions.APP_VERSION,buildId:versions.BUILD_ID}));
      const environment=root.TAXMATE_FIREBASE_ENVIRONMENT||{},provider=root.TaxMateCompaniesHouseProvider.createFounderPreviewProvider(networkProvider,{hostname:root.location&&root.location.hostname||'',firebaseProjectId:environment.firebaseConfig&&environment.firebaseConfig.projectId||'',firebaseEmulators:root.TAXMATE_FIREBASE_EMULATORS===true,previewMode:root.TAXMATE_FOUNDER_PREVIEW_MODE||''});
      driver=new root.TaxMateCanonicalCompanyDriver.CanonicalCompanyDriver({
        mode:b.hasExistingCompany()?'existing':'fresh',repository,copy,deviceId:b.deviceId(),now:Date.now,
        entitlementSnapshot:b.entitlementSnapshot(),trustedActiveCompanyId:b.activeCompanyId(),personalTaxJurisdiction:b.personalTaxJurisdiction(),companiesHouseProvider:provider,
        activeCompanyClaim:data=>b.callTrusted('claimActiveLtdCompany',data),fixtureRepositoryFactory:state=>fixtureRepository(state),
        runtime:{providerMode:provider.founderPreviewMode?'founder_preview_local_emulator':'actual_taxmate_app',founderPreviewMode:provider.founderPreviewMode===true,firebase:true,firebaseEmulators:root.TAXMATE_FIREBASE_EMULATORS===true,sentry:b.sentryEnabled(),googleSignIn:true,billing:true,promo:true,analytics:b.analyticsEnabled(),serviceWorker:'serviceWorker' in navigator,externalNetwork:true}
      });
      facade=decorateProductionFacade(new root.TaxMateLtdUIFacadeModule.TaxMateLtdUIFacade({driver,storage:localStorage,draftKey:b.ltdDraftKey(),prepareAction:()=>{driver.setEntitlementSnapshot(b.entitlementSnapshot());driver.setTrustedActiveCompanyId(b.activeCompanyId());driver.setPersonalTaxJurisdiction(b.personalTaxJurisdiction());}}));
      root.TaxMateLtdUIFacade=facade;
      root.TaxMateLtdWorkbenchRenderer.setProductionMode(true);
      unsubscribe=facade.subscribe(value=>{snapshot=value;root.TaxMateLtdWorkbenchRenderer.render(b.mount(),facade,value);});
      canonicalListener=()=>{if(!driver||driver.isFixtureSession&&driver.isFixtureSession())return;driver.reload();facade.emit();};root.addEventListener('taxmate:canonical-state-updated',canonicalListener);
      return facade;
    })().catch(error=>{ready=null;throw error;});
    return ready;
  }

  async function openRoute(kind,options={}){
    const f=await initialise(),b=bridge();
    driver.reload();driver.setEntitlementSnapshot(b.entitlementSnapshot());driver.setTrustedActiveCompanyId(b.activeCompanyId());driver.setPersonalTaxJurisdiction(b.personalTaxJurisdiction());
    root.TaxMateLtdWorkbenchRenderer.setLocale(b.locale());root.TaxMateLtdWorkbenchRenderer.setTheme(b.theme());
    b.enterLtd();
    if(kind==='add')f.route('business.category-choice');
    else if(kind==='new-ltd'){
      f.route('business.category-choice');
      const chosen=await f.onAddBusinessCategoryChosen({category:'limited_company'});
      if(chosen&&chosen.nextRoute==='ltd.onboarding.step1'&&['provided','not_available'].includes(options.companyNumberStatus)){
        await f.onDraftChanged({screenId:'ltd.onboarding.step1',field:{id:'companyNumberStatus',type:'select-one',value:options.companyNumberStatus}});
      }
    }else await f.onOpenExistingCompany({});
    return f.getSnapshot();
  }

  root.TaxMateLtdProductionAdapter=Object.freeze({
    initialise,
    openAddBusiness:()=>openRoute('add'),
    openNewLimitedCompany:options=>openRoute('new-ltd',options),
    openExistingCompany:()=>openRoute('existing'),
    getSnapshot:()=>clone(snapshot),
    refreshFromCanonicalState:()=>{if(driver){driver.reload();driver.setTrustedActiveCompanyId(bridge().activeCompanyId());driver.setPersonalTaxJurisdiction(bridge().personalTaxJurisdiction());facade.emit();}return clone(snapshot);},
    isReady:()=>!!facade,
    dispose:()=>{if(unsubscribe)unsubscribe();if(canonicalListener)root.removeEventListener('taxmate:canonical-state-updated',canonicalListener);unsubscribe=null;canonicalListener=null;facade=null;driver=null;snapshot=null;ready=null;}
  });
  const start=()=>{if(!root.TaxMateLtdProductionBridge||!bridge().accountReady())return;initialise().then(()=>bridge().refreshShell()).catch(error=>console.error('Ltd runtime initialisation failed',error));};
  root.addEventListener('taxmate:account-ready',start);if(root.TaxMateLtdProductionBridge&&bridge().accountReady())root.queueMicrotask(start);
})(typeof globalThis!=='undefined'?globalThis:this);

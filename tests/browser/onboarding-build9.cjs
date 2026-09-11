'use strict';
// Invoked by the existing isolated Firebase emulator harness; never production.
module.exports=async function run(h){
  const {users,launch,closeApp,startWithoutAccount,productSignIn,signedInEntry,waitOnboarding,currentOb,check,equal,seedTier,seedReviewDataset,personalState,adminSet,adminGet,membershipCount,evidence,fs,path,screenshots}=h;
  async function screen(page,name){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});screenshots.push(name+'.png');}
  async function logo(page){equal(await page.locator('#ob-root .brand-logo-light').count(),1,'One TaxMate logo pair in the active flow');}
  async function choose(page,target){await page.locator(`[data-tm-click="${target==='ltd'?'obStartLtd()':'obStartPartnerSync()'}"]`).click();}
  for(const source of ['ltd','partner'])for(const tier of ['free','plus','pro']){
    const user=source==='ltd'?users.freeLtd:users.freePartner;await seedTier(user,tier);
    const app=await launch(`build9-guest-${source}-${tier}`,{account:{...user,mode:'free'}});
    try{
      const page=app.page;await startWithoutAccount(page);await logo(page);
      equal(await page.locator('#ob-root .ob-entry-pro').allTextContents(),['Pro','Pro'],'Guest sees both Pro badges');
      await choose(page,source);equal((await currentOb(page)).pendingIntent.source,source==='ltd'?'ltd':'partner_sync','Feature intent exists before Google login');
      await productSignIn(page);
      if(tier==='pro'){
        if(source==='ltd'){await page.locator('#taxmate-ltd-ui-root:not([hidden])').waitFor();await page.waitForFunction(()=>TaxMateLtdUIFacade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step1');}
        else{await waitOnboarding(page,'Enter your Partner Sync code');equal(await membershipCount('CONNECT8',user.localId),0,'Pro opens input without joining a business');}
      }else{
        await waitOnboarding(page,'Pro required');await logo(page);
        equal(await page.locator('#ob-root [data-plan-card]').count(),3,'Free Plus Pro choices use existing plan cards');
        await page.getByRole('button',{name:'Yearly',exact:true}).click();
        await page.locator('[data-tm-click="obOpenRedeem()"]').click();await logo(page);
        await page.locator('#ob-promo-code').fill('KEEP_CODE');await page.locator('#ob-root .ob-back').click();
        equal((await currentOb(page)).billingCadence,'yearly','Redeem Back preserves cadence');
        equal((await currentOb(page)).promoCode,'KEEP_CODE','Redeem Back preserves typed code');
        await screen(page,`build9-${source}-${tier}-plans`);
        await page.locator('#ob-root .ob-back').click();await waitOnboarding(page,'How would you like to get started?');
        equal((await currentOb(page)).pendingIntent.source,source==='ltd'?'ltd':'partner_sync','Back retains the selected feature');
      }
    }finally{await closeApp(app);}
  }
  // General Google login routes existing data to Home without letting background hydration navigate.
  await seedTier(users.direct,'pro');await seedReviewDataset(users.direct,personalState([{id:'returning-business',name:'Returning trade',structure:'sole'}],[]));
  let app=await launch('build9-existing',{account:{...users.direct,mode:'pro'}});
  try{await productSignIn(app.page);await app.page.locator('[data-home-business-list]').waitFor();check((await app.page.locator('[data-home-business-list]').textContent()).includes('Returning trade'),'General existing sign-in opens own Home');await app.page.evaluate(()=>go('expenses'));await app.page.evaluate(()=>startUserSync(cloudUser()));equal(await app.page.evaluate(()=>S.tab),'expenses','Background sync preserves current route');}finally{await closeApp(app);}
  await seedTier(users.promo,'free');app=await launch('build9-promo',{account:{...users.promo,mode:'free'}});
  try{
    const page=app.page;await signedInEntry(page);await choose(page,'partner');await waitOnboarding(page,'Pro required');await page.locator('[data-tm-click="obOpenRedeem()"]').click();
    for(const [code,expected] of [['INVALID_9',"isn't valid"],['EXPIREDPRO','ended']]){await page.locator('#ob-promo-code').fill(code);await page.locator('[data-tm-click="obRedeemPromotionCode()"]').click();await page.waitForFunction(()=>!!OB._promoError);check((await currentOb(page))._promoError.toLowerCase().includes(expected),`${code} has a specific visible error`);}
    const now=Date.now();await adminSet('founderPromotions/PLUS_TEST9',{code:'PLUS_TEST9',tier:'plus',startsAt:now-1000,durationDays:10,maxRedemptions:10,redemptionCount:0,active:true});
    await page.locator('#ob-promo-code').fill('PLUS_TEST9');await page.locator('[data-tm-click="obRedeemPromotionCode()"]').click();await page.waitForFunction(()=>currentTier()==='plus'&&!OB._promoBusy);
    check(!!await adminGet(`promotionRedemptions/PLUS_TEST9__${users.promo.localId}`),'Plus code with underscore creates canonical audit');equal((await currentOb(page)).screen,'redeem','Plus grant cannot enter a Pro feature');
    await page.locator('#ob-promo-code').fill('PROREVIEW');await page.locator('[data-tm-click="obRedeemPromotionCode()"]').click();await waitOnboarding(page,'Enter your Partner Sync code');
    await page.locator('#ob-partner-code').fill('BADCODE9');await page.locator('[data-tm-click="obPartnerContinue()"]').click();await page.locator('[data-tm-click="obConfirmPartnerConnection()"]').click();await page.waitForFunction(()=>!!OB._intentError&&!OB._partnerBusy);equal(await membershipCount('BADCODE9',users.promo.localId),0,'Invalid partner code creates no membership');
    await page.locator('#ob-root .ob-back').click();await page.locator('#ob-partner-code').fill('CONNECT8');await page.locator('[data-tm-click="obPartnerContinue()"]').click();equal(await membershipCount('CONNECT8',users.promo.localId),0,'Valid code still waits for confirmation');await page.locator('[data-tm-click="obConfirmPartnerConnection()"]').click();await waitOnboarding(page,'Business connected');equal(await membershipCount('CONNECT8',users.promo.localId),1,'Successful explicit confirmation joins exactly once');await screen(page,'build9-partner-connected');
  }finally{await closeApp(app);}
  // TaxMate checkout presentation with local provider fixtures: Back, failures, return markers.
  await seedTier(users.promoErrors,'free');app=await launch('build9-checkout',{account:{...users.promoErrors,mode:'free'}});
  try{
    const page=app.page;await signedInEntry(page);await choose(page,'ltd');await waitOnboarding(page,'Pro required');await page.getByRole('button',{name:'Yearly',exact:true}).click();
    await page.evaluate(()=>{window.__flowOriginalCall=callSecureFunction;callSecureFunction=async(name,data)=>name==='getCheckoutOffer'?{moneyOperationsEnabled:true,consumerDisclosuresReady:true,offer:{id:'fixture-offer',tier:'pro',cadence:'yearly',priceMinor:9999,currency:'gbp',contract:{termsHtml:'<p>Local fixture terms</p>'}}}:window.__flowOriginalCall(name,data);});
    await page.locator('[data-tm-click="obChoosePlan(\'pro\')"]').click();await page.locator('#sb-billing.open').waitFor();
    equal(await page.locator('#sb-billing .brand-logo-light').count(),1,'Checkout retains TaxMate logo');
    check(await page.locator('#sb-billing').evaluate(el=>+getComputedStyle(el).zIndex>+getComputedStyle(document.querySelector('#ob-root')).zIndex),'Checkout is operable above onboarding');
    await screen(page,'build9-checkout');await page.locator('#sb-billing').getByRole('button',{name:'Back',exact:true}).click();equal((await currentOb(page)).billingCadence,'yearly','Checkout Back retains cadence');
    await page.evaluate(()=>{billingRememberCheckout();history.replaceState(null,'','?billing=cancelled');consumeBillingReturn();});await waitOnboarding(page,'Pro required');check((await currentOb(page))._intentMessage.includes('cancelled'),'Payment cancellation is visible');await page.evaluate(()=>billingHandleReturn());equal((await currentOb(page)).screen,'pro-gate','Cancellation does not redirect to a feature');
    await seedTier(users.promoErrors,'pro');await page.evaluate(()=>{billingRememberCheckout();history.replaceState(null,'','?billing=success');consumeBillingReturn();return billingHandleReturn();});await page.waitForFunction(()=>TaxMateLtdUIFacade.getSnapshot().navigation.routes.at(-1).screenId==='ltd.onboarding.step1');check(true,'Verified paid entitlement resumes LTD Step 1 without extra success screen');
  }finally{await closeApp(app);}
};

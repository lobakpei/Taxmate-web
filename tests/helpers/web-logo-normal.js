'use strict';
// Ordinary Web navigation only. No native platform emulation or permission probes.
module.exports=async function webLogoNormal({page,personal,presentation,openCompany,nav,shot,check,mobile=false}){
  const identity=()=>page.evaluate(()=>({uid:firebase.auth().currentUser.uid,origin:performance.timeOrigin,entries:JSON.stringify(S.entries),businesses:JSON.stringify(S.businesses),companyRecords:JSON.stringify(Object.fromEntries(Object.entries(S.domain).filter(([,value])=>Array.isArray(value))))}));
  const before=await identity(),prefix=mobile?'logo-mobile':'logo';
  const home=async()=>{await page.waitForFunction(()=>S.tab==='home'&&!BILLING_VIEW&&!document.body.classList.contains('ltd-active'));const next=await identity();check(JSON.stringify(next)===JSON.stringify(before),'Logo returns to same account/data without reload: '+prefix);};
  const checkButton=async(button,expected)=>{
    await page.waitForFunction(()=>!document.body.classList.contains('ltd-active')||!TaxMateLtdUIFacade.getSnapshot().busy.active);
    check(await button.evaluate((n,label)=>n.tagName==='BUTTON'&&n.type==='button'&&n.getAttribute('aria-label')===label,expected),prefix+' semantic localized brand button');
    await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    const focused=await button.evaluate(n=>({focus:n===document.activeElement,visible:n.matches(':focus-visible'),outline:getComputedStyle(n).outlineColor,width:getComputedStyle(n).outlineWidth,rect:n.getBoundingClientRect().toJSON()}));
    check(focused.focus&&focused.visible&&focused.outline==='rgb(255, 190, 10)'&&focused.width==='2px',prefix+' keyboard focus visible on navy in either theme: '+JSON.stringify(focused));
    return focused;
  };
  for(const width of mobile?[390]:[390,1440]){
    for(const tab of ['home','income','expenses','tax','more']){
      await personal(page,tab);await presentation(page,'zh','light',width);await page.locator('.header-brand-lockup').click();await home();
      check(await page.locator('[data-home-business-list]').isVisible(),prefix+' actual App Home after '+tab+' '+width);
    }
    for(const lang of ['en','zh','pl','ro','es','ur'])for(const theme of ['light','dark']){
      await personal(page,'tax');await presentation(page,lang,theme,width);
      const main=page.locator('.header-brand-lockup'),name=await page.evaluate(()=>t('nav.home'));await checkButton(main,name);await shot(page,`${prefix}-header-${lang}-${theme}-${width}`,false);await page.keyboard.press('Enter');await home();
      await openCompany(page);await nav(page,'money');
      const buttons=page.locator('.tm-logo.web-brand-home:visible');check(await buttons.count()===(width>=1100?2:1),prefix+' existing company header and desktop rail brands found');
      const label=require('../../src/integration/ltd/approved-copy.json').canonical[lang==='zh'?'zh-HK':lang]['web.logo_home'];
      await checkButton(buttons.last(),label);await page.evaluate(()=>TaxMateLtdProductionAdapter.refreshFromCanonicalState());check(await buttons.last().evaluate(n=>n===document.activeElement&&n.matches(':focus-visible')),prefix+' same-route canonical refresh preserves brand keyboard focus');await shot(page,`${prefix}-company-${lang}-${theme}-${width}`,false);await page.keyboard.press('Space');await home();
      if(width>=1100){await openCompany(page);await page.locator('.rail .web-brand-home').click();await home();}
    }
  }
  // Inline LTD forms also have a brand. Reuse the existing discard dialog,
  // preserve edits on Keep editing, and leave only after explicit discard.
  await personal(page,'home');await presentation(page,'en','light',390);
  for(const [action,field,value]of [['onOpenCompanyEdit','value','Unsaved normal company name'],['onOpenOwnershipChange','reason','Unsaved normal ownership note']]){
    await openCompany(page);await page.evaluate(action=>TaxMateLtdUIFacade[action](),action);await page.waitForFunction(()=>!TaxMateLtdUIFacade.getSnapshot().busy.active);
    const input=page.locator('.tm-workspace-shell [data-field="'+field+'"]');await input.fill(value);await page.locator('.tm-summary-sheet .web-brand-home').click();
    const dialog=page.locator('[data-web-home-discard]');check(await dialog.isVisible(),prefix+' Logo asks before leaving '+action);await shot(page,prefix+'-inline-'+action+'-prompt',false);
    await dialog.getByRole('button',{name:'Keep editing',exact:true}).click();check(await input.inputValue()===value,prefix+' Keep editing preserves '+action);check(JSON.stringify(await identity())===JSON.stringify(before),prefix+' unsaved form does not change stored records');
    await page.locator('.tm-summary-sheet .web-brand-home').click();await page.locator('[data-web-home-discard]').getByRole('button',{name:'Discard',exact:true}).click();await home();
  }
  // Retain the ordinary unsaved form / Back confirmation lifecycle.
  await personal(page,'expenses');await presentation(page,'en','light',390);await page.locator('.direction-a-list-action .btn').click();await page.locator('#en-amount').fill('123.45');
  await page.goBack();await page.locator('#sb-confirm.open').waitFor();check(await page.locator('#cf-title').innerText()==='Discard changes?',prefix+' existing unsaved Back confirmation remains');
  await page.locator('#sb-confirm [data-tm-click]').filter({hasText:'Cancel'}).click();check(await page.locator('#en-amount').inputValue()==='123.45',prefix+' cancel preserves unsaved entry');await shot(page,prefix+'-unsaved-preserved',false);
  await page.evaluate(()=>closeSheet('entry'));await page.locator('.header-brand-lockup').click();await home();
};

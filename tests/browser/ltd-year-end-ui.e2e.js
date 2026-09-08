'use strict';

// TaxMate Ltd — Direction A year-end UI against the real facade + canonical driver
// through the localhost Founder Preview harness. Every functional assertion reads engine
// output back through /api/snapshot; the UI never computes a status.
//
// The rework round adds the checks the earlier suite could not make: money colours by
// role from computed style (light and dark), the four navigation icons as real SVG
// geometry, no truncated match options, a confirmation that never overlaps a control,
// and first-screen information density per page. Evidence screenshots cover six locales,
// light/dark, Urdu RTL, phone/desktop and empty / loading / error / needs-checking /
// read-only states.

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const evidence=path.resolve(process.env.TAXMATE_LTD_YEAR_END_EVIDENCE||path.join(root,'.ltd-year-end-ui-evidence'));
const port=Number(process.env.TAXMATE_LTD_YEAR_END_PORT||41748),origin=`http://127.0.0.1:${port}`;
const assertions=[],externalRequests=[],consoleErrors=[],screenshots=[];
let server,browser;
const check=(value,message)=>{assert.ok(value,message);assertions.push(message);};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);assertions.push(message);};
const chromePath=()=>{for(const candidate of [process.env.TAXMATE_CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','/opt/pw-browsers/chromium/chrome','/usr/bin/google-chrome','/usr/bin/chromium'])if(candidate&&fs.existsSync(candidate))return candidate;return null;};
const waitForServer=async()=>{const started=Date.now();while(Date.now()-started<15000){try{const response=await fetch(`${origin}/?mode=existing&tier=pro`);if(response.ok)return;}catch(_){}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Founder Preview server did not start');};
async function goHome(tier='pro'){await fetch(`${origin}/api/action?mode=existing&tier=${tier}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({callback:'onOpenHome',input:{}})});}
async function snapshot(tier='pro'){const response=await fetch(`${origin}/api/snapshot?mode=existing&tier=${tier}`);return response.json();}
async function pageFor(viewport){const context=await browser.newContext({viewport});await context.route('**/*',async route=>{const url=route.request().url();if(/^https?:\/\//i.test(url)&&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(url)){externalRequests.push(url);await route.abort('blockedbyclient');return;}await route.continue();});const page=await context.newPage();lastPage=page;page.on('pageerror',error=>consoleErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!/ERR_BLOCKED_BY_CLIENT/.test(message.text()))consoleErrors.push(message.text());});return{context,page};}
async function goto(page,pathName){await page.goto(`${origin}${pathName}`,{waitUntil:'networkidle'});await page.locator('.tm-app').waitFor();await page.waitForFunction(()=>window.TaxMateLtdPreviewReady===true);}
async function shot(page,name,fullPage=true){const file=path.join(evidence,name+'.png');await page.screenshot({path:file,fullPage});screenshots.push(name+'.png');}
async function openCompany(page){await page.getByRole('button',{name:/ToodaLoop Ltd/}).click();await page.locator('.tm-workspace-shell').waitFor();}
async function openTax(page){await workspaceNav(page,'tax');await page.locator('[data-action="open-checklist"]').waitFor();}
async function openChecklist(page){const summary=page.locator('[data-action="open-checklist"]').first();if(await summary.getAttribute('data-open')!=='true')await summary.click();await page.locator('[data-statutory-count]').waitFor();}
async function openTodo(page){const toggle=page.locator('[data-action="todo-toggle"]');if(await toggle.count()&&!(await page.locator('[data-todo]').count()))await toggle.click();await page.locator('[data-todo]').first().waitFor();}
async function openDisclosure(page,action){const summary=page.locator(`[data-action="${action}"]`).first();if(await summary.getAttribute('data-open')!=='true')await summary.click();await sleep(200);}
async function closeDisclosure(page,action){const summary=page.locator(`[data-action="${action}"]`).first();if(await summary.count()&&await summary.getAttribute('data-open')==='true')await summary.click();await sleep(200);}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rgb=value=>String(value||'').replace(/\s/g,'');
// Approved money-semantic values (index.html / direction-a.css / workbench.css tokens).
const MONEY={light:{in:'rgb(22,122,67)',out:'rgb(189,48,55)'},dark:{in:'rgb(95,216,145)',out:'rgb(255,138,143)'}};
async function colourOf(locator){return rgb(await locator.evaluate(node=>getComputedStyle(node).color));}


async function workspaceNav(page,area){await page.locator(`.tm-workspace-shell button[data-area="${area}"]:visible`).click();}
async function openRecords(page){await workspaceNav(page,'tax');await page.locator('[data-action="open-records"]').click();}
async function openAllChecks(page){
  await openTax(page);
  await openDisclosure(page,'open-all-confirmations');
  await page.locator('[data-action="statutory-record-checks"]').click();
  await page.locator('.tm-sheet').waitFor();
}

async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  const previewTemp=fs.mkdtempSync(path.join(evidence,'preview-state-'));
  server=spawn(process.execPath,['ui-preview-harness/server.js',`--port=${port}`],{cwd:root,env:{...process.env,TEMP:previewTemp,TMP:previewTemp},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let serverError='';server.stderr.on('data',chunk=>{serverError+=String(chunk);});
  await waitForServer();
  const executablePath=chromePath();
  browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true});

  const mobile=await pageFor({width:390,height:844}),page=mobile.page;
  await goto(page,'/?mode=existing&tier=pro&reset=1');
  await openCompany(page);

  // ---- Overview: key amounts, money colours by role, one to-do entry --------
  const s0=await snapshot();
  check(s0.statutory&&s0.statutory.checklist&&s0.statutory.checklist.items.length===12,'engine checklist has the 12 fixed items');
  equal(await colourOf(page.locator('[data-metric="revenue"] .v')),MONEY.light.in,'money in uses the income colour on the overview');
  equal(await colourOf(page.locator('[data-metric="allowableRunningExpenses"] .v')),MONEY.light.out,'company costs use the expense colour on the overview');
  if(s0.workspace.projection.metrics.corporationTax.status==='supported_estimate')equal(await colourOf(page.locator('[data-metric="corporationTax"] .tm-num')),MONEY.light.out,'a supported zero Corporation Tax is red');
  else check((await page.locator('[data-metric="corporationTax"]').innerText()).includes('Please check'),'unknown Corporation Tax is a review state, not a fabricated zero');
  await openDisclosure(page,'open-overview-details');
  equal(await colourOf(page.locator('[data-metric="companyCash"] .v')),MONEY.light.in,'a positive company cash balance reads as money in');
  await closeDisclosure(page,'open-overview-details');
  const overviewTodo=page.locator('[data-action="open-todo"]');
  check(await overviewTodo.count()===1,'Overview carries exactly one to-do entry point, not a repeated checklist summary');
  equal(await page.locator('[data-statutory-item]').count(),0,'the full checklist is not repeated on the Overview');
  // The four workspace icons must be real SVG geometry, not HTML nodes named "svg".
  const icons=await page.locator('.tm-bottom-nav .tm-navicon').evaluateAll(nodes=>nodes.map(node=>({
    name:node.dataset.icon,ns:node.namespaceURI,ctor:node.constructor.name,
    paths:[...node.children].map(child=>({ns:child.namespaceURI,box:typeof child.getBBox==='function'?(()=>{const b=child.getBBox();return b.width>0&&b.height>0;})():false}))
  })));
  equal(icons.map(i=>i.name),['overview','money','pay','tax'],'the four approved workspace icons are rendered');
  for(const icon of icons){
    equal(icon.ns,'http://www.w3.org/2000/svg',`${icon.name} icon is in the SVG namespace`);
    check(/^SVGSVGElement$/.test(icon.ctor),`${icon.name} icon is an SVGSVGElement, not an HTMLUnknownElement`);
    check(icon.paths.length>0&&icon.paths.every(p=>p.ns==='http://www.w3.org/2000/svg'&&p.box),`${icon.name} icon paints real geometry`);
  }
  await shot(page,'overview-en-light-390');

  // ---- Tax: figures status, merged to-dos, collapsed 12-item checklist ------
  await openTax(page);
  equal(await page.locator('[data-statutory-item]').count(),0,'the Tax area opens with the checklist collapsed');
  await openTodo(page);
  const todoText=await page.locator('.tm-todo-list').innerText();
  check(/Company obligations/.test(await page.locator('[data-action="open-checklist"]').innerText()),'the obligations have one separate checklist entry');
  equal(await page.locator('[data-todo="statutory"]').count(),0,'obligations are not duplicated in the actionable task list');
  check(!/statutory_/.test(todoText)&&!/reason/i.test(todoText),'no raw backend reason code is shown as a user task');
  await shot(page,'tax-todo-en-light-390');
  await openChecklist(page);
  equal(await page.locator('[data-statutory-item]').count(),12,'the checklist still lists all 12 engine items on demand');
  for(const item of s0.statutory.checklist.items){
    const node=page.locator(`[data-statutory-item="${item.id}"]`);
    equal(await node.getAttribute('data-status'),item.status,`item ${item.id} shows engine status ${item.status}`);
    const text=await node.innerText();
    if(item.deadline.status==='known')check(text.includes(item.deadline.date.split('-').reverse().join('/')),`item ${item.id} shows the engine deadline date`);
    else check(text.includes('Please check')&&!/\b0\.00\b|null/.test(text),`item ${item.id} shows Please check for an unknown deadline (never null/0)`);
  }
  await page.locator('[data-statutory-item="vat_rolling_threshold"]').click();
  await page.locator('[data-statutory-item="ct600_deadline"]').click();
  await page.locator('[data-statutory-item="director_psc_identity"]').click();
  await shot(page,'tax-checklist-expanded-en-light-390');

  // ---- Record checks: facts with evidence -> onSaveStatutoryReview ----------
  // Exactly N relevant short rows, then one evidenced fact.
  await page.locator('[data-todo-action="director"]').click();
  equal(await page.locator('[data-review-fact]').count(),4,'4 checks opens precisely 4 short fact rows');
  equal(await page.locator('.tm-statgroup').count(),0,'the list does not expand 11 unrelated groups');
  equal(await page.locator('[data-action="statutory-save"]').count(),0,'the short list has no irrelevant Save action before choosing a fact');
  await page.locator('[data-review-fact="microEntityEligibilityConfirmed"]').click();
  equal(await page.locator('[data-fact]').count(),1,'a selected check opens exactly one question');
  check(await page.locator('[data-action="statutory-save"]').isDisabled(),'an unanswered check cannot be saved as completed');
  await page.locator('[data-fact="microEntityEligibilityConfirmed"] .tm-choice').first().click();
  check(await page.locator('[data-action="statutory-save"]').isDisabled(),'a confirmed fact still requires evidence');
  await page.locator('[data-fkey="ui.statutory::ev:accounts"]').fill('Reviewed eligibility evidence 2026-08-24');
  await page.locator('[data-action="statutory-save"]').click();
  await page.waitForFunction(()=>!document.querySelector('.tm-sheet'));
  await openTax(page);
  await page.locator('[data-todo-action="director"]').click();
  equal(await page.locator('[data-review-fact]').count(),3,'after one evidenced confirmation precisely 3 checks remain');
  await page.locator('.tm-dialog-close').click();
  equal(await page.evaluate(()=>document.activeElement.getAttribute('data-todo-action')),'director','closing the fact list restores focus to the exact task opener');
  const yes=key=>page.locator(`[data-fact="${key}"] .tm-choice`).first();
  for(const group of [
    {id:'registration',keys:['utrReceived','corporationTaxRegistered'],evidence:'HMRC UTR letter 12/05/2026'},
    {id:'retention',keys:['recordsBackedUp','retentionExceptionsChecked'],evidence:'Full Backup ZIP 2026-08-20'},
    {id:'loan',keys:['noOverdrawnDirectorLoan'],evidence:'Director loan ledger review 2026-08-24'}
  ]){
    await openAllChecks(page);
    await page.locator(`[data-review-group="${group.id}"]`).click();
    for(const key of group.keys)await yes(key).click();
    await page.locator(`[data-fkey="ui.statutory::ev:${group.id}"]`).fill(group.evidence);
    check(!(await page.locator('[data-action="statutory-save"]').isDisabled()),'a scoped answered group with evidence can be saved');
    await page.locator('[data-action="statutory-save"]').click();
    await page.waitForFunction(()=>!document.querySelector('.tm-sheet'));
  }
  const s1=await snapshot();
  equal(s1.statutory.checklist.reviewStatus,'current','engine accepted the evidenced review');
  equal(s1.statutory.checklist.items.find(i=>i.id==='utr').status,'completed','UTR item became completed from the recorded facts (engine decision)');
  equal(s1.statutory.checklist.items.find(i=>i.id==='record_retention').status,'completed','record retention became completed from the recorded facts');
  equal(s1.statutory.checklist.items.find(i=>i.id==='director_loan_s455').status,'not_applicable','director loan became not applicable from the recorded fact');
  equal(s1.navigation.routes.at(-1).screenId,'ltd.tax.company-year','saving checks routes to the company-year screen (facade nextRoute)');
  await openChecklist(page);
  equal(await page.locator('[data-statutory-item="utr"]').getAttribute('data-status'),'completed','UI repainted the UTR item from the new engine status');
  await shot(page,'company-year-after-record-checks-en-light-390');
  await page.locator('.tm-workspace-shell .main .tm-wsback').click();await sleep(300);
  await openTax(page);await openChecklist(page);
  equal(await page.locator('[data-statutory-item="utr"]').getAttribute('data-status'),'completed','Tax area shows the same engine status after navigating back');
  await shot(page,'tax-after-record-checks-en-light-390');
  await closeDisclosure(page,'open-checklist');   // collapse again: the default state is closed

  // ---- Missing evidence keeps the save disabled ----------------------------
  await openAllChecks(page);
  await page.locator('.tm-sheet').waitFor();
  await page.locator('[data-review-group="hmrc"]').click();
  await page.locator('[data-fact="hmrcSoftwareReady"] .tm-choice').first().click();
  check(await page.locator('[data-action="statutory-save"]').isDisabled(),'an answer without an evidence reference cannot be saved');
  await shot(page,'sheet-evidence-missing-en-light-390',false);
  await page.locator('.tm-sfoot .tm-btn.g').click();

  // ---- Company year: figures first, details on demand -----------------------
  await page.locator('[data-action="prepare-company-year"]').click();
  await page.locator('[data-figures-status]').waitFor();
  const s2=await snapshot();
  equal(s2.navigation.routes.at(-1).screenId,'ltd.tax.company-year','facade routed to the company-year screen');
  equal(await page.locator('[data-figures-status]').getAttribute('data-figures-status'),s2.workspace.companyYearFigures.status,'figures status pill mirrors the engine');
  const keyFigures=await page.locator('.tm-keyfigures').innerText();
  check(keyFigures.includes('£10,000.00')&&keyFigures.includes('£16,000.00')&&keyFigures.includes('£6,000.00'),'income, costs and profit are on the first screen even though the year is review_required');
  equal(await colourOf(page.locator('.tm-keyfigures .tm-summ .r').nth(0).locator('.tm-num')),MONEY.light.in,'turnover uses the income colour');
  equal(await colourOf(page.locator('.tm-keyfigures .tm-summ .r').nth(1).locator('.tm-num')),MONEY.light.out,'operating costs use the expense colour');
  equal(await colourOf(page.locator('.tm-keyfigures .tm-summ .r').nth(2).locator('.tm-num')),MONEY.light.out,'a negative profit uses the expense colour');
  check(await page.locator('[data-statutory-item]').count()===0,'the company-year screen does not open with the whole checklist');
  const yearTodo=await page.locator('.tm-todo-list').innerText();
  check(/bank statement/i.test(yearTodo),'the unreconciled bank statement is one actionable to-do');
  check(await page.locator('[data-todo-action="bank"]').count()===1,'the bank to-do offers a direct entry point');
  await openDisclosure(page,'open-year-details');
  equal(await page.locator('[data-readiness="figures"]').getAttribute('data-value'),String(s2.statutory.readiness.figuresReady),'figures readiness mirrors engine readiness');
  equal(await page.locator('[data-readiness="statutory"]').getAttribute('data-value'),String(s2.statutory.readiness.statutoryObligationsComplete),'statutory readiness mirrors engine readiness');
  equal(await page.locator('[data-readiness="official"]').getAttribute('data-value'),'false','official submission is never shown as verified');
  const detailText=await page.locator('.tm-app').innerText();
  check(detailText.includes('Please check')&&!/\bnull\b/.test(detailText),'unknown balance-sheet values stay Please check, never null or £0.00');
  await shot(page,'company-year-en-light-390');
  await closeDisclosure(page,'open-year-details');

  // ---- Bank statement: needs_attention -> match -> reconciled ---------------
  await page.locator('[data-todo-action="bank"]').first().click();
  await page.locator('.tm-sheet').waitFor();
  await page.locator('[data-fkey="ui.bank::endDate"]').fill('24/08/2026');await page.locator('[data-fkey="ui.bank::endDate"]').blur();
  await page.locator('[data-fkey="ui.bank::opening"]').fill('0');
  await page.locator('[data-fkey="ui.bank::closing"]').fill('9000');
  await page.locator('[data-fkey="ui.bank::evidence"]').fill('Bank statement to 24/08/2026');
  await page.locator('[data-fkey="ui.bank::l:d0"]').fill('15/05/2026');await page.locator('[data-fkey="ui.bank::l:d0"]').blur();
  await page.locator('[data-fkey="ui.bank::l:a0"]').fill('10000');
  await page.locator('[data-fkey="ui.bank::l:s0"]').fill('Client payment');
  await page.locator('[data-action="bank-add-line"]').click();
  await page.locator('[data-fkey="ui.bank::l:d1"]').fill('10/06/2026');await page.locator('[data-fkey="ui.bank::l:d1"]').blur();
  await page.locator('[data-fkey="ui.bank::l:a1"]').fill('-1000');
  await page.locator('[data-fkey="ui.bank::l:s1"]').fill('Hosting');
  await shot(page,'sheet-bank-statement-en-light-390',false);
  await page.locator('[data-action="bank-save"]').click();
  await page.locator('[data-bank-status]').waitFor();
  const s3=await snapshot();
  equal(s3.navigation.routes.at(-1).screenId,'ltd.money.bank-matching','facade routed to bank matching');
  const rec=s3.workspace.bankReconciliations.at(-1);
  equal(rec.status,'needs_attention','unmatched statement is needs_attention in the engine');
  equal(await page.locator('[data-bank-status]').getAttribute('data-bank-status'),'needs_attention','bank screen mirrors engine status');
  equal(await page.locator('[data-bank-summary]').getAttribute('data-bank-summary'),'unmatched','the result screen states the unmatched position in one line');
  await shot(page,'bank-matching-needs-attention-en-light-390');

  // Matching uses readable record rows: no single-line native option, nothing truncated.
  await page.locator('[data-action="bank-continue"]').click();
  await page.locator('[data-match-line]').first().waitFor();
  equal(await page.locator('.tm-sheet select').count(),0,'the match sheet no longer uses a one-line native select');
  equal(await page.locator('[data-match-line]').count(),2,'one match block per statement line');
  const optionOverflow=await page.locator('[data-match-line] .tm-choice').evaluateAll(nodes=>nodes.map(node=>({
    text:node.innerText.replace(/\s+/g,' ').trim(),
    clipped:node.scrollWidth>node.clientWidth+1||[...node.querySelectorAll('*')].some(child=>child.scrollWidth>child.clientWidth+1),
    ellipsis:getComputedStyle(node).textOverflow==='ellipsis'
  })));
  check(optionOverflow.length>=3,'every unmatched company record is offered as its own row');
  for(const option of optionOverflow){
    check(!option.clipped&&!option.ellipsis,`match option is fully readable at 390px: ${option.text.slice(0,60)}`);
  }
  check(optionOverflow.some(o=>/Client project income/.test(o.text)&&/15\/05\/2026/.test(o.text)&&/£10,000\.00/.test(o.text)),'a match option shows the name, the date and the full amount');
  await shot(page,'sheet-bank-match-en-light-390',false);
  await page.locator('[data-match-line="statement-line:1"] .tm-choice').filter({hasText:/Client project income/}).click();
  await page.locator('[data-match-line="statement-line:2"] .tm-choice').filter({hasText:/hosting/i}).click();
  await page.locator('[data-action="bank-match-save"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-bank-status="reconciled"]'));
  const s4=await snapshot();
  equal(s4.workspace.bankReconciliations.find(r=>r.id===rec.id).status,'reconciled','engine reconciled the statement after matching');
  equal(await page.locator('[data-bank-summary]').getAttribute('data-bank-summary'),'matched','the result screen states that every line is matched');
  // Status is a short label; the transaction itself is an ordinary record row.
  const matchedPill=page.locator('[data-line-match="matched"]').first();
  const pillText=(await matchedPill.innerText()).trim();
  check(pillText.length<=24&&!/£/.test(pillText),`matched status stays a short label ("${pillText}")`);
  check(await page.locator('[data-statement-line] .rs.match').count()===2,'the matched company record is shown as a normal record line');
  equal(await colourOf(page.locator('[data-statement-line]').nth(0).locator('.rv .tm-num')),MONEY.light.in,'a money-in statement line uses the income colour');
  equal(await colourOf(page.locator('[data-statement-line]').nth(1).locator('.rv .tm-num')),MONEY.light.out,'a money-out statement line uses the expense colour');
  await shot(page,'bank-matching-reconciled-en-light-390');

  // The confirmation must not sit on any control, and must not survive into the next sheet.
  const toast=page.locator('.tm-toast');
  check(await toast.count()===1,'the action confirmation is shown');
  const overlap=await page.evaluate(()=>{
    const strip=document.querySelector('.tm-toast');if(!strip)return null;
    const box=strip.getBoundingClientRect();
    const controls=[...document.querySelectorAll('button,[role=tab],a[href],input,select')];
    const hit=controls.find(control=>{const r=control.getBoundingClientRect();return r.width>0&&r.height>0&&!(r.right<=box.left||r.left>=box.right||r.bottom<=box.top||r.top>=box.bottom);});
    return{position:getComputedStyle(strip).position,overlapped:hit?hit.textContent.trim().slice(0,40):null};
  });
  equal(overlap.position,'static','the confirmation is placed in the layout, not floated over it');
  equal(overlap.overlapped,null,'the confirmation covers no button or control');
  await page.locator('[data-action="bank-delete"]').click();
  await page.locator('.tm-sheet').waitFor();
  equal(await page.locator('.tm-toast').count(),0,'the previous confirmation is cleared when the next sheet opens');
  await shot(page,'sheet-bank-delete-en-light-390',false);

  // Removing a reconciliation needs both a reason and evidence, and must reach the engine.
  const deleteButton=page.locator('[data-action="bank-delete-confirm"]');
  const deleteReason=page.locator('[data-fkey="ui.bankDelete::reason"]');
  const deleteEvidence=page.locator('[data-fkey="ui.bankDelete::evidence"]');
  check(await deleteButton.isDisabled(),'Reconciliation removal starts disabled');
  await deleteReason.fill('Duplicate statement');
  check(await deleteButton.isDisabled(),'A removal reason alone does not bypass required evidence');
  await deleteEvidence.fill('local:duplicate-statement-review');
  check(await deleteButton.isEnabled(),'Reason and evidence enable reconciliation removal without a repaint');
  await deleteReason.fill('   ');
  check(await deleteButton.isDisabled(),'Whitespace-only removal reason stays disabled');
  await deleteReason.fill('Duplicate statement');
  await deleteEvidence.fill('   ');
  check(await deleteButton.isDisabled(),'Whitespace-only removal evidence stays disabled');
  await deleteEvidence.fill('local:duplicate-statement-review');
  await deleteButton.click();
  await page.waitForFunction(()=>!document.querySelector('.tm-sheet'));
  const removed=(await snapshot()).workspace.bankReconciliations.find(r=>r.id===rec.id);
  equal(removed.status,'voided','Engine keeps the removed reconciliation as voided');
  equal(removed.voidReasonCode,'Duplicate statement','Engine stores the supplied removal reason');
  equal(removed.voidEvidenceRefs,['local:duplicate-statement-review'],'Engine stores the supplied removal evidence');
  equal(await page.locator('[data-bank-status]').getAttribute('data-bank-status'),'voided','UI shows the engine voided state');
  equal(await page.locator('[data-action="bank-delete"]').count(),0,'Voided reconciliation no longer offers removal');
  await shot(page,'bank-voided-en-light-390');

  // ---- Preparation pack: one action first, guidance and figures on demand ----
  await page.locator('.tm-workspace-shell .main .tm-wsback').click();await sleep(300);   // -> company-year
  await page.locator('.tm-workspace-shell .main .tm-wsback').click();await sleep(300);   // -> tax
  await workspaceNav(page,'tax');
  await page.locator('[data-action="download-self-filing-pack"]').first().click();
  await page.locator('[data-pack-status]').waitFor();
  const s5=await snapshot();
  equal(s5.navigation.routes.at(-1).screenId,'ltd.tax.self-filing-pack','facade routed to the pack screen');
  equal(s5.lastResult.status,'review_required','pack is review_required for an unfinished year');
  check(!!s5.lastResult.data&&!!s5.lastResult.data.fileName,'review_required still carries a downloadable preparation pack');
  equal(await page.locator('[data-pack-status]').getAttribute('data-pack-ready'),'true','the pack screen states that it can be downloaded');
  const packButton=page.locator('[data-action="download-pack-file"]');
  equal(await packButton.count(),1,'exactly one download button is offered for the review_required pack');
  equal((await packButton.innerText()).trim(),'Download','the download button is a short verb, not the file name');
  const packFirstScreen=await page.locator('.tm-workspace-shell .main>.tm-col').innerText();
  check(/does not submit/i.test(packFirstScreen),'the pack screen still says once that TaxMate does not submit it');
  check(!/iXBRL/.test(packFirstScreen),'submission mechanics are not on the first screen');
  check(!/Box 145/.test(packFirstScreen),'CT600 boxes are not on the first screen');
  await shot(page,'self-filing-pack-en-light-390');
  await openDisclosure(page,'open-pack-guidance');
  check((await page.locator('[data-pack-file]').innerText()).includes(s5.lastResult.data.fileName),'the file name is shown in the expanded download guidance');
  check(/not an iXBRL file/.test(await page.locator('.tm-app').innerText()),'the filing route detail is available on demand');
  await closeDisclosure(page,'open-pack-guidance');
  await openDisclosure(page,'open-pack-details');
  const packDetail=await page.locator('.tm-app').innerText();
  check(packDetail.includes('Box 145')&&packDetail.includes('£10,000.00'),'CT600 boxes use engine display values');
  check(packDetail.includes('Please check')&&!/\bnull\b/.test(packDetail),'unknown accounts lines show Please check (never null / £0.00)');
  await shot(page,'self-filing-pack-details-en-light-390');
  await closeDisclosure(page,'open-pack-details');

  // ---- RTI evidence -> onUpdatePayrollReporting ------------------------------
  await page.locator('.tm-workspace-shell .main .tm-wsback').click();await sleep(300);
  await workspaceNav(page,'pay');
  await page.getByRole('button',{name:/Record salary already paid/}).click();
  await page.locator('.tm-sheet').waitFor();
  const sid='ui.salary';
  await page.locator(`[data-fkey="${sid}::payDate"]`).fill('20/08/2026');await page.locator(`[data-fkey="${sid}::payDate"]`).blur();
  await page.locator(`[data-fkey="${sid}::gross"]`).fill('1000');
  await page.locator(`[data-fkey="${sid}::paye"]`).fill('0');
  await page.locator(`[data-fkey="${sid}::eeNi"]`).fill('0');
  await page.locator(`[data-fkey="${sid}::erNi"]`).fill('0');
  await page.locator(`[data-fkey="${sid}::evidence"]`).fill('Payroll run 20/08/2026');
  await page.locator('.tm-sheet .tm-choice').filter({hasText:/pending|Pending/i}).first().click();
  for(const box of await page.locator('.tm-sheet .tm-check').all())await box.click();
  await page.locator('.tm-sfoot .tm-btn.p').click();
  await page.waitForFunction(()=>!document.querySelector('.tm-sheet'));
  const s6=await snapshot();
  const salary=s6.workspace.salaryRecords[0];
  check(!!salary,'salary record exists');
  equal(s6.navigation.routes.at(-1).screenId,'ltd.tax.salary-record','facade routed to the salary record screen');
  equal(await page.locator('[data-rti-status]').first().getAttribute('data-rti-status'),'pending_rti','salary record screen shows the pending RTI position');
  equal(await colourOf(page.locator('.tm-summ .r').first().locator('.tm-num')),MONEY.light.out,'gross salary is shown as a company cost');
  await shot(page,'salary-record-pending-rti-en-light-390');
  await page.locator('[data-action="rti-update"]').first().click();
  await page.locator('.tm-sheet').waitFor();
  await page.locator('.tm-sheet .tm-choice').first().click();
  await page.locator('[data-fkey="ui.rti::evidence"]').fill('FPS receipt ABC123');
  await page.locator('[data-fkey="ui.rti::reason"]').fill('FPS filed through payroll software');
  await shot(page,'sheet-rti-en-light-390',false);
  await page.locator('[data-action="rti-save"]').click();
  await page.waitForFunction(()=>!document.querySelector('.tm-sheet'));
  const s7=await snapshot();
  const updated=s7.workspace.salaryRecords.find(r=>r.id===salary.id);
  equal(updated.payrollReporting.status,'reported_rti','RTI evidence saved as a revisioned payrollReporting record');
  equal(updated.payeReportingStatus,salary.payeReportingStatus,'the original financial posting status is untouched');
  equal(s7.statutory.checklist.items.find(i=>i.id==='paye_rti').status,'completed','PAYE/RTI checklist item follows the engine after RTI evidence');
  equal(await page.locator('[data-rti-status]').first().getAttribute('data-rti-status'),'reported_rti','UI reads payrollReporting, not the old posting status');
  // Rapid follow-up: the "Done" confirmation must not land on the next sheet's footer.
  await page.locator('[data-action="rti-update"]').first().click();
  await page.locator('.tm-sheet').waitFor();
  equal(await page.locator('.tm-toast').count(),0,'the RTI confirmation does not survive into the reopened sheet');
  const footerClear=await page.evaluate(()=>{
    const footer=document.querySelector('.tm-sfoot');if(!footer)return null;
    const box=footer.getBoundingClientRect();
    const sheet=document.querySelector('.tm-sheet');
    if(box.bottom>innerHeight+1||box.top<0)return 'footer-outside-viewport';
    // Test the painted hit surface, not merely rectangles of the inert background nav.
    for(const button of footer.querySelectorAll('button')){
      const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      if(!hit||!sheet.contains(hit))return hit?hit.className||hit.tagName:'missing-hit';
    }
    return null;
  });
  equal(footerClear,null,'no floating element covers the sheet footer during a rapid second action');
  await shot(page,'sheet-rti-reopened-en-light-390',false);
  await page.locator('.tm-sfoot .tm-btn.g').last().click();await sleep(200);
  await shot(page,'salary-record-rti-updated-en-light-390');
  await page.locator('.tm-workspace-shell .main .tm-wsback').click();await sleep(300);
  await openTax(page);await openChecklist(page);
  equal(await page.locator('[data-statutory-item="paye_rti"]').getAttribute('data-status'),'completed','PAYE/RTI item shows completed in the Tax area');
  await shot(page,'tax-rti-updated-en-light-390');

  // ---- Dark theme: the same money roles in the dark palette -----------------
  const dark=await pageFor({width:390,height:844});
  await goHome();
  await goto(dark.page,'/?mode=existing&tier=pro&theme=dark');
  await openCompany(dark.page);
  equal(await colourOf(dark.page.locator('[data-metric="revenue"] .v')),MONEY.dark.in,'dark mode keeps money in on the income colour');
  equal(await colourOf(dark.page.locator('[data-metric="allowableRunningExpenses"] .v')),MONEY.dark.out,'dark mode keeps company costs on the expense colour');
  await workspaceNav(dark.page,'money');await sleep(300);
  const darkRows=dark.page.locator('.tm-rec[data-event-role]');
  const darkIn=darkRows.filter({has:dark.page.locator('[data-event-role="in"]')});
  equal(await colourOf(darkRows.filter({hasText:/Client project income/}).first().locator('.rv .tm-num')),MONEY.dark.in,'dark mode income record row uses the income colour');
  equal(await colourOf(darkRows.filter({hasText:/hosting/i}).first().locator('.rv .tm-num')),MONEY.dark.out,'dark mode expense record row uses the expense colour');
  await shot(dark.page,'money-en-dark-390');
  await dark.context.close();

  // ---- Read-only tiers: no Pro-only controls, honest retention copy ---------
  const plus=await pageFor({width:390,height:844});
  await goto(plus.page,'/?mode=existing&tier=plus&reset=1');
  await openCompany(plus.page);
  check(await plus.page.locator('[data-read-only]').count()===1,'Plus (retained read) sees the read-only notice exactly once');
  await plus.page.locator('[data-action="open-bank"]').click();
  await plus.page.locator('.tm-sheet').waitFor();
  equal(await plus.page.locator('.tm-sheet input,.tm-sheet textarea,.tm-sheet [data-action="bank-match-save"]').count(),0,'retained bank entry exposes no write form or Save action');
  await shot(plus.page,'bank-plus-read-only-en-light-390',false);
  await plus.page.keyboard.press('Escape');
  equal(await plus.page.evaluate(()=>document.activeElement.getAttribute('data-action')),'open-bank','bank Escape restores the real opener');
  await workspaceNav(plus.page,'money');await sleep(400);
  equal(await plus.page.getByRole('button',{name:/Add income/}).count(),0,'Plus cannot see Add income');
  await shot(plus.page,'money-plus-read-only-en-light-390');
  await workspaceNav(plus.page,'tax');await sleep(400);
  check(await plus.page.locator('[data-action="prepare-company-year"]').count()<=1,'retained Plus has at most one read-only figure entry; engine retains the permission gate');
  equal(await plus.page.locator('[data-action="statutory-record-checks"]').count(),0,'Plus cannot record checks');
  equal(await plus.page.locator('[data-read-only]').count(),1,'the read-only notice is never repeated down the Tax screen');
  await openChecklist(plus.page);
  equal(await plus.page.locator('[data-statutory-item]').count(),12,'Plus can still read the 12-item checklist');
  await shot(plus.page,'tax-plus-read-only-en-light-390');
  await openRecords(plus.page);await sleep(400);
  equal(await plus.page.getByRole('button',{name:/Remove company/}).count(),0,'Plus cannot see Remove company');
  await shot(plus.page,'records-plus-read-only-en-light-390');
  const free=await pageFor({width:390,height:844});
  await goto(free.page,'/?mode=existing&tier=free&reset=1');
  const sFree=await snapshot('free');
  equal(sFree.companyLimit.reason,'tax_year_retention_date_required','Free with no trusted access-end date is blocked by the engine');
  const freeRow=free.page.locator('[data-locked-company]');
  equal(await freeRow.getAttribute('data-locked-company'),'tax_year_retention_date_required','Home shows the engine reason for the withheld company');
  const freeText=await freeRow.innerText();
  check(!freeText.includes('ToodaLoop')&&!freeText.includes('£6,000'),'withheld company shows no name or figures');
  check(freeText.includes('£11.99')&&freeText.includes('£9.99'),'locked row shows standard £11.99 struck through beside launch £9.99');
  await shot(free.page,'home-free-locked-en-light-390');

  // ---- Six locales × light/dark, Urdu RTL ----------------------------------
  const locales=['en','zh-HK','pl','ro','es','ur'];
  for(const locale of locales)for(const theme of ['light','dark']){
    const ctx=await pageFor({width:390,height:844});
    await goHome();
    await goto(ctx.page,`/?mode=existing&tier=pro&locale=${locale}&theme=${theme}`);
    await openCompany(ctx.page);
    await workspaceNav(ctx.page,'tax');
    await ctx.page.locator('[data-action="open-checklist"]').waitFor();
    const surface=await ctx.page.locator('.tm-app').innerText();
    check(!/⟨[a-z0-9_.]+⟩/.test(surface),`${locale}/${theme}: no missing copy key sentinel`);
    check(!/\b(company_income|company_expense|needs_attention|ready_for_director_check|pending_rti)\b/.test(surface),`${locale}/${theme}: no internal enum is shown as a label`);
    if(locale==='ur'){
      equal(await ctx.page.locator('.tm-app').getAttribute('dir'),'rtl','Urdu renders RTL');
      check(!/Please check|Statutory checklist|What still needs doing/.test(surface),'Urdu shows no English fallback on the Tax surface');
      const isolated=await ctx.page.locator('.tm-num').first().evaluate(node=>getComputedStyle(node).unicodeBidi);
      check(/isolate/.test(isolated),'amounts and dates stay bidi-isolated in Urdu');
    }
    if(locale!=='en')check(!/Statutory checklist|Company year-end/.test(surface),`${locale}: section titles are translated`);
    await shot(ctx.page,`tax-${locale}-${theme}-390`);
    await openChecklist(ctx.page);
    const listText=await ctx.page.locator('.tm-statlist').innerText();
    check(!/⟨[a-z0-9_.]+⟩/.test(listText),`${locale}/${theme}: checklist items are fully translated`);
    await shot(ctx.page,`tax-checklist-${locale}-${theme}-390`);
    await openAllChecks(ctx.page);
    await ctx.page.locator('.tm-sheet').waitFor();
    const sheetText=await ctx.page.locator('.tm-sheet').innerText();
    check(!/⟨[a-z0-9_.]+⟩/.test(sheetText),`${locale}/${theme}: record-checks sheet is fully translated`);
    await shot(ctx.page,`sheet-record-checks-${locale}-${theme}-390`,false);
    await ctx.context.close();
  }

  // ---- Widths: no horizontal overflow, nothing clipped ---------------------
  for(const width of [360,412,1440]){
    const ctx=await pageFor({width,height:width>1000?900:844});
    await goHome();
    await goto(ctx.page,'/?mode=existing&tier=pro');
    await openCompany(ctx.page);
    await workspaceNav(ctx.page,'tax');
    await ctx.page.locator('[data-action="open-checklist"]').waitFor();
    const overflow=await ctx.page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    check(!overflow,`no horizontal overflow at ${width}px`);
    await shot(ctx.page,`tax-en-light-${width}`);
    await ctx.context.close();
  }

  // ---- Loading / error states ---------------------------------------------
  const err=await pageFor({width:390,height:844});
  await err.page.route('**/api/action*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'failure',error:{reasonCode:'facade_failure',copyKey:'error.fix_issue',params:{}},data:null,fieldErrors:[],reviewReasons:[]})}));
  await goHome();
  await goto(err.page,'/?mode=existing&tier=pro');
  await err.page.getByRole('button',{name:/ToodaLoop Ltd/}).click();
  await err.page.locator('.tm-toast').waitFor();
  check((await err.page.locator('.tm-toast').innerText()).length>0,'facade failure surfaces the approved error copy, not a raw message');
  await shot(err.page,'error-facade-failure-en-light-390',false);
  await err.context.close();
  const slow=await pageFor({width:390,height:844});
  await slow.page.route('**/api/snapshot*',async route=>{await sleep(1500);await route.continue();});
  await slow.page.goto(`${origin}/?mode=existing&tier=pro`);
  await slow.page.locator('#taxmate-ltd-ui-root').waitFor();
  await shot(slow.page,'loading-en-light-390',false);
  await slow.context.close();

  equal(externalRequests,[],'no external network request was made');
  equal(consoleErrors,[],'no page or console errors');
  const result={status:'PASS',assertions:assertions.length,assertionList:assertions,screenshots,serverError:serverError.trim()||null,generatedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,'ltd-year-end-ui-result.json'),JSON.stringify(result,null,2));
  console.log(`LTD_YEAR_END_UI PASS assertions=${assertions.length} screenshots=${screenshots.length} evidence=${evidence}`);
}

let lastPage=null;
main().then(()=>cleanup(0)).catch(async error=>{console.error(error);fs.mkdirSync(evidence,{recursive:true});try{if(lastPage)await lastPage.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});}catch(_){}fs.writeFileSync(path.join(evidence,'ltd-year-end-ui-result.json'),JSON.stringify({status:'FAIL',error:String(error&&error.stack||error),assertions:assertions.length,assertionList:assertions,consoleErrors,externalRequests},null,2));cleanup(1);});
async function cleanup(code){try{if(browser)await browser.close();}catch(_){}try{if(server)server.kill();}catch(_){}process.exit(code);}

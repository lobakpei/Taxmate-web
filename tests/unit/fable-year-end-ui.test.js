'use strict';

// Fable R5 — source-level and vm-level checks for the Direction A year-end UI,
// retained-access copy and the main-shell retention surfaces. Browser behaviour is
// covered by tests/browser/ltd-year-end-ui.e2e.js against the real facade + driver.

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const renderer=read('src/ui/ltd/workbench-renderer.js');
const app=read('src/app/app.js');
const shell=read('index.html');
const directionCss=read('src/ui/direction-a.css');
const workbenchCss=read('src/ui/ltd/workbench.css');
const driver=read('src/integration/ltd/CanonicalCompanyDriver.js');
const copy=JSON.parse(read('src/integration/ltd/approved-copy.json'));
const locales=['en','zh-HK','pl','ro','es','ur'];

test('renderer reads the revisioned payrollReporting position before the original posting status',()=>{
  assert.match(renderer,/function rtiStatus\(r\)\{ return \(r\.payrollReporting&&r\.payrollReporting\.status\)\|\|r\.payeReportingStatus/);
  assert.match(renderer,/expectedReportingRevision:\(rec\.payrollReporting&&rec\.payrollReporting\.revision\)\|\|0/);
  assert.match(renderer,/sourceEventRevisionId:rec\.sourceEventRevisionId/);
  assert.doesNotMatch(renderer,/payeReportingStatus:\s*getChoice\(sid,'status'/);
});

test('unknown figures render as Please check and are never coerced to £0.00',()=>{
  assert.match(renderer,/function isKnownMinor\(v\)\{ return typeof v==='number' && isFinite\(v\) && Math\.floor\(v\)===v/);
  assert.match(renderer,/function moneyRole\(minor, role\)\{\s*if\(!isKnownMinor\(minor\)\) return h\('span',\{class:'tm-muted tm-check-needed'/);
  assert.match(renderer,/function figNode\(minor, role\)\{ return moneyRole\(minor, role\|\|'signed'\); \}/);
  assert.match(renderer,/return h\('span',\{class:'tm-muted tm-check-needed',text:t\('statutory\.needs_checking'\)\}\)/);
  assert.match(renderer,/if\(dl\.status==='known'&&dl\.date\) return isoToDisplay\(dl\.date\)/);
  assert.doesNotMatch(renderer,/String\(it\.deadline\.date\)|JSON\.stringify\(it\.deadline\)/);
});

test('money semantics: an explicit cost column is always the expense colour, other values follow their sign',()=>{
  // Presentation only — moneyClass never changes a value, a sign or a classification.
  assert.match(renderer,/function moneyClass\(minor, role\)\{[\s\S]{0,400}if\(role==='out'\) return 'neg';[\s\S]{0,200}return minor>0\?'pos':minor<0\?'neg':'';/);
  for(const [row,role] of [['operatingCostsMinor','out'],['directorSalaryMinor','out'],['corporationTaxMinor','out'],['turnoverMinor','in'],['profitBeforeTaxMinor','signed']])
    assert.ok(renderer.includes(`['${row}',`)&&new RegExp(`\\['${row}','[a-z._]+','${role}'\\]`).test(renderer),`${row} carries the ${role} money role`);
  assert.match(renderer,/var MONEY_IN_TYPES=\{company_income:1,director_loan_funding:1,share_capital_funding:1,sales_invoice_payment:1\}/);
  assert.match(app,/const moneyCls = \(value, role\) =>/);
  for(const call of ["moneyCls(personal.profitMinor,'signed')","moneyCls(personal.incomeMinor,'in')","moneyCls(personal.expensesMinor,'out')"])assert.ok(app.includes(call),`personal shell uses ${call}`);
  // Money tokens exist in both themes and are not the brand palette.
  assert.match(directionCss,/--money-in:#167A43;--money-out:#BD3037/);
  assert.match(directionCss,/--money-in:#5FD891;--money-out:#FF8A8F/);
  assert.match(shell,/--money-in:#067A4B; --money-out:#E5484D/);
  assert.match(shell,/--money-in:#3DE89B; --money-out:#FF6B73/);
});

test('the four workspace icons are built in the SVG namespace with real paths',()=>{
  assert.match(renderer,/var SVG_NS='http:\/\/www\.w3\.org\/2000\/svg'/);
  assert.match(renderer,/var n = isSvg \? document\.createElementNS\(SVG_NS, tag\) : document\.createElement\(tag\)/);
  assert.match(renderer,/if\(k==='class'\)\{ if\(isSvg\) n\.setAttribute\('class', v\); else n\.className = v; \}/);
  for(const icon of ['overview','money','tax','records'])assert.match(renderer,new RegExp(`${icon}:\\[\\['(path|rect)'`),`${icon} icon has shape children`);
  assert.doesNotMatch(renderer,/h\('svg',\{[^}]*html:/);
});

test('reminders use the approved amber module and never the income green',()=>{
  assert.match(shell,/\.notice\.green,\.notice\.amber\{background:var\(--amber-soft\)/);
  assert.match(directionCss,/html\[data-direction-a="true"\] \.notice\.green,\s*html\[data-direction-a="true"\] \.notice\.amber,\s*html\[data-direction-a="true"\] \.tm-notice\.ok,\s*html\[data-direction-a="true"\] \.tm-notice\.warn\{background:var\(--amber-soft\)/);
  assert.match(workbenchCss,/\.tm-notice\.ok\{background:var\(--amber-soft\)/);
  assert.match(workbenchCss,/\.tm-pill\.ok\{background:var\(--amber-soft\)/);
  assert.doesNotMatch(app,/notice green[^"']*Changes are kept on this device/);
  assert.match(app,/data-sync-pending[\s\S]{0,200}sync\.pendingLocal/);
});

test('the personal bottom navigation centres its icon and label as one group',()=>{
  assert.match(shell,/nav button\{[^}]*justify-content:center/);
  assert.match(directionCss,/>#nav button\{[\s\S]{0,320}justify-content:center/);
  // The selected state only changes colours, so nothing shifts when a tab is picked.
  assert.match(directionCss,/>#nav button svg\{width:36px;height:24px;padding:2px 8px/);
  assert.match(directionCss,/>#nav button\.on svg\{background:var\(--y\);color:var\(--navy\)\}/);
  assert.match(directionCss,/padding:0 0 env\(safe-area-inset-bottom\)/);
});

test('a confirmation is placed in the layout and cleared before the next sheet or screen',()=>{
  assert.match(renderer,/function clearToast\(\)\{ if\(UI\._toastT\) clearTimeout\(UI\._toastT\); UI\._toastT=null; UI\.toast=null; \}/);
  assert.match(renderer,/function openSheet\(kind, ctx\)\{[\s\S]*?flushActive\(\); clearToast\(\);/);
  assert.match(renderer,/UI\.lastRouteKey=rId; clearToast\(\);/);
  assert.match(renderer,/if\(UI\.toast\) col\.append\(h\('div',\{class:'tm-toast',role:'status'/);
  assert.doesNotMatch(renderer,/app\.append\(h\('div',\{class:'tm-toast'/);
  assert.match(workbenchCss,/\.tm-toast\{display:block; margin:10px 0 0; pointer-events:none\}/);
  assert.doesNotMatch(workbenchCss,/\.tm-toast\{position:fixed/);
});

test('the match sheet offers readable record rows instead of one-line native options',()=>{
  assert.match(renderer,/choiceGroup\(\{scope:sid,name:'m:'\+l\.id,current:cur,options:opts/);
  assert.match(renderer,/return \{v:id,title:pp\.title,body:pp\.meta,amount:bankEventAmount\(eventById\(id\),rec\),role:'signed'\}/);
  assert.match(renderer,/amount===l\.amountMinor&&!lines\.some/);
  assert.match(renderer,/tm-choice-amount[\s\S]{0,80}moneyRole\(op\.amount/);
  assert.doesNotMatch(renderer,/selectField\(\{scope:sid,fid:'m:'/);
  assert.match(workbenchCss,/\.tm-matchline \.tm-choice\{display:block/);
  // The matched record is a normal row, not a long line of small text in a status pill.
  assert.match(renderer,/text:unmatched\?t\('bank\.unmatched_short'\):t\('bank\.matched'\)/);
  assert.doesNotMatch(renderer,/tm-pill '\+\(unmatched\?'warn':'ok'\),text:unmatched\?t\('bank\.none'\):t\('bank\.matched_to'/);
});

test('the year and pack screens lead with figures and one action, with detail on demand',()=>{
  // Reason codes are merged into a few actionable to-dos rather than listed one by one.
  assert.match(renderer,/function todoItems\(opts\)/);
  assert.match(renderer,/var DIRECTOR_CHECK_CODES=/);
  assert.match(renderer,/items\.push\(\{id:'statutory',text:t\('todo\.statutory_items',\{count:statutory\}\),action:'checklist'\}\)/);
  assert.match(renderer,/function statutoryDisclosure\(opts\)/);
  assert.match(renderer,/out\.push\(h\('div',\{class:'tm-keyfigures'\},\[figRows\(fig,KEY_ROWS,'profitAndLoss'\)\]\)\)/);
  assert.match(renderer,/disclosure\('year\.details', t\('year\.view_details'\)/);
  // The download button is a verb; the file name is a separate line.
  assert.match(renderer,/btn\(t\('pack\.download'\),'p',function\(\)\{ triggerDownload\(d\); \}/);
  assert.match(renderer,/dataset:\{packFile:d\.fileName\},text:t\('pack\.file',\{name:d\.fileName\}\)/);
  assert.doesNotMatch(renderer,/t\('design\.download'\)\+' · '\+d\.fileName/);
  assert.match(renderer,/disclosure\('pack\.guidance', t\('pack\.guidance'\)/);
  // review_required still downloads: the pack action is not blocked by open checks.
  assert.match(renderer,/var ready=!!d\.fileName;/);
});

test('every status, deadline and readiness value shown comes from the engine snapshot',()=>{
  assert.match(renderer,/function statutory\(\)\{ return S\(\)\.statutory\|\|null; \}/);
  assert.match(renderer,/dataset:\{statutoryItem:it\.id,status:it\.status\}/);
  assert.match(renderer,/dataset:\{readiness:'official',value:'false'\}/);
  assert.match(renderer,/r\.figuresReady\?t\('year\.figures_ready'\):t\('year\.figures_not_ready'\)/);
  assert.match(renderer,/run\('onSaveStatutoryReview',\{expectedRevision:c\.reviewRevision\|\|0, sourceFingerprint:c\.sourceFingerprint, facts:col\.facts\}/);
  assert.match(renderer,/run\('onPrepareCompanyYear'/);
  assert.match(renderer,/run\('onDownloadSelfFilingPack'/);
  assert.match(renderer,/run\('onMatchBankStatement',\{statement:stmt\}/);
  assert.match(renderer,/run\('onUpdatePayrollReporting'/);
  assert.match(renderer,/case 'ltd\.tax\.company-year': return screenCompanyYear\(\);/);
  assert.match(renderer,/case 'ltd\.tax\.self-filing-pack': return screenSelfFilingPack\(\);/);
  assert.match(renderer,/case 'ltd\.money\.bank-matching': return screenBankMatching\(\);/);
});

test('Pro-only controls are hidden from the snapshot entitlement while handlers and driver guards stay',()=>{
  assert.match(renderer,/function can\(action\)\{[\s\S]*return acts\[action\]\.allowed!==false;/);
  for(const action of ['create_event','correct_event','edit_draft_event','confirm_salary','declare_dividend','record_dividend_payment','create_scenario','create_period','edit_company','change_ownership','companies_house_lookup','generate_working_pack','remove_company'])assert.ok(renderer.includes(`can('${action}')`),`renderer gates ${action}`);
  assert.match(driver,/requireAccess\('edit_draft_event'\)/);
  assert.match(driver,/requireAccess\('remove_company'\)/);
  assert.match(driver,/retention:clone\(read&&read\.retention\|\|null\)/);
});

test('approved copy carries every new key in all six locales with no English fallback',()=>{
  const en=copy.canonical.en;
  const keys=Object.keys(en).filter(key=>/^(statutory|year|pack|bank|rti)\.|^plan\.(read_only|retained|download_reminder)/.test(key));
  assert.ok(keys.length>=400,`expected the R5 key set, got ${keys.length}`);
  for(const locale of locales){for(const key of keys)assert.equal(typeof copy.canonical[locale][key],'string',`${locale}:${key}`);}
  const sample=['statutory.title','statutory.needs_checking','statutory.status.outstanding','year.title','pack.not_submission','bank.title','rti.title','plan.read_only_title','statutory.item.utr.title','statutory.fact.utrReceived'];
  for(const locale of locales.filter(l=>l!=='en'))for(const key of sample)assert.notEqual(copy.canonical[locale][key],en[key],`${locale}:${key} fell back to English`);
  for(const key of keys){const placeholders=[...en[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();for(const locale of locales)assert.deepEqual([...copy.canonical[locale][key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),placeholders,`${locale}:${key} placeholders`);}
  const literal=new Set([...renderer.matchAll(/\bt\('([^']+)'/g)].map(m=>m[1]).filter(k=>!k.endsWith('.')));
  for(const locale of locales){const dictionary={...copy.design_scaffolding[locale],...copy.canonical[locale]};for(const key of literal)assert.ok(Object.hasOwn(dictionary,key),`${locale}:${key}`);}
});

test('official names stay and positive preparation wording does not claim submission',()=>{
  const en=copy.canonical.en;
  assert.match(en['statutory.item.hmrc_ixbrl.title'],/CT600/);assert.match(en['statutory.item.cs01.title'],/CS01/);
  assert.match(en['pack.not_submission'],/does not submit accounts or a Company Tax Return/);
  assert.match(en['year.official_not_verified'],/Not verified by TaxMate/);
  assert.doesNotMatch(en['year.prepare'],/not submit|does not/i);
  assert.equal(en['plan.pro_standard_price'],'Standard price £11.99/month');assert.equal(en['plan.pro_launch_price'],'Launch price £9.99/month');
  assert.match(renderer,/h\('s',\{class:'tm-price-standard',text:t\('plan\.pro_standard_price'\)\}\)/);
});

function shellContext(control,snapshot){
  const {I18N}=require('../../scripts/i18n-audit');
  const Entitlement=require('../../src/core/entitlement');
  const context=vm.createContext({console,navigator:{onLine:true},ENTITLEMENT:{snapshot},CLOUD:{retentionControl:control},TaxMateEntitlement:Entitlement,locale:()=>'en-GB',esc:v=>String(v),t:(key,vars)=>{let s=I18N.en[key]||key;if(vars)for(const k in vars)s=s.split('{'+k+'}').join(vars[k]);return s;}});
  vm.runInContext(app.slice(app.indexOf('function retentionDateLabel(value){'),app.indexOf('function openBillingPortal(){')),context);
  return context;
}
test('settings data card reads the server retention control: none / purging / failed / complete / warnings',()=>{
  const snapshot={subscriptionStatus:'canceled',paidTier:'free',lastPaidTier:'pro',currentPeriodEnd:Date.UTC(2026,5,30),graceUntil:Date.UTC(2026,5,30),serverVerifiedAt:Date.UTC(2026,8,1)};
  const base={schemaVersion:1,epoch:2,cutoffDate:'2027-04-06',deleteOnDate:'2027-04-06',retainThroughDate:'2027-04-05'};
  const expectations=[[null,'none','no history removal has run'],[{...base,status:'purging'},'purging','in progress'],[{...base,status:'failed'},'failed','will be retried automatically'],[{...base,status:'complete'},'complete','server confirmed removal of records before 6 Apr 2027'],[{...base,status:'complete_with_warnings',warningCodes:['receipt_cleanup_pending']},'complete_with_warnings','receipt files are still being removed']];
  for(const [control,status,text] of expectations){
    const html=shellContext(control,snapshot).retentionStatusCard();
    assert.match(html,new RegExp(`data-retention-status="${status}"`));
    assert.ok(html.includes(text),`${status}: ${text}`);
    if(status!=='complete'&&status!=='complete_with_warnings')assert.doesNotMatch(html,/confirmed removal/);
  }
  // Lapsed Free with no server control: no date is guessed.
  assert.match(shellContext(null,snapshot).retentionStatusCard(),/deletion date needs checking/);
  // Lapsed Free with a server control: the control's dates are the authority.
  assert.match(shellContext({...base,status:'complete'},snapshot).retentionStatusCard(),/History kept through 5 Apr 2027; deleted from 6 Apr 2027/);
  // Active paid access with a known period end: the UK tax-year boundary from the entitlement engine.
  const active=shellContext(null,{subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:Date.UTC(2027,1,1),serverVerifiedAt:Date.UTC(2026,8,1)}).retentionStatusCard();
  assert.match(active,/Paid features end: 1 Feb 2027/);assert.match(active,/History kept through 5 Apr 2027; deleted from 6 Apr 2027/);
  assert.doesNotMatch(active,/2027-04-06|null|undefined/);
});

test('retention-paused shell notice and sync status distinguish processing from a failed cleanup',()=>{
  assert.match(app,/const failed=!!\(CLOUD\.retentionControl&&CLOUD\.retentionControl\.status==='failed'\);page\.innerHTML='<div class="notice amber" data-retention-paused data-retention-status="'/);
  assert.match(app,/t\(failed\?'ret\.failedTitle':'ret\.pausedTitle'\)/);
  assert.match(app,/return\{state:failed\?'failed':'checking',pending:null,message:t\(failed\?'sync\.retentionFailed':'sync\.retention'\)/);
  assert.doesNotMatch(app,/<strong>Checking account history<\/strong>/);
  assert.doesNotMatch(app,/message:'Expired history is being removed safely/);
  const {I18N}=require('../../scripts/i18n-audit');
  for(const locale of ['zh','pl','ro','es','ur'])for(const key of ['ret.manageBody','ret.cleanupFailed','ret.pausedTitle','sync.retention','ret.keptUntil'])assert.notEqual(I18N[locale][key],I18N.en[key],`${locale}.${key} fell back to English`);
});

test('the personal shell and the Ltd renderer agree on the six locale codes',()=>{
  assert.match(app,/locale:\(\)=>\(\{en:'en',zh:'zh-HK',pl:'pl',ro:'ro',es:'es',ur:'ur'\}\)\[S\.settings\.lang\]\|\|'en'/);
  assert.match(renderer,/var LOCALES = \[\['en','EN'\],\['zh-HK','繁'\],\['pl','PL'\],\['ro','RO'\],\['es','ES'\],\['ur','اردو'\]\]/);
  const rendererLocales=['en','zh-HK','pl','ro','es','ur'];
  assert.deepEqual(Object.keys(copy.canonical).sort(),rendererLocales.slice().sort());
  // Entering the Ltd workspace always applies the current shell locale and theme.
  assert.match(read('src/integration/ltd/TaxMateLtdProductionAdapter.js'),/setLocale\(b\.locale\(\)\);root\.TaxMateLtdWorkbenchRenderer\.setTheme\(b\.theme\(\)\)/);
});

test('personal-shell strings that were hard-coded English now resolve through the six-language table',()=>{
  const {I18N}=require('../../scripts/i18n-audit');
  const keys=['ltd.rowType','ltd.rowSetupPending','ltd.rowReadOnly','ltd.finishSetup','ltd.openCompany','ltd.loadFailed','ltd.openFailed','shell.restoringTitle','shell.dataCheckTitle','tax.rulesUnavailable','sync.updateRequired','sync.openingAccount','sync.pendingLocal','set.analyticsTitle','set.appInfo','bk.done'];
  for(const key of keys){
    for(const locale of ['en','zh','pl','ro','es','ur'])assert.equal(typeof I18N[locale][key],'string',`${locale}:${key}`);
    for(const locale of ['zh','pl','ro','es','ur'])assert.notEqual(I18N[locale][key],I18N.en[key],`${locale}:${key} fell back to English`);
  }
  // The English wording now lives only in the I18N table, never in the render path.
  const renderPath=app.slice(app.indexOf('/* ═══════════ helpers ═══════════ */'));
  for(const literal of ['Limited company${share','Restoring your account…','TaxMate data needs checking','Optional analytics','Build information','Full backup downloaded','The company workspace could not be loaded'])
    assert.ok(!renderPath.includes(literal),`the literal "${literal}" is gone from the render path`);
});

test('Founder Preview harness renders the Direction A stylesheet and real asset types',()=>{
  const html=read('ui-preview-harness/index.html'),server=read('ui-preview-harness/server.js');
  assert.match(html,/<html lang="en" data-direction-a="true">/);
  assert.match(html,/src\/ui\/direction-a\.css/);
  assert.match(server,/\.svg'\)\?'image\/svg\+xml'/);
});

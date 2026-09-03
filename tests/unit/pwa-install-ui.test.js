const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const dispatcher=fs.readFileSync('src/app/action-dispatch.js','utf8');

test('Home puts the formal Hero first and keeps the approved compact install copy after it',()=>{
  assert.match(app,/'pwa\.homeTitle':'Install TaxMate'/);
  assert.match(app,/'pwa\.homeBody':'Keep TaxMate on your Home Screen for faster access and core bookkeeping offline\.'/);
  assert.doesNotMatch(app,/Everything works offline/i);
  const home=app.slice(app.indexOf('function pageHome()'),app.indexOf('function entryRow('));
  const carousel=app.slice(app.indexOf('function carouselCards()'),app.indexOf('function cxrOnScroll('));
  assert.doesNotMatch(app,/function homeInstallCard\(|pwa-home-install/);
  assert.match(carousel,/!dismissed\.includes\('pwa'\)&&canShowHomeInstallPromotion\(\)/);
  assert.match(carousel,/cards\.push\(\{id:'pwa',[\s\S]*onclick:'doInstall\(\)'\}\)/);
  assert.ok(home.indexOf('${hasPersonal?personalHero')<home.indexOf('${homeCarousel()}'));
  assert.match(html,/\.cxr-card\{[^}]*min-height:74px/);
});

test('receipt education remains in Assistant and is not duplicated on Home',()=>{
  const tip=app.slice(app.indexOf('function topContextTip()'),app.indexOf('function activeLtdProfile('));
  assert.doesNotMatch(tip,/tip\.receipt|receipt_missing/);
  assert.match(app,/function assistantHomeCard\(/);
});

test('home-working education remains in Assistant but is removed from the Home carousel',()=>{
  const tip=app.slice(app.indexOf('function topContextTip()'),app.indexOf('function activeLtdProfile('));
  const assistant=app.slice(app.indexOf('function tipsCard('));
  assert.doesNotMatch(tip,/home_working|tip\.home_t|tip\.home_b/);
  assert.match(assistant,/home_working/);assert.match(assistant,/tip\.home_t/);assert.match(assistant,/tip\.home_b/);
});

test('all contextual advice stays in Assistant and PWA chrome uses one deep release identity',()=>{
  const carousel=app.slice(app.indexOf('function carouselCards()'),app.indexOf('function cxrOnScroll('));
  const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
  assert.doesNotMatch(carousel,/topContextTip|id:'tip'|tip\.phone_t|tip\.home_t/);
  assert.equal((html.match(/<meta name="theme-color"/g)||[]).length,1);
  assert.match(html,/<meta name="theme-color" content="#0F1620">/);
  assert.equal(manifest.theme_color,'#0F1620');assert.equal(manifest.background_color,'#0F1620');
  assert.match(html,/manifest\.json\?v=20260903-10/);assert.match(app,/sw\.js\?v=20260903-10/);
  assert.match(sw,/manifest\.json\?v=20260903-10/);assert.match(sw,/taxmate-v2-existing-ownership-recovery-candidate-1/);
});

test('Settings keeps its existing install entry while installed state hides both surfaces',()=>{
  const more=app.slice(app.indexOf('function pageMore()'),app.indexOf('function setAnalyticsConsent'));
  assert.match(more,/\$\{installCard\(\)\}/);
  assert.match(app,/function installCard\(\)\{\s*if\(isPwaInstalled\(\)\) return '';/);
  assert.match(app,/display-mode: standalone/);
  assert.match(app,/window\.navigator\.standalone===true/);
  assert.match(app,/window\.addEventListener\('appinstalled'/);
});

test('only native Android prompt or the existing iOS TaxMate sheet is used',()=>{
  assert.match(app,/await dp\.prompt\(\)/);
  assert.match(app,/isIOSSafari:isIOSSafari\(\)/);
  assert.match(app,/openSheet\('iosinstall'\)/);
  assert.match(app,/'pwa\.iosStep1':'Tap Share'/);
  assert.match(app,/'pwa\.iosStep2':'Tap “Add to Home Screen”'/);
  assert.match(app,/'pwa\.iosStep3':'Tap “Add”'/);
  assert.doesNotMatch(app,/\balert\s*\(|\bwindow\.prompt\s*\(/);
});

test('first-use actions never open an automatic blocking install sheet',()=>{
  assert.doesNotMatch(app,/schedulePwaInstallSuggestion|maybeOpenPendingPwaSuggestion|openSheet\('pwainstall'\)/);
  assert.match(dispatcher,/'dismissInstallPromotion'/);
});

test('folder controls are grouped with Business instead of directly beneath Settings Download',()=>{
  const more=app.slice(app.indexOf('function pageMore()'),app.indexOf('function setAnalyticsConsent'));
  const business=more.slice(more.indexOf("${t('sec.biz')}"),more.indexOf("${t('sec.prefs')}")),preferences=more.slice(more.indexOf("${t('sec.prefs')}"),more.indexOf("${t('sec.report')}"));
  assert.match(business,/\$\{organiseSection\}/);assert.doesNotMatch(preferences,/\$\{organiseSection\}/);assert.match(preferences,/\$\{installCard\(\)\}/);
});

test('offline shell includes the install policy and existing local app runtime',()=>{
  for(const asset of ['/src/core/pwa-install.js','/src/core/state-schema.js','/src/app/app.js','/index.html'])assert.ok(sw.includes(asset),asset);
});
test('service worker registration does not wait on third-party window load',()=>{assert.match(app,/registerTaxMateServiceWorker/);assert.match(app,/DOMContentLoaded/);assert.doesNotMatch(app,/window\.addEventListener\(['"]load['"][\s\S]{0,180}serviceWorker\.register/);});

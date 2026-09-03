const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('src/app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const dispatcher=fs.readFileSync('src/app/action-dispatch.js','utf8');

test('Home uses the approved compact install copy in the requested position',()=>{
  assert.match(app,/'pwa\.homeTitle':'Install TaxMate'/);
  assert.match(app,/'pwa\.homeBody':'Keep TaxMate on your Home Screen for faster access and core bookkeeping offline\.'/);
  assert.doesNotMatch(app,/Everything works offline/i);
  const home=app.slice(app.indexOf('function pageHome()'),app.indexOf('function entryRow('));
  const card=app.slice(app.indexOf('function homeInstallCard()'),app.indexOf('function installCard()'));
  assert.ok(home.indexOf('${homeInstallCard()}')<home.indexOf('${hasPersonal?homeCarousel():\'\'}'));
  assert.ok(home.indexOf('${homeInstallCard()}')<home.indexOf('${hasPersonal?personalHero'));
  assert.match(card,/data-tm-click="doInstall\(\)"/);
  assert.match(card,/data-tm-click="dismissInstallPromotion\(\)"/);
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app/app.js', 'utf8');

test('home add-business and catch-up controls have explicit separation', () => {
  assert.match(app, /class="btn soft home-add-business"/);
  assert.match(app, /class="card catchup-card"/);
  assert.match(html, /\.home-add-business\+\.catchup-card\{margin-top:14px\}/);
});

test('account UI and authentication expose Google only', () => {
  assert.match(app, /data-tm-click="signIn\('google'\)"/);
  assert.doesNotMatch(app, /Continue with Apple|Google or Apple sign-in|apple\.com|signIn\('apple'\)|'ac\.apple'/);
  assert.match(app, /const provider = new firebase\.auth\.GoogleAuthProvider\(\)/);
});

test('tax hero is green in light mode and preserves the dark treatment in dark mode', () => {
  assert.match(app, /<div class="hero tax-hero">/);
  assert.doesNotMatch(app, /class="hero" style="background:linear-gradient\(135deg,#1B2B3C,#16202B\)"/);
  assert.match(html, /:root\[data-theme="dark"\] \.tax-hero\{background:linear-gradient\(135deg,#1B2B3C,#16202B\)\}/);
});

test('floating add glyph has an explicit optical centering correction', () => {
  assert.match(app, /class="fab-plus" aria-hidden="true">\+<\/span>/);
  assert.match(html, /\.fab-plus\{display:block;line-height:1;transform:translateY\(-2px\)\}/);
});

test('promotion redemption is independent and appears before every plan card', () => {
  const plans = app.match(/function proPlansCard\(\)\{([\s\S]*?)\n\}/)[1];
  const redeemAt = plans.indexOf('class="btn ghost promo-redeem"');
  assert.ok(redeemAt >= 0);
  assert.ok(redeemAt < plans.indexOf("planBlock('free')"));
  assert.ok(redeemAt < plans.indexOf("planBlock('plus')"));
  assert.ok(redeemAt < plans.indexOf("planBlock('pro')"));
  assert.equal((app.match(/data-tm-click="openPromotionSheet\(\)"/g) || []).length, 1);
  assert.equal((app.match(/data-tm-click="activateTrial\(\)"/g) || []).length, 0);
  assert.doesNotMatch(app, /if\(tier==='pro'\)[^\n]*promo\.redeem/);
});

test('Plans UI keeps Plus cadence and exposes the complete Founder-approved Pro pricing',()=>{
  assert.match(app,/data-billing-cadence="monthly"/);
  assert.match(app,/data-billing-cadence="yearly"/);
  assert.match(app,/min-height:19px/);
  assert.match(app,/style\.visibility=cadence==='yearly'\?'visible':'hidden'/);
  assert.match(app,/£3\.99 \/ month/);
  assert.match(app,/£29\.99 \/ year/);
  assert.match(app,/const accessible=t\('billing\.monthlyAria'\)/);
  assert.match(app,/<s><bdi dir="ltr">£11\.99<\/bdi><\/s> <bdi class="current" dir="ltr">£9\.99\/month<\/bdi>/);
  assert.match(app,/£99\.99\/year/);
  assert.doesNotMatch(app,/Pro annual price not yet available|Annual Pro price pending|Founder decision pending/i);
  assert.doesNotMatch(app,/Was £11\.99/);
  assert.match(app,/BILLING_CADENCE/);
  assert.match(app,/!isCurrent&&tier==='pro'/);
  assert.match(app,/createCheckoutSession',\{tier,cadence:BILLING_CADENCE\}/);
  assert.doesNotMatch(app,/BEST VALUE|MOST POPULAR|Pay once for the year|Was £11\.99|(?:two|2) months? free|save £\d+(?:\.\d{2})? on Pro|Pro savings/i);
});

test('draft persistence has one-shot suppression while canonical emits always repaint',()=>{
  const renderer=fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8');
  const adapter=fs.readFileSync('src/integration/ltd/TaxMateLtdProductionAdapter.js','utf8');
  assert.match(renderer,/UI\.skipNextDraftEmitRender\+=1;\s*try\{\s*run\('onDraftChanged'/);
  assert.match(renderer,/if\(UI\.skipNextDraftEmitRender>0\)\{\s*UI\.skipNextDraftEmitRender-=1;\s*return; \/\/ consume only the draft persistence emit/);
  assert.match(renderer,/finally \{[\s\S]*if\(UI\.skipNextDraftEmitRender>0\) UI\.skipNextDraftEmitRender-=1;/);
  assert.match(renderer,/onDraftChanged[^\n]*\{skipPaint:true\}/);
  assert.match(renderer,/else if\(!opts\.skipPaint\) paintIfChanged\(\)/);
  assert.match(renderer,/function paintIfChanged\(\)\{ if\(UI\.mountedKey!==renderKey\(\)\) paint\(\); \}/);
  assert.doesNotMatch(renderer,/if\s*\(\s*key\s*===\s*UI\.mountedKey\s*\)\s*\{?\s*return/);
  assert.match(adapter,/canonicalListener=\(\)=>\{if\(!driver\)return;driver\.reload\(\);facade\.emit\(\);\};root\.addEventListener\('taxmate:canonical-state-updated',canonicalListener\)/);
  assert.doesNotMatch(adapter,/isFixtureSession|fixtureRepository|fixtureSession/);
  assert.match(adapter,/refreshFromCanonicalState:\(\)=>\{if\(driver\)\{driver\.reload\(\);[\s\S]*facade\.emit\(\)/);
  assert.match(renderer,/if\(UI\.skipNextDraftEmitRender>0\)[\s\S]*paint\(\);\s*\}\s*\n\s*function paint/);
});

test('Ltd entry clears personal overlays without scheduling a personal prompt and has a CSS fail-safe',()=>{
  assert.match(app,/function closePersonalSurfacesForLtd\(\)\{[\s\S]*querySelectorAll\('\.sb\.open'\)[\s\S]*classList\.remove\('sheet-open'\)[\s\S]*taxmate-lightbox[\s\S]*pwaProactivePending=false;[\s\S]*sheetOpener=null;[\s\S]*LB=\{url:'',path:''\};/);
  assert.match(app,/enterLtd\(\)\{closePersonalSurfacesForLtd\(\);/);
  assert.match(app,/function openSheet\(id\)\{ if\(document\.body\.classList\.contains\('ltd-active'\)\)return false;/);
  const cleanup=app.match(/function closePersonalSurfacesForLtd\(\)\{[\s\S]*?\n\}/)[0];
  assert.doesNotMatch(cleanup,/maybeOpenPendingPwaSuggestion|openSheet\(/);
  assert.match(html,/body\.ltd-active \.sb,[\s\S]*body\.ltd-active>#taxmate-lightbox,[\s\S]*body\.ltd-active>#taxmate-toast,[\s\S]*body\.ltd-active>#ob-root\{display:none!important;visibility:hidden!important;pointer-events:none!important\}/);
  assert.match(html,/body\.ltd-active\.sheet-open\{overflow:auto\}/);
});

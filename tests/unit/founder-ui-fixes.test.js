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
  assert.equal((app.match(/data-tm-click="activateTrial\(\)"/g) || []).length, 1);
  assert.doesNotMatch(app, /if\(tier==='pro'\)[^\n]*promo\.redeem/);
});

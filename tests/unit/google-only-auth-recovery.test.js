const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app/app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const environment = fs.readFileSync('firebase-environment.js', 'utf8');

test('account surface contains exactly one Google sign-in action and no Apple sign-in action', () => {
  assert.equal((app.match(/data-tm-click="signIn\('google'\)"/g) || []).length, 1);
  assert.equal((app.match(/Continue with Google/g) || []).length, 1);
  assert.doesNotMatch(app, /Continue with Apple|OAuthProvider\(['"]apple\.com|signIn\(['"]apple['"]\)|ac\.apple/i);
});

test('Google popup, local persistence, callback observer and logout invariants remain present', () => {
  assert.match(app, /new firebase\.auth\.GoogleAuthProvider\(\)/);
  assert.match(app, /provider\.setCustomParameters\(\{ prompt: 'select_account' \}\)/);
  assert.match(app, /firebase\.auth\(\)\.setPersistence\(firebase\.auth\.Auth\.Persistence\.LOCAL\)/);
  assert.match(app, /firebase\.auth\(\)\.signInWithPopup\(provider\)/);
  assert.match(app, /firebase\.auth\(\)\.onAuthStateChanged\(u=>/);
  assert.match(app, /firebase\.auth\(\)\.signOut\(\)/);
});

test('production Auth identity is taxmate-uk-2 and contains no staging identity', () => {
  assert.match(environment, /authDomain: 'taxmate-uk-2\.firebaseapp\.com'/);
  assert.match(environment, /projectId: 'taxmate-uk-2'/);
  assert.doesNotMatch(environment + html + app, /taxmate-staging/i);
});

test('service worker never intercepts Firebase reserved Auth callback namespace', () => {
  const bypassAt = sw.indexOf("url.pathname.startsWith('/__/')");
  const respondAt = sw.indexOf('e.respondWith');
  assert.ok(bypassAt >= 0, 'reserved namespace bypass is required');
  assert.ok(respondAt >= 0, 'app shell must retain its normal fetch strategy');
  assert.ok(bypassAt < respondAt, 'reserved namespace must bypass before respondWith');
});

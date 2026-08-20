const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const evidence = path.join(root, 'evidence', 'w0');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('authorized Git baseline is frozen exactly', () => {
  const head = execFileSync('git', ['rev-parse', 'main'], { cwd: root, encoding: 'utf8' }).trim();
  const tree = execFileSync('git', ['rev-parse', 'main^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(head, '745f7497d374f000870c4a7a111130008f8945a7');
  assert.equal(tree, '4726b48f89150782f50e6227226c227c13765212');
});
test('preserved production assets match the audited SHA-256 identity', () => {
  assert.equal(sha256(path.join(evidence, 'live-index.html')), '73d6b65db4f12b8f7f3edf99a953db8087f9c797415eda0a888352a4ddd12642');
  assert.equal(sha256(path.join(evidence, 'live-manifest.json')), 'ac80212cf9c2b9f9d0b9cfcb87b8ef5462770b4d8256361d542aff46c1e74e89');
  assert.equal(sha256(path.join(evidence, 'live-sw.js')), '53a6cb17af99c4606ed423730fc4c2bc710e461851cdc06a4729629b271025ce');
});

test('old production behavior is characterized without treating it as correct', () => {
  const html = fs.readFileSync(path.join(evidence, 'live-index.html'), 'utf8');
  assert.match(html, /'2026-27':\{[^\n]*c2SmallProfits:6845,c2Weekly:3\.50/);
  assert.match(html, /const profit = calcTax\(yr\)\.myProfit/);
  assert.match(html, /const poaRequired = liability > cfg\.poaThreshold/);
  assert.match(html, /Object\.assign\(TAXCFG, years\)/);
  assert.match(html, /onclick="setTier\('\$\{tier\}'\)"/);
  assert.match(html, /if\(!data \|\| !Array\.isArray\(data\.businesses\)\)/);
  assert.match(html, /user-scalable=no/);
});

test('legacy in-page audit result is preserved as a characterization artifact', () => {
  const snapshot = fs.readFileSync(path.join(evidence, 'live-audit-dom.txt'), 'utf8');
  assert.match(snapshot, /PASS: 29 \| FAIL: 0 \| WARN: 0/);
});

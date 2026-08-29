const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const evidence = path.join(root, 'evidence', 'w0');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'authorized-production-baseline.json'), 'utf8'));

function sha256Normalized(file) {
  const bytes = Buffer.from(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

test('authenticated immutable baseline fixture is frozen exactly without requiring a Git checkout', () => {
  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.authority, 'authenticated_audit_package_source_manifest');
  assert.equal(baseline.authorizedProductionCommit, '41252f319d6c695dcb96105f524282a4e916145c');
  assert.equal(baseline.authorizedProductionTree, 'b5a7d00f4333bd17ee3e41e592c4972a7d5a98a9');
  assert.equal(baseline.part1ProductionBaseCommit, 'da7092c15ff4eb565c46d0153f2a9e08cadc8079');
  assert.equal(baseline.part1ProductionBaseTree, '0d72fd6d52d6206c62179a66f44b215934154415');
});
test('preserved production assets match the audited SHA-256 identity', () => {
  for (const [relative, expected] of Object.entries(baseline.preservedAssets)) {
    assert.equal(sha256Normalized(path.join(root, ...relative.split('/'))), expected, relative);
  }
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

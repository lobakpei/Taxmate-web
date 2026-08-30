'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const matrix=read('docs/PRODUCT_FUNCTION_HEALTH_MATRIX.md');
const statuses=['REAL_DURABLE','BROKEN','SHELL','DEAD','DUPLICATE','MISPLACED','MISLABELLED','INTENTIONALLY_HIDDEN'];
const totals=Object.fromEntries(statuses.map(status=>[status,0]));
for(const line of matrix.split(/\r?\n/)){
  const match=line.match(/^\| (REAL_DURABLE|BROKEN|SHELL|DEAD|DUPLICATE|MISPLACED|MISLABELLED|INTENTIONALLY_HIDDEN) \|/);
  if(match)totals[match[1]]++;
}
assert.ok(totals.REAL_DURABLE>=70,`matrix is incomplete: only ${totals.REAL_DURABLE} durable visible journeys`);
for(const status of ['BROKEN','SHELL','DEAD','DUPLICATE','MISPLACED','MISLABELLED'])assert.equal(totals[status],0,`${status} must be zero`);

const isolatedOutput='production-health-gate';
const build=spawnSync(process.execPath,['scripts/build-hosting.js','production',isolatedOutput],{cwd:root,encoding:'utf8'});
if(build.status!==0)throw new Error((build.stdout||'')+(build.stderr||''));
const hostingRoot=path.join(root,'.hosting-build',isolatedOutput);
function filesUnder(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesUnder(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const publicFiles=filesUnder(hostingRoot).filter(file=>/\.(?:html|js|css|json|webmanifest)$/i.test(file));
const publicText=publicFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n').replace(/\bdp\.prompt\(\);/g,'');
assert.doesNotMatch(publicText,/(?:^|[^.\w])(?:window\.)?(?:alert|prompt|confirm)\s*\(/, 'browser-native user dialog remains');
assert.doesNotMatch(publicText,/release candidate|ready for approval|candidate build|not configured in (?:this )?preview|coming soon|fake trial|debug build|staging OAuth|SA103 PDF/i);
assert.doesNotMatch(publicText,/car\.proTitle|activateTrial|Free Pro access|Limited time — activate now/i);
assert.doesNotMatch(publicText,/sk_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i);
assert.equal(fs.existsSync(path.join(hostingRoot,'src','core','legal.js')),false,'obsolete legal runtime must not ship');
assert.equal(fs.existsSync(path.join(hostingRoot,'src','core','product-content.js')),true,'canonical content runtime missing');
const versions=read('src/core/versions.js');
assert.match(versions,/APP_VERSION:\s*'2\.1\.8'/);
assert.match(versions,/BUILD_ID:\s*'2026-08-30\.home-assistant-founder-preview-correction\.1'/);
assert.match(versions,/PWA_CACHE_VERSION:\s*'taxmate-v2-home-assistant-founder-preview-correction-1'/);
assert.match(read('index.html'),/src\/core\/product-content\.js/);
console.log(`PRODUCT_FUNCTION_HEALTH_GATE PASS REAL_DURABLE=${totals.REAL_DURABLE} INTENTIONALLY_HIDDEN=${totals.INTENTIONALLY_HIDDEN} BROKEN=0 SHELL=0 DEAD_VISIBLE=0 DUPLICATE_VISIBLE=0 MISPLACED=0 MISLABELLED=0`);

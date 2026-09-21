'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const app=read('src/app/app.js');
const ltd=read('src/ui/ltd/workbench-renderer.js');
const ltdCss=read('src/ui/ltd/workbench.css');
const direction=read('src/ui/direction-a.css');

test('all personal and LTD modal surfaces lock the document while their own body remains scrollable',()=>{
  assert.match(html,/html\.sheet-open,body\.sheet-open\{overflow:hidden;overscroll-behavior:none\}/);
  assert.match(html,/html\.ltd-sheet-open,body\.ltd-active\.ltd-sheet-open\{overflow:hidden;overscroll-behavior:none\}/);
  assert.match(app,/function openSheet\(id\)[\s\S]{0,900}document\.documentElement\.classList\.add\('sheet-open'\)/);
  assert.match(app,/function closeSheet\(id\)[\s\S]{0,350}document\.documentElement\.classList\.remove\('sheet-open'\)/);
  assert.match(ltd,/document\.documentElement\.classList\.toggle\('ltd-sheet-open',modalOpen\)/);
  assert.match(ltdCss,/\.tm-sbody\{[^}]*overflow-y:auto[^}]*overscroll-behavior:contain/);
  assert.match(ltdCss,/\.tm-scrim\{[^}]*position:fixed[^}]*overscroll-behavior:contain[^}]*touch-action:none/);
});

test('repeated action groups have explicit breathing room and the first company metric has no orphan divider',()=>{
  assert.match(html,/\.catgrid\{[^}]*gap:12px/);
  assert.match(html,/\.sheet \.sact\{[^}]*gap:12px/);
  assert.match(html,/\.rc-actions\{[^}]*gap:12px/);
  assert.match(ltdCss,/\.tm-sfoot\{[^}]*gap:12px/);
  assert.match(ltdCss,/\.tm-sbody>\.tm-btn\{margin-top:12px\}/);
  assert.match(ltdCss,/\.tm-choices\{[^}]*gap:12px/);
  assert.match(direction,/\.tm-fact \.tm-choices\.row\{flex-direction:row;gap:12px\}/);
  assert.match(direction,/\.tm-review-summary \.tm-metric:first-child\{border-top:0\}/);
});

test('offline paid receipt capture is local-first and does not use the read-only partnership error as a network error',()=>{
  assert.match(app,/if\(CLOUD\.controlsCached&&!offline\)return false/);
  assert.match(app,/if\(typeof navigator!==['"]undefined['"]&&navigator\.onLine===false\)return true/);
  const capture=app.slice(app.indexOf('async function onReceiptFile('),app.indexOf('function compressImage(',app.indexOf('async function onReceiptFile(')));
  assert.ok(capture.indexOf('TaxMateLocalReceipts.put')<capture.indexOf('ensureFB()'),'device receipt bytes must be committed before any cloud attempt');
  assert.match(capture,/EN\.receiptUrl = TaxMateLocalReceipts\.url/);
  assert.match(capture,/t\('rc\.savedOffline'\)/);
  assert.doesNotMatch(capture,/t\('sy\.readOnly'\)/);
  const sync=app.slice(app.indexOf('async function sendSyncOperation('),app.indexOf('async function flushSyncOutbox('));
  assert.match(sync,/operation\.record=await promoteLocalReceiptForSync/);
  assert.match(sync,/const record=await promoteLocalReceiptForSync/);
});

test('locally cached receipt images remain displayable after their record has a cloud URL',()=>{
  assert.match(app,/function receiptDisplayUrl\(url,receiptPath\)/);
  assert.match(app,/const path=receiptPath\|\|TaxMateLocalReceipts\.pathFromUrl\(url\),cached=/);
  assert.match(app,/receiptDisplayUrl\(e\.receiptUrl,e\.receiptPath\)/);
  assert.match(app,/receiptDisplayUrl\(EN\.receiptUrl,EN\.receiptPath\)/);
});

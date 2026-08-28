'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.resolve(__dirname,'..'),uiRoot=path.join(root,'src','ui','ltd');
test('Fable UI layer contains no canonical engine imports or provider wiring',()=>{
  for(const name of fs.readdirSync(uiRoot)){if(!name.endsWith('.js')&&!name.endsWith('.css'))continue;const text=fs.readFileSync(path.join(uiRoot,name),'utf8');assert.doesNotMatch(text,/src\/core|require\s*\(|firebase|sentry|stripe|google-signin|serviceWorker\.register/i,name);}
});
test('harness binds to loopback and carries a deny-by-default CSP',()=>{const text=fs.readFileSync(path.join(root,'ui-preview-harness','server.js'),'utf8');assert.match(text,/listen\(PORT,'127\.0\.0\.1'/);assert.match(text,/default-src 'self'/);assert.match(text,/connect-src 'self'/);assert.doesNotMatch(text,/https:\/\//);});
test('no raw Founder backup or credential-style file is present in the isolated Ltd candidate',()=>{const all=[];function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else all.push(file);}}for(const dir of [path.join(root,'src','integration','ltd'),path.join(root,'src','ui','ltd'),path.join(root,'ui-preview-harness')])walk(dir);for(const file of all){const relative=path.relative(root,file);assert.doesNotMatch(relative,/\.env|service-account|credentials|download.?token|taxmate-backup-2026-08-23\.json/i);}});
test('sanitised fixture contains receipt references but no URL or token',()=>{const text=fs.readFileSync(path.join(root,'ui-preview-harness','sanitised-backup-fixture.js'),'utf8');assert.match(text,/receiptPath/);assert.doesNotMatch(text,/https?:\/\/|[?&]token=/i);});
test('unknown Ltd routes fail closed with explicit recovery actions rather than falling through to Home',()=>{
  const text=fs.readFileSync(path.join(uiRoot,'workbench-renderer.js'),'utf8');
  assert.match(text,/default:\s*return screenUnknownRoute\(id\)/);
  assert.match(text,/function screenUnknownRoute\(id\)/);
  assert.match(text,/run\('onBack'/);
  assert.match(text,/run\('onOpenHome'/);
  assert.doesNotMatch(text,/default:\s*return screenHome\(/);
});

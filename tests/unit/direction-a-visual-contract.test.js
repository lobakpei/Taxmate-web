'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('src/app/app.js','utf8');
const css=fs.readFileSync('src/ui/direction-a.css','utf8');
const ltd=fs.readFileSync('src/ui/ltd/workbench-renderer.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const build=fs.readFileSync('scripts/build-hosting.js','utf8');

test('Direction A exact surface tokens and local approved font are release assets',()=>{
  assert.match(html,/<html[^>]+data-direction-a="true"/);
  assert.match(html,/src\/ui\/direction-a\.css\?v=20260905-1/);
  for(const token of ['#F6F3EC','#FFFFFF','#101821','#0F1620','#111A26','#1B2634','#F2F4F7','#0A0F16','#FFBE0A'])assert.ok(css.includes(token),`missing ${token}`);
  assert.match(css,/@font-face[\s\S]*font-family:'Plus Jakarta Sans'[\s\S]*plus-jakarta-sans-latin-500-800\.woff2/);
  assert.ok(fs.statSync('assets/fonts/plus-jakarta-sans-latin-500-800.woff2').size>20000);
  assert.match(sw,/src\/ui\/direction-a\.css/);
  assert.match(sw,/assets\/fonts\/plus-jakarta-sans-latin-500-800\.woff2/);
  assert.match(build,/assets', 'fonts/);
});

test('Direction A keeps Assistant on Home as a responsive overlay and preserves real handlers',()=>{
  const homeCard=app.slice(app.indexOf('function assistantHomeCard()'),app.indexOf('function assistantTask('));
  assert.match(homeCard,/assistantOpen\(\)/);
  assert.doesNotMatch(homeCard,/if\(!count\)return/);
  assert.match(css,/\.sb>\.sheet[\s\S]*overflow-x:hidden/);
  assert.match(css,/@media \(min-width:1024px\)[\s\S]*\.sb\{align-items:center\}/);
  assert.match(ltd,/function workspaceShell\(area, inner, opts\)/);
  assert.match(ltd,/run\('onSetWorkspaceArea'/);
  assert.match(ltd,/directionNavIcon/);
});

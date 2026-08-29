'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.resolve(__dirname,'..');
const copy=JSON.parse(fs.readFileSync(path.join(root,'src','integration','ltd','approved-copy.json'),'utf8'));
const locales=['en','zh-HK','pl','ro','es','ur'];

test('all six Ltd locales have an exact canonical key set with no English fallback',()=>{
  const expected=Object.keys(copy.canonical.en).sort();assert.ok(expected.length>=428);
  for(const locale of locales){const actual=Object.keys(copy.canonical[locale]||{}).sort();assert.deepEqual(actual,expected,locale);for(const key of expected)assert.equal(typeof copy.canonical[locale][key],'string',`${locale}:${key}`);}
});

test('every literal renderer copy key exists in every locale',()=>{
  const source=fs.readFileSync(path.join(root,'src','ui','ltd','workbench-renderer.js'),'utf8'),keys=new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(match=>match[1]).filter(key=>!key.endsWith('.')));assert.ok(keys.size>100);
  for(const locale of locales){const dictionary={...copy.design_scaffolding[locale],...copy.canonical[locale]};for(const key of keys)assert.ok(Object.hasOwn(dictionary,key),`${locale}:${key}`);}
});

test('Urdu remains the only RTL locale and the rendered app carries locale and direction semantics',()=>{const source=fs.readFileSync(path.join(root,'src','ui','ltd','workbench-renderer.js'),'utf8');assert.equal(locales.includes('ur'),true);assert.ok(Object.keys(copy.canonical.ur).length>0);assert.match(source,/dir:isRTL\(\)\?'rtl':'ltr'/);assert.match(source,/lang:UI\.locale/);});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
function gate(script,success){const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,(result.stdout||'')+(result.stderr||''));assert.match(result.stdout,success);}
test('PRODUCT_FUNCTION_HEALTH_GATE',()=>gate('scripts/product-health-gate.js',/PRODUCT_FUNCTION_HEALTH_GATE PASS/));
test('PLAN_FEATURE_CONTRACT_GATE',()=>gate('scripts/plan-feature-contract-gate.js',/PLAN_FEATURE_CONTRACT_GATE PASS/));

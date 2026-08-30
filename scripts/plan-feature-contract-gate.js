'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('src/app/app.js'),help=read('src/core/product-content.js'),contract=read('docs/PLAN_FEATURE_CONTRACT.md');
const functions=read('functions/index.js'),firestore=read('firestore.rules'),storage=read('storage.rules');
const expected={mileageCompare:'plus',multiBiz:'plus',receiptPhoto:'plus',pdfReport:'plus',partnerSync:'pro',sa104:'pro',receiptPack:'pro',mtdReady:'pro',ltd:'pro'};
const featureBody=(app.match(/const FEATURE_TIER = \{([\s\S]*?)\n\};/)||[])[1];
assert.ok(featureBody,'FEATURE_TIER not found');
const actual={};for(const match of featureBody.matchAll(/^\s*(\w+):'(plus|pro)'/gm))actual[match[1]]=match[2];
assert.deepEqual(actual,expected);
assert.match(app,/const free = \['feat\.records','feat\.taxcalc','feat\.onebiz','feat\.mileageBasic','feat\.sa103view','feat\.sync','feat\.backup'\]/);
assert.match(app,/const plus = \['feat\.multiBiz','feat\.receiptPhoto','feat\.mileageCompare','feat\.pdfReport'\]/);
assert.match(app,/const pro  = \['feat\.partnerSync','feat\.sa104','feat\.receiptPack','feat\.mtdReady','feat\.ltd'\]/);
for(const id of [...Object.keys(expected),'records','taxcalc','onebiz','mileageBasic','sa103view','sync','backup','aiTips','mtdGuidance','promotion','billing'])assert.match(contract,new RegExp('`'+id+'`'));
for(const phrase of ['multiple businesses','receipt photos','mileage comparison','PDF tax report','Partner Sync','SA104 partnership working paper','Receipt Pack PDF','quarterly record summaries'])assert.match(help,new RegExp(phrase,'i'));
for(const price of ['£3.99','£29.99','£9.99','£11.99','£99.99']){assert.match(app,new RegExp(price.replace('.','\\.')));assert.match(help,new RegExp(price.replace('.','\\.')));assert.match(contract,new RegExp(price.replace('.','\\.')));}
for(const text of [app,help,contract]){assert.doesNotMatch(text,/(?:Pro annual price (?:not yet available|has not been approved)|Annual Pro pricing is intentionally pending|Founder decision pending)/i);assert.doesNotMatch(text,/Was £11\.99|(?:two|2) months? free|save £\d+(?:\.\d{2})? on Pro|Pro savings/i);}
assert.doesNotMatch(app,/sa103Pdf/);assert.doesNotMatch(help,/SA103 PDF/i);
assert.match(app,/if\(!hasFeature\('mileageCompare'\)\)return[\s\S]*feat\.mileageBasic/);
assert.equal((app.match(/'rc\.proOnly':[^\n]*Plus/g)||[]).length,6,'receipt Plus wording must exist in all six locales');
assert.match(functions,/exports\.createPartnership=onCall\(baseOpts[\s\S]*await requireTier\(user\.uid,'pro'\)/);
assert.match(functions,/exports\.joinPartnership=onCall\(baseOpts[\s\S]*await requireTier\(user\.uid,'pro'\)/);
assert.match(firestore,/allow create, update: if member\(partnershipId\) && pro\(request\.auth\.uid\)/);
assert.match(storage,/allow create, update:[^\n]*receiptAccess\(uid\)/);
assert.match(storage,/paidTier in \['plus', 'pro'\]/);
console.log('PLAN_FEATURE_CONTRACT_GATE PASS features=21 plan_tiers=3 receipt_locales=6 server_enforced=2 ltd_pro_only=1');

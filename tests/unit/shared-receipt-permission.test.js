'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../src/app/app.js'),'utf8'),Sync=require('../../src/core/sync');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
function runtime(shared=true){
 let paid=true,removed=0,confirmation=null;
 const entry={id:'entry',bizId:'biz',date:'2026-09-01',receiptPath:'receipts/owner/photo.jpg',receiptUrl:'photo',createdAt:1,updatedAt:1},business={id:'biz',syncCode:shared?'SHARE':null};
 const buttons={'en-delete':{style:{}},remove:{hidden:false}},c=vm.createContext({console,ACCOUNT_TRANSITION_PENDING:false,ACTIVE_ACCOUNT_SCOPE:'owner',CLOUD:{generation:1},FB:{ready:true,subs:{SHARE:{memberUid:'owner',membership:{}}}},EN:{id:'entry'},LB:{entryId:'entry'},S:{entries:[entry],tombstones:[]},DEVICE_ID:'device',TaxMateSync:Sync,TaxMateRetentionPolicy:{controlWritable:()=>true},TaxMateAccountStorage:{token:x=>x,ownsReceiptPath:()=>true},TaxMateLocalReceipts:{remove:async()=>{removed++;}},navigator:{onLine:true},bizById:()=>business,cloudUser:()=>({uid:'owner'}),hasFeature:()=>paid,currentRetentionEpoch:()=>0,readAccountControls:async()=>({}),loadEntitlementFromCloud:async()=>{},t:x=>x,showNotice:()=>{},document:{getElementById:id=>buttons[id],querySelector:()=>buttons.remove},callSecureFunction:async()=>({status:'referenced'}),confirmAction:(_a,_b,callback)=>{confirmation=callback;},save:()=>{},closeSheet:()=>{},render:()=>{},toast:()=>{},pushEntryRemote:()=>{},deleteEntry:()=>{}});
 c.FB.db={collection:()=>({doc:()=>({collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>({})})})})})})};
 vm.runInContext(extract('function entryMutationAllowed(','/* UI-09:'),c);
 vm.runInContext(extract('function localReceiptReferenced(','// deleteEntry:'),c);
 vm.runInContext(extract('deleteEntry = async function(){','// Lightbox'),c);
 return{c,entry,business,buttons,setPaid:x=>{paid=x;},removed:()=>removed,confirm:()=>confirmation&&confirmation()};
}
test('R2 shared delete controls are absent for Free, missing membership and expired retained records',()=>{
 const r=runtime();r.c.refreshReceiptMutationControls();assert.equal(r.buttons.remove.hidden,false);
 for(const reason of ['tier','member','cutoff','retention']){const x=runtime();if(reason==='tier')x.setPaid(false);if(reason==='member')x.c.FB.subs.SHARE.membership=null;if(reason==='cutoff')x.c.FB.subs.SHARE.membership.retentionCutoffDate='2027-04-06';if(reason==='retention')x.c.CLOUD.retentionBlocked=true;x.c.refreshReceiptMutationControls();assert.equal(x.buttons['en-delete'].style.display,'none');assert.equal(x.buttons.remove.hidden,true);}
});
test('R2 downgrade while a confirmation is open rechecks permission and preserves the existing row and receipt',async()=>{
 const r=runtime();await r.c.deleteEntry();r.setPaid(false);await r.confirm();assert.equal(r.c.S.entries.length,1);assert.equal(r.c.S.tombstones.length,0);assert.equal(r.removed(),0);
});
test('R2 handler preflight sees a server-side downgrade even while the UI entitlement is stale',async()=>{
 const r=runtime();r.c.loadEntitlementFromCloud=async()=>r.setPaid(false);assert.equal(await r.c.entryMutationPreflight(r.entry),false);assert.equal(r.c.S.entries.length,1);
});
test('R2 stale membership, epoch and account-scope responses reject before local mutation',async()=>{
 for(const reason of ['member','epoch','scope']){const r=runtime();if(reason==='member')r.c.FB.db.collection=()=>({doc:()=>({collection:()=>({doc:()=>({get:async()=>({exists:false})})})})});if(reason==='epoch')r.c.readAccountControls=async()=>({retention:{epoch:1}});if(reason==='scope')r.c.readAccountControls=async()=>{r.c.ACTIVE_ACCOUNT_SCOPE='another';return{};};assert.equal(await r.c.entryMutationPreflight(r.entry),false);assert.equal(r.removed(),0);}
});
test('R2 direct and offline shared handlers reject; pending or rejected cloud mutations keep local bytes',async()=>{
 const r=runtime();r.c.navigator.onLine=false;await r.c.deleteEntry();assert.equal(r.c.S.entries.length,1);r.c.S.entries=[];await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),0);r.c.navigator.onLine=true;await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),0);
});
test('R2 an authorised member tombstones a shared row but never deletes its bytes before server ACK',async()=>{
 const r=runtime();await r.c.deleteEntry();await r.confirm();assert.equal(r.c.S.entries.length,0);assert.equal(r.c.S.tombstones.length,1);assert.equal(r.removed(),0);
});
test('R2 Free personal local deletion stays available and active local references prevent byte deletion',async()=>{
 const r=runtime(false);r.setPaid(false);r.c.cloudUser=()=>null;assert.equal(r.c.entryMutationAllowed(r.entry),true);await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),0);await r.c.deleteEntry();await r.confirm();assert.equal(r.c.S.entries.length,0);assert.equal(r.removed(),1);
});
test('R2 receipt replacement uses new immutable names and server cleanup is not driven by metadata flags',()=>{
 assert.match(source,/photo-\$\{crypto.randomUUID\(\)\}/);assert.doesNotMatch(extract('async function deleteReceiptFromStorage(','// deleteEntry:'),/storage\(\)\.ref\(path\)\.delete/);
 const rules=fs.readFileSync(path.join(__dirname,'../../storage.rules'),'utf8');assert.match(rules,/allow update, delete: if false/);assert.doesNotMatch(rules,/sharedProtected/);
});
test('R2 delayed Admin physical-delete events do not race the explicit retention/reset cleanup owner',async()=>{
 const cleanup=require('../../functions/receipt-cleanup');const result=await cleanup.acceptedEntryChange({db:null,bucket:null,before:{receiptPath:'receipts/owner/old.jpg'},after:undefined});assert.equal(result.status,'no_change');
});
test('R2 Free local receipt bytes survive another active LTD or URL-only transaction reference',async()=>{
 const r=runtime(false);r.setPaid(false);r.c.cloudUser=()=>null;r.c.S.entries=[];
 r.c.S.domain={economicEvents:[{deletedAt:null,sourceTransaction:{evidenceRefs:[r.entry.receiptPath]}}]};
 await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),0,'active LTD evidence retains the local binary');
 r.c.S.domain.economicEvents[0].deletedAt=2;r.c.S.entries=[{id:'other',receiptUrl:'http://localhost/_taxmate_receipt/'+encodeURIComponent(r.entry.receiptPath)}];
 await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),0,'active URL-only receipt association retains the local binary');
 r.c.S.entries=[];await r.c.deleteReceiptFromStorage(r.entry.receiptPath);assert.equal(r.removed(),1);
 const legacy=runtime(false);legacy.setPaid(false);legacy.c.cloudUser=()=>null;const path='receipts/owner/old image%20?#.jpg';
 legacy.c.S.entries=[{id:'legacy-url',receiptUrl:'http://localhost/_taxmate_receipt/'+encodeURIComponent(path)}];
 await legacy.c.deleteReceiptFromStorage(path);assert.equal(legacy.removed(),0,'encoded legacy filename preserves active local bytes');
});

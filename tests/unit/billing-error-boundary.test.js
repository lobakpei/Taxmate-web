'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadBoundary}=require('../helpers/billing-boundary-local');
const plain=value=>JSON.parse(JSON.stringify(value)),user={uid:'isolated-boundary-user',token:{}};

async function assertRedaction(boundary){
  const sensitive='isolated-sensitive-provider-detail';
  const raw=Object.assign(new Error(sensitive),{raw:{message:sensitive},requestId:sensitive,code:sensitive});
  await assert.rejects(boundary.billingCall({auth:user},async()=>{throw raw;}),error=>{
    assert.equal(error.code,'internal');assert.equal(error.message,'Payments are temporarily unavailable');
    assert.deepEqual(plain(error.details),{reason:'billing-unavailable'});
    assert(!JSON.stringify(error).includes(sensitive));return true;
  });
  assert.deepEqual(plain(boundary.logs),[['billing-failure',{category:'billing-unavailable'}]]);
}

test('actual billing boundary redacts unknown provider failures from client and logs',async()=>{
  await assertRedaction(loadBoundary());
});
test('actual billing boundary preserves actionable domain code without leaking its message',async()=>{
  const b=loadBoundary();
  for(const [reason,code]of [['billing_refresh_in_progress',undefined],['payment_not_found','not-found']]){
    await assert.rejects(b.billingCall({auth:user},async()=>{throw Object.assign(new Error('private provider detail'),{billingReason:reason,billingCode:code});}),error=>{
      assert.equal(error.code,code||'failed-precondition');assert.equal(error.message,'Billing action needs attention');
      assert.deepEqual(plain(error.details),{reason});return true;
    });
  }
  assert.deepEqual(b.logs,[]);
});
test('actual billing boundary preserves a deliberate safe HttpsError and normal result',async()=>{
  const b=loadBoundary(),safe=new b.HttpsError('failed-precondition','Billing configuration unavailable',{reason:'billing-config'});
  await assert.rejects(b.billingCall({auth:user},async()=>{throw safe;}),error=>error===safe);
  assert.deepEqual(await b.billingCall({auth:user},async current=>({uid:current.uid})),{uid:user.uid});
  assert.deepEqual(b.logs,[]);
});
test('actual billing boundary denies missing authentication and non-boolean staff grants before service',async()=>{
  const b=loadBoundary();let calls=0;const run=async()=>{calls++;};
  await assert.rejects(b.billingCall({},run),error=>error.code==='unauthenticated'&&error.details.reason==='auth-required');
  for(const grant of [undefined,false,'true',1])await assert.rejects(b.billingCall({auth:{...user,token:{billingRefundOperator:grant}}},run,'billingRefundOperator'),error=>error.code==='permission-denied'&&error.details.reason==='billing_staff_required');
  assert.equal(calls,0);await b.billingCall({auth:{...user,token:{billingRefundOperator:true}}},run,'billingRefundOperator');assert.equal(calls,1);
});
test('redaction proof detects returning the raw provider error and logging its contents',async()=>{
  const rawReturn=loadBoundary(source=>source.replace("throw billingFailure('billing-unavailable');","throw error;"));
  await assert.rejects(assertRedaction(rawReturn),{code:'ERR_ASSERTION'});
  const rawLog=loadBoundary(source=>source.replace("throw billingFailure('billing-unavailable');","console.error(error);throw billingFailure('billing-unavailable');"));
  await assert.rejects(assertRedaction(rawLog),{code:'ERR_ASSERTION'});
});

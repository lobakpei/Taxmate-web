'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');

const root=path.resolve(__dirname,'../..');
function exportsFor(googlePlay,appStore){
  const program="const value=require('./index.js');const params=require('firebase-functions/params');process.stdout.write(JSON.stringify({exports:Object.keys(value).sort(),params:params.declaredParams.map(value=>value.name).sort()}))";
  const result=spawnSync(process.execPath,['-e',program],{
    cwd:path.join(root,'functions'),encoding:'utf8',
    env:{...process.env,FUNCTIONS_EMULATOR:'false',GOOGLE_PLAY_PROVIDER_READY:String(googlePlay),APP_STORE_PROVIDER_READY:String(appStore)}
  });
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout);
}

test('production source exposes fail-closed Play endpoints without unready App Store endpoints',()=>{
  const env=fs.readFileSync(path.join(root,'functions/.env.taxmate-uk-2'),'utf8');
  assert.match(env,/^GOOGLE_PLAY_PROVIDER_READY=(?:false|true)$/m);
  assert.match(env,/^APP_STORE_PROVIDER_READY=false$/m);
  const state=exportsFor(false,false),names=state.exports;
  for(const name of ['getGooglePlayBillingConfiguration','verifyGooglePlayPurchase','reserveNativeBillingPurchase','googlePlayBillingNotification','maintainGooglePlayBilling','releaseNativeBillingPurchase'])assert.equal(names.includes(name),true,name);
  for(const name of ['getAppStoreBillingConfiguration','verifyAppStoreTransaction','refreshAppStoreBilling','reserveAppStoreBillingPurchase','maintainAppStoreBilling','appStoreServerNotificationV2'])assert.equal(names.includes(name),false,name);
  for(const name of ['bootstrapAccountStorageControls','deleteAccountData','manageLtdSetup'])assert.equal(names.includes(name),true,name);
  for(const name of ['APP_STORE_ROOT_CA_BASE64','APP_STORE_PRIVATE_KEY','APP_STORE_BUNDLE_ID','APP_STORE_PLUS_MONTHLY_PRODUCT_ID'])assert.equal(state.params.includes(name),false,name);
  assert.equal(state.params.includes('GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID'),true);
});

test('Play exports are discovery-stable while App Store exports retain their readiness gate',()=>{
  const google=exportsFor(true,false),apple=exportsFor(false,true);
  for(const name of ['getGooglePlayBillingConfiguration','verifyGooglePlayPurchase','reserveNativeBillingPurchase','googlePlayBillingNotification','maintainGooglePlayBilling','releaseNativeBillingPurchase'])assert.equal(google.exports.includes(name),true,name);
  for(const name of ['getAppStoreBillingConfiguration','verifyAppStoreTransaction','refreshAppStoreBilling','reserveAppStoreBillingPurchase','maintainAppStoreBilling','appStoreServerNotificationV2','releaseNativeBillingPurchase'])assert.equal(apple.exports.includes(name),true,name);
  assert.equal(google.exports.includes('getAppStoreBillingConfiguration'),false);
  assert.equal(apple.exports.includes('getGooglePlayBillingConfiguration'),true);
  assert.equal(apple.params.includes('APP_STORE_ROOT_CA_BASE64'),true);
  assert.equal(apple.params.includes('APP_STORE_PRIVATE_KEY'),true);
  assert.equal(apple.params.includes('APP_STORE_BUNDLE_ID'),true);
  assert.equal(google.params.includes('GOOGLE_PLAY_PLUS_SUBSCRIPTION_ID'),true);
});

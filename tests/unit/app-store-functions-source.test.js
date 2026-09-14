'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('functions/index.js','utf8');
const service=fs.readFileSync('functions/app-store-billing.js','utf8');
const pkg=require('../../functions/package.json');

test('App Store callables bind Apple verification secrets while Web-safe account deletion does not',()=>{
  assert.match(source,/const APP_STORE_ROOT_CA=exposeAppStoreFunctions\?defineSecret\('APP_STORE_ROOT_CA_BASE64'\):null/);
  assert.match(source,/const appStoreOpts=exposeAppStoreFunctions\?\{\.\.\.baseOpts,secrets:\[APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY\]\}:null/);
  assert.match(source,/exports\.getAppStoreBillingConfiguration=onCall\(appStoreOpts/);
  assert.match(source,/exports\.verifyAppStoreTransaction=onCall\(appStoreOpts/);
  assert.match(source,/exports\.reserveAppStoreBillingPurchase=onCall\(appStorePurchaseOpts/);
  assert.match(source,/const accountDeletionOpts=\{\.\.\.baseOpts,secrets:\[STRIPE_SECRET\]\}/);
  assert.match(source,/exports\.deleteAccountData=onCall\(accountDeletionOpts/);
  const deletion=source.slice(source.indexOf('exports.deleteAccountData='),source.indexOf("\nif(process.env.FUNCTIONS_EMULATOR",source.indexOf('exports.deleteAccountData=')));
  assert.match(deletion,/BillingDeletionSafety\.appStoreDeletionEvidence/);
  assert.match(deletion,/reason:'app_store_status_required'/);
  assert.doesNotMatch(deletion,/appStoreService\(\)\.refreshForUser/,'deletion without Apple secrets must never call the Apple verifier');
  for(const name of ['confirmPlanChange','createCheckoutSession','reserveNativeBillingPurchase'])assert.match(source,new RegExp(`exports\\.${name}=onCall\\(opts`));
  assert.match(source,/const user=auth\(req\)/);
  assert.doesNotMatch(source,/verifyAppStoreTransaction=onCall\(opts/,'App Store verification must not require Stripe credentials');
});

test('App Store configuration and reservation share the Web checkout legal purchase gates',()=>{
  assert.match(source,/function billingPurchaseControls\(\)/);
  assert.match(source,/consumerDisclosuresEnabled:BILLING_CONSUMER_DISCLOSURES\.value\(\)==='true'/);
  assert.match(source,/supplierDisclosureVerified:BillingCheckout\.supplierDisclosureVerified/);
  assert.match(source,/eligibility=nativePurchaseEligibility\(appStorePurchaseEligibility/);
  assert.match(source,/if\(provider!=='stripe'\)assertBillingPurchaseReady\(\)/);
  assert.match(source,/exports\.verifyAppStoreTransaction=onCall\(appStoreOpts/,'post-purchase verification remains available so an existing charge can be reconciled');
});

test('Web and Play purchase entry points do not bind Apple secrets and fail closed on App Store history',()=>{
  for(const name of ['confirmPlanChange','createCheckoutSession','reserveNativeBillingPurchase'])assert.doesNotMatch(source,new RegExp(`exports\\.${name}=onCall\\(appStorePurchaseOpts`));
  assert.match(source,/const appStoreNeedsReconciliation=bindings\.appStore&&!appStoreBindingIsVerifiedEmpty\(initial\.snapshots\.appStore\)/);
  assert.match(source,/if\(appStoreNeedsReconciliation&&provider!=='app_store'\)throw new HttpsError\('failed-precondition'[^\n]*reason:'app_store_reconciliation_required'/);
});

test('App Store Server Notifications V2 verifies signed payloads and never logs JWS data',()=>{
  assert.match(source,/exports\.appStoreServerNotificationV2=onRequest\(\{region:'europe-west2',secrets:\[APP_STORE_ROOT_CA,APP_STORE_PRIVATE_KEY\]\}/);
  assert.match(source,/appStoreService\(\)\.handleNotification\(\{signedPayload\}\)/);
  assert.match(service,/verifyAcross\(config,'verifyAndDecodeNotification',signedPayload\)/);
  assert.match(service,/verifyAndDecodeTransaction\(data\.signedTransactionInfo\)/);
  assert.doesNotMatch(service,/console\.(?:log|warn|error)\([^\n]*(?:signedPayload|rawJws|signedTransaction)/);
});

test('four product IDs and Apple app identity come only from deploy configuration and fail closed',()=>{
  for(const name of ['APP_STORE_BUNDLE_ID','APP_STORE_APPLE_ID','APP_STORE_ENVIRONMENT','APP_STORE_PLUS_MONTHLY_PRODUCT_ID','APP_STORE_PLUS_YEARLY_PRODUCT_ID','APP_STORE_PRO_MONTHLY_PRODUCT_ID','APP_STORE_PRO_YEARLY_PRODUCT_ID'])assert.match(source,new RegExp(`defineString\\('${name}'`));
  assert.match(source,/defineSecret\('APP_STORE_ROOT_CA_BASE64'\)/);
  assert.equal(pkg.dependencies['@apple/app-store-server-library'],'3.1.0');
  assert.match(service,/new library\.SignedDataVerifier\(config\.rootCertificates,true,environment,config\.bundleId,environment==='Production'\?config\.appAppleId:undefined\)/);
  assert.match(service,/const environments=Object\.freeze\(\[environment\]\)/,'a production backend must never also admit Sandbox transactions');
  assert.match(service,/new Set\(products\.map\(row=>row\.productId\)\)\.size!==4/);
});

test('user-readable App Store entitlement stores only transaction hashes while server records retain provider IDs',()=>{
  const publicProjection=service.slice(service.indexOf('function publicProjection'),service.indexOf('function activeProjection'));
  assert.match(publicProjection,/transactionHash/);
  assert.doesNotMatch(publicProjection,/transactionId|originalTransactionId/);
  const verifyResponse=service.slice(service.indexOf('async function verifyForUser'),service.indexOf('async function handleNotification'));
  assert.match(verifyResponse,/return\{verified:true,transactionHash:projection\.transactionHash,verificationHash:hashVerifiedTransactionId\(projection\.transactionId\)/);
  assert.doesNotMatch(verifyResponse,/return\{verified:true,(?:transactionId|originalTransactionId)/);
  assert.match(service,/appStoreTransactions\/\$\{projection\.transactionHash\}/);
  assert.match(service,/const transactionRecord=\{[^\n]*transactionId:[^\n]*originalTransactionId:/);
  assert.match(service,/appStoreTransactionTombstones\/\$\{transactionTombstoneId/);
  assert.match(service,/transactionHistoryState:'verified'/);
});

test('cross-provider purchase guards and deletion fences cover App Store without blocking an empty account binding',()=>{
  assert.match(source,/providerPaidState\(data,'app_store'/);
  assert.match(source,/providerPaidState\(data,'stripe'/);
  assert.match(source,/reason:'app_store_active'/);
  assert.match(source,/BillingDeletionSafety\.appStoreDeletionEvidence/);
  assert.match(service,/where\('appAccountTokenHash','==',binding\.account\.appAccountTokenHash\)/);
  assert.doesNotMatch(source,/appStoreAccount\.exists[^\n]*!appStoreStates\.length/);
  assert.match(source,/deleteAppStoreAccountData\(uid,\{deletionId:correlationId,resetEpoch\}\)/);
  assert.match(source,/billingDeletionSignals\/\$\{uid\}/);
});

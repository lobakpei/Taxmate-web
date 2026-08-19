const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Legal=require('../../src/core/legal');

const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
const app=read('src/app/app.js');
const index=read('index.html');
const privacy=read('privacy.html');
const terms=read('terms.html');
const bootstrap=read('src/app/bootstrap.js');
const sentry=read('src/app/sentry-bootstrap.js');
const functions=read('functions/index.js');
const hosting=read('firebase.json');

test('public and in-app legal surfaces share the current policy identity and core facts',()=>{
  assert.equal(Legal.POLICY_VERSION,'2026-08-19');
  for(const text of [privacy,terms,Legal.privacyHtml,Legal.termsHtml]){
    assert.match(text,/Hau Ying Ou-Yang/);
    assert.match(text,/support@taxmate\.uk/);
    assert.match(text,/Google/);
    assert.doesNotMatch(text,/Apple Sign-In|Continue with Apple|sign in with Apple/i);
  }
  assert.match(privacy,/lawful bases/i);
  assert.match(privacy,/international transfers/i);
  assert.match(privacy,/right to object/i);
  assert.match(terms,/Free, Plus, Pro and promotions/i);
  assert.match(terms,/14 days/i);
  assert.match(terms,/Consumer Rights Act 2015/i);
  for(const text of [app,terms,Legal.termsHtml]){
    assert.match(text,/£3\.99\/month|£3\.99 per month/);
    assert.match(text,/£8\.49\/month|£8\.49 per month/);
    assert.match(text,/monthly only|monthly recurring|recur monthly/i);
    assert.match(text,/no annual plan/i);
  }
  for(const text of [privacy,Legal.privacyHtml]){
    assert.match(text,/Namecheap/);
    assert.match(text,/Microsoft Outlook/);
  }
  assert.match(app,/TaxMateLegal\.privacyHtml/);
});

test('optional GA4 is off by default and cannot receive arbitrary event parameters',()=>{
  assert.doesNotMatch(index,/src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
  assert.match(bootstrap,/getItem\(CONSENT_KEY\)==='granted'/);
  assert.match(bootstrap,/if\(loaded\|\|!enabled\(\)\)return/);
  assert.match(bootstrap,/client_storage:'none'/);
  assert.match(bootstrap,/send_page_view:false/);
  assert.match(app,/Share anonymous usage analytics/);
  assert.match(app,/TaxMateAnalytics\.enabled\(\)/);
});

test('Sentry minimises diagnostics and disables breadcrumbs/default PII',()=>{
  assert.match(sentry,/sendDefaultPii:false/);
  assert.match(sentry,/maxBreadcrumbs:0/);
  assert.match(read('src/core/telemetry.js'),/value:'Application error'/);
});

test('account deletion covers promotion records and partnership last-member behavior',()=>{
  assert.match(functions,/collection\('promotionRedemptions'\)\.where\('uid','==',uid\)/);
  assert.match(functions,/otherMembers\.length/);
  assert.match(functions,/recursiveDelete\(partnership\)/);
  assert.match(functions,/exports\.joinPartnership=onCall\(baseOpts/);
  assert.match(functions,/exports\.leavePartnership=onCall\(baseOpts/);
  assert.match(functions,/enforceAppCheck:process\.env\.FUNCTIONS_EMULATOR!==\'true\'/);
  assert.match(app,/firebase\.appCheck\(\)\.getToken\(false\)/);
  assert.match(app,/'X-Firebase-AppCheck':appCheck\.token/);
  assert.match(app,/callSecureFunction\('joinPartnership',\{code\}\)/);
  assert.match(app,/callSecureFunction\('leavePartnership',\{code\}\)/);
  assert.match(functions,/deleteFiles\(\{prefix:`receipts\/\$\{uid\}\//);
  assert.doesNotMatch(functions,/catch\(e\)\{console\.error\('receipt cleanup'/);
  assert.match(functions,/consent_collection:\{terms_of_service:'required'\}/);
});

test('Google is the only authentication frame/provider surface',()=>{
  assert.match(hosting,/frame-src https:\/\/accounts\.google\.com;/);
  assert.doesNotMatch(hosting,/appleid\.apple\.com/i);
  assert.doesNotMatch(app,/Continue with Apple|signIn\('apple'\)|Google or Apple sign-in/i);
});

test('stale unsupported legal, deletion and HMRC marketing claims are absent',()=>{
  const current=[app,privacy,terms,read('help.html'),Legal.privacyHtml,Legal.termsHtml].join('\n');
  for(const claim of [/MTD-ready quarterly export/i,/for HMRC checks/i,/供稅局審查/i,/MTD 季度匯出/i,/Eksport kwartalny MTD/i,/Export trimestrial MTD/i,/Exportación trimestral MTD/i,/MTD سہ ماہی ایکسپورٹ/i,/Erase everything everywhere/i,/all your data has been deleted from this device and the cloud/i,/accepts no liability/i,/not liable for any losses/i,/data is never deleted/i,/Google Analytics 4 runs without client storage for aggregate usage/i])assert.doesNotMatch(current,claim);
});

test('public runtime files contain no private contact details or secret credentials',()=>{
  const files=['index.html','privacy.html','terms.html','help.html','src/app/app.js','src/core/legal.js','src/app/bootstrap.js','src/app/sentry-bootstrap.js'];
  const publicText=files.map(read).join('\n');
  const emails=publicText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
  assert.deepEqual([...new Set(emails.map(x=>x.toLowerCase()))],['support@taxmate.uk']);
  assert.doesNotMatch(publicText,/\+44\s?\d|\b0[1-9]\d{8,10}\b/);
  assert.doesNotMatch(publicText,/\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/i);
  assert.doesNotMatch(publicText,/sk_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i);
});

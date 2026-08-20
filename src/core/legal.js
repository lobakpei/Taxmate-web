(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.TaxMateLegal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const POLICY_VERSION='2026-08-19';
  const LAST_UPDATED='19 August 2026';

  const privacyHtml=`
<div class="stitle" style="margin-bottom:16px">Privacy Policy</div>
<div class="s" style="margin-bottom:20px;color:var(--muted)">Last updated: ${LAST_UPDATED} · policy version ${POLICY_VERSION}</div>
<div style="font-size:14px;line-height:1.7;color:var(--ink)">
<p><strong>1. Controller and contact</strong><br>
TaxMate UK ("TaxMate") is a trading name used by Hau Ying Ou-Yang, a UK sole trader and the controller of personal information processed for this service. ICO registration: <strong>ZC174150</strong>. Contact: <a href="mailto:support@taxmate.uk">support@taxmate.uk</a>. TaxMate has not appointed a data protection officer.</p>

<p><strong>2. Information processed</strong><br>
TaxMate can process business names and types; income, expense, mileage, category, date and note records; tax-year adjustments; receipt images; backup files; partnership membership and shared records; and app preferences. If you sign in with Google, Google supplies an account identifier and may supply your name, email address and profile image. Billing records can include a Stripe customer identifier, subscription status, plan, renewal date, cancellation status and promotion redemption. Support messages and limited technical diagnostics are processed when you contact us or an error occurs.</p>

<p><strong>3. Local-only use and cloud use</strong><br>
The app works locally without an account. Local records and preferences are stored in your browser and remain under your control until you clear them, reset the app or delete them. Google sign-in is optional but is required for cloud sync, partnership sync and paid plans. Signed-in personal records use Firebase Authentication, Cloud Firestore and Cloud Storage. Partnership records are shared with the members of that partnership.</p>

<p><strong>4. Purposes and lawful bases</strong><br>
We process account, bookkeeping, receipt, backup, sync, partnership and entitlement information where necessary to provide the service or take steps you request before entering a contract. We process payment and accounting records to perform the paid-service contract and meet applicable legal obligations. We use necessary security, abuse-prevention, promotion-integrity and strictly minimised error diagnostics for our legitimate interests in protecting and operating TaxMate. Optional Google Analytics measurement is based on consent and is off unless you enable it. You may withdraw analytics consent in Settings at any time.</p>

<p><strong>5. Data minimisation</strong><br>
Do not enter special-category information or information about other people unless it is genuinely needed for your own records and you are entitled to use it. TaxMate does not sell personal information and does not use bookkeeping records for advertising. TaxMate does not intentionally send financial amounts, business names, notes, receipt content or account identity to GA4 or Sentry.</p>

<p><strong>6. Providers and recipients</strong><br>
Google/Firebase processes sign-in, app security checks, cloud records, receipts and server functions. Stripe processes checkout, payment methods, invoices, subscriptions and promotion codes; TaxMate does not receive complete card details. Sentry processes minimised error reports. If you opt in, Google Analytics 4 processes a small approved set of value-free usage events. Namecheap forwards messages sent to the public support address and Microsoft Outlook is the destination mailbox service; the private destination address is not published. Browsers also connect to Google Fonts and software-content delivery networks to obtain app assets. Professional advisers, regulators, courts or law-enforcement bodies may receive information where necessary and lawful.</p>

<p><strong>7. Locations and international transfers</strong><br>
The candidate Firestore database and server functions are configured for <code>europe-west2</code> (London). Receipt Storage is configured in the United States. Google, Stripe, Sentry and their subprocessors may process information in the UK, EEA, United States and other countries. Where UK personal information is transferred internationally, the relevant provider terms describe adequacy arrangements, the UK Extension to the Data Privacy Framework and/or contractual safeguards such as the UK Addendum to standard contractual clauses. Contact us to request further information about applicable safeguards.</p>

<p><strong>8. Retention</strong><br>
Local data remains until you remove it. Active-account cloud records remain while the account is used. Deleting the account removes the personal Firestore tree, receipt objects, promotion-redemption records, TaxMate's Stripe customer object and Firebase Auth identity through the authenticated server workflow. If a partnership still has another member, its shared records remain for that member and your membership is removed; if you are the last member, the partnership is deleted. Provider backups, logs, fraud-prevention records and legally required transaction records may remain for limited provider-defined or legally required periods. GA4 user/event retention must be configured to two months before release; standard aggregated reports are not governed by that setting. Sentry event retention must be fixed and verified in staging before release.</p>

<p><strong>9. Your choices and rights</strong><br>
You can use TaxMate locally, export JSON data, export a full ZIP including available receipt binaries, correct records in the app and use "Delete all my data" for the authenticated deletion workflow. Depending on the lawful basis and circumstances, you may have rights of access, correction, erasure, restriction, objection and portability. Consent can be withdrawn at any time without affecting earlier processing.</p>

<p><strong>Your right to object</strong><br>
You may object to processing based on legitimate interests, including security/error-monitoring processing, by contacting us. We will assess the request against any compelling legitimate grounds or legal obligations.</p>

<p><strong>10. Automated calculations</strong><br>
Tax estimates and plan entitlements are produced by rules-based software. They do not make decisions with legal or similarly significant effects. TaxMate is not affiliated with HMRC, does not submit returns or MTD updates, and is not tax advice.</p>

<p><strong>11. Security and deletion limits</strong><br>
TaxMate applies access rules, App Check, encrypted provider connections and telemetry filtering, but no online service can guarantee absolute security. A deletion request is complete only when the app reports server-side success. If it reports that only local data was erased, contact support so cloud deletion can be retried.</p>

<p><strong>12. Complaints and changes</strong><br>
Contact <a href="mailto:support@taxmate.uk">support@taxmate.uk</a> about privacy or to exercise a right. You may also complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>. Material policy changes will be dated and communicated appropriately.</p>
</div>`;

  const termsHtml=`
<div class="stitle" style="margin-bottom:16px">Terms of Use</div>
<div class="s" style="margin-bottom:20px;color:var(--muted)">Last updated: ${LAST_UPDATED} · terms version ${POLICY_VERSION}</div>
<div style="font-size:14px;line-height:1.7;color:var(--ink)">
<p><strong>1. Who provides TaxMate</strong><br>
TaxMate UK ("TaxMate") is a trading name used by Hau Ying Ou-Yang, a UK sole trader. Contact: <a href="mailto:support@taxmate.uk">support@taxmate.uk</a>. These terms apply when you use the TaxMate web app.</p>

<p><strong>2. Eligibility and agreement</strong><br>
You must be at least 18 and able to enter a contract. By using TaxMate you agree to these terms. Paid checkout separately requires acceptance of the terms presented there.</p>

<p><strong>3. What the service does</strong><br>
TaxMate helps UK self-employed users keep records, estimate selected Self Assessment amounts and create summaries or draft exports. It does not file tax returns or MTD updates, is not HMRC-recognised submission software, is not affiliated with HMRC, and does not provide tax, accounting or legal advice. Exports are working aids, not official filings or proof that HMRC will accept a claim.</p>

<p><strong>4. Your responsibilities</strong><br>
You are responsible for lawful and accurate input, protecting your account and devices, maintaining suitable backups, reviewing calculations and meeting filing and payment deadlines. Verify important figures with current HMRC guidance or a qualified adviser. Do not upload unlawful content, malware, another person's information without authority, or material that infringes rights.</p>

<p><strong>5. Accounts and partnerships</strong><br>
Google is the only sign-in provider. A partnership code grants access to shared records, so share it only with an intended partner. Partnership members can see and change shared records. Removing your account removes your membership; shared records remain if another member remains and are deleted when the last member leaves.</p>

<p><strong>6. Free, Plus and Pro</strong><br>
Free costs £0. Plus costs £3.99 per month or £29.99 per year. Pro costs £7.99 per month or £59.99 per year. Monthly and yearly options are recurring subscriptions. TaxMate is not launching with a VAT-registered sales configuration: Stripe Tax is off, no VAT is added to these prices, and TaxMate does not issue a VAT amount or VAT invoice. Before payment, Checkout must show the selected final price, monthly or yearly renewal arrangement, included plan and payment method. Paid access starts only after server-verified Stripe status; client settings cannot unlock it.</p>

<p><strong>7. Promotions</strong><br>
A promotion redeemed directly in TaxMate grants the Plus or Pro tier and duration encoded by the server-controlled promotion. It does not create a paid subscription unless you separately complete Checkout. When it expires, access returns to Free and account records are preserved. A code used inside Stripe Checkout instead changes the checkout price or duration shown there. Promotions may have eligibility, redemption-count and expiry conditions disclosed with the offer or at redemption.</p>

<p><strong>8. Renewal and cancellation</strong><br>
Paid subscriptions renew at the selected monthly or yearly interval until cancelled. Use the Stripe billing portal from Settings or contact support to cancel. Unless Checkout or mandatory law says otherwise, cancellation stops future renewal and paid access continues until the end of the paid monthly or yearly period. Existing monthly subscribers stay monthly unless they actively choose and complete a different billing arrangement. Cancelling a plan does not delete your records; use the separate deletion control if you want account data removed.</p>

<p><strong>9. Cooling-off and statutory rights</strong><br>
Consumers may have a statutory cancellation period, normally 14 days for a distance service contract. By completing Checkout and using paid features immediately, you request that the digital service begin during that period. Contact support to exercise a cancellation right or request the model cancellation form. Any lawful deduction for service already supplied and any refund will be handled under applicable law. Nothing in these terms removes rights under the Consumer Rights Act 2015 or other mandatory consumer law.</p>
<p>Cancelling a subscription is not the same as receiving a refund. Ordinary cancellation keeps paid access until the end of the paid billing period; after that, an active promotion applies or access returns to Free. A successful full Stripe refund ends the refunded paid entitlement immediately; an independently active promotion still applies, otherwise access returns to Free. A partial refund does not automatically change access and is marked for manual review. Bookkeeping and account data are retained in each case unless you separately request deletion under the Privacy Policy. These product-access rules do not limit any statutory consumer right.</p>

<p><strong>10. Service and price changes</strong><br>
We may improve or discontinue features for genuine operational, security, legal or product reasons. We will give reasonable advance notice of a material adverse change where practicable. A price change applies only as disclosed for a future billing period; you can cancel before it takes effect.</p>

<p><strong>11. Availability and support</strong><br>
We use reasonable care and skill but cannot promise uninterrupted availability or compatibility with every device. Planned maintenance, provider incidents and events outside reasonable control can affect access. Contact support if the service does not conform to these terms.</p>

<p><strong>12. Liability</strong><br>
We are responsible for loss that is a foreseeable result of our breach or failure to use reasonable care and skill. We are not responsible for loss caused by inaccurate user input, ignoring a clear warning, failing to keep a backup, or using an estimate as professional advice. Nothing excludes or limits liability where the law does not allow it, including liability for fraud or for death or personal injury caused by negligence.</p>

<p><strong>13. Intellectual property and your records</strong><br>
TaxMate's software, branding and supplied content are protected by intellectual-property law. You retain rights in records and material you enter and give us only the permission needed to host, process, back up, sync and share them as you direct.</p>

<p><strong>14. Suspension and termination</strong><br>
We may proportionately restrict access where reasonably necessary for security, unlawful use, serious breach or non-payment, and will explain or give an opportunity to remedy where appropriate. You may stop using Free, cancel a paid plan, or request account deletion at any time.</p>

<p><strong>15. Governing law</strong><br>
These terms are governed by the law of England and Wales. If you are a consumer, mandatory protections and court rights in the part of the UK where you live continue to apply.</p>

<p><strong>16. Contact</strong><br>
Questions, complaints and cancellation requests: <a href="mailto:support@taxmate.uk">support@taxmate.uk</a>.</p>
</div>`;

  return Object.freeze({POLICY_VERSION,LAST_UPDATED,privacyHtml,termsHtml});
});

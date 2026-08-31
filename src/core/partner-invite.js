(function attachPartnerInvite(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMatePartnerInvite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function partnerInviteFactory() {
  'use strict';
  const PRODUCTION_ORIGIN = 'https://www.taxmate.uk/';
  const CODE_PATTERN = /^[A-Z0-9]{6,8}$/;
  function normaliseCode(value) { return String(value || '').trim().toUpperCase(); }
  function validCode(value) { return CODE_PATTERN.test(normaliseCode(value)); }
  function inviteUrl() { return PRODUCTION_ORIGIN; }
  function interpolate(template, values) {
    let output = String(template || '');
    for (const [key, value] of Object.entries(values || {})) output = output.split(`{${key}}`).join(String(value));
    return output;
  }
  function payload({businessName, code, title, message}) {
    const cleanCode = normaliseCode(code), url = inviteUrl(), cleanName = String(businessName || '').trim();
    if (!validCode(cleanCode)) throw new Error('partner-invite-code-invalid');
    if (!cleanName) throw new Error('partner-invite-business-name-required');
    return Object.freeze({title:String(title || 'TaxMate Partner Sync'),text:interpolate(message,{n:cleanName,c:cleanCode,u:url}),url});
  }
  return Object.freeze({PRODUCTION_ORIGIN,normaliseCode,validCode,inviteUrl,payload});
});

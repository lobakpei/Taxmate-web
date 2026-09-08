'use strict';
// Local artifact only: no hosting API, network operation or account configuration.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const contract=require('../functions/contracts/terms-20260907.json'),content=require('../src/core/product-content');
function render(){
  assert.equal(contract.version,content.POLICY_VERSION);assert.equal(contract.termsHtml,content.termsHtml);
  assert.equal(contract.establishmentAddressVerified,false);
  return `<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>TEST ONLY — TaxMate candidate terms</title><style>body{font:18px/1.6 system-ui,sans-serif;margin:2rem auto;padding:0 1rem;max-width:52rem;color:#182621;background:#fff}aside{padding:1rem;border:3px solid #8b3d00;background:#fff3df}summary{cursor:pointer;font-weight:600}details{margin:1rem 0}a{color:#155f4c}h1{font-size:1.8rem}</style></head><body><main><aside aria-label="Test-only notice"><h1>TEST ONLY — not a live sales page</h1><p>TaxMate sandbox integration preview. Contract version: <strong>${contract.version}</strong>.</p><p>The candidate terms below are reproduced without changes. This preview is not approved for consumer sales. Supplier establishment-address verification and the formal sales gate remain pending. No purchase or payment can be submitted on this page.</p></aside><article id="candidate-contract">${contract.termsHtml}</article></main></body></html>\n`;
}
function previewConfiguration(){return{hosting:{site:'taxmate-staging',public:'public',ignore:['**/.*'],headers:[{source:'**',headers:[
  {key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'},
  {key:'Cache-Control',value:'no-store'},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'no-referrer'},
  {key:'Content-Security-Policy',value:"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}
]}]}};}
function build(output){
  const root=path.resolve(__dirname,'..'),allowed=path.join(root,'.hosting-build')+path.sep,dest=path.resolve(output);
  assert.ok(dest.startsWith(allowed),'Output must stay in this candidate .hosting-build directory');
  const html=render();fs.mkdirSync(path.join(dest,'public'),{recursive:true});
  const filename='taxmate-test-terms-20260907.html',manifest={status:'LOCAL_ONLY_NOT_PUBLISHED',contractVersion:contract.version,contractSha256:crypto.createHash('sha256').update(contract.termsHtml).digest('hex'),htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),filename,supplierEstablishmentAddressVerified:false,liveSalesCleared:false,stripeSettingsChanged:false,proposedProjectId:'taxmate-staging',hostingTargetCurrentlyVerified:false,proposedChannel:'billing-terms-20260907',proposedExpiryDays:7,publicUrl:null};
  fs.writeFileSync(path.join(dest,'public',filename),html,{flag:'wx'});fs.writeFileSync(path.join(dest,'TEST_TERMS_MANIFEST.json'),JSON.stringify(manifest,null,2),{flag:'wx'});fs.writeFileSync(path.join(dest,'firebase.test-terms.preview.json'),JSON.stringify(previewConfiguration(),null,2),{flag:'wx'});return manifest;
}
if(require.main===module){try{assert.ok(process.argv[2],'Local output directory required');console.log(JSON.stringify(build(process.argv[2])));}catch(e){console.error('Test terms preview not built: '+e.message);process.exitCode=1;}}
module.exports={render,build,previewConfiguration};

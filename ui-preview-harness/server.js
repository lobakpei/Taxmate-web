'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {createFounderPreviewBackup}=require('./sanitised-backup-fixture');
const {buildPreviewDataset}=require('./founder-preview-dataset');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../src/integration/ltd/CanonicalCompanyDriver');
const Repository=require('../src/integration/ltd/company-state-repository');
const {TaxMateLtdUIFacade}=require('../src/integration/ltd/TaxMateLtdUIFacade');
const entitlementFor=tier=>Object.freeze(tier==='pro'?{subscriptionStatus:'active',paidTier:'pro',currentPeriodEnd:DEFAULT_NOW+365*86400000,serverVerifiedAt:DEFAULT_NOW,billingCadence:'monthly'}:tier==='plus'?{subscriptionStatus:'active',paidTier:'plus',currentPeriodEnd:DEFAULT_NOW+365*86400000,serverVerifiedAt:DEFAULT_NOW,billingCadence:'monthly'}:{subscriptionStatus:'inactive',paidTier:'free',currentPeriodEnd:null,serverVerifiedAt:DEFAULT_NOW,billingCadence:null});

const SOURCE_ROOT=path.resolve(__dirname,'..');
const COPY=JSON.parse(fs.readFileSync(path.join(SOURCE_ROOT,'src','integration','ltd','approved-copy.json'),'utf8'));
const PORT=Number((process.argv.find(arg=>arg.startsWith('--port='))||'--port=41739').split('=')[1]);
if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw new Error('Use --port=1024..65535');

function dataset(mode){
  const bytes=Buffer.from(JSON.stringify(createFounderPreviewBackup(),null,2)+'\n','utf8');
  const digest=crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'taxmate-fable-ui-'));
  const backupPath=path.join(tempDir,'sanitised-preview-backup.json');
  try{fs.writeFileSync(backupPath,bytes,{flag:'wx'});return buildPreviewDataset({mode,backupPath,expectedSha256:digest});}
  finally{try{fs.unlinkSync(backupPath);}catch(_){}try{fs.rmdirSync(tempDir);}catch(_){}}
}
const PREVIEW_STATE_ROOT=path.join(os.tmpdir(),'taxmate-ltd-v1-5-production-integration-preview');fs.mkdirSync(PREVIEW_STATE_ROOT,{recursive:true});
function previewCompaniesHouseProvider(){return Object.freeze({isNetworkProvider:false,async lookup(number){if(number==='22222222')return{status:'not_found',retryable:false,reasonCode:'company_not_found'};if(number==='33333333')return{status:'unavailable',retryable:true,reasonCode:'companies_house_temporarily_unavailable'};const company={number,name:'PREVIEW COMPANY LTD',incorporationDate:'2025-12-15',status:number==='44444444'?'dissolved':'active',type:number==='55555555'?'private-limited-guarant-nsc':'ltd',registryUrl:`https://find-and-update.company-information.service.gov.uk/company/${number}`},reasonCodes=[];if(company.status!=='active')reasonCodes.push('companies_house_status_needs_checking');if(company.type!=='ltd')reasonCodes.push('companies_house_company_type_not_supported');return{status:'found',retryable:false,company,verificationStatus:reasonCodes.length?'needs_checking':'verified',reasonCodes};}});}
function createFacade(mode,tier){const bundle=dataset(mode),file=path.join(PREVIEW_STATE_ROOT,`${mode}-${tier}.json`),repository=Repository.fileRepository({file,initialState:bundle.state});return new TaxMateLtdUIFacade({driver:new CanonicalCompanyDriver({mode,repository,resetState:bundle.state,meta:{...bundle.meta,previewTier:tier},copy:COPY,now:()=>DEFAULT_NOW,personalTaxJurisdiction:'EWNI',entitlementSnapshot:entitlementFor(tier),companiesHouseProvider:previewCompaniesHouseProvider()})});}
const facades=Object.fromEntries(['fresh','existing'].flatMap(mode=>['free','plus','pro'].map(tier=>[`${mode}:${tier}`,createFacade(mode,tier)])));
const safeMode=url=>url.searchParams.get('mode')==='fresh'?'fresh':'existing';
const safeTier=url=>['free','plus'].includes(url.searchParams.get('tier'))?url.searchParams.get('tier'):'pro';
const headers={
  'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
function json(response,status,value){response.writeHead(status,{...headers,'content-type':'application/json; charset=utf-8'});response.end(JSON.stringify(value));}
const semanticError=reasonCode=>({status:'failure',error:{reasonCode,copyKey:'error.fix_issue',params:{}}});
function readBody(request){return new Promise((resolve,reject)=>{let size=0,body='';request.setEncoding('utf8');request.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>2_000_000){reject(new Error('Request body too large'));request.destroy();return;}body+=chunk;});request.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch(error){reject(error);}});request.on('error',reject);});}
function contentType(file){return file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.json')?'application/json; charset=utf-8':'application/octet-stream';}
function staticFile(request,response,url){
  const relative=url.pathname==='/'?'ui-preview-harness/index.html':decodeURIComponent(url.pathname).replace(/^\/+/,''),target=path.resolve(SOURCE_ROOT,relative);
  if(target!==SOURCE_ROOT&&!target.startsWith(SOURCE_ROOT+path.sep)){json(response,403,semanticError('path_forbidden'));return;}
  fs.readFile(target,(error,bytes)=>{if(error){json(response,404,semanticError('not_found'));return;}response.writeHead(200,{...headers,'content-type':contentType(target)});response.end(bytes);});
}
const server=http.createServer(async(request,response)=>{
  const host=String(request.headers.host||'').split(':')[0].replace(/^\[|\]$/g,'');if(!['127.0.0.1','localhost','::1'].includes(host)){json(response,403,semanticError('localhost_only'));return;}
  const url=new URL(request.url,`http://${request.headers.host}`),mode=safeMode(url),tier=safeTier(url),facade=facades[`${mode}:${tier}`];
  try{
    if(request.method==='GET'&&url.pathname==='/api/snapshot'){json(response,200,facade.getSnapshot());return;}
    if(request.method==='POST'&&url.pathname==='/api/action'){const body=await readBody(request),result=await facade.invoke(body.callback,body.input||{});json(response,200,result);return;}
    if(request.method!=='GET'){json(response,405,semanticError('method_not_allowed'));return;}
    staticFile(request,response,url);
  }catch(_){json(response,500,{status:'failure',error:{reasonCode:'harness_failure',copyKey:'error.fix_issue',params:{}}});}
});
server.listen(PORT,'127.0.0.1',()=>{
  process.stdout.write(`TaxMate Ltd V1.5 Founder Preview (localhost-only)\nFresh Pro:      http://127.0.0.1:${PORT}/?mode=fresh&tier=pro\nExisting Pro:   http://127.0.0.1:${PORT}/?mode=existing&tier=pro\nExisting Plus:  http://127.0.0.1:${PORT}/?mode=existing&tier=plus\nExisting Free:  http://127.0.0.1:${PORT}/?mode=existing&tier=free\nReset: add &reset=1\n`);
});

'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const http=require('node:http');
const os=require('node:os');
const path=require('node:path');
const {createFounderPreviewBackup}=require('./sanitised-backup-fixture');
const {buildPreviewDataset}=require('./founder-preview-dataset');
const {CanonicalCompanyDriver,DEFAULT_NOW}=require('../src/integration/ltd/CanonicalCompanyDriver');
const {createCompaniesHouseProvider}=require('../src/integration/ltd/companies-house-provider');
const {TaxMateLtdUIFacade}=require('../src/integration/ltd/TaxMateLtdUIFacade');

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
function createFacade(mode){const bundle=dataset(mode),apiKey=process.env.COMPANIES_HOUSE_API_KEY||'';return new TaxMateLtdUIFacade({driver:new CanonicalCompanyDriver({mode,state:bundle.state,meta:bundle.meta,copy:COPY,now:()=>DEFAULT_NOW,personalTaxJurisdiction:'EWNI',companiesHouseProvider:createCompaniesHouseProvider({apiKey})})});}
const facades={fresh:createFacade('fresh'),existing:createFacade('existing')};
const safeMode=url=>url.searchParams.get('mode')==='fresh'?'fresh':'existing';
const headers={
  'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
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
  const url=new URL(request.url,`http://${request.headers.host}`),mode=safeMode(url),facade=facades[mode];
  try{
    if(request.method==='GET'&&url.pathname==='/api/snapshot'){json(response,200,facade.getSnapshot());return;}
    if(request.method==='POST'&&url.pathname==='/api/action'){const body=await readBody(request),result=await facade.invoke(body.callback,body.input||{});json(response,result.status==='failure'?400:200,result);return;}
    if(request.method!=='GET'){json(response,405,semanticError('method_not_allowed'));return;}
    staticFile(request,response,url);
  }catch(_){json(response,500,{status:'failure',error:{reasonCode:'harness_failure',copyKey:'error.fix_issue',params:{}}});}
});
server.listen(PORT,'127.0.0.1',()=>{
  process.stdout.write(`TaxMate Ltd V1.5 Founder Preview (localhost-only)\nFresh:    http://127.0.0.1:${PORT}/?mode=fresh\nExisting: http://127.0.0.1:${PORT}/?mode=existing\nReset: add &reset=1\n`);
});

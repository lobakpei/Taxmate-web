'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const JSZip=require('jszip');

const root=path.resolve(__dirname,'..');
const output=path.join(root,'.ltd-fable-rereview-evidence');
const originalOuter=process.env.TAXMATE_FABLE_REVIEW_ZIP||'C:\\Users\\tamtam\\Downloads\\fabletowork.zip';
const expectedInnerSha='4C5FA69B9B930F9442623856C32B5025FAFFA36D94F72DC1307C16CD3AE2B828';

function sha256(value){return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();}
function safeReset(target){
  const resolved=path.resolve(target),scope=path.resolve(root)+path.sep;
  if(!resolved.startsWith(scope)||path.basename(resolved)!=='.ltd-fable-rereview-evidence')throw new Error(`Unsafe evidence path: ${resolved}`);
  fs.rmSync(resolved,{recursive:true,force:true});fs.mkdirSync(resolved,{recursive:true});
}
function run(command,args,options={}){
  const result=spawnSync(command,args,{cwd:options.cwd||root,encoding:'utf8',maxBuffer:128*1024*1024,windowsHide:true});
  return{command:[command,...args].join(' '),exitCode:result.status,stdout:String(result.stdout||''),stderr:String(result.stderr||''),error:result.error?String(result.error.message||result.error):null};
}
function git(args){const result=run('git',args);if(result.exitCode!==0)throw new Error(result.stderr||result.stdout);return result.stdout.trim();}
function npm(args){
  const npmCli=path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
  return run(process.execPath,[npmCli,...args]);
}
function saveResult(name,result){
  const log=`$ ${result.command}\n\n${result.stdout}${result.stderr}${result.error?`\nSPAWN ERROR: ${result.error}\n`:''}`;
  fs.writeFileSync(path.join(output,`${name}.log`),log);
  return{name,command:result.command,exitCode:result.exitCode,status:result.exitCode===0?'PASS':'FAIL',log:`${name}.log`};
}
function ltdSyncEvidence(){
  const attempts=[];let result;
  for(let attempt=1;attempt<=3;attempt++){
    result=npm(['run','test:ltd:sync:browser']);
    const saved=saveResult(`05-ltd-sync-browser-attempt-${attempt}`,result);attempts.push(saved);
    if(result.exitCode===0)return{name:'05-ltd-sync-browser',command:saved.command,exitCode:0,status:attempt===1?'PASS':'PASS_AFTER_ENVIRONMENT_RETRY',attempts};
    const combined=`${result.stdout}\n${result.stderr}`,browserResult=path.join(root,'.ltd-sync-browser-evidence','paid-sync-browser-result.json'),rawResult=fs.existsSync(browserResult)?fs.readFileSync(browserResult,'utf8'):'';
    if(!/Auth emulator did not accept sign-in/i.test(combined)||!/ERR_CONNECTION_REFUSED/i.test(rawResult))break;
  }
  return{name:'05-ltd-sync-browser',command:attempts[attempts.length-1].command,exitCode:result.exitCode,status:'FAIL',attempts};
}
async function extractOriginalFableTests(){
  const outerBytes=fs.readFileSync(originalOuter),outer=await JSZip.loadAsync(outerBytes);
  const entry=outer.file('TAXMATE_FABLE_ARCHITECTURE_REVIEW_ONLY_20260905.zip');
  if(!entry)throw new Error('Original inner Fable review ZIP not found');
  const innerBytes=await entry.async('nodebuffer'),innerSha=sha256(innerBytes);
  if(innerSha!==expectedInnerSha)throw new Error(`Original Fable review SHA mismatch: ${innerSha}`);
  const inner=await JSZip.loadAsync(innerBytes),destination=path.join(output,'original-fable-review');
  for(const [relative,item] of Object.entries(inner.files)){
    if(item.dir)continue;
    const target=path.resolve(destination,...relative.split('/'));
    if(!target.startsWith(path.resolve(destination)+path.sep))throw new Error(`Unsafe Fable ZIP entry: ${relative}`);
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,await item.async('nodebuffer'));
  }
  return{outerPath:originalOuter,outerSha256:sha256(outerBytes),innerSha256:innerSha,destination};
}
function copyResultIfPresent(source,name){
  if(!fs.existsSync(source))return null;
  const destination=path.join(output,name);fs.copyFileSync(source,destination);
  return{name,bytes:fs.statSync(destination).size,sha256:sha256(fs.readFileSync(destination))};
}

(async()=>{
  const resume=process.argv.includes('--resume'),partialPath=path.join(output,'PARTIAL.json');
  const current={branch:git(['branch','--show-current']),commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),trackedStatus:git(['status','--short','--untracked-files=no'])};
  if(current.trackedStatus)throw new Error(`Evidence must run from a clean tracked candidate:\n${current.trackedStatus}`);
  let start,fable,checks;
  if(resume){
    if(!fs.existsSync(partialPath))throw new Error('No PARTIAL.json exists to resume');
    const partial=JSON.parse(fs.readFileSync(partialPath,'utf8'));start=partial.identity;checks=partial.checks||[];
    if(start.commit!==current.commit||start.tree!==current.tree||start.branch!==current.branch)throw new Error('Partial evidence identity does not match the current candidate');
    fable={...partial.originalFableReview,destination:path.join(output,'original-fable-review')};
  }else{
    safeReset(output);start=current;fable=await extractOriginalFableTests();checks=[];
  }
  function persist(){fs.writeFileSync(partialPath,JSON.stringify({identity:start,originalFableReview:{outerSha256:fable.outerSha256,innerSha256:fable.innerSha256},checks},null,2)+'\n');}
  function step(name,produce,decorate){
    const existing=checks.find(check=>check.name===name);
    if(existing){if(existing.blocking!==false&&existing.exitCode!==0)throw new Error(`Cannot resume past blocking failure: ${name}`);return existing;}
    const check=produce();if(decorate)decorate(check);checks.push(check);persist();
    if(check.blocking!==false&&check.exitCode!==0)throw new Error(`Blocking evidence failed: ${name}; see ${check.log||'attempt logs'}`);
    return check;
  }
  if(!resume)persist();
  step('01-npm-test',()=>saveResult('01-npm-test',npm(['test'])));
  step('02-rules-emulator',()=>saveResult('02-rules-emulator',npm(['run','test:rules:emulator'])));
  step('03-functions-emulator',()=>saveResult('03-functions-emulator',npm(['run','test:functions:emulator'])));
  step('04-ltd-actual-app',()=>saveResult('04-ltd-actual-app',npm(['run','test:ltd:actual-app'])));
  step('05-ltd-sync-browser',ltdSyncEvidence);
  const hook=path.join(root,'tests','fable-source-root-hook.js'),reviewRoot=fs.existsSync(path.join(fable.destination,'review'))?path.join(fable.destination,'review'):fable.destination,tests=path.join(reviewRoot,'tests-fable');
  const nonBlocking=check=>{check.classification='ORIGINAL_REVIEW_FIXTURE_LIMITATIONS_RETAINED';check.blocking=false;};
  step('06a-original-fable-gate',()=>saveResult('06a-original-fable-gate',run(process.execPath,['--require',hook,'--test',path.join(tests,'fable-gate.test.js')])),nonBlocking);
  step('06b-original-fable-gate2',()=>saveResult('06b-original-fable-gate2',run(process.execPath,['--require',hook,'--test',path.join(tests,'fable-gate2.test.js')])),nonBlocking);
  step('07-original-fable-g3',()=>saveResult('07-original-fable-g3',run(process.execPath,['--require',hook,path.join(tests,'g3.js')])));
  const rawResults=[
    copyResultIfPresent(path.join(root,'.ltd-actual-app-evidence','ltd-actual-app-browser-result.json'),'ltd-actual-app-browser-result.json'),
    copyResultIfPresent(path.join(root,'.ltd-sync-browser-evidence','paid-sync-browser-result.json'),'ltd-sync-browser-result.json')
  ].filter(Boolean);
  const end={branch:git(['branch','--show-current']),commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),trackedStatus:git(['status','--short','--untracked-files=no'])};
  const blockingFailures=checks.filter(check=>check.blocking!==false&&check.exitCode!==0);
  const summary={
    generatedAt:new Date().toISOString(),
    status:blockingFailures.length===0&&start.commit===end.commit&&start.tree===end.tree&&!end.trackedStatus?'PASS':'FAIL',
    identity:{start,end},
    originalFableReview:{outerSha256:fable.outerSha256,innerSha256:fable.innerSha256},
    checks,
    rawResults,
    note:'The original Fable exploratory gates are preserved verbatim. Their non-zero exit is non-blocking because the supplied README identifies fixture-baseline failures; the corrected g3 probe and all product-owned gates remain blocking.',
  };
  fs.writeFileSync(path.join(output,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(`LTD_FABLE_REREVIEW_EVIDENCE_${summary.status} commit=${end.commit} tree=${end.tree}`);
  for(const check of checks)console.log(`${check.status} exit=${check.exitCode} ${check.name}${check.blocking===false?' (original exploratory fixture; non-blocking)':''}`);
  if(summary.status!=='PASS')process.exitCode=1;
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

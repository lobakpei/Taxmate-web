'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const JOBS={
 regression:{args:[npmCli,'test']},
 'rules-emulator':{args:['scripts/run-rules-emulator.js']},
 'functions-emulator':{args:['scripts/run-functions-emulator.js']},
 'retention-emulator':{args:['scripts/run-functions-emulator.js'],env:{TAXMATE_RETENTION_TEST_ONLY:'1'}},
 'shared-receipt-emulator':{args:['scripts/run-functions-emulator.js'],env:{TAXMATE_RECEIPT_TEST_ONLY:'1'}},
 'retention-browser':{args:['scripts/run-ltd-actual-app-browser.js'],env:{TAXMATE_RETENTION_BROWSER_ONLY:'1'}},
 'actual-app':{args:['scripts/run-ltd-actual-app-browser.js']},
 'paid-sync':{args:['scripts/run-paid-sync-browser.js']},
 'account-isolation':{args:['scripts/run-account-isolation-browser.js']},
 'first-sync':{args:['scripts/run-onboarding-connected-browser.js','--first-sync-only']},
 'auth-once':{args:['scripts/run-onboarding-connected-browser.js','--auth-once-only']},
 'sync-runtime':{args:['scripts/run-sync-runtime-browser.js']},
 'ltd-sync':{args:['scripts/run-ltd-sync-browser.js']},
 'source-hosting':{args:['scripts/check-ltd-completion-source.js']}
};
function sourceHashes(){const result=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);return Object.fromEntries([...new Set(result.stdout.split('\0').filter(Boolean))].sort().filter(p=>!p.startsWith('.ltd-statutory-evidence-')).map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));}
function main(){
 const at=process.argv.indexOf('--job'),names=process.argv.includes('--all')?Object.keys(JOBS):at>=0?[process.argv[at+1]]:process.argv.includes('--browser')?['actual-app']:['regression'];
 if(names.some(n=>!JOBS[n]))throw new Error('Choose an explicit supported verification job');
 const out=fs.mkdtempSync(path.join(root,'.ltd-statutory-evidence-')),before=sourceHashes(),results=[];
 for(const name of names){
  const spec=JOBS[name],env={...process.env};delete env.TAXMATE_RETENTION_TEST_ONLY;delete env.TAXMATE_RETENTION_BROWSER_ONLY;delete env.TAXMATE_RECEIPT_TEST_ONLY;
  Object.assign(env,spec.env||{},Object.fromEntries(['TAXMATE_LTD_ACTUAL_APP_EVIDENCE','TAXMATE_PAID_SYNC_EVIDENCE','TAXMATE_ACCOUNT_ISOLATION_EVIDENCE','TAXMATE_ONBOARDING_EVIDENCE','TAXMATE_SYNC_RUNTIME_EVIDENCE'].map(key=>[key,path.join(out,name)])));
  console.log('Running '+name+'; evidence '+out);const startedAt=new Date().toISOString(),run=spawnSync(process.execPath,spec.args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,env});
  fs.writeFileSync(path.join(out,name+'.log'),String(run.stdout||'')+String(run.stderr||''));results.push({name,command:[process.execPath,...spec.args],startedAt,completedAt:new Date().toISOString(),exitCode:run.status,signal:run.signal,error:run.error?.message||null});console.log(name+': '+(run.status===0?'PASS':'FAIL'));
  if(run.status!==0)break;
 }
 const after=sourceHashes(),sourceUnchanged=JSON.stringify(before)===JSON.stringify(after),report={schemaVersion:2,createdAt:new Date().toISOString(),sourceHashes:before,sourceUnchanged,results,status:sourceUnchanged&&results.length===names.length&&results.every(r=>r.exitCode===0)?'PASS':'FAIL'};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,status:report.status,sourceUnchanged,results}));process.exitCode=report.status==='PASS'?0:1;
}
if(require.main===module)main();module.exports={JOBS,sourceHashes};

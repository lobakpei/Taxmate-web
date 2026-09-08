'use strict';
// Fresh synthetic Firestore only. Never imports existing data, runs Functions,
// starts Stripe CLI, reads a key, or contacts a payment provider.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {localToolEnvironment}=require('./local-tool-runtime');
const root=path.resolve(__dirname,'..'),project='demo-taxmate-release-closeout-20260908';
async function available(port){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});await new Promise(resolve=>server.close(resolve));}
async function main(){
  const option=process.argv.find(value=>value.startsWith('--output='));assert(option,'An explicit new evidence output directory is required');
  const out=path.resolve(option.slice('--output='.length));assert(!fs.existsSync(out),'Refusing to overwrite an existing run');
  await Promise.all([38580,38500,38550,38581].map(available));
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'cli-config'));
  const config=path.join(out,'firebase.json'),rules=path.join(out,'firestore.rules');
  fs.writeFileSync(rules,"rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }\n",{flag:'wx'});
  fs.writeFileSync(config,JSON.stringify({firestore:{rules},emulators:{firestore:{host:'127.0.0.1',port:38580,websocketPort:38581},hub:{host:'127.0.0.1',port:38500},logging:{host:'127.0.0.1',port:38550},ui:{enabled:false},singleProjectMode:true}},null,2),{flag:'wx'});
  const env={...localToolEnvironment(root).env};
  for(const key of Object.keys(env))if(/STRIPE|GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_TOKEN|FIREBASE_CONFIG|FIREBASE_AUTH_EMULATOR|FIREBASE_STORAGE_EMULATOR|FUNCTIONS_EMULATOR|FIRESTORE_EMULATOR|GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT|CLOUDSDK_AUTH/i.test(key))delete env[key];
  Object.assign(env,{GCLOUD_PROJECT:project,GOOGLE_CLOUD_PROJECT:project,FIRESTORE_EMULATOR_HOST:'127.0.0.1:38580',TAXMATE_CLOSEOUT_FIRESTORE:'1',XDG_CONFIG_HOME:path.join(out,'cli-config'),METADATA_SERVER_DETECTION:'none',CI:'true',FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true'});
  const firebase=path.join(root,'node_modules/firebase-tools/lib/bin/firebase.js');assert(fs.existsSync(firebase));
  const args=[firebase,'emulators:exec','--config',config,'--project',project,'--only','firestore','node --test --test-concurrency=1 tests/unit/billing-webhook-retry.test.js'];
  const command={at:new Date().toISOString(),project,root,out,executable:process.execPath,args,source:'synthetic read-only provider double',existingDataImported:false,providerWritesAuthorized:false};
  fs.writeFileSync(path.join(out,'COMMAND.json'),JSON.stringify(command,null,2),{flag:'wx'});
  const child=spawn(process.execPath,args,{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const log=fs.createWriteStream(path.join(out,'OUTPUT.log'),{flags:'wx'});let output='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk.toString();log.write(chunk);process.stdout.write(chunk);});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  await new Promise(resolve=>log.end(resolve));
  const number=name=>Number(output.match(new RegExp('^# '+name+' (\\d+)','m'))?.[1]||0);
  const result={finishedAt:new Date().toISOString(),exitCode:code,tests:number('tests'),pass:number('pass'),fail:number('fail'),skipped:number('skipped'),cancelled:number('cancelled'),backend:'fresh-isolated-firestore-emulator',provider:'non-network read-only double',actualStripeAutomaticRetry:'NOT_TESTED',project};
  fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify(result,null,2),{flag:'wx'});
  console.log(JSON.stringify(result));process.exitCode=code===0&&result.tests===12&&result.pass===12?0:1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

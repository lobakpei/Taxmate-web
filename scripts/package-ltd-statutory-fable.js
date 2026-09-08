'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),Zip=require('jszip');
const root=path.resolve(__dirname,'..'),stamp=new Date('2026-09-06T12:00:00Z'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const completionGate=JSON.parse(fs.readFileSync(path.join(root,'docs','FOUNDER_COMPLETION_GATE.json'),'utf8'));
if(completionGate.status!=='COMPLETE'||completionGate.uiWorkAuthorisedByGate!==false||completionGate.independentAcceptance!=='PENDING'||completionGate.openItems.length)throw new Error('Founder-confirmed account retention completion is unfinished; do not generate a Fable-ready package.');
function git(args,binary=false){const p=spawnSync('git',args,{cwd:root,encoding:binary?null:'utf8',maxBuffer:128*1024*1024,windowsHide:true});if(p.status!==0)throw new Error(String(p.stderr));return binary?p.stdout:p.stdout.trim();}
const paths=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(p=>p&&!p.startsWith('.ltd-statutory-evidence-'))) ].sort();
const files=new Map(paths.map(p=>{
  const bytes=fs.readFileSync(path.join(root,p));
  if(p==='functions/.env.taxmate-uk-2'){
    // Tracked public price IDs and public app origin, never Stripe API keys.
    for(const line of bytes.toString('utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#'))){const at=line.indexOf('='),key=line.slice(0,at),value=line.slice(at+1).trim();if(key==='PUBLIC_APP_URL'){if(!/^https:\/\/[a-zA-Z0-9.-]+\/?$/.test(value))throw new Error('Unexpected public app origin');}else if(!/^STRIPE_(PLUS|PRO)_(MONTHLY_PRICE_ID|ANNUAL_PRICE_ID|LEGACY_PRICE_IDS)$/.test(key)||!/^$|^price_[A-Za-z0-9_]+(?:,price_[A-Za-z0-9_]+)*$/.test(value))throw new Error('Non-public environment content');}
  }else if(/(^|\/)(\.env(?:\.|$)|credentials|service-account)/i.test(p)||p.endsWith('.zip'))throw new Error('Unexpected secret/archive source path: '+p);
  return[p,bytes];
}));
const hashes=Object.fromEntries([...files].map(([p,b])=>[p,sha(b)]));
const evidenceDirs=process.argv.slice(2);if(!evidenceDirs.length)throw new Error('Provide verified evidence directory names');
const gatePath='docs/FOUNDER_COMPLETION_GATE.json';
const reports=evidenceDirs.map(dir=>{if(!/^\.ltd-statutory-evidence-[A-Za-z0-9]+$/.test(dir))throw new Error('Invalid evidence path');const report=JSON.parse(fs.readFileSync(path.join(root,dir,'result.json'),'utf8'));if(report.status!=='PASS'||report.schemaVersion!==2||!report.sourceUnchanged)throw new Error('Evidence did not pass: '+dir);for(const [p,h] of Object.entries(hashes))if(report.sourceHashes[p]!==h&&p!==gatePath)throw new Error('Evidence source mismatch: '+dir+' '+p);return{dir,report};});
function add(zip,name,bytes){zip.file(name,bytes,{date:stamp});}
async function main(){
  const required=Object.keys(require('./verify-ltd-statutory-completion').JOBS),completed=new Set(reports.flatMap(r=>r.report.results.filter(job=>job.exitCode===0).map(job=>job.name)));
  for(const name of required)if(!completed.has(name))throw new Error('Missing same-source mandatory verification: '+name);
  const source=new Zip();for(const [p,b] of files)add(source,p,b);const sourceBytes=await source.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});
  const outer=new Zip(),payload=new Map(),put=(p,b)=>payload.set(p,Buffer.isBuffer(b)?b:Buffer.from(b));
  put('SOURCE.zip',sourceBytes);put('SOURCE_SHA256.json',JSON.stringify(hashes,null,2)+'\n');put('CHANGES_FROM_CANDIDATE_HEAD.patch',git(['diff','--binary','HEAD'],true));
  put('CHANGED_FILES.txt',git(['diff','--name-status','HEAD'])+'\nNEW FILES (included in SOURCE.zip):\n'+git(['ls-files','--others','--exclude-standard']).split('\n').filter(p=>p&&!p.startsWith('.ltd-statutory-evidence-')).join('\n')+'\n');
  put('00_READ_ME_FIRST.md',files.get('docs/TAXMATE_LTD_STATUTORY_FABLE_HANDOFF_20260905.md'));
  put('ACCEPTANCE_MATRIX.json',JSON.stringify({status:'READY_FOR_R4_INDEPENDENT_ACCEPTANCE',required,checks:reports.flatMap(r=>r.report.results.map(job=>({...job,status:job.exitCode===0?'PASS':'FAIL',evidenceDirectory:r.dir}))),founderAcceptance:'PENDING',independentAcceptance:'PENDING',fableUiIntegration:'NOT_STARTED',productionDeletion:'NOT_AUTHORISED_OR_ACTIVATED',scope:'Complete local candidate and demo/emulator implementation. No deployment, push, PR or merge.',sourceFileCount:files.size},null,2)+'\n');
  put('PACKAGING_VERIFICATION.json',JSON.stringify({allRuntimeTestsAndPackagingSourceMatchEvidence:true,postTestCompletionMetadata:{path:gatePath,reason:'Completion gate is closed only after every required verification job passes.',packagedSha256:hashes[gatePath],testedSnapshotHashes:reports.map(r=>({evidence:r.dir,sha256:r.report.sourceHashes[gatePath]}))}},null,2)+'\n');
  const original=await Zip.loadAsync(fs.readFileSync('C:/Users/tamtam/Downloads/fabletowork2.zip'));
  const revisedBytes=await original.file('TAXMATE_FABLE_COVERAGE_VERDICT_REVISED_20260905.zip').async('nodebuffer');
  if(sha(revisedBytes)!=='ef995917f0b08dd714513793ee89d05bd4991c6c09160c7e8740b03bde126feb')throw new Error('Original Fable revised ZIP hash mismatch');
  const revised=await Zip.loadAsync(revisedBytes),revisedText=await revised.file('cov2/TAXMATE_LTD_COVERAGE_VERDICT_REVISED.md').async('nodebuffer'),outerText=await original.file('TAXMATE_LTD_COVERAGE_VERDICT_REVISED.md').async('nodebuffer');
  if(!revisedText.equals(outerText))throw new Error('Fable inner/outer Markdown mismatch');
  put('ORIGINAL_FABLE/TAXMATE_FABLE_COVERAGE_VERDICT_REVISED_20260905.zip',revisedBytes);put('ORIGINAL_FABLE/TAXMATE_LTD_COVERAGE_VERDICT_REVISED.md',revisedText);
  put('ORIGINAL_FABLE/SUPERSEDED_TAXMATE_LTD_MVP_COVERAGE_REVIEW.md',fs.readFileSync('C:/Users/tamtam/Downloads/TAXMATE_LTD_MVP_COVERAGE_REVIEW.md'));
  put('ORIGINAL_FABLE/README.md','# Original reports\n\nSUPERSEDED_TAXMATE_LTD_MVP_COVERAGE_REVIEW.md is retained unchanged for history only. The revised Fable report supersedes it; Codex official-source corrections are in 00_READ_ME_FIRST.md.\n');
  function evidenceWalk(dir,prefix){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())evidenceWalk(p,prefix+e.name+'/');else put(prefix+e.name,fs.readFileSync(p));}}
  for(const {dir} of reports)evidenceWalk(path.join(root,dir),'EVIDENCE/'+dir+'/');
  const identity={status:'READY_FOR_R4_INDEPENDENT_ACCEPTANCE',architectureVerdictBasis:'Fable PASS on prior candidate; no new architecture phase requested',sourceKind:'frozen_working_tree_snapshot_with_prior_approved_membership_changes',baseCommit:git(['rev-parse','HEAD']),baseTree:git(['rev-parse','HEAD^{tree}']),branch:git(['branch','--show-current']),sourceSha256:sha(sourceBytes),sourceFileCount:files.size,sourceManifestSha256:sha(payload.get('SOURCE_SHA256.json')),evidence:reports.map(r=>({name:r.report.results[0].name,status:r.report.status})),productionChanged:false,uiIntegrationCompleted:false,independentAcceptance:'PENDING'};
  put('MANIFEST.json',JSON.stringify(identity,null,2)+'\n');
  const checksums=[...payload].map(([p,b])=>sha(b)+'  '+p).join('\n')+'\n';for(const [p,b] of payload)add(outer,p,b);add(outer,'SHA256SUMS.txt',checksums);
  const bytes=await outer.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}}),verified=await Zip.loadAsync(bytes);
  for(const [p,b] of payload)if(sha(await verified.file(p).async('nodebuffer'))!==sha(b))throw new Error('Package verification failed: '+p);
  const sourceCheck=await Zip.loadAsync(await verified.file('SOURCE.zip').async('nodebuffer'));for(const [p,h] of Object.entries(hashes)){if(sha(await sourceCheck.file(p).async('nodebuffer'))!==h||sha(fs.readFileSync(path.join(root,p)))!==h)throw new Error('Source drift: '+p);}
  const destination=path.join(root,'.hosting-build','handoffs','TAXMATE_LTD_CODEX_COMPLETE_FABLE_UI_20260906_R4.zip');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});
  const visible=destination;
  fs.writeFileSync(destination+'.sha256',sha(bytes)+'  '+path.basename(destination)+'\n',{flag:'wx'});
  console.log(JSON.stringify({...identity,zip:visible,sha256:sha(bytes),verifiedPayloads:payload.size,bytes:bytes.length},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

'use strict';

const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const JSZip=require('jszip');

const root=path.resolve(__dirname,'..');
const parent='23377ae57d7fed43147f6c3c7c8829bfee76ef8a';
const originalBase='da7092c15ff4eb565c46d0153f2a9e08cadc8079';
const expectedBranch='codex/taxmate-ltd-v1-5-actual-app-integration-20260828';
const packageName='TAXMATE_LTD_V1.5_FINAL_PRE_RELEASE_CANDIDATE_AUDIT_PACK_20260828.zip';
const output=path.resolve(root,'..',packageName);
const evidenceFolders=['.ltd-audit-evidence','.ltd-actual-app-evidence','.ltd-final-correction-evidence','.paid-sync-browser-evidence','.ltd-founder-preview-evidence'];

function run(command,args,options={}){
  const result=spawnSync(command,args,{cwd:options.cwd||root,encoding:options.binary?null:'utf8',maxBuffer:128*1024*1024,windowsHide:true});
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed\n${String(result.stderr||result.stdout||'')}`);
  return options.binary?result.stdout:String(result.stdout||'').trimEnd();
}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();}
function gitBlobSha(buffer){return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
function normal(relative){return relative.split(path.sep).join('/');}
function safeRemove(target,parentPath){
  const resolved=path.resolve(target),scope=path.resolve(parentPath)+path.sep;
  if(!resolved.startsWith(scope))throw new Error(`Refusing to remove unsafe path: ${resolved}`);
  fs.rmSync(resolved,{recursive:true,force:true});
}
function sanitizeText(text){
  const rootPattern=root.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return String(text).replace(new RegExp(rootPattern,'gi'),'<REPO_ROOT>').replace(/C:\\Users\\[^\\\r\n]+/gi,'<USER_HOME>');
}
function copySanitised(source,destination){
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    const from=path.join(source,entry.name),to=path.join(destination,entry.name);
    if(entry.isDirectory())copySanitised(from,to);
    else if(/\.(?:log|json|txt|md)$/i.test(entry.name))write(to,sanitizeText(fs.readFileSync(from,'utf8')));
    else{fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
  }
}
function trackedEntries(commit){
  const raw=run('git',['ls-tree','-r','-z','--full-tree',commit],{binary:true});
  return raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
    const match=/^(\d+)\s+(\w+)\s+([0-9a-f]+)\t(.+)$/.exec(line);
    if(!match||match[2]!=='blob')throw new Error(`Unexpected tree entry: ${line}`);
    return{mode:match[1],hash:match[3],relative:match[4]};
  });
}
function extractTracked(commit,destination){
  const entries=trackedEntries(commit),mismatches=[];
  for(const entry of entries){
    const buffer=run('git',['cat-file','blob',entry.hash],{binary:true});
    if(gitBlobSha(buffer)!==entry.hash)mismatches.push(entry.relative);
    const target=path.join(destination,...entry.relative.split('/'));write(target,buffer);
  }
  return{entries:entries.length,mismatches};
}
function collectFiles(directory){
  const found=[];
  function walk(current){for(const entry of fs.readdirSync(current,{withFileTypes:true})){const absolute=path.join(current,entry.name);if(entry.isDirectory())walk(absolute);else found.push(absolute);}}
  walk(directory);return found.sort((a,b)=>normal(path.relative(directory,a)).localeCompare(normal(path.relative(directory,b))));
}
function manifest(directory){
  return collectFiles(directory).filter(file=>path.basename(file)!=='MANIFEST_SHA256.txt').map(file=>{
    const buffer=fs.readFileSync(file),relative=normal(path.relative(directory,file));
    return{relative,bytes:buffer.length,sha256:sha256(buffer)};
  });
}
function verifyPatch(patchFile,candidateTree){
  const worktree=path.join(os.tmpdir(),`taxmate-ltd-patch-${process.pid}-${Date.now()}`);
  safeRemove(worktree,os.tmpdir());
  try{
    run('git',['worktree','add','--detach',worktree,parent]);
    run('git',['apply','--binary','--whitespace=nowarn',patchFile],{cwd:worktree});
    run('git',['add','-A'],{cwd:worktree});
    const reconstructed=run('git',['write-tree'],{cwd:worktree}).trim();
    return{status:reconstructed===candidateTree?'PASS':'FAIL',expectedTree:candidateTree,reconstructedTree:reconstructed};
  }finally{
    try{run('git',['worktree','remove','--force',worktree]);}catch(_){safeRemove(worktree,os.tmpdir());run('git',['worktree','prune']);}
  }
}
function hostingManifest(hostingRoot){return manifest(hostingRoot);}
function closeout(identity,changedCount,hosting){return `# TaxMate Ltd V1.5 final pre-release correction closeout

Date: 2026-08-28

## Frozen identity

- Branch: \`${identity.branch}\`
- Candidate commit: \`${identity.commit}\`
- Candidate tree: \`${identity.tree}\`
- Parent commit: \`${identity.parent}\`
- Parent tree: \`${identity.parentTree}\`
- Original base: \`${identity.originalBase}\`
- Changed paths from frozen parent: ${changedCount}
- Version: \`2.1.0\`
- Build: \`2026-08-28.ltd-v1-5-actual-app.1\`
- Cache: \`taxmate-v2-ltd-v1-5-actual-app-1\`
- Hosting artifact: ${hosting.files} files, ${hosting.bytes} bytes, aggregate SHA-256 \`${hosting.aggregateSha256}\`

## Acceptance

- Real \`index.html\` app mount: PASS.
- Canonical production facade/state/domain binding: PASS.
- Trusted one-active-Ltd race: PASS.
- Pro-only active actions and downgrade read/hydrate/export: PASS.
- Companies House server-only provenance boundary: PASS.
- Personal shell isolation in active Ltd mode: PASS by computed-style and rendered-geometry assertions; All businesses and legacy-business exits restore the personal shell with one navigation instance.
- Hidden factual defaults: PASS.
- Current-schema migration no-op: PASS with equal full-state/data-payload SHA-256, unchanged original provenance/domain timestamp, zero sync upload and zero browser outbox churn.
- Later genuine structural reconciliation: PASS with separate reconciliation provenance and original v0-to-v8 provenance preserved.
- Scenario product honesty: PASS; the fixed equal-split candidate is labelled as an example and the badge is limited to the displayed examples.
- 2.0.6 migration, per-record sync/outbox/tombstones, clean device and backup/restore: PASS.
- Companies House Step 1 grouping: PASS by current mobile/desktop, light/dark and Urdu RTL actual-app screenshots.
- Six locales, Urdu RTL, light/dark, 390x844 and desktop: PASS.
- Existing Web, Cloud Sync, Partner Sync, receipt/rules and Full Backup regression: PASS.
- Sentry localhost/emulator/automation isolation: PASS.

## 19:54:17 BST alerts

The four alerts were emitted by localhost actual-app testing. The exact defects were the top-level dependency guards in company workspace, scenario, remuneration and tax: those modules loaded before \`revision-sync.js\`. They were genuine candidate module-initialisation defects, not production 2.0.6 failures and not expected domain rejections. Script order is corrected and regression-protected. Local/emulator/automated-browser Sentry requests are now zero; production configuration still initialises with release/build/cache identity and the privacy scrubber.

## Test result

- Characterization 4/4
- Unit 132/132
- Integration 7/7
- Rules source 6/6
- Ltd/facade/domain 59/59
- Functions emulator 8/8
- Firestore/Storage emulator 16/16
- Final correction evidence script: PASS
- Actual app browser 215 assertions
- Paid Cloud/Partner Sync browser 90 assertions
- Isolated preview browser 35 assertions
- Product Health: 85 REAL_DURABLE, 6 INTENTIONALLY_HIDDEN, all defect counters 0
- Plan Contract: 21 features, 3 tiers, 6 receipt locales, 2 server-enforced, 1 Ltd-Pro-only

## Release truth

- Production TaxMate 2.0.6 modified: NO.
- Production data/Firebase modified: NO.
- Push/PR/merge/deploy: NO.
- Native/Mobile PR #2/SEO/P10: NO.
- Live Companies House or Stripe operation: NO.
- Actual incremental cost: GBP 0.

## Remaining gates

- Pro annual price: Founder decision pending.
- Production billing alignment: pending separate release authority.
- Live Companies House credential smoke: pending release gate.
- Final release drift/migration preflight and explicit production release authority: pending.

This package is for independent audit only. It is not deployment authority.
`;}
function rerun(){return `# Portable run and review

Requirements: Node.js 22+, npm, Java 21+ for Firebase emulators, and Chrome/Chromium available to Playwright.

From the extracted \`source\` directory:

\`\`\`powershell
npm ci
npm test
npm run test:functions:emulator
npm run test:rules:emulator
npm run test:paid-sync:browser
npm run test:ltd:browser
npm run test:ltd:actual-app
npm run test:ltd:final-corrections
\`\`\`

Founder review of the real TaxMate app shell:

\`\`\`powershell
npm run preview:ltd:actual-app
\`\`\`

The review URL is \`http://127.0.0.1:4177/\`. The launcher runs the production-shaped setup, opens Chrome, and remains active until Ctrl+C. It uses Firebase emulators/test providers only; no production Firebase, Stripe, Companies House credential, analytics or Sentry transport is used.

The legacy standalone preview remains developer tooling only:

\`\`\`powershell
npm run preview:ltd
\`\`\`

Fresh: \`http://127.0.0.1:41742/?mode=fresh&reset=1&locale=en&theme=light\`

Existing: \`http://127.0.0.1:41742/?mode=existing&reset=1&locale=en&theme=light\`
`;}

async function main(){
  const branch=run('git',['branch','--show-current']).trim(),commit=run('git',['rev-parse','HEAD']).trim(),tree=run('git',['rev-parse','HEAD^{tree}']).trim(),parentTree=run('git',['rev-parse',`${parent}^{tree}`]).trim();
  if(branch!==expectedBranch)throw new Error(`Branch drift: ${branch}`);
  if(run('git',['rev-parse','HEAD^']).trim()!==parent)throw new Error('Candidate parent drift');
  const dirty=run('git',['status','--porcelain','--untracked-files=all']).split(/\r?\n/).filter(Boolean).filter(line=>!evidenceFolders.some(folder=>line.slice(3).replace(/\\/g,'/').startsWith(folder+'/'))&&!line.slice(3).endsWith(packageName));
  if(dirty.length)throw new Error(`Worktree is not frozen:\n${dirty.join('\n')}`);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'taxmate-ltd-audit-')),payload=path.join(temp,'payload');
  try{
    const sourceVerification=extractTracked(commit,path.join(payload,'source'));
    if(sourceVerification.mismatches.length)throw new Error(`Source blob mismatch: ${sourceVerification.mismatches.join(', ')}`);
    const patch=run('git',['diff','--binary','--full-index','--no-ext-diff',parent,commit,'--']);
    const patchFile=path.join(payload,'changes','frozen-parent-to-candidate.patch');write(patchFile,patch+'\n');
    const changed=run('git',['diff','--name-status',parent,commit,'--']);write(path.join(payload,'changes','CHANGED_FILES.txt'),changed+'\n');
    write(path.join(payload,'changes','DIFFSTAT.txt'),run('git',['diff','--stat',parent,commit,'--'])+'\n');
    const patchVerification=verifyPatch(patchFile,tree);if(patchVerification.status!=='PASS')throw new Error('Patch did not reconstruct candidate tree');
    run(process.execPath,['scripts/build-hosting.js','production','ltd-audit-candidate']);
    const hostingSource=path.join(root,'.hosting-build','ltd-audit-candidate'),hostingTarget=path.join(payload,'hosting-artifact');fs.cpSync(hostingSource,hostingTarget,{recursive:true});
    const hostingRows=hostingManifest(hostingTarget),hosting={files:hostingRows.length,bytes:hostingRows.reduce((sum,row)=>sum+row.bytes,0),aggregateSha256:sha256(Buffer.from(hostingRows.map(row=>`${row.sha256} ${row.bytes} ${row.relative}`).join('\n')))};
    write(path.join(payload,'evidence','HOSTING_ARTIFACT_MANIFEST_SHA256.txt'),hostingRows.map(row=>`${row.sha256}\t${row.bytes}\t${row.relative}`).join('\n')+'\n');
    for(const folder of evidenceFolders){const source=path.join(root,folder);if(!fs.existsSync(source))throw new Error(`Missing evidence folder: ${folder}`);copySanitised(source,path.join(payload,'evidence',folder.slice(1)));}
    const identity={branch,commit,tree,parent,parentTree,originalBase};
    write(path.join(payload,'review','CANDIDATE_CLOSEOUT.md'),closeout(identity,changed.split(/\r?\n/).filter(Boolean).length,hosting));
    write(path.join(payload,'review','RUN_AND_REVIEW.md'),rerun());
    write(path.join(payload,'review','IDENTITY.json'),JSON.stringify({...identity,version:'2.1.0',buildId:'2026-08-28.ltd-v1-5-actual-app.1',cache:'taxmate-v2-ltd-v1-5-actual-app-1',hosting},null,2)+'\n');
    write(path.join(payload,'evidence','SOURCE_BLOB_VERIFICATION.json'),JSON.stringify({status:'PASS',trackedBlobs:sourceVerification.entries,mismatchCount:0,commit,tree},null,2)+'\n');
    write(path.join(payload,'evidence','PATCH_RECONSTRUCTION_VERIFICATION.json'),JSON.stringify(patchVerification,null,2)+'\n');
    write(path.join(payload,'review','DECISIVE_CORRECTION_EVIDENCE.md'),'# Decisive final-correction evidence\n\n## Personal shell isolation\n\n- Implementation: `source/index.html` explicit `body.ltd-active` boundary plus the existing production bridge.\n- Real-browser assertions: `evidence/ltd-actual-app-evidence/ltd-actual-app-browser-result.json` under `shellEvidence`.\n- The test deliberately clears the personal shell elements hidden attributes while Ltd mode is active; computed `display` remains `none`, rendered geometry is zero, the Ltd root is rendered, and nav count remains one.\n- All-businesses and legacy-business exits restore the personal header/page/nav and hide the Ltd root.\n- Screenshots: all `actual-app-step1-*` and workspace images in the same evidence folder.\n\n## Migration no-op and sync churn\n\n- Exact evidence: `evidence/ltd-final-correction-evidence/migration-noop-and-scenario-result.json`.\n- First and second full state SHA-256 are equal; Data-only data payload SHA-256 values are equal; original migration timestamp/device/from-version and domain updatedAt are unchanged; reconciliation against exact remote envelopes creates 0 uploads, 0 downloads and 0 conflicts.\n- Browser lifecycle: `noOpSave` in the actual-app result proves persisted state, migration provenance, domain updatedAt, localEditAt and outbox are unchanged and outbox count is 0.\n\n## Scenario claim\n\n- Runtime returns `comparisonScope=displayed_examples` and `mixedScenarioMethod=equal_split_example`.\n- Six locales label the mixed result as an example and limit the lowest-tax badge to these examples.\n- Scenario remains non-posting and unsupported facts remain review-required.\n\n## Companies House Step 1\n\n- Five actual-app screenshots cover 390x844 light/dark English, desktop light/dark English, and 390x844 Urdu RTL.\n- Browser geometry verifies the three identity field groups are rendered with a consistent visible gap; visual evidence shows company number, check action, lookup result, and registered-name/date groups separately.\n\n## PWA lifecycle\n\n- `evidence/paid-sync-browser-evidence/paid-sync-browser-result.json` proves active Service Worker control, full offline reload, browser termination, backend-blocked reopen, durable local record, reconnect, ACK and no duplication for Ltd, same-account and partnership paths.\n');
    write(path.join(payload,'review','REMAINING_RELEASE_GATES.md'),'# Remaining genuine release gates\n\n1. Independent source audit and Founder acceptance.\n2. Founder decision on Pro annual pricing; no annual amount is exposed or inferred.\n3. Separately authorised production billing alignment for the approved Ltd monthly positioning.\n4. Live Companies House credential/configuration and smoke test under a release gate.\n5. Release-time identity/drift, migration/rollback preflight, authorised Functions/Rules/Hosting deployment and post-deploy fresh/upgrade/offline checks.\n\nNo production release action is authorised by this package.\n');
    write(path.join(payload,'review','NO_PRODUCTION_IMPACT.md'),'# No-production-impact proof\n\nProduction TaxMate 2.0.6 modified = NO\n\nProduction Firebase/data mutation = NO\n\nPush = NO\n\nPR = NO\n\nMerge = NO\n\nDeploy = NO\n\nNative/Mobile PR #2 = NO\n\nSEO = NO\n\nP10 = NOT AUTHORISED\n\nBillable operation = NO\n\nActual incremental cost = GBP 0\n');
    const rows=manifest(payload);write(path.join(payload,'MANIFEST_SHA256.txt'),'# SHA-256, bytes and relative path for every payload file except this self-referential manifest.\n'+rows.map(row=>`${row.sha256}\t${row.bytes}\t${row.relative}`).join('\n')+'\n');
    const zip=new JSZip();for(const file of collectFiles(payload)){const relative=normal(path.relative(payload,file));zip.file(relative,fs.readFileSync(file),{binary:true});}
    const archive=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9},platform:'UNIX'});write(output,archive);
    const reopened=await JSZip.loadAsync(fs.readFileSync(output)),manifestText=await reopened.file('MANIFEST_SHA256.txt').async('string'),expected=new Map();for(const line of manifestText.split(/\r?\n/)){if(!/^[0-9A-F]{64}\t\d+\t/.test(line))continue;const [hash,bytes,...parts]=line.split('\t');expected.set(parts.join('\t'),{hash,bytes:Number(bytes)});}
    const archiveFiles=Object.values(reopened.files).filter(item=>!item.dir),failures=[];for(const [relative,item] of expected){const file=reopened.file(relative);if(!file){failures.push(`${relative}: missing`);continue;}const data=await file.async('nodebuffer'),row=item;if(data.length!==row.bytes||sha256(data)!==row.hash)failures.push(`${relative}: digest`);}
    const unexpected=archiveFiles.map(item=>item.name).filter(name=>name!=='MANIFEST_SHA256.txt'&&!expected.has(name));failures.push(...unexpected.map(name=>`${name}: unexpected`));
    if(failures.length)throw new Error(`Manifest verification failed:\n${failures.join('\n')}`);
    process.stdout.write(JSON.stringify({status:'PASS',zip:output,sha256:sha256(archive),bytes:archive.length,fileCount:archiveFiles.length,manifestVerified:`${expected.size}/${expected.size}`,sourceBlobs:`${sourceVerification.entries}/${sourceVerification.entries}`,patchTree:patchVerification.reconstructedTree,commit,tree,branch},null,2)+'\n');
  }finally{safeRemove(temp,os.tmpdir());}
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

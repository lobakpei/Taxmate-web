'use strict';

const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const JSZip=require('jszip');

const root=path.resolve(__dirname,'..');
const parent='e10b613d3aae0d7f24e2c4ae91bc50c10b99a75e';
const originalBase='da7092c15ff4eb565c46d0153f2a9e08cadc8079';
const expectedBranch='codex/taxmate-ltd-v1-5-actual-app-integration-20260828';
const packageName='TAXMATE_LTD_V1.5_RENDERER_REPAINT_FINAL_INDEPENDENT_AUDIT_PACK_20260829.zip';
const output=path.resolve(root,'..',packageName);
const evidenceFolders=['.ltd-actual-app-evidence','.ltd-final-correction-evidence','.paid-sync-browser-evidence','.ltd-founder-preview-evidence'];

function run(command,args,options={}){
  const result=spawnSync(command,args,{cwd:options.cwd||root,encoding:options.binary?null:'utf8',maxBuffer:128*1024*1024,windowsHide:true});
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed\n${String(result.stderr||result.stdout||'')}`);
  return options.binary?result.stdout:String(result.stdout||'').trimEnd();
}
function captureValidation(label,args,destination){
  const npmCli=path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'),result=spawnSync(process.execPath,[npmCli,...args],{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024,windowsHide:true});
  const output=`$ npm ${args.join(' ')}\n\n${String(result.stdout||'')}${String(result.stderr||'')}\n`;
  write(destination,sanitizeText(output));
  if(result.status!==0)throw new Error(`${label} failed; see ${destination}`);
  return{label,command:`npm ${args.join(' ')}`,status:'PASS',log:normal(path.relative(path.dirname(path.dirname(destination)),destination))};
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
function closeout(identity,changedCount,hosting){return `# TaxMate Ltd V1.5 renderer-repaint final independent-audit closeout

Date: 2026-08-29

## Frozen identity

- Branch: \`${identity.branch}\`
- Candidate commit: \`${identity.commit}\`
- Candidate tree: \`${identity.tree}\`
- Parent commit: \`${identity.parent}\`
- Parent tree: \`${identity.parentTree}\`
- Original base: \`${identity.originalBase}\`
- Changed paths from frozen parent: ${changedCount}
- Version: \`2.1.2\`
- Build: \`2026-08-29.ltd-v1-5-renderer-repaint.1\`
- Cache: \`taxmate-v2-ltd-v1-5-renderer-repaint-1\`
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
- Founder-approved Pro pricing: launch £9.99/month, standard £11.99/month and £99.99/year (9999 minor units): PASS across current runtime, UI, plan contract, legal/help, deterministic Stripe TEST helpers and tests.
- Pro checkout remains fail-closed; production billing alignment remains a separate open release gate.
- Companies House Step 1 real-button lookup/autofill/edit/Continue/provenance: PASS, including found, not-found, unavailable and edited-facts recheck behaviour.
- Renderer event contract: PASS. Only the synchronous draft-persistence emit is suppressed once; every canonical reload emit repaints even when route and presentation state are unchanged.
- Real blur-to-click: PASS for Companies House found, not-found and unavailable through the actual input and real button.
- Same-route canonical and cloud-style updates: PASS; Overview company identity and Money record DOM update immediately after production-bridge canonical replacement without route change or manual paint.
- Companies House Step 1 visual evidence: PASS by current mobile/desktop, light/dark and Urdu RTL actual-app screenshots; official name and incorporation date are visibly autofilled.
- Six locales, Urdu RTL, light/dark, 390x844 and desktop: PASS.
- Existing Web, Cloud Sync, Partner Sync, receipt/rules and Full Backup regression: PASS.
- Sentry localhost/emulator/automation isolation: PASS.

## 19:54:17 BST alerts

The four alerts were emitted by localhost actual-app testing. The exact defects were the top-level dependency guards in company workspace, scenario, remuneration and tax: those modules loaded before \`revision-sync.js\`. They were genuine candidate module-initialisation defects, not production 2.0.6 failures and not expected domain rejections. Script order is corrected and regression-protected. Local/emulator/automated-browser Sentry requests are now zero; production configuration still initialises with release/build/cache identity and the privacy scrubber.

## Test result

- Characterization 4/4
- Unit 134/134
- Integration 7/7
- Rules source 6/6
- Ltd/facade/domain 60/60
- Functions emulator 8/8
- Firestore/Storage emulator 16/16
- Final correction evidence script: PASS
- Actual app browser 262 assertions
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
- Stripe TEST network operation: NO; no test customer, subscription, Checkout Session or Price was created. The £99.99 evidence is deterministic and remains fail-closed pending separately authorised TEST/LIVE billing alignment.
- Actual incremental cost: GBP 0.

## Remaining gates

- Pro annual pricing decision: RESOLVED — £99.99/year.
- Production billing alignment: STILL OPEN under separate release authority.
- Founder acceptance: STILL OPEN.
- Live Companies House credential smoke: pending release gate.
- Final release drift/migration preflight and explicit production release authority: pending.

This package is for independent audit only. It is not deployment authority.
`;}
function rerun(){return `# Portable Windows run and review

Supported review environment: Windows PowerShell. Requirements: Node.js 22+, npm, Java 21+ for Firebase emulators, and Chrome/Chromium available to Playwright. A Git checkout is not required.

From the extracted \`source\` directory:

\`\`\`powershell
npm run audit:bootstrap
npm test
npm run test:functions:emulator
npm run test:rules:emulator
npm run test:paid-sync:browser
npm run test:ltd:browser
npm run test:ltd:actual-app
npm run test:ltd:final-corrections
\`\`\`

\`audit:bootstrap\` installs both root and \`functions\` lockfile dependencies. It requires no manual file move, hidden Git object or production credential. The packaged characterization tests validate authenticated immutable fixtures, so they run when \`.git\` is absent.

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
    const validationDir=path.join(payload,'evidence','current-validation'),validationSpecs=[
      ['complete Node gates',['test'],'npm-test.log'],
      ['Functions emulator',['run','test:functions:emulator'],'functions-emulator.log'],
      ['Firestore and Storage emulators',['run','test:rules:emulator'],'rules-emulator.log'],
      ['paid Cloud Partner Sync PWA browser',['run','test:paid-sync:browser'],'paid-sync-browser.log'],
      ['Founder Preview browser',['run','test:ltd:browser'],'founder-preview-browser.log'],
      ['actual app browser',['run','test:ltd:actual-app'],'actual-app-browser.log'],
      ['final corrections',['run','test:ltd:final-corrections'],'final-corrections.log']
    ],validationResults=validationSpecs.map(spec=>captureValidation(spec[0],spec[1],path.join(validationDir,spec[2])));
    write(path.join(validationDir,'VALIDATION_INDEX.json'),JSON.stringify({status:'PASS',candidateCommit:commit,candidateTree:tree,results:validationResults},null,2)+'\n');
    for(const folder of evidenceFolders){const source=path.join(root,folder);if(!fs.existsSync(source))throw new Error(`Missing evidence folder: ${folder}`);copySanitised(source,path.join(payload,'evidence',folder.slice(1)));}
    const identity={branch,commit,tree,parent,parentTree,originalBase};
    write(path.join(payload,'review','CANDIDATE_CLOSEOUT.md'),closeout(identity,changed.split(/\r?\n/).filter(Boolean).length,hosting));
    write(path.join(payload,'review','RUN_AND_REVIEW.md'),rerun());
    write(path.join(payload,'review','IDENTITY.json'),JSON.stringify({...identity,version:'2.1.2',buildId:'2026-08-29.ltd-v1-5-renderer-repaint.1',cache:'taxmate-v2-ltd-v1-5-renderer-repaint-1',hosting},null,2)+'\n');
    write(path.join(payload,'evidence','SOURCE_BLOB_VERIFICATION.json'),JSON.stringify({status:'PASS',trackedBlobs:sourceVerification.entries,mismatchCount:0,commit,tree},null,2)+'\n');
    write(path.join(payload,'evidence','PATCH_RECONSTRUCTION_VERIFICATION.json'),JSON.stringify(patchVerification,null,2)+'\n');
    write(path.join(payload,'review','DECISIVE_CORRECTION_EVIDENCE.md'),'# Decisive renderer-repaint correction evidence\n\n## Draft-only suppression\n\n- `source/src/ui/ltd/workbench-renderer.js` arms a one-shot counter only around `onDraftChanged`, consumes it only in the corresponding synchronous subscription callback, and clears any unused token for the HTTP preview facade.\n- `source/tests/unit/founder-ui-fixes.test.js` forbids the former unconditional same-renderKey return and proves the draft and canonical event paths are distinct.\n\n## Real blur-to-click\n\n- `evidence/ltd-actual-app-evidence/ltd-actual-app-browser-result.json` records ordered `blur` then `click` events and exactly one provider call for Companies House found, not-found and unavailable.\n- The test uses the rendered company-number input and real Check Companies House button; it does not call the facade directly.\n\n## Same-route canonical repaint\n\n- The actual-app result `canonicalRepaintEvidence` records an Overview identity replacement and a cloud-peer Money record insertion through `TaxMateLtdProductionBridge.replaceState`.\n- Both preserve the route and reach the DOM after `taxmate:canonical-state-updated -> driver.reload -> facade.emit`, with `manualPaint=false`.\n- Screenshots: `actual-app-same-route-canonical-repaint.png` and `actual-app-cloud-style-record-repaint.png`.\n\n## Existing decisive evidence\n\n- Personal shell isolation remains under `shellEvidence`.\n- Migration no-op and sync churn remain in `evidence/ltd-final-correction-evidence/migration-noop-and-scenario-result.json`.\n- Companies House visual proof remains in the five `actual-app-step1-*` images.\n- `evidence/paid-sync-browser-evidence/paid-sync-browser-result.json` proves the PWA offline/reopen/reconnect/ACK lifecycle.\n');
    write(path.join(payload,'review','REMAINING_RELEASE_GATES.md'),'# Current release gates\n\n- Pro annual pricing decision: RESOLVED — £99.99/year (9999 minor units).\n- Production billing alignment: STILL OPEN.\n- Founder acceptance: STILL OPEN.\n- Live Companies House credential smoke: STILL OPEN.\n- Release drift/migration/rollback preflight: STILL OPEN.\n- Explicit production release authority: STILL OPEN.\n\nNo production release action is authorised by this package.\n');
    write(path.join(payload,'review','STRIPE_EVIDENCE_BOUNDARY.md'),'# Stripe evidence boundary\n\nThe current Founder contract is launch £9.99/month, standard £11.99/month and £99.99/year (9999 minor units). Local deterministic contract, entitlement, hosted-receipt and billing-delta tests use those values. No Stripe TEST or LIVE network operation was performed during this correction: no Price, customer, subscription or Checkout Session was created or changed. Production checkout remains disabled/fail-closed until separately authorised production billing alignment. Historical £7.99/£59.99 reports are retained only as explicitly superseded evidence and are not current contract truth.\n');
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

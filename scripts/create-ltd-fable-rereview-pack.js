'use strict';

const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const JSZip=require('jszip');

const root=path.resolve(__dirname,'..');
const evidenceRoot=path.join(root,'.ltd-fable-rereview-evidence');
const baseCommit='b7c1eff0729077ebb6d6a155e02248f9e49c57e1';
const baseTree='cb586256f04e95e19a260d20c9c555d9fb93473b';
const originalProductBase='aa530e962fcd2e54202b83ee9f3c13d56239318c';
const expectedBranch='codex/taxmate-ltd-self-filing-completion';
const packageName='TAXMATE_LTD_FABLE_ARCHITECTURE_REREVIEW_20260905.zip';
const fixedZipDate=new Date('2026-09-05T12:00:00.000Z');

function run(command,args,options={}){
  const result=spawnSync(command,args,{cwd:options.cwd||root,encoding:options.binary?null:'utf8',maxBuffer:128*1024*1024,windowsHide:true});
  if(result.status!==0)throw new Error(`${command} ${args.join(' ')} failed\n${String(result.stderr||result.stdout||'')}`);
  return options.binary?result.stdout:String(result.stdout||'').trimEnd();
}
function sha256(value){return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();}
function normal(relative){return relative.split(path.sep).join('/');}
function safeReset(target){
  const resolved=path.resolve(target),scope=path.resolve(os.tmpdir())+path.sep;
  if(!resolved.startsWith(scope)||!path.basename(resolved).startsWith('taxmate-ltd-fable-rereview-'))throw new Error(`Unsafe staging path: ${resolved}`);
  fs.rmSync(resolved,{recursive:true,force:true});fs.mkdirSync(resolved,{recursive:true});
}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
function copyFile(source,destination){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);}
function copyTree(source,destination){
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    const from=path.join(source,entry.name),to=path.join(destination,entry.name);
    if(entry.isDirectory())copyTree(from,to);else copyFile(from,to);
  }
}
function collectFiles(directory){
  const files=[];(function walk(current){for(const entry of fs.readdirSync(current,{withFileTypes:true})){const item=path.join(current,entry.name);if(entry.isDirectory())walk(item);else files.push(item);}})(directory);
  return files.sort((a,b)=>normal(path.relative(directory,a)).localeCompare(normal(path.relative(directory,b))));
}
function trackedEntries(commit){
  const raw=run('git',['ls-tree','-r','-z','--full-tree',commit],{binary:true});
  return raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
    const match=/^(\d+)\s+(\w+)\s+([0-9a-f]+)\t(.+)$/.exec(line);
    if(!match||match[2]!=='blob')throw new Error(`Unexpected tree entry: ${line}`);
    return{mode:match[1],hash:match[3],relative:match[4]};
  });
}
async function createExactSourceZip(commit,destination){
  const source=new JSZip();
  for(const entry of trackedEntries(commit)){
    const bytes=run('git',['cat-file','blob',entry.hash],{binary:true});
    source.file(entry.relative,bytes,{date:fixedZipDate,unixPermissions:parseInt(entry.mode,8)});
  }
  const archive=await source.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9},platform:'UNIX'});
  write(destination,archive);
}
function founderRequirements(){return `# Founder 第一手要求與權限邊界\n\n以下係今次工作嘅最高產品要求。Fable 原有報告係驗收意見，唔會取代 Founder 呢啲要求。\n\n## Founder 原話\n\n> 「重做嘅係 Ltd 嘅 part，你唔好亂咁搞出邊嘅嘢。」\n\n> 「target audience 係一啲佢肯學、但唔想俾錢會計師，寧願自己搞嘅人。」\n\n> 「你只係需要填一啲最簡單、每一日都發生緊嘅支出同收入。我幫你喺後邊搞掂晒，然後話俾你聽：你而家要報稅 step by step 係點做、邊個位填、邊一個 number。」\n\n> 「A 係基本；B 先係我真正心入面想做嘅事。」\n\n> 「入邊啲按鈕全部都要係講人話，唔可以有過多術語；要 balance 專業度同親民度。」\n\n> 「講到尾，最後都係用戶自己承擔返自己嘅稅務責任。」\n\n## 轉成可驗收要求\n\n1. 只重做 Ltd 架構；Self-employed 必須 byte-for-byte 保持不變。\n2. 最低能力唔止係記帳：要由日常輸入算到公司年度數字，並清楚輸出申報步驟、填邊個位及填邊個數。\n3. 用戶一定會輸入錯，所以 invoice、bill、付款、資產、折舊及銀行對數必須可以安全修正或作廢；帳簿與業務記錄要一齊變，並保留追查記錄。\n4. 軟件係 self-filing 輔助工具，唔係直接向 HMRC 或 Companies House 提交，亦唔會假扮已經申報。\n5. Fable 今輪只驗架構。未獨立 PASS 前，唔可以開始 UI。若架構 PASS，先按 Direction A 為已完成架構著衫，所有文案必須講人話。\n`}
function handoff(identity,changedPaths,evidence){return `# 00 — TaxMate Ltd 架構重驗交接\n\n日期：2026-09-05\n\n- 狀態：**READY_FOR_FABLE_ARCHITECTURE_REREVIEW**\n- **UI_WORK_AUTHORISED_BY_CODEX: NO**\n- 只有 Fable 完成獨立 source + adversarial review 並判定 PASS，UI gate 先可以轉 YES。\n\n## 先讀順序\n\n1. \`FOUNDER_REQUIREMENTS_FIRST_HAND.md\` — Founder 第一手要求，最高產品權限。\n2. \`CODEX_ARCHITECTURE_RESPONSE.md\` — 今次實際補咗乜及點驗。\n3. \`ORIGINAL_FABLE_REVIEW/\` — Fable 上一輪 NEEDS_WORK 報告、測試及原始結果。\n4. \`EVIDENCE/\` — 鎖定候選版本嘅完整重跑證據。\n5. \`SOURCE/\` — 候選版本完整 editable source ZIP、binary patch、changed-file mapping。\n\n## 鎖定身份\n\n- Branch: \`${identity.branch}\`\n- Candidate commit: \`${identity.commit}\`\n- Candidate tree: \`${identity.tree}\`\n- Correction starting commit: \`${baseCommit}\`\n- Correction starting tree: \`${baseTree}\`\n- Original product base: \`${originalProductBase}\`\n- Changed paths: ${changedPaths}\n- Evidence status: \`${evidence.status}\`\n\n## 權限與範圍真相\n\n- Ltd engine / facade / tests / emulator evidence：有改。\n- UI / Direction A 視覺整合：冇做。\n- Self-employed：冇改。\n- Production / Firebase data / push / PR / merge / deploy：全部冇做。\n- 呢個 ZIP 只授權 Fable 做獨立架構重驗，唔係 UI、merge 或 deploy 授權。\n\n## Fable 要回覆\n\n請逐項回覆 A8、A9、A11、A12，同時重驗原本 PASS 嘅 A1–A7、A10 有冇 regression。最後必須明確輸出：\n\n- \`OVERALL_ARCHITECTURE_VERDICT: PASS | NEEDS_WORK | BLOCKED\`\n- \`UI_WORK_AUTHORISED_BY_GATE: YES | NO\`\n\n若任何一項未通過，請保持 UI=NO，列出可重現輸入、預期、實際、source 位置及最小修正要求，退回 Codex。\n`}
function architectureResponse(){return `# Codex 對 Fable NEEDS_WORK 嘅逐項回應\n\n## 一句人話\n\n上一版係「記到數，但未完整帶人去報；打錯資料亦未有完整修正路」。今版補嘅正正係呢兩半：**由帳簿去到申報指引**，以及**改錯而唔整亂盤數**。呢個仍然係架構候選，未獲 Fable PASS，唔代表 UI 可以開工。\n\n## A8 — 由數字去到「填邊度、填幾多」\n\nSelf-filing pack schema 升到 v2，engine 直接輸出而唔靠 UI 猜：\n\n- Companies House micro-entity profit-and-loss rows 同 balance-sheet rows；每行有顯示名稱、人話解釋、figure、source IDs 同 where-to-enter。\n- CT600 boxes 145、155、160、165、315、430、435、440、475、525、690 嘅 box details。\n- Tax computation：會計利潤 → 加返折舊 → 減 AIA → 應課稅利潤 → Corporation Tax。\n- Filing steps：先執齊資料、對數、核對年度、準備 accounts/CT computation/CT600，再列 Companies House、HMRC、繳稅 deadline。\n- 四個明確 confirmation gate；資料不足、年度未完、未對數或 unsupported balances 未確認，一律唔會扮 ready。\n- 每個數保留 source IDs，可追返 invoice、bill、asset、payment、reconciliation 及 journal。\n\n## A11 — 用戶打錯資料可以真修正\n\n加入專用、可審計、原子式 lifecycle：\n\n- Sales invoice：修正、作廢；已收付款可以反轉。\n- Supplier bill：修正、作廢；已付付款可以反轉。\n- Fixed asset：修正、作廢；首次即時付款與其後付款都可反轉。\n- Depreciation：可反轉。\n- Bank reconciliation：可作廢，保留 tombstone，亦會即時令 year-end readiness 失效。\n\n每次修正都要求 reason 同 evidence；journal reversal、replacement record、業務記錄同 audit history 一次過保存。相同 correction ID + 相同內容重試會返回原結果；相同 ID 夾帶唔同內容會 fail closed。已付款金額超過新 invoice/bill 金額、日期早過已發生付款、或用 generic correction 偷改 company-book event，都會拒絕而且零 mutation。\n\n## A12 — AIA 上限與 reserve\n\n- Simple AIA period ceiling 會按 period 長度計：完整月份按 months/12，非整月按 days/365，最多 24 個月。\n- 所有同一 period claim 合計唔可以超過 period ceiling。\n- Company-year balance sheet 加入 profit-and-loss reserve 同 shareholders' funds，並由 journal 重計。\n\n## A9 — 真雲端同步證據\n\nFirestore/Storage Rules emulator、Functions emulator、actual-app browser 同 paid cross-device sync 已喺同一鎖定 commit/tree 重跑。Paid sync 結果內亦記錄 repository identity，避免用舊結果冒充。\n\n## 明確 MVP 邊界\n\n今版**唔包括**：直接向 HMRC/Companies House 提交、iXBRL 產生、invoice PDF/email/收款、automatic bank feed/CSV ingestion、資產出售計算、複雜 capital allowances。遇到超出 simple self-filing case 嘅資料會標示需要核對，唔會造數。\n\n## Codex-owned 回歸證據\n\n- Full npm regression suite：PASS。\n- Ltd suite：74/74 PASS。\n- Rules emulator：18/18 PASS。\n- Functions emulator：8/8 PASS。\n- Actual app：1,453 assertions PASS。\n- Paid Cloud/Partner Sync：105 assertions PASS。\n- Product Health：REAL_DURABLE=85、INTENTIONALLY_HIDDEN=6，其餘 defect counters 全 0。\n- Self-employed source：由 correction starting commit 到 candidate 冇改。\n\n原 Fable exploratory tests 原封不動重跑；其 README 已註明部分 fixture-baseline assertions 係設計上會 fail。包內保留原始 non-zero log，冇改測試去扮綠。\`g3.js\` 同所有產品自有 gate 仍然係 blocking evidence。\n`}

function architectureResponseForRereview(){
  const base=architectureResponse()
    .replace('Firestore/Storage Rules emulator、Functions emulator、actual-app browser 同 paid cross-device sync 已喺同一鎖定 commit/tree 重跑。Paid sync 結果內亦記錄 repository identity，避免用舊結果冒充。','Firestore/Storage Rules emulator、Functions emulator、actual-app browser 同 focused Ltd cross-device sync 已喺同一鎖定 commit/tree 重跑。Ltd sync 結果內亦記錄 repository identity，避免用舊結果冒充。')
    .replace('- Paid Cloud/Partner Sync：105 assertions PASS。','- Focused Ltd Cloud Sync：真瀏覽器完成 Device A 上傳、乾淨 Device B 還原、離線保存、關閉重開及重新 ACK；實際 assertions 數見 result JSON。');
  return base+`\n## 今輪發現、但按 Founder 指令冇越界修改\n\n完整舊有 paid/partner aggregate test 顯示：Partnership 成員離開後，server membership 已刪，但背景 rehydration 可把該成員本機 business 嘅 \`syncCode\` 加返。呢個係 Partnership 範圍，唔係 Ltd engine 或 Ltd cloud collection；今輪冇修改生產 Partnership 邏輯。Fable 應以專用 Ltd sync gate 驗 A9，亦應保留呢項為另一次獲授權先處理嘅 out-of-scope observation。\n`;
}

(async()=>{
  if(!fs.existsSync(path.join(evidenceRoot,'SUMMARY.json')))throw new Error('Run npm run evidence:ltd-fable-rereview first');
  const evidence=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'SUMMARY.json'),'utf8'));
  if(evidence.status!=='PASS')throw new Error(`Evidence status is ${evidence.status}, expected PASS`);
  const identity={branch:run('git',['branch','--show-current']),commit:run('git',['rev-parse','HEAD']),tree:run('git',['rev-parse','HEAD^{tree}']),status:run('git',['status','--short','--untracked-files=no'])};
  if(identity.branch!==expectedBranch)throw new Error(`Wrong branch: ${identity.branch}`);
  if(identity.status)throw new Error(`Tracked worktree is not clean:\n${identity.status}`);
  if(identity.commit!==evidence.identity.end.commit||identity.tree!==evidence.identity.end.tree)throw new Error('Evidence identity does not match current candidate');
  const commonGit=path.resolve(root,run('git',['rev-parse','--git-common-dir']));
  const output=path.join(path.dirname(commonGit),packageName),staging=path.join(os.tmpdir(),`taxmate-ltd-fable-rereview-${process.pid}`);
  safeReset(staging);
  try{
    const changeList=run('git',['diff','--name-status',baseCommit,identity.commit]),changedPaths=changeList?changeList.split(/\r?\n/).length:0;
    write(path.join(staging,'00_READ_ME_FIRST_TAXMATE_LTD_FABLE_REREVIEW_20260905.md'),handoff(identity,changedPaths,evidence));
    write(path.join(staging,'FOUNDER_REQUIREMENTS_FIRST_HAND.md'),founderRequirements());
    write(path.join(staging,'CODEX_ARCHITECTURE_RESPONSE.md'),architectureResponseForRereview());
    write(path.join(staging,'SOURCE','CHANGED_FILES.txt'),changeList+'\n');
    write(path.join(staging,'SOURCE','BASE_TO_CANDIDATE.patch'),run('git',['diff','--binary','--full-index',baseCommit,identity.commit],{binary:true}));
    await createExactSourceZip(identity.commit,path.join(staging,'SOURCE','TAXMATE_LTD_CANDIDATE_COMPLETE_EDITABLE_SOURCE.zip'));
    copyTree(path.join(evidenceRoot,'original-fable-review'),path.join(staging,'ORIGINAL_FABLE_REVIEW'));
    copyTree(evidenceRoot,path.join(staging,'EVIDENCE'));
    fs.rmSync(path.join(staging,'EVIDENCE','original-fable-review'),{recursive:true,force:true});
    for(const [source,name] of [
      [path.join(root,'.ltd-actual-app-evidence','ltd-actual-app-browser-result.json'),'ltd-actual-app-browser-result.json'],
      [path.join(root,'.ltd-sync-browser-evidence','paid-sync-browser-result.json'),'ltd-sync-browser-result.json']
    ])if(fs.existsSync(source))copyFile(source,path.join(staging,'EVIDENCE',name));
    const manifest=collectFiles(staging).map(file=>`${sha256(fs.readFileSync(file))}  ${normal(path.relative(staging,file))}`).join('\n')+'\n';
    write(path.join(staging,'SHA256SUMS.txt'),manifest);
    const zip=new JSZip();
    for(const file of collectFiles(staging))zip.file(normal(path.relative(staging,file)),fs.readFileSync(file),{date:fixedZipDate});
    const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9},platform:'DOS'});
    fs.writeFileSync(output,bytes);
    const check=await JSZip.loadAsync(bytes),expected=collectFiles(staging).map(file=>normal(path.relative(staging,file))).sort(),actual=Object.values(check.files).filter(item=>!item.dir).map(item=>item.name).sort();
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('ZIP member verification failed');
    console.log(`FABLE_REREVIEW_PACKAGE_READY path=${output}`);
    console.log(`SHA256=${sha256(bytes)} files=${actual.length} bytes=${bytes.length}`);
    console.log(`candidate_commit=${identity.commit} candidate_tree=${identity.tree}`);
  }finally{safeReset(staging);fs.rmSync(staging,{recursive:true,force:true});}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});

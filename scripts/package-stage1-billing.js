'use strict';
// Local artefact assembly only. No provider, Git remote or deployment action.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync,spawnSync}=require('node:child_process'),Zip=require('../vendor/jszip-3.10.1.min');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url');
const repairBaseline='caf77db0fcdb59c89a80469c8825c40b8f06d6b8';
const rejected='fca77419b5bdc06a6c2bbc0150e6dbccc45dc1c1';
const root=path.resolve(__dirname,'..'),base='89cabd69b9e119b544ec6acbe033bc5cead2a515';
const [billingId,uiId]=process.argv.slice(2);if(!/^[a-z0-9]+$/.test(billingId||'')||!/^[a-z0-9]+$/.test(uiId||''))throw Error('Expected two local normal-run identifiers');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const billingDir=path.join(root,'.hosting-build/billing-normal-runs',billingId),uiDir=path.join(root,'.hosting-build/review01-r01-r05-runs',uiId),billing=json(path.join(billingDir,'result.json')),ui=json(path.join(uiDir,'normal-use-result.json'));
if(billing.status!=='COMPLETE_NORMAL_CHECKS'||ui.status!=='PASS'||ui.variant!=='FULL_NORMAL'||!ui.sourceUnchanged)throw Error('Normal checks not complete');
if(git(['status','--porcelain']))throw Error('Commit the isolated candidate before packaging');
const identity=json(path.join(billingDir,'source-identity.json'));if(!identity.unchanged)throw Error('Billing run changed its source');
const commit=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']),stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),name='TAXMATE_STAGE1_BILLING_B031_WEB_LOGO_'+stamp;
const out=path.join(root,'.hosting-build/deliveries',name),zipPath=out+'.zip';if(fs.existsSync(out)||fs.existsSync(zipPath))throw Error('New delivery path already exists');fs.mkdirSync(out,{recursive:true});
const put=(p,v)=>{const file=path.join(out,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,v);};
const copy=(from,to)=>{const dest=path.join(out,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(from,dest,{recursive:true,errorOnExist:true,force:false});};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function main(){
  const source=execFileSync('git',['archive','--format=zip',commit],{cwd:root,maxBuffer:64*1024*1024});put('SOURCE.zip',source);const archive=await Zip.loadAsync(source),tracked=git(['ls-tree','-r','--name-only',commit]).split(/\r?\n/),sourceHashes={},normalised=[];
  const evidenceHashes=json(path.join(billingDir,'source-after.json'));const sensitive=[];
  for(const file of tracked){const entry=archive.file(file);if(!entry)throw Error('Missing source archive entry '+file);const b=await entry.async('nodebuffer'),working=read(path.join(root,file));sourceHashes[file]=sha(b);if(evidenceHashes[file]!==sha(working))throw Error('Final billing evidence/source mismatch '+file);if(ui.sourceHashes[file]!==sha(working))throw Error('Final UI evidence/source mismatch '+file);
    if(!b.equals(working)){if(b.toString('utf8').replace(/\r\n/g,'\n')!==working.toString('utf8').replace(/\r\n/g,'\n'))throw Error('Archive differs from tested source '+file);normalised.push(file);}
    if(/(?:^|\/)(?:\.secret\.local|\.env\.local|credentials\.json|serviceAccount[^/]*\.json)$/i.test(file))sensitive.push(file+': forbidden local file');
    if(b.length<3*1024*1024&&!b.includes(0)){const text=b.toString('utf8');for(const rule of [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/,/\bya29\.[A-Za-z0-9_-]{25,}/])if(rule.test(text))sensitive.push(file+': credential-shaped content');}
  }
  if(Object.values(archive.files).filter(e=>!e.dir).length!==tracked.length)throw Error('Unexpected archive entries');if(sensitive.length)throw Error('Review source credential scan: '+sensitive.join(', '));
  put('SOURCE_SHA256.json',JSON.stringify(sourceHashes,null,2));put('CHANGES.diff',execFileSync('git',['diff','--binary',base,commit],{cwd:root,maxBuffer:32*1024*1024}));put('CHANGED_FILES.txt',git(['diff','--name-status',base,commit])+'\n');
  put('B01_B04_REPAIR.diff',execFileSync('git',['diff','--binary',rejected,commit],{cwd:root,maxBuffer:32*1024*1024}));put('B01_B04_CHANGED_FILES.txt',git(['diff','--name-status',rejected,commit])+'\n');
  put('B031_REPAIR.diff',execFileSync('git',['diff','--binary',repairBaseline,commit],{cwd:root,maxBuffer:32*1024*1024}));put('B031_CHANGED_FILES.txt',git(['diff','--name-status',repairBaseline,commit])+'\n');
  copy(path.resolve(root,'../../independent-stage1-billing-recheck-20260907/INDEPENDENT_RECHECK_20260907_R2.md'),'INDEPENDENT_REJECTION/INDEPENDENT_RECHECK_20260907_R2.md');
  copy(path.join(root,'.hosting-build/deliveries/TAXMATE_STAGE1_BILLING_20260907T104431Z_RECHECK_V2/SOURCE.zip'),'REFERENCES/B031_REJECTED_SOURCE.zip');
  copy(billingDir,'NORMAL/BILLING_FINAL');copy(uiDir,'NORMAL/UI_R01_R05_FINAL');
  for(const dir of fs.readdirSync(path.join(root,'.hosting-build/review01-r01-r05-runs'))){if(dir!==uiId&&/^[a-z0-9]+$/.test(dir))copy(path.join(root,'.hosting-build/review01-r01-r05-runs',dir),'HISTORY/UI/'+dir);}
  for(const dir of fs.readdirSync(path.join(root,'.hosting-build/billing-normal-runs'))){if(dir!==billingId&&/^[a-z0-9]+$/.test(dir))copy(path.join(root,'.hosting-build/billing-normal-runs',dir),'HISTORY/BILLING/'+dir);}
  for(const file of tracked.filter(p=>p.startsWith('docs/STAGE1_BILLING_')))copy(path.join(root,file),'REPORTS/'+path.basename(file));
  const authority=path.resolve(root,'../../founder-launch-plan-20260906');for(const file of ['STAGE1_STEPS2_3_AUTHORISATION_20260907.md','BILLING_THREE_DECISIONS_APPROVED_20260907.md','WEB_LOGO_HOME_AND_NEXT_STEP_PREPARATION_20260907.md'])copy(path.join(authority,file),'AUTHORITY/'+file);
  copy(path.join(root,'.hosting-build/review01-handoff/SOURCE.zip'),'REFERENCES/R01_PRE_CORRECTION_SOURCE.zip');
  copy(path.resolve(root,'../../independent-stage1-billing-audit-20260907/INDEPENDENT_BILLING_REVIEW_20260907.md'),'INDEPENDENT_REJECTION/INDEPENDENT_BILLING_REVIEW_20260907.md');
  copy(path.join(root,'.hosting-build/deliveries/TAXMATE_STAGE1_BILLING_20260907T094951Z/SOURCE.zip'),'REFERENCES/REJECTED_BILLING_SOURCE.zip');
  const unit=spawnSync(process.execPath,['--test','tests/unit/billing-funded-normal.test.js'],{cwd:root,encoding:'utf8'});put('NORMAL/unit.tap',unit.stdout+unit.stderr);if(unit.status!==0)throw Error('Focused unit check failed');const unitCount=Number(unit.stdout.match(/# tests (\d+)/)?.[1]),unitPass=Number(unit.stdout.match(/# pass (\d+)/)?.[1]);if(!unitCount||unitCount!==unitPass)throw Error('Unit count mismatch');
  const syntax=[];for(const file of git(['diff','--name-only',base,commit]).split(/\r?\n/).filter(p=>/\.js$/.test(p))){const run=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});syntax.push({file,exitCode:run.status,output:run.stdout+run.stderr});if(run.status!==0)throw Error('Syntax check failed '+file);}put('NORMAL/syntax.json',JSON.stringify(syntax,null,2));
  const buildName='stage1-billing-package-'+stamp.toLowerCase(),build=path.join(root,'.hosting-build',buildName);if(fs.existsSync(build))throw Error('Build destination already exists');const built=spawnSync(process.execPath,['scripts/build-hosting.js','production',buildName],{cwd:root,encoding:'utf8'});put('NORMAL/build.log',built.stdout+built.stderr);if(built.status!==0)throw Error('Local build failed');copy(build,'HOSTING_BUILD_NOT_DEPLOYED');
  const manifest={status:'PENDING_GENERAL_INDEPENDENT_REVIEW',statusZh:'待一般獨立再核對',repairBaseline,repair:'B03.1 + WEB_LOGO_HOME',nativeApps:'NOT_RUN_NO_NATIVE_PROJECT',previousRepairBaseline:rejected,overviewPngPages:12,createdAt:new Date().toISOString(),base,commit,tree,branch:git(['branch','--show-current']),sourceFiles:tracked.length,sourceZipSha256:sha(source),testedWorkingTreeEquivalent:true,gitArchiveLineEndingNormalisation:normalised,billing:{run:billingId,assertions:billing.assertions.length,captures:billing.captures.length,sourceUnchanged:identity.unchanged,provider:'LOCAL_PROTOCOL_DOUBLE_NOT_STRIPE_TEST'},ui:{run:uiId,assertions:ui.assertions.length,captures:ui.captures.length,afterCaptures:ui.captures.filter(c=>c.phase==='after'||String(c.file||'').startsWith('after/')).length,beforeCaptures:ui.captures.filter(c=>c.phase==='before'||String(c.file||'').startsWith('before/')).length,sourceUnchanged:ui.sourceUnchanged},unit:unitPass+'/'+unitCount,build:'LOCAL_ONLY_NOT_DEPLOYED',stripeTest:'NOT_RUN',legacyExistingData:'NOT_RUN_EXCLUDED_FAULT_INJECTION',independentReview:'PENDING',founderAcceptance:'PENDING',release:'NOT_AUTHORISED',secretScan:{highConfidenceSourceCredentialMatches:0,localEnvAndProfilesExcluded:true,publicTrackedPriceIdsRetained:true}};
  put('MANIFEST.json',JSON.stringify(manifest,null,2));
  const pages=[
  [
    "Web Logo：鍵盤返回主頁",
    "保留品牌外觀；桌面及手機瀏覽器沿用 Home 導航。明暗鍵盤焦點可見，原生 App 未實測。",
    [
      "NORMAL/UI_R01_R05_FINAL/after/logo-header-zh-light-390.png",
      "NORMAL/UI_R01_R05_FINAL/after/logo-company-zh-dark-390.png"
    ]
  ],
  [
    "稅務及助理",
    "R03／R05 原有操作和金額表達。",
    [
      "NORMAL/UI_R01_R05_FINAL/after/04-tax.png",
      "NORMAL/UI_R01_R05_FINAL/after/10-assistant.png"
    ]
  ],
  [
    "公司及年度",
    "原有真 App 公司入口和年度工作區。",
    [
      "NORMAL/UI_R01_R05_FINAL/after/05-company.png",
      "NORMAL/UI_R01_R05_FINAL/after/08-company-year.png"
    ]
  ],
  [
    "銀行及文件包",
    "R02／R04 原有功能保留。",
    [
      "NORMAL/UI_R01_R05_FINAL/after/09-bank-match.png",
      "NORMAL/UI_R01_R05_FINAL/after/pack-first-screen.png"
    ]
  ],
  [
    "B01 付款與抵扣顏色",
    "只有金額按性質用紅／綠；日期及文字保持中性。",
    [
      "NORMAL/BILLING_FINAL/02-payment-history.png",
      "NORMAL/BILLING_FINAL/review-upgrade-quote-zh-light-390.png"
    ]
  ],
  [
    "B02／B04 中文取消與首頁",
    "同一正常取消狀態；主層簡短，資料說明按需展開。",
    [
      "NORMAL/BILLING_FINAL/review-home-canceled-zh-light-390.png",
      "NORMAL/BILLING_FINAL/review-cancel-confirmation-zh-light-390.png"
    ]
  ],
  [
    "B03 審批前看實際權益後果",
    "真 CS 影響區域：已用抵扣升級全退為 Free；另有獨立 Plus 則保留。完整原頁亦在 NORMAL。",
    [
      "NORMAL/BILLING_FINAL/review-cs-upgrade-free-impact.png",
      "NORMAL/BILLING_FINAL/review-cs-independent-plus-impact.png"
    ]
  ],
  [
    "B03.1 年費全退：批准及處理中",
    "退款後日期來自本宗條件式預覽，並非目前年費到期日；未宣稱已退款或刪資料。",
    [
      "NORMAL/BILLING_FINAL/b031-annual-only-approved.png",
      "NORMAL/BILLING_FINAL/b031-annual-only-refund_pending.png"
    ]
  ],
  [
    "B03.1 年費退款後：核實結果",
    "左：年費全退後 Free 與本年度保留日。右：原有其他已付 Pro 權益保留。",
    [
      "NORMAL/BILLING_FINAL/b031-annual-only-refunded.png",
      "NORMAL/BILLING_FINAL/b031-other-grant-refunded.png"
    ]
  ],
  [
    "B03.1 成功結果不可沿用舊預測",
    "同宗退款：處理中原預測為 Free；期間另購有效 Pro，確認成功後顯示實際 Pro 結果。",
    [
      "NORMAL/BILLING_FINAL/b031-grant-after-submission-refund_pending.png",
      "NORMAL/BILLING_FINAL/b031-grant-after-submission-refunded.png"
    ]
  ],
  [
    "六語言／明暗及英文合約標籤",
    "必要付款前披露及同意保留；英文法律文本未獲六語言法律核准。",
    [
      "NORMAL/BILLING_FINAL/locale-zh-light-precontract.png",
      "NORMAL/BILLING_FINAL/locale-ur-dark-precontract.png"
    ]
  ],
  [
    "Logo 離頁與未儲存內容",
    "公司與 ownership 內頁沿用放棄／繼續編輯提示；按確認前不離頁或改已存資料。",
    [
      "NORMAL/UI_R01_R05_FINAL/after/logo-inline-onOpenCompanyEdit-prompt.png",
      "NORMAL/UI_R01_R05_FINAL/after/logo-inline-onOpenOwnershipChange-prompt.png"
    ]
  ]
];
  const body=pages.map(([title,note,images],i)=>{for(const file of images)if(!fs.existsSync(path.join(out,file)))throw Error('Missing overview screenshot '+file);return`<section><p class="number">${i+1} / 12 · 本機一般流程</p><h1>${esc(title)}</h1><p>${esc(note)}</p><div class="images">${images.map(f=>`<figure><a href="${f}"><img src="${f}" alt="${esc(title)}"></a><figcaption><a href="${f}">首屏／區域縮圖；長頁下方請開啟原圖</a></figcaption></figure>`).join('')}</div><footer>待一般獨立再核對 · NOT STRIPE TEST · NOT DEPLOYED</footer></section>`;}).join('');
  put('01_REAL_APP_12_PAGE_OVERVIEW.html',`<!doctype html><html lang="zh-HK"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TaxMate Stage 1 — 12 頁真 App</title><style>body{margin:0;background:#eee;font:16px system-ui,sans-serif;color:#14202b}section{box-sizing:border-box;max-width:1060px;min-height:1040px;margin:24px auto;background:white;padding:32px;break-after:page}h1{font-size:26px}.number,footer,figcaption{color:#566476;font-size:13px}.images{display:flex;gap:24px;justify-content:center;align-items:flex-start}figure{margin:8px 0;max-width:100%;flex:1;text-align:center}figure>a:first-child{display:block;height:790px;overflow:hidden}figure img{max-height:790px;max-width:100%;width:auto;height:auto;object-fit:contain}figure img[src$="02-payment-history.png"],figure img[src*="review-home-canceled-"]{max-height:none}footer{margin-top:20px}@media print{body{background:white}section{margin:0;max-width:none;height:270mm;min-height:0}img{max-height:215mm}@page{size:A4 portrait;margin:12mm}}</style>${body}</html>`);
  fs.mkdirSync(path.join(out,'OVERVIEW_PNG'));
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'});
  try{const page=await browser.newPage({viewport:{width:1200,height:1100},deviceScaleFactor:1});await page.route(/^https?:/,r=>r.abort());await page.goto(pathToFileURL(path.join(out,'01_REAL_APP_12_PAGE_OVERVIEW.html')).href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const audit=await page.evaluate(()=>({sections:document.querySelectorAll('section').length,images:document.images.length,allImagesLoaded:[...document.images].every(i=>i.complete&&i.naturalWidth>0),overflow:document.documentElement.scrollWidth>innerWidth}));
    if(audit.sections!==12||!audit.allImagesLoaded||audit.overflow)throw Error('Overview rendering incomplete');
    for(let n=0;n<12;n++)await page.locator('section').nth(n).screenshot({path:path.join(out,'OVERVIEW_PNG',String(n+1).padStart(2,'0')+'.png')});
    put('OVERVIEW_PNG/render-check.json',JSON.stringify({...audit,pngPages:12,source:'actual App captures, no redraw'},null,2));
  }finally{await browser.close();}
  put('00_READ_ME_FIRST.md',`# TaxMate 第一階段 ②＋③候選交付\n\n狀態：**待一般獨立再核對**。未部署，未獲 Founder 驗收。\n\n來源 commit \`${commit}\`，tree \`${tree}\`。SOURCE.zip ${tracked.length} 檔，SHA-256 \`${sha(source)}\`。完整源碼、差異、逐檔 hash、原始一般檢查及曾失敗紀錄均在本包。Git archive 的換行正規化另列 MANIFEST，已核對與被測工作檔內容相等。\n\n一般檢查：billing ${billing.assertions.length} 項／${billing.captures.length} 圖；原有 R01–R05 UI ${ui.assertions.length} 項／${ui.captures.length} 圖；聚焦單元檢查 ${unitPass}/${unitCount}。這些都是工程自查，不是獨立 QA。\n\n先看 OVERVIEW_PNG 的 12 頁 PNG（另有 HTML 索引），再閱讀 REPORTS 的狀態及發行關卡。NORMAL 是最終紀錄；HISTORY 是舊輪次及失敗記錄，不可當作最終版本證據。REFERENCES 中的 ZIP 是舊 UI 比較輸入，不是目前源碼。\n\n**仍未通過的關卡：** Stripe TEST、精確 2.1.18 既有資料 split-cloud 回歸、商戶地理地址及完整消費者披露／法定表格／耐久確認審核、一般獨立核對、Founder 驗收。舊回歸腳本包含本輪明確禁止的故障注入，因此沒有執行。新建乾淨資料不能替代。\n\n供應商 TEST 沒有接 production 作替代；沒有收退真錢、改正式訂閱／價格、CS 電郵、push／PR／merge／部署、排程、手機工程、新任務或 sub-agent。HOSTING_BUILD_NOT_DEPLOYED 只是本機組建。款項操作預設關閉；本機示範配置不在 SOURCE.zip。\n\n本包續修 B03.1，另加入 Founder 同輪批准的 Web Logo 返回主頁；B01／B02／B04 已通過的修正保持。原 R2 獨立核對為 NEEDS_WORK，未代填再核對 PASS。下一步只準備，未授權發行或新階段實作。B031_REPAIR.diff 對照 caf77db0；B01_B04_REPAIR.diff 保留較早差異；CHANGES.diff 對照原 R01–R05 基線。\n\nAUTHORITY 的 7 September go／ok 是本輪權限邊界。SOURCE 中舊 release／READY 文件是歷史資料，不代表本輪驗收，也不授權下一階段。\n`);
  const sums=Object.fromEntries(files(out).map(f=>[path.relative(out,f).replaceAll('\\','/'),sha(read(f))]));put('SHA256SUMS.txt',Object.entries(sums).sort().map(([p,h])=>h+'  '+p).join('\n')+'\n');
  const outer=new Zip();for(const file of files(out))outer.file(path.relative(out,file).replaceAll('\\','/'),read(file));const bytes=await outer.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});fs.writeFileSync(zipPath,bytes,{flag:'wx'});const opened=await Zip.loadAsync(bytes);for(const [p,h]of Object.entries(sums))if(sha(await opened.file(p).async('nodebuffer'))!==h)throw Error('Outer archive hash mismatch '+p);console.log(JSON.stringify({out,zipPath,zipSha256:sha(bytes),files:Object.values(opened.files).filter(e=>!e.dir).length,...manifest},null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});

# TaxMate LTD — Codex 收口 → Fable 一次 UI 整合

## R4 — Admission 暫存副本生命週期收口；待獨立驗收

新版完整包：`TAXMATE_LTD_CODEX_COMPLETE_FABLE_UI_20260906_R4.zip`。保留 R1／R2／R3 及獨立 audit 原件，R3 跨帳戶隔離成果保留。本次補正獨立重現的過期／中斷待提交副本讀取及資料清理缺口；不是新產品階段或重做架構評審。

- ordinary entries、app/meta、LTD batch、shared admission 的 direct-read 現在受 expiry、retention／epoch、reset 及相應 membership／Pro pending-write 權限控制。Plus 原有 LTD 歷史讀取不變；過期許可不能繞過正本規則。
- 成功／取消有事件清理，放棄／失敗／程序中斷有持久文件巡查恢復。刪副本及對應 pins 為 token-fenced transaction，舊清理不會刪新 permit，亦不會解除仍有效的圖片引用保護。不另複製財務資料、不使用全站鎖、不假設 TTL 已啟用。
- 年度 retention 必須先物理清理應移除的暫存副本；此步失敗就保留 failed／retry，不能宣稱 complete。退出合夥及帳戶重設一併涵蓋，其他成員的帳簿、有效引用、待提交資料及新年度合法儲存保留。
- 精確 lifecycle 盤點、API、事件、復原路徑及 collection-group UID index 設定見 `docs/R4_ADMISSION_LIFECYCLE.md`。Fable 接同一份 source 的真實狀態／權限，不得改成直接刪 Storage、假成功或全體 partners 同意。
- 全部原有 14 組 gates 在最終 R4 source 重新執行；精確數字與原始證據見 `FINAL_QA_SUMMARY_R4.md` 和 `ACCEPTANCE_MATRIX.json`。只在測試後更新完成 gate metadata，差異 hash 在 `PACKAGING_VERIFICATION.json` 披露。
- `FOUNDER_ACCEPTANCE: PENDING`、`INDEPENDENT_ACCEPTANCE: PENDING`、`FABLE_UI_INTEGRATION: NOT_STARTED`；UI 開始 gate 不自行開啟。沒有 push／PR／merge／deploy、正式帳戶／資料操作或 production scheduler 啟動。Cloud delivery／IAM／正式 rollout／真人驗收未做；原年度 purge demo-only guard 保留。

## R3 — 歷史收據範圍隔離、持久恢復（由 R4 補足暫存資料 lifecycle）

新包：`TAXMATE_LTD_CODEX_COMPLETE_FABLE_UI_20260906_R3.zip`。R1、R2 及獨立 audit 原件保留不變。R2 的 PASS 是其歷史測試結果，但漏驗 A 清理故障阻塞 B；不得沿用為 R3 驗收結論。本包所有必需 gates 必須按 R3 source 重跑，結果見 `ACCEPTANCE_MATRIX.json` 及 `FINAL_QA_SUMMARY_R3.md`。

- **不再有全站寫入鎖。** 每張圖片有獨立 server-owned object 狀態。A 正常清理／失敗／逾時／程序中斷，不會鎖住 B 的普通、Free 自僱、獨立合夥、meta、LTD 或其他收據操作。
- 因舊資料可在任意巢狀欄位、URL、LTD evidence 內引用圖片，真實同步寫入先經 `prepareReceiptWrite` 檢查完整 payload，保留該圖片的短期引用，再在原 Firestore 權限檢查下原子寫入並消耗一次性許可。不能省略、偽造、重播或以 client metadata 取代。LTD ownership 歷史用同一 batch 許可，保留原本整批原子提交，不可拆散其一致性。
- 原 Pro／實際 membership／retention 條件沒有放寬。許可不是記帳或刪除授權。過期／降級／退出成員後，即使已取得許可，真正提交仍須被 Rules 拒絕；offline outbox 留待重新連線取得有效許可，不可先破壞 bytes。
- 每次清理先持久寫入 `receiptCleanupJobs` 及 wakeup，然後才可能刪 Storage。generation-specific deletion intent 必須先持久保存；逾時、ACK 遺失、重複／並行 worker 或原程序消失，都只恢復同一個 generation，不會盲目到時解鎖或刪除新物件。
- `runReceiptCleanupJob` 為獨立持久工作提供事件重試；`recoverReceiptCleanupJobs` 的 source 定義為每五分鐘巡查。巡查分頁、五路並行及持久游標避免單一失敗項拖住其他項。**本交接沒有部署或啟動任何雲端排程**；本機只驗證 job／事件／恢復引擎，雲端 Scheduler delivery、IAM、長期故障告警仍未驗證，日後 rollout 需另行批准。
- Retention 的單張收據清理失敗會留下持久 retry，年度記錄處理可完成並帶 `receipt_cleanup_pending` 警告及 pending 數量，讓新年度 Free 記帳繼續。這不等於所有雲端圖片已刪；UI 必須忠實顯示警告。原 `runRetentionPurgeDemo` guard 保留；正式年度 purge 沒有授權或啟動。
- Fable 只可在取得明確開始批准後接本包 source 的真實狀態／事件；不可把上述接線換回直接 Storage delete、假成功或全站 lock。此刻 `FABLE_UI_INTEGRATION: NOT_STARTED`、`FOUNDER_ACCEPTANCE: PENDING`、`INDEPENDENT_ACCEPTANCE: PENDING`。Codex 完成本機修正不等同獨立接納，UI gate 不自行開啟。
- 此更新涉及 App／Rules／Functions 協定；未更新的 R2 writer 不能繞過 admission。沒有獲准作 production rollout，不能只部署其中一層。所有 local outbox／備份需保留，正式版本升級及 provider 行為待日後批准後驗證。

Firebase 原子操作依據：[Transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)、[Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)。實際安全結果以本包真 demo emulator 測試為準，不以文件取代測試。

## R2 — 歷史共用交易／收據刪除權限修正（已由 R3 取代）

新版檔名為 `TAXMATE_LTD_CODEX_COMPLETE_FABLE_UI_20260906_R2.zip`。原 20260906 ZIP（SHA-256 `846b8edca18f720b118a8611045306e727a1701a6e94d8c0f595195915fa3c15`）保留不變，屬歷史快照；不得把舊 13 項 PASS 冒充 R2 證據。R2 必須通過全部原有 gates 及新增 shared-receipt-emulator，並逐檔對齊本包 SOURCE_SHA256.json。

- 非 LTD 共用 partnership ledger：有實際 Pro、membership 和 retention 寫入權限的成員可以刪共用交易或移除／替換收據，其他成員同步見到結果。**不要求全體 partners 同意**。
- 沒有實際 ledger 寫入權限：交易 Delete 和 lightbox 收據 Delete 都隱藏；已開啟畫面／confirmation 的 handler 仍重新讀取伺服器權限。不能只靠 UI 或 metadata 做保護。
- Free 普通／self-employed 帳簿仍可刪自己的交易及收據。Free 不獲新增付費 upload／Receipt Pack／PDF 權限；原有 backup／restore 合約保持。
- 新上載／替換用全新 immutable object name。Firestore 獲接受的交易移除／tombstone 才觸發收據清理；離線 queued／拒絕寫入不會先刪圖片。圖片仍被另一有效普通、共用或 LTD 記錄引用時保留。
- Storage 客戶端 overwrite／delete 一律拒絕，合法個人刪除透過 committed tombstone／reference-safe callable 完成，並非禁用 Free 個人刪除功能。`sharedProtected` 不再是權限依據。
- `receiptObjects` 及 `receiptCleanupControl` 是不可由客戶端寫入的伺服器清理控制，不是另一份帳簿。掃描及刪檔期间暫停接受含記錄的寫入，原 outbox 保留並重試；讀取不受影響。失敗保持 fail-closed，只能重試同一檔案，不能直接清除鎖去冒險刪檔。
- `cleanupPersonalEntryReceipt`／`cleanupSharedEntryReceipt`／`cleanupReceipt` 僅為此 candidate 的待發行實作。沒有部署、啟動 production 清理或 scheduler。Retention purge 的 demo-only guard 原封保留。
- Fable 只接現有真實狀態、事件及權限；不得新增全體同意條件、直接 Storage delete、假成功或自行解除伺服器保護。UI 整合尚未開始；Founder acceptance 仍是 PENDING。

主要新增驗證：`tests/unit/shared-receipt-permission.test.js`、`tests/integration/shared-receipt-emulator.test.js`、由原 paid-sync 真 App suite 執行的 `tests/browser/shared-receipt-scenarios.js`。精確結果及截圖以本次 EVIDENCE 為準，不用文件中的宣稱代替測試結果。

## 只有兩步

1. Codex 完成 LTD 功能、法定清單、測試，連同已批准會員規則交同一份完整 source。
2. Fable 一次完成 Direction A LTD UI、所有相關文案和六語言呈現；交回完整 source、改檔對照／patch、測試和畫面證據。Codex 再核對一次及處理少量修訂。

不要重新安排一輪完整架構重驗或多個產品階段。真人由 LTD 入口一路使用的 Founder acceptance 在獲批准發行後進行；目前不是 production acceptance，也沒有 merge／deploy 授權。

## 最新 Fable 來源已核實

- 來源外包：Downloads/fabletowork2.zip。
- 內包：TAXMATE_FABLE_COVERAGE_VERDICT_REVISED_20260905.zip。
- 內包 SHA-256：`ef995917f0b08dd714513793ee89d05bd4991c6c09160c7e8740b03bde126feb`，與 Founder 提供一致。
- 已完整閱讀修訂 Markdown。舊 TAXMATE_LTD_MVP_COVERAGE_REVIEW.md 在交接包保留原文，標示 SUPERSEDED；不得用舊報告推翻已完成的 PAYE／dividend 架構。
- `ARCHITECTURE_VERDICT: PASS` 是 Fable 對先前候選 tree `db8ccc5720bde4133b7790d6bdc9e28207aa53f9` 的裁決，不是冒充本次獨立審核。
- 本次是否已完成的執行證據以包內 ACCEPTANCE_MATRIX.json 及 EVIDENCE/.ltd-statutory-evidence-*/result.json 為準；通過後直接進入 Fable UI 整合，不增加架構階段。

## 按官方資料修正修訂報告內仍不準確的地方

1. 保存 accounting records：至少由「紀錄涉及的最後一個公司財政年度結束」起六年，**不是交表日起六年**。跨期交易、長壽命資產、遲交 return、HMRC 查核可能需更久。公司 minutes 等其他紀錄不應套用這個日期自動刪除。來源：https://www.gov.uk/running-a-limited-company/company-and-accounting-records
2. VAT：歷史測試是 taxable turnover **超過** £90,000，不是大於等於。歷史登記期限是首次超標月份月底之後 30 日；未來 30 日測試另計。普通 income、已收現金、單一 accounts year 都不能代替 VAT taxable turnover。來源：https://www.gov.uk/register-for-vat
3. 長 accounts period 的 CT600：不超過 18 個月的相關 period of account，交表日期須考慮該 accounts period 結束後 12 個月。兩份 CT600 可以同日到期；每個 tax period 的繳稅日期仍各自計。後發的 HMRC notice 另有三個月規則；如不清楚須查 HMRC，不能冒充最終 notice date。來源：https://www.gov.uk/hmrc-internal-manuals/company-taxation-manual/ctm93030 及 https://www.gov.uk/hmrc-internal-manuals/company-taxation-manual/ctm93050
4. 董事與 PSC 身份各自要連結；PSC 有自己的 14 日窗口，不能直接複製 CS01 due date。TaxMate 不收集 personal code。來源：https://www.gov.uk/guidance/when-you-need-to-verify-your-identity-for-companies-house
5. Companies House accounts 自 2028-04-01 轉 commercial software / iXBRL，並非 CS01 等所有 WebFiling 都關閉。來源：https://www.gov.uk/guidance/using-software-to-file-your-companys-information
6. HMRC joint online service 2026-03-31 關閉；本產品是 CT600、accounts、computation 的準備與欄位對照，不把 JSON/PDF 冒充可直接上傳的 iXBRL。來源：https://www.gov.uk/government/news/the-online-accounts-and-company-tax-return-service-is-closing

官方資料核對日：2026-09-05。清單本身有 ruleset version、verifiedAt 和 reviewBy；過期就退回 needs_checking。Micro-entity 維持「三項中至少兩項」，並提醒核對適用年度、排除情況和資格歷史，不單憑 turnover 自動批准。

## Source 合約：UI 不推算狀態

- 新 engine：`src/core/company-statutory.js`。
- `CompanyBooks.buildSelfFilingPack` schema v3，新增 `statutoryChecklist`、`readiness`、每個 accounts／CT600 數值的 `display`。
- `snapshot.statutory.checklist` 是年度頁同 overview 可直接讀的清單；若 `snapshot.statutory.status` 為 needs_checking，顯示需核對，不顯示 ready。
- `onPrepareCompanyYear({filingFacts})` 回傳 `{figures, statutoryChecklist, readiness}`。`figures.status` 僅代表計算；整體 `review_required` 仍可有完整數字，UI 必須展示 data，不可把 review_required 當作沒有資料。
- `onDownloadSelfFilingPack({filingFacts})` 即使 `review_required` 亦可帶有可下載 JSON pack，清楚顯示待辦。這是 preparation export，不是官方提交文件。
- `onSaveStatutoryReview({expectedRevision, sourceFingerprint, facts})` 保存有證據的核對資料，需 Pro 可編輯權限。`sourceFingerprint`、`reviewRevision` 從最新 checklist 取得；舊版本拒絕寫入，不覆蓋。
- 核對存於 `companyProfiles[].statutoryReview`，歷史存於 `statutoryReviewHistory`；由既有 repository、backup、Ltd profile sync 路徑攜帶，沒有另建旁路存儲。
- 改帳簿、salary、dividend、tax period、profile 等來源後，舊確認失效。跨公司、不同年度、未來日期、欠 evidence、非法字段均不提供完成判斷。
- 實際瀏覽器重新開啟時，發現 production adapter 的刷新只重載資料、沒有同步最新會員快照；已補 canonical refresh 的 entitlement 更新，避免雲端已恢復 Pro、清單仍被舊 Free 快照隱藏。沒有放鬆權限。
- 不能由畫面勾勾直接寫 status；輸入是有來源的事實，status 由 engine 產生。`completed` 是已記錄證據／核對，不代表 TaxMate 已向官方查證 accepted filing；`officialSubmissionVerified` 永遠 false。

### 五態與每項欄位

`completed` 已完成；`outstanding` 仲要做；`not_applicable` 不適用；`unsupported` TaxMate 暫不支援；`needs_checking` 請查實。

Fable 原文只列四態，Founder 要求五態，所以明確新增 needs_checking。每項有 `id/title/status/statusCopyKey/plainEnglish/officialLinks/deadline/triggerReasons/sourceRecords/sourceIds`。`deadline` 為帶 status 的物件；未知日期保留 `date:null`，**顯示 display／copyKey，不能 stringify null 或轉成 0**。部分事項另有角色或各 CT period 的 deadlines，不可只取父項空日期。

12 項固定輸出：UTR／CT registration、CH accounts、HMRC iXBRL route、CS01、director/PSC identity、PAYE/RTI、dividend documents、VAT rolling review、director loan/s455、record retention、CT600/payment deadlines、missing figures。

未知是否有薪金／股息，不等於不適用。有現存 pending RTI、缺 dividend documents 或 overdrawn loan，不可用一般確認蓋過。不適用項可收合，但不可藏去 unknown／unsupported／outstanding。

### 保存事實的格式

每個 `facts[key] = {value, evidenceRefs:['local:...']}`。所有 fact 都需 evidence reference；可以引用用戶保存的官方回條、信件或完整核對紀錄，不能預填／假造。不要收集 UTR 原文或 identity personal code，記錄已準備及證據來源即可。

- Boolean keys：utrReceived、corporationTaxRegistered、accountsFiled、accountsSoftwareReady、hmrcSoftwareReady、cs01Filed、directorsVerified、pscsVerified、noPayroll、noDividends、vatRegistered、noOverdrawnDirectorLoan、recordsBackedUp、retentionExceptionsChecked。
- Date keys：cs01ReviewDate（本次 review-period end）、directorIdentityDueDate、pscIdentityDueDate（均依官方 record）、vatWindowStart、vatWindowEnd、vatFirstExceededMonthEnd、vatExpectedKnownOn。
- Integer-pence keys：vatTaxableTurnoverMinor、vatNext30DaysMinor。VAT review window 為截至上一個完整月份月底的連續 12 個月；不能只拿選中 accounts year。須包含帳外 taxable supplies、zero-rated 等；未完成核對就保持 needs_checking。近門檻可加文案，但不得把「到 £90,000」說成法定必須登記。
- Per-period booleans：`ct600Filed:<periodId>`、`corporationTaxPaid:<periodId>`。不接受任意 UI status。

### Dividend / PDF / wording

- 清單帶 `blankTemplates` 及每筆 declaration 的 `templates`：minutes 欄位、每股東 voucher 所需姓名、日期、金額；一律 draft_for_review，生成範本不等於法律批准或文件已完成。
- 欄位數值用 engine `display`。合法 0 顯示 0.00；null/undefined/非法值顯示「請查實／Please check」。
- MTD、SA104、CT600、CS01 等官方名稱保留。主要定位採「準備 MTD／SA104／CT600」等正面說法；在實際交接步驟清楚講使用甚麼官方／相容軟件路徑，不在每一個功能名後重複「不代提交」。
- Fable 完成六語言 copy（包括新增清單及狀態 key），Urdu RTL；不得以 English fallback 代替完成。

## 已批准會員修改一併保留

- Receipt Pack PDF：Plus 已包括，Pro 繼承；不是 Pro 專屬。
- Pro 月費：正價 £11.99，發行優惠 £9.99；正價可劃線，不能刪掉正價或把 9.99 寫成永久正價。Plus 及其餘已確認規則不另改。
- 已有效降回 Free：付費詳細 PDF 權益不再可用；不要把取消自動續費當作即時失去已付費期間。
- LTD 舊 24 個月 access 規則已由 UK tax-year runtime window 取代：例如有效付費結束落在 2025–26，就保留查看至 2026-04-05；2026-04-06 開始下一稅年不能再查看。不是季度。
- Basic machine-readable backup/restore 與 paid detailed PDF 是不同能力，不可混為一個 export。
- 取消／到期前提醒用戶先自行下載留底；官方六年留存責任不是平台六年保管承諾。
- 本次規則涵蓋全帳戶普通／自僱、合夥歷史、LTD 及收據。有效 Plus 或 Pro 保留歷史；Pro 降 Plus 不刪 LTD，但不開放 Pro 操作。6 月 2026 結束付費：保留至 5 April 2027，London 6 April 午夜開始刪除；新年度 Free 記錄及其他成員的共享資料保留。12 月復訂不刪；刪除後付款不會自動復活，需明確還原自己保存的備份。
- 完整 worker、client、rules 及 retry/epoch 合约在此 source，刪除只允許 demo emulators。沒有 production scheduler，沒有部署或實際生產刪除授權。日後啟用 production 需要獨立授權及安全 rollout；Fable 不得移除 guard 或部署 rules。UI 只可按真實 `retention/current` 狀態說明完成／處理中／重試，不得憑日曆聲稱雲端已刪除。
- Free 混合帳戶備份會匯出符合權限的普通資料，並明確披露被排除的 LTD／過期歷史。JSON 無圖片；Full Backup ZIP 包含真收據 binaries；PDF 不能還原。Free ZIP 還原圖片存於帳戶隔離的本機 IndexedDB，`receiptDisplayUrl`／`receiptBytesFromUrl` 是顯示及讀取入口；不能把 `_taxmate_receipt` URL 當遠端伺服器圖片。再次 ZIP 匯出包含這些 binaries。
- 不要直接改 payroll financial posting 的 `payeReportingStatus`。最新申報狀態與證據讀取 `salaryRecord.payrollReporting`，保存用 `onUpdatePayrollReporting` 及 expected revision。舊 snapshot 及財務 posting 保持不可變。
- `retentionHistoryGap` 表示年度歷史缺失；VAT 不可判安全，年度／CT600／tax computation 不可將 null 顯示為 £0。開帳 cash／loan／loss continuity 與完整年度 profit 是不同內容。

## Fable 交回要求

在此包的 SOURCE.zip 上一次完成所有 LTD Direction A 畫面及以上連接，不從舊 production／舊 Fable return 重新拼接。保留 Codex 的 engine、data、security、entitlement、tax contracts。除本包已批准的會員文案／權益外，不重做外面的 Self-employed 功能。

交回完整 editable source ZIP、相對本包 source manifest 的 changed-file mapping／patch、六語言 desktop/mobile light/dark/RTL 證據，以及從 LTD 入口完成日常記錄→修正→年度數字→12 項待辦→export 的實際操作結果。核對每個 checklist 與 engine 一致即可，不再重做全套架構評審。

所有測試結果須標清是本次重跑還是歷史；不能拿舊 1453 assertions 當本次通過。最終版本 identity / cache revision 在 UI 整合發行時統一更新；此包仍是未發佈的 2.1.21 candidate。

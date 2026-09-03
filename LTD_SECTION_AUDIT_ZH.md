# TaxMate 2.1.18 LTD 功能精簡審核

審核日期：2026-09-03

## 結論

現有 LTD 區最適合定位為「英國小型、由戶主兼任董事、普通服務或數碼產品公司」的日常公司記帳、紀錄整理及 provisional tax planning 工具。現有 code 已經刻意 fail closed：遇到集團、關聯公司、物業／投資、存貨、完整 VAT、資產處置、研發、複雜外幣、benefits in kind、複雜退休金／股份計劃等情況，會要求 review，而唔係估算成已支援。

目前唔應定位成完整法定合規或報稅產品。working pack 明確唔係 statutory accounts、CT600、Company Tax Return、iXBRL 或 filing submission；Salary 只記錄已由 payroll 處理的數字，唔會運行 PAYE 或提交 RTI；VAT 只係風險問題，冇 VAT ledger／return；Companies House 只讀取公司公開資料，唔會代交 accounts、confirmation statement 或公司變更。

## 現有功能事實

| 範圍 | 現有能力 | 判斷 |
|---|---|---|
| 公司設定 | 公司編號／名稱／成立日、營運狀態、開始營運日、accounts period、Corporation Tax 狀態、董事及股東、活動風險問題 | `必須保留`；缺資料時維持 draft／review |
| Companies House | 透過 provider 查公司資料，保留 official facts 與用戶修改後 facts 的 provenance | `可選並解釋價值`；只可視為查詢，不可暗示完成 filing |
| 公司帳簿 | 公司收入、公司支付支出、個人代付支出、共用成本、director loan、share funding；雙重分錄以整數便士平衡 | `必須保留`；係現階段核心價值 |
| 支出稅務處理 | 問 capital/revenue、特殊成本、invoice 對象、公司／私人使用；複雜類別 fail closed | `需要稅務專業確認`；維持 needs checking 邊界 |
| Corporation Tax | 由已確認期間及已評估交易產生 provisional estimate；支援 19%／25%、marginal relief、短期及 associated-company threshold 調整、簡化 carried-forward trading loss | `需要稅務專業確認`；不得稱為 Company Tax Return 或最終稅額 |
| Salary | 記錄 pay date、gross、PAYE、employee/employer NI、evidence、RTI 狀態及多項確認 | `保留但簡化`；只記已跑 payroll 數字，不擴建 payroll engine |
| Dividend | 檢查 provisional distributable profit，記 declaration/payment、board/minutes/accounts/voucher references，按有效股權分配 | `必須保留`；正式 profit 判斷仍 `需要稅務專業確認` |
| 股權歷史 | effective-dated ownership versions、profile revisions、dividend impact review；2.1.18 加入單一股東 100→51 時餘下 49 的可見輸入 | `必須保留`；外部 PSC／statement of capital 申報仍屬公司責任 |
| 工作區輸出 | 現金、profit/loss、company owes you、provisional Corporation Tax、potential dividend、deadlines、review items、working pack | `保留但簡化`；繼續用 estimate／working record 字眼 |
| 備份及同步 | LTD collections、ownership/history、salary、dividend、period/loss records可經 account-scoped sync、Data-only 及 Full Backup round trip | `必須保留`；不等同法定紀錄保存服務保證 |

## 逐頁／逐欄位清單

`LTD_FIELD_INVENTORY.json` 係本審核的 machine-readable 主清單，共 105 個 item，覆蓋 Setup Step 1–5、Companies House lookup、dates/periods、ownership、quick checks、review/completion、Overview、Money、Tax、Records、salary/dividends、corrections/evidence、export/Full Backup/restore/sync。每個 item 都直接列出：

1. 畫面及欄位／控制項名稱；
2. required／optional／conditional；
3. canonical 或 derived 資料位置；
4. 寫入程式路徑；
5. 讀取程式路徑；
6. 計算影響；
7. summary/report/backup/restore/sync surface；
8. 官方需要及 source id；
9. 普通用戶直接好處；
10. record-only 保存價值；
11. 重複判斷；
12. 移除後果；
13. 只使用批准七類之一的建議分類。

分類統計：`必須保留` 67、`保留但簡化` 5、`可選並解釋價值` 9、`建議合併` 2、`建議移除` 0、`需要Founder決定` 4、`需要稅務專業確認` 18。今次 code review 未發現一個同時「無 consumer、無紀錄／法定／計算價值、無普通用戶價值」的現有控制，因此唔為湊數提出 `建議移除`。

## 與官方責任比較

1. 董事仍然要保留公司及會計紀錄、準備 annual accounts、完成 Company Tax Return、提交 accounts／return 及繳 Corporation Tax。TaxMate 只處理其中「日常紀錄＋估算＋working pack」一段，責任不可轉移。
2. 私人有限公司一般要在財政年度完結後 9 個月交 annual accounts、Corporation Tax period 後 9 個月加 1 日繳稅、12 個月交 Company Tax Return；首份 accounts 通常以成立後 21 個月為 deadline。TaxMate 可顯示 deadline，但現時唔會提交或取得 filing receipt。
3. Company Tax Return 包括 CT600、補充頁、accounts 及 tax computations；網上 filing 需要相應 commercial software／iXBRL。現有 working pack 不具備呢個 filing contract。
4. 公司要保存收入、支出、資產、債務、stock、交易對手、receipts、invoices、bank statements 等足夠紀錄，稅務紀錄一般要保留 6 年。現有 ledger 覆蓋現金交易核心，但未涵蓋完整 stock／fixed asset register／debtors／creditors／bank reconciliation。
5. 股息只可以由可分派利潤支付，通常要有董事決議、minutes 及每位收款人的 voucher；現有 dividend flow 方向正確，但 provisional profit 唔應取代正式 accounts 判斷。
6. 公司支付 salary 時要成為 employer，處理 Income Tax／NI；董事 NI 用 annual earnings 規則。現有 salary flow 要繼續要求 payroll/RTI confirmation，唔好將 estimate 當實際 payroll calculation。
7. Corporation Tax taxable profits 可包括 trading profits、investment income 及 chargeable gains；資本開支可能涉及 capital allowances。現有簡化模型主要針對普通 trading income/cost，其他類型應維持 review-required。
8. VAT taxable turnover 超過或預期 30 日內超過 £90,000 時一般要註冊。現有 `fullVat` 問題只係風險 gate，唔足以做 VAT compliance。
9. confirmation statement 至少每 12 個月要檢查及提交，內容包括 directors、shareholders、statement of capital、SIC、PSC 等。TaxMate 現時冇呢個 filing workflow。

## 缺口及風險排序（建議，未執行）

| 優先度 | 缺口 | 風險 | 建議 |
|---|---|---|---|
| P0 | 產品定位可能被理解成完整 accounts／tax return | 用戶可能錯過正式申報 | 所有 CT／working pack／deadline surface 維持清楚「estimate、not filed」狀態；唔加一鍵 filing 假象 |
| P0 | PAYE/RTI 不是實際 payroll submission | salary/NI 數字可能同 payroll 不一致 | 只容許輸入已跑 payroll 數字；保留 RTI、PAYE registration、payment confirmation；唔自行擴建 payroll |
| P0 | VAT、capital allowances、chargeable gains、R&D、property/investment、inventory、group/associated complexity 不完整 | Corporation Tax estimate 可能錯 | 保留硬 review gate；唔將呢啲 profiles 放入 supported estimate |
| P0 | 無 statutory accounts、CT600、iXBRL、Companies House/HMRC filing receipt | 法定責任未完成 | 保留 working pack only；如將來做 filing，必須獨立受控 programme |
| P1 | 無完整 bank reconciliation、debtors/creditors、fixed asset/stock register | 帳簿未必足夠出完整 accounts | 先決定目標客群是否需要 accrual bookkeeping；未決定前唔膨脹現有 UI |
| P1 | Companies House confirmation statement／PSC／statement of capital 未追蹤 | 公司資料變更可能漏報 | 可考慮只讀 checklist/deadline，不要直接改現有 ownership engine |
| P1 | Deadline completion 只係 unconfirmed | 顯示 deadline 不代表已交 | 如保留 deadline card，加「mark as filed」亦要保存官方 receipt/reference；否則維持 unconfirmed |
| P2 | 多語言欄位很多，複雜 profile 問題會增加認知負擔 | mobile friction | 以 supported-profile gate 隱藏未適用欄位，唔刪 engine 資料或 audit history |

## 建議的精簡判斷

- 應保留：公司身份、期間、普通 trading income/expense、公司／個人付款來源、evidence、director loan、salary record、dividend record、股權歷史、CT provisional estimate、backup/sync。
- 應按條件顯示：shared allocations、advanced CT review、custom loss use、share funding、salary/dividend paperwork、company correction。
- 應維持排除／轉交 review：VAT return、payroll/RTI submission、statutory accounts、CT600/iXBRL、R&D、capital gains、capital allowance schedules、stock、property/investment、group relief、complex FX/benefits/pensions/share schemes。
- 可考慮隱藏而非刪除：對未有 profit 的 salary/dividend scenario、未有相關紀錄的 correction/history sections、一般用戶不需要的 advanced loss control。

## 官方來源

全部連結於 2026-09-03 存取：

- GOV.UK — [Running a limited company: directors’ responsibilities](https://www.gov.uk/running-a-limited-company)
- GOV.UK — [Company and accounting records](https://www.gov.uk/running-a-limited-company/company-and-accounting-records)
- GOV.UK — [Accounts and tax returns for private limited companies](https://www.gov.uk/prepare-file-annual-accounts-for-limited-company)
- HMRC — [Company Tax Return obligations](https://www.gov.uk/guidance/company-tax-return-obligations)
- HMRC — [Filing your Company Tax Return online](https://www.gov.uk/government/publications/corporation-tax-commercial-software-suppliers)
- GOV.UK — [Your limited company's first accounts and Company Tax Return](https://www.gov.uk/first-company-accounts-and-return)
- GOV.UK — [Corporation Tax rates](https://www.gov.uk/corporation-tax-rates)
- HMRC — [Marginal Relief for Corporation Tax](https://www.gov.uk/guidance/corporation-tax-marginal-relief)
- GOV.UK — [Corporation Tax expenses](https://www.gov.uk/corporation-tax-rates/corporation-tax-expenses)
- GOV.UK — [Corporation Tax allowances and reliefs](https://www.gov.uk/corporation-tax-rates/allowances-and-reliefs)
- HMRC — [Work out and claim relief from Corporation Tax trading losses](https://www.gov.uk/guidance/corporation-tax-calculating-and-claiming-a-loss)
- GOV.UK — [Taking money out of a limited company](https://www.gov.uk/running-a-limited-company/taking-money-out-of-a-limited-company)
- GOV.UK — [National Insurance for company directors](https://www.gov.uk/employee-directors)
- GOV.UK — [Confirmation statement](https://www.gov.uk/running-a-limited-company/confirmation-statement)
- GOV.UK — [Register for VAT: when to register](https://www.gov.uk/register-for-vat)
- GOV.UK — [Corporation Tax when a company sells assets](https://www.gov.uk/tax-when-your-company-sells-assets)

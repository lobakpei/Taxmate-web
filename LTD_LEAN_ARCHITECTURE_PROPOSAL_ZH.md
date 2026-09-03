# LTD 精簡架構提案（只供決策，未執行）

日期：2026-09-03

## 目標

保留現有 canonical domain、audit history、account-scoped sync、backup 及 fail-closed tax engine；只精簡用戶見到的路徑。唔建立第二套 ledger、第二套 company profile 或額外「保安員」系統。

## 建議四層

1. **Profile gate**：公司身份、成立／營運／accounts period、director/shareholder、五個 setup risk answers。只有符合簡單 profile 才進入 supported estimate。
2. **Daily books**：收入、支出、付款來源、私人使用／shared allocation、director loan、evidence。呢層係主畫面核心。
3. **Owner pay**：只有用戶主動需要時先展示 salary、dividend、share funding；保留 payroll、profit、minutes、voucher 確認。
4. **Review/export**：provisional CT、deadlines、review items、corrections、ownership history、working pack、backup。所有 filing 狀態預設 unconfirmed。

## 可見路徑建議

```text
Company setup
  -> supported simple profile
      -> Overview
      -> Money
      -> Tax estimate
      -> Records / export
  -> complex or incomplete profile
      -> record-only / needs checking
      -> accountant handoff
```

## 普通用戶最少要提供的資料

| 建議步驟 | 用戶真正輸入 | 為甚麼需要 | 可自動推導／預填 |
|---|---|---|---|
| 1. 公司身份 | company number；若未註冊則 proposed name | 鎖定正確 legal entity，建立一公司限制及資料 provenance | 已註冊公司由 Companies House lookup 帶入 legal name、incorporation date、公開 status；用戶只核對／更正 |
| 2. 營運及期間 | 是否已開始營運；如是則 trading start date；Corporation Tax account 狀態 | 決定 accounts/CT period及是否需要 review | 由 incorporation/trading dates 推導首個 accounts period與一個或多個 CT periods；只有例外先展開 official-date override |
| 3. 人物及股權 | account-holder legal name、是否director、是否sole shareholder；多股東時只輸入另一股東名稱及比例 | supported owner-director gate、股息分配及 ownership history | sole shareholder 自動 100%；100 改 51 時自動顯示餘下 49，但必須由用戶填 owner 並確認 total 100% |
| 4. 支援範圍 quick check | group、associated companies、property/investment、inventory/stock、VAT、ordinary service/digital 的 yes/no/not sure | 複雜公司必須 fail closed，避免假精確 estimate | 已保存答案可預填；不應由模糊 business description 暗中推定 Yes/No |
| 5. Review | 核對公司、日期、期間、director及 ownership，再 explicit confirm | 防止錯誤 facts 直接成為 active company | summary 全部由前四步 canonical draft 產生，不另存第二份 summary |

## 最短可完成流程

最短安全路徑仍然係五個短畫面，但每步只顯示當下需要欄位：

1. 輸入 company number → lookup 成功 →核對名稱／成立日。
2. 回答 trading、trading date、CT account；接受自動 period。
3. 輸入 legal name，確認 director＋sole shareholder；系統自動 100%。
4. 六個 quick checks 全部回答 No，ordinary service/digital 回答 Yes。
5. 核對 summary、tick confirmation、開始 bookkeeping。

唔建議為少一個畫面而把未回答 quick checks 當 No，亦唔建議自動把 Google display name 當法律姓名。若 Founder 想再短，可把第 4 步六題放入同一 scroll page，但 canonical answers、Back/review及 fail-closed validation要保留。

## Advanced／Optional 建議

- Accounting period start/end override：只有自動 period 不符官方資料先展開。
- Shared expense allocation、private use、capital/special-cost/invoice facts：只有對應 expense 先問。
- Salary：只有用戶要記錄已跑 payroll 的 payment 先展示；RTI/PAYE/evidence仍要保留。
- Dividend：只有有 provisional distributable profit 且用戶主動 declare 先展示；accounts/minutes/voucher不可靜默略過。
- Loss treatment、associated-company threshold、property/investment、inventory、VAT 等：保留 needs checking／accountant review，不在普通 supported path 展開計算。
- Company corrections、ownership history、working pack、remove company：放 Records；只在用戶要核對或更正時使用。

## 完成 setup 後四區責任

| 區域 | 單一責任 | 不應負責 |
|---|---|---|
| Overview | 只讀 derived snapshot：cash、profit/loss、company owes you、provisional CT、potential dividend、deadlines及review items | 不另存第二套總數；不顯示 filed/paid 除非有可靠 reference |
| Money | 日常 canonical ledger：income、expense、payer、shared/private split、director loan、share funding及evidence | 不做 statutory accounts、VAT return或複雜 tax conclusion |
| Tax | provisional CT working view、已跑 payroll salary record、dividend declaration/payment及相關review | 不提交 CT600/iXBRL、PAYE/RTI或VAT；不把 provisional profit 當正式可分派利潤證明 |
| Records | 公司facts、periods、ownership/history、salary/dividend record、correction/reason/evidence及working pack | 不成為第二套編輯ledger；Companies House/HMRC filing仍在外部完成 |

## 欄位規則

- `必須保留`：影響 entity、period、ledger、tax treatment、ownership、salary/dividend record、sync/backup identity 的欄位。
- `保留但簡化`：例如 salary 多項 confirmation、CT account 狀態及 deadlines wording。
- `可選並解釋價值`：只在對應 action 展示，例如 Companies House recheck、working pack、scenario compare。
- `需要稅務專業確認`：loss use、associated companies、capital/revenue、可分派利潤等。
- 現階段排除：VAT return、statutory accounts、CT600/iXBRL、PAYE/RTI filing、Companies House filing、complex relief schedules。

## 不變條件

- 同一 canonical company profile 及 ledger。
- 金額繼續用 integer minor units；journal 必須平衡。
- ownership/profile correction 繼續 effective-dated、append-only audit history。
- sync 仍以 account UID scope 及 per-record envelope；Full Backup/Data-only 必須 round trip。
- review-required 不可降級成成功 estimate。
- UI 隱藏唔可以刪除真實資料、receipt 或 history。

## 分段建議

1. Founder 先批准定位及 supported profile。
2. 只做 route/visibility inventory，逐項確認 `keep/conditional/hide`。
3. 用現有 tests 建立「同一 canonical state、同一 CT result、同一 backup/sync」基線。
4. 先精簡 UI，唔改 domain schema；如有實際用戶證據先考慮 engine 擴展。
5. 完成獨立法律／稅務 review 先可新增 filing 或 payroll submission。

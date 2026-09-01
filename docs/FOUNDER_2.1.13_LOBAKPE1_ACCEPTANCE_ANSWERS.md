# TaxMate 2.1.13 — `lobakpe1` Founder Step 1–5 答案包

適用範圍：只供獲授權 Founder 帳戶在正式網站測試 `lobakpe1`。這些答案建立的是隔離 test-data session，不代表正式 Companies House、HMRC、bookkeeping 或稅務事實。

## 開始前

1. 在正式網站以獲授權 Google 帳戶登入。
2. 確認帳戶為 Pro。
3. 選擇新增 Limited company，並選擇已有公司。
4. 畫面進入真正的 Ltd Step 1–5 後，使用以下答案。

## Step 1 of 5 — Set up your limited company

| 畫面實際問題／欄位 | 輸入／選擇 |
| --- | --- |
| Has your company been registered with Companies House yet? | **Yes** |
| Company number | **lobakpe1** |
| Check Companies House | 按一次；應顯示 **LOBAKPE FOUNDER PREVIEW LTD** |
| Registered company name | 應自動填入 **LOBAKPE FOUNDER PREVIEW LTD** |
| Incorporation date | 應自動填入 **15/12/2025** |

核對後按 **Continue**。不要把 `00000000` 當成要手動輸入的公司號碼；它只是隔離 fixture 內部的非正式 placeholder。

## Step 2 of 5 — Set up your limited company

| 畫面實際問題／欄位 | 輸入／選擇 |
| --- | --- |
| Has the company started doing business yet? | **Yes** |
| When did it start doing business? | **20/12/2025** |
| Your first company periods | 只核對系統計算結果；不要開啟 **My official dates are different**，除非畫面日期明顯錯誤 |
| Have you added Corporation Tax to your HMRC business tax account? | **Yes**（本隔離 happy-path fixture 答案；不代表真實 HMRC 狀態） |

核對後按 **Continue**。

## Step 3 of 5 — Set up your limited company

| 畫面實際問題／欄位 | 輸入／選擇 |
| --- | --- |
| Your legal name | **Founder Preview**（隔離 fixture 名稱；不要在測試包記錄真實法定姓名） |
| Are you a director of this company? | **Yes** |
| Are you the only shareholder? | **Yes** |
| Ownership result | 應顯示 **You own 100%** |

核對後按 **Continue**。

## Step 4 of 5 — A few quick checks

Step 4 是 6 個逐頁問題：

| 次序 | 畫面實際問題 | 選擇 |
| --- | --- | --- |
| 1 | Is this company owned by, or does it own, another company? | **No** |
| 2 | Do you or the other shareholders also control another company? | **No** |
| 3 | Does the company mainly earn money from property or investments? | **No** |
| 4 | Does the company buy or make products that it keeps to sell later? | **No** |
| 5 | Is the company VAT registered? | **No** |
| 6 | Does the company provide ordinary services or digital products? | **Yes** |

每題按 **Next question**；第 6 題按 **Continue**。可用 **Back** 核對先前答案。

## Step 5 of 5 — You’re ready to start

核對摘要應包括：

- Company：**LOBAKPE FOUNDER PREVIEW LTD**
- Trading status：已開始營業
- Trading since：**20/12/2025**
- Ownership：**Founder Preview 100%**
- Your role：**Director**
- 沒有未解決的 review-required 阻擋

勾選 **I’ve checked these details and they’re correct.**，再由 Founder 自己按 **Start company bookkeeping**。Codex 不會代替 Founder 登入或按下正式網站的完成按鈕。

## 驗收時另外核對

- `Test data` 如有顯示，只應在本次 Founder alias session 低干擾地顯示一次。
- Back／Continue、reload 及完成流程均應保留本 session 答案。
- 此 fixture 不應出現在普通帳簿、Data Backup、Full Backup、import、restore、sync 或重新登入後的普通 canonical state。
- 其他帳戶輸入 `lobakpe1` 應只得到普通無效公司號碼結果，不應看到 Founder 或測試身份提示。

# Founder LTD 精簡決策清單

日期：2026-09-03

以下全部係建議。TaxMate 2.1.18 hotfix 冇因本審核刪欄位、合併資料、改 domain schema 或重設流程。

## 本輪找到的合併建議

### D1 — Salary 多項確認

- 現時用途：記錄 salary 已支付、payroll 已處理、普通服務／數碼 profile、普通 salary、PAYE 已註冊等前提；任何一項不足就 fail closed。
- 建議分類：`建議合併`。
- 移除／合併好處：把多個語意相近 checkbox 合成「我確認以上 payroll facts」摘要，再以 Advanced 展開逐項，mobile 會更短，亦減少漏 tick。
- 可能風險：直接刪除個別 facts 會失去 eligibility 及 audit evidence；合併只應改 presentation，不應丟 canonical facts 或把未回答當 Yes。
- 我的建議：簡化 UI，但保留每個 underlying answer、RTI status、evidence 及 fail-closed validation。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

### D2 — Dividend「confirmed distributable profit」數值與確認 checkbox

- 現時用途：一個欄位保存用戶確認的可分派利潤數值；另一個 checkbox 確認用戶真係核對過，兩者現時使用近似 label。
- 建議分類：`建議合併`。
- 移除／合併好處：合成一個清楚問題組，例如「根據已核對 accounts，可分派利潤係幾多？」＋單一確認，可避免以為要輸入兩次同一資料。
- 可能風險：只留 checkbox 會冇 amount guard；只留 amount 又會失去 explicit confirmation。正式可分派利潤仍要由適當 accounts／專業判斷支持。
- 我的建議：合併視覺及文案，但兩個 canonical meanings 都保留。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

## 建議移除項目

本輪逐項追蹤 105 個欄位／控制後，冇找到符合「無程式 consumer、無計算／紀錄／官方責任價值、亦無普通用戶價值」全部條件的現有項目，所以 `建議移除` 數目係 0。唔應為精簡數字而刪除 evidence、history、review gate、backup 或 sync control。

## 其他需要 Founder 決定的產品取捨

### D3 — Accounting period override 放到 Advanced

- 現時用途：當自動推導日期同官方 accounts period 不同時，讓用戶輸入 start/end。
- 簡化好處：普通 owner-director journey 少兩個高認知負擔日期欄。
- 風險：完全移除會令例外期間無法修正，進而影響 CT period、deadline 及 working pack。
- 我的建議：預設隱藏在 Advanced；保留 schema、validation 及 audit trail。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

### D4 — Share funding 入口是否保持主 Money action

- 現時用途：記錄向公司注入 share capital 的日期、金額及 evidence，更新公司 cash/equity event。
- 簡化好處：移到 Records／Advanced 可令最常用 Income、Expense、Director loan 更突出。
- 風險：隱藏太深會令新公司開立時漏記資金；直接移除會破壞已存在 canonical event 用途。
- 我的建議：保留功能，是否移到 Advanced 由 Founder 決定。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

### D5 — Remove company 的兩個入口

- 現時用途：Records 可移除 active company；Assistant 可移除 unfinished LTD setup，兩者對象／確認路徑不同。
- 簡化好處：統一文案及導向同一受控 confirmation surface，減少用戶不知差異。
- 風險：錯誤合併可能把「移除未完成 setup」變成「刪除已存在公司」；active records 要保留 reversals/history。
- 我的建議：保留兩種 domain action，UI 可共用說明但必須清楚顯示影響範圍。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

### D6 — LTD 的正式定位

- 現時用途：普通 owner-director LTD 日常記帳、紀錄整理及 provisional planning。
- 簡化好處：明確支持範圍，可把複雜 VAT、group、property/investment、stock 等保留為 needs checking。
- 風險：若宣稱完整 accounts／tax return，現有產品冇 CT600、iXBRL、PAYE/RTI、VAT 或 Companies House submission receipt 支持。
- 我的建議：正式定位為「簡單 LTD bookkeeping＋provisional estimate」，所有 filing 狀態預設 unconfirmed。
- Founder 選擇：
  - [ ] 保留
  - [ ] 簡化
  - [ ] 合併
  - [ ] 移除
  - [ ] 稍後決定

## 建議優先決定

先決定 D6 產品定位，再決定 D1／D2 UI 合併，最後先排 D3–D5。任何合併都只應合併 presentation，唔應刪 canonical facts、evidence、history、backup 或 sync data。

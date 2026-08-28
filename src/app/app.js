
/* ═══════════ i18n ═══════════ */
const LOCALES = { en:'en-GB', zh:'zh-HK', pl:'pl-PL', ro:'ro-RO', es:'es-ES', ur:'ur-PK' };
function obMonShort(m){ return new Date(2026, m-1, 1).toLocaleDateString(LOCALES[S.settings.lang]||'en-GB', {month:'short'}); }
function obMonFull(m){ return new Date(2026, m-1, 1).toLocaleDateString(LOCALES[S.settings.lang]||'en-GB', {month:'long'}); }
const LANG_NAMES = { en:'English', zh:'繁體中文', pl:'Polski', ro:'Română', es:'Español', ur:'اردو' };

const I18N = {
en:{
 'nav.home':'Home',
 'nav.income':'Income',
 'nav.expenses':'Expenses',
 'nav.tax':'Tax',
 'nav.more':'Settings',
 'c.save':'Save',
 'c.cancel':'Cancel','c.discardConfirm':'Discard changes?','c.discardConfirmM':'Your unsaved changes will be lost.',
 'c.edit':'Edit',
 'c.yes':'Yes, do it',
 'c.active':'Active',
 'home.hi':'Hello 👋',
 'home.profit':'Your profit · {y}',
 'home.in':'Money in',
 'home.out':'Money out',
 'home.taxT':'Set aside for tax',
 'home.taxS':'Estimated tax on your profit so far',
 'home.oweLine':'Estimated tax to pay',
 'home.biz':'Your businesses',
 'home.addBiz':'Add a business',
 'home.recent':'Recent activity',
 'home.share':'your share',
 'tag.sole':'Sole trader',
 'tag.part':'Partnership',
 'tag.your':'your {n}%',
 'w.title':'Welcome to TaxMate 👋',
 'w.sub':'Know how much tax to set aside — so 31 January never catches you out. Free, private, no sign-up.',
 'w.priv':'🔒 Private by design. Your data is yours alone — on your device, and synced securely only when you sign in.',
 'w.steps':'1 · Add what you do (driver, cleaner, etc.)\n2 · Tap ＋ to log money in and money out\n3 · See your tax estimate update instantly — no maths, no stress',
 'w.start':'Add your first business',
 'inc.title':'Income',
 'inc.add':'Add income',
 'inc.empty':'No income logged yet',
 'inc.emptyS':'Add money as it comes in — your tax estimate stays live.',
 'exp.title':'Expenses',
 'exp.add':'Add expense',
 'exp.empty':'No expenses yet',
 'exp.emptyS':'Every expense you log can shrink your tax bill.',
 'flt.all':'All',
 'f.amount':'Amount',
 'f.date':'Date',
 'f.business':'Business',
 'f.category':'Category',
 'f.note':'Note',
 'f.optional':'(optional)',
 'f.amountErr':'Enter an amount greater than 0',
 'f.bizUse':'Business use','f.bizUsePartial':'Partly personal?',
 'f.bizUseHint':'Partly personal (like your phone)? Claim only the business share — HMRC expects a fair split.',
 'f.addIncome':'Add income',
 'f.editIncome':'Edit income',
 'f.addExpense':'Add expense',
 'f.editExpense':'Edit expense',
 'f.deleteEntry':'Delete this entry',
 'b.add':'Add a business',
 'b.edit':'Edit business',
 'b.name':'Business name',
 'b.nameErr':'Enter a name',
 'b.setup':'How is it set up?',
 'b.justMe':'Just me',
 'b.partnership':'Partnership',
 'b.soleHint':'You work for yourself and keep all the profit.',
 'b.partHint':'You run it with someone else and split the profit. Only your share is taxed.',
 'b.share':'Your share of profit (%)',
 'b.delete':'Delete this business and its entries',
 'tax.bill':'Estimated bill · {y}',
 'tax.it':'Income Tax',
 'tax.c4':'Class 4 NI',
 'tax.fileBy':'File & pay by {d}',
 'tax.taT':'Expenses vs £1,000 allowance',
 'tax.taHint':'HMRC lets you knock a flat £1,000 off your self-employed income instead of claiming real expenses (not partnerships). Whichever gives the smaller profit wins — TaxMate compares both for you.',
 'tax.taActual':'Profit with actual expenses',
 'tax.taAllow':'Profit with £1,000 allowance',
 'tax.taBest':'Best for you',
 'tax.taSave':'saves {x} of profit',
 'tax.auto':'Auto',
 'tax.allowance':'Allowance',
 'tax.expensesOpt':'Expenses',
 'tax.using':'Using: {x}',
 'tax.autoNote':'Auto always picks whichever is cheaper for you.',
 'tax.usingAllow':'£1,000 trading allowance',
 'tax.usingExp':'actual expenses',
 'tax.how':'How it’s worked out',
 'tax.taxableP':'Your taxable profit',
 'tax.pa':'Personal Allowance',
 'tax.paHint':'tax-free amount everyone gets',
 'tax.paRed':'reduced — income over £100,000',
 'tax.taxable':'Taxable income',
 'tax.basic':'Basic rate',
 'tax.higher':'Higher rate',
 'tax.addl':'Additional rate',
 'tax.on':'on',
 'tax.c4Hint':'6% on profit £12,570–£50,270, 2% above',
 'tax.c2':'Class 2 National Insurance',
 'tax.c2Paid':'profits over £{x}, so it counts as paid — free State Pension credit',
 'tax.c2Vol':'profits under £{x} — you can pay £{v} voluntarily to protect your State Pension record',
 'tax.opt':'optional',
 'tax.total':'Total bill',
 'tax.payT':'What you’ll actually pay',
 'tax.editPos':'Edit',
 'tax.thisBill':'This year’s bill (above)',
 'tax.priorAdj':'Adjustment from last year',
 'tax.priorAdjS':'under/overpayment carried forward',
 'tax.poaPaid':'Payments on account already made',
 'tax.balancing':'Balancing payment due 31 Jan',
 'tax.refund':'💚 This estimate may indicate an overpayment. HMRC decides any amount due or refundable after filing.',
 'tax.datesT':'Payment dates',
 'tax.poaWhy':'Your bill is over £1,000, so HMRC also asks for two payments on account towards next year — half each.',
 'tax.janS':'balancing payment + 1st payment on account',
 'tax.julS':'2nd payment on account',
 'tax.poaReduce':'Expect a lower profit next year? You can ask HMRC to reduce your payments on account — but reduce too far and they charge interest.',
 'tax.noPoa':'your full bill — no payments on account needed (under £1,000)',
 'tax.accT':'How accurate is this?',
 'tax.accB':'Uses {y} rates for England, Wales and Northern Ireland (Scotland has different Income Tax bands). Assumes self-employment is your only income — PAYE jobs, savings interest, dividends and student loans aren’t included yet. A planning estimate, not tax advice: always confirm with HMRC or an accountant before filing.',
 'tax.disc':'Estimate only — not tax advice.','tax.estimateWarn':'This is an estimate, not your final tax. You must still file with HMRC by 31 Jan. Not affiliated with HMRC.',
 'a.title':'Your HMRC position',
 'a.sub':'Two numbers from your last Self Assessment that change what you actually pay this year.',
 'a.poaLabel':'Payments on account already made for this year',
 'a.poaHint':'The advance payments (31 Jan + 31 Jul) HMRC asked for based on last year. Enter the total, or 0 if none.',
 'a.priorLabel':'Adjustment from last year',
 'a.priorHint':'Underpaid last year and it rolled forward? Enter it as positive. Overpaid and it’s being knocked off? Enter negative (e.g. -120).',
 'm.title':'Settings',
 'm.biz':'Businesses',
 'm.lang':'Language',
 'm.backup':'Back up & restore',
 'm.backupHint':'Your figures are already saved to the cloud. Download a local copy as extra insurance.',
 'm.export':'Back up data (JSON)',
 'm.backupFull':'Full backup','m.backupFullS':'Includes your TaxMate data and receipt files (ZIP)',
 'm.backupData':'Data-only backup','m.backupDataS':'TaxMate records only; receipt files are not included (JSON)',
 'm.csv':'Export entries (CSV)',
 'm.restore':'Restore from backup',
 'm.danger':'Danger zone','m.eraseCloud':'Delete all my data (incl. cloud)','m.eraseCloudT':'Delete your TaxMate account data?','m.eraseCloudM':'This permanently deletes your personal businesses, entries, receipts and settings from this device and TaxMate cloud. Your membership is removed from shared partnerships; records remain for other members. Provider backups and legally required billing records may remain for limited periods. Export a backup first.','m.erasing':'Erasing your data…','m.erasedAll':'Your personal TaxMate account data has been deleted from this device and cloud. Shared partnership records may remain for other members.','m.erasedLocal':'Local data deleted. Cloud data could not be reached — try again when online.',
 'm.reset':'Delete all data on this device',
 'm.resetT':'Delete everything?',
 'm.resetM':'This wipes all businesses, entries and settings from this device. There is no undo. Export a backup first if in doubt.',
 'm.foot':'TaxMate UK · free, private, offline. Estimates only — not tax advice.',
 'd.entryT':'Delete this entry?',
 'd.entryM':'It will be removed permanently.',
 'd.bizT':'Delete this business?',
 'd.bizM':'All its income and expense entries will be deleted too. There is no undo.',
 'r.title':'Restore this backup?',
 'r.msg':'It will replace everything currently on this device.',
 'r.bad':'That file is not a TaxMate backup.',
 'cat.vehicle':'Vehicle & fuel',
 'cat.travel':'Travel & parking',
 'cat.phone':'Phone & internet',
 'cat.home':'Home working',
 'cat.equip':'Equipment & tools',
 'cat.office':'Office & admin',
 'cat.stock':'Stock & materials',
 'cat.insure':'Insurance',
 'cat.fees':'Professional fees',
 'cat.market':'Marketing & subs',
 'cat.repair':'Repairs',
 'cat.other':'Other expense',
 'cat.sales':'Work income',
 'cat.tips':'Tips & bonuses',
 'cat.royalty':'Royalties',
 'cat.otherin':'Other income',
 'rc.add':'Add receipt',
 'rc.take':'Take photo','rc.upload':'Upload receipt','rc.chooseExisting':'Choose existing photo',
 'rc.imagesOnly':'Image files only',
 'rc.view':'View receipt',
 'rc.delete':'Delete receipt',
 'rc.uploading':'Uploading…','rc.signinNeeded':'Please sign in again to save to the cloud',
 'rcb.tab':'Receipts',
 'rcb.title':'Add receipts',
 'rcb.intro':'Pick a category and month, then add a receipt for each expense that still needs one.',
 'rcb.cat':'Category',
 'rcb.month':'Month',
 'rcb.allMonths':'All months',
 'rcb.noMissing':'Every expense here already has a receipt. 🎉',
 'rcb.pickCat':'Pick a category to see expenses that need a receipt.',
 'rcb.noExpenses':'No expenses in this category yet.',
 'rcb.add':'Add',
 'rcb.done':'✓',
 'rcb.uploading':'Uploading…',
 'rcb.remaining':'{n} still need a receipt',
 'rcb.allDone':'All done — every expense here has a receipt.',
 'rcb.tip':'Two receipts for one expense? Put them side by side in one image.',
 'car.rcTitle':'Snap your receipts',
 'car.rcBody':'Attach photos to your expenses in one place.',
 'car.rcCta':'Add receipts →',
 'car.rcLockedBody':'A Plus feature — attach photo proof to expenses.',
 'car.rcLockedCta':'See Plus →',
 'rc.uploadErr':'Upload failed — try again',
 'rc.deleteConfirm':'Delete this receipt photo?',
 'rc.proOnly':'Receipt photos are a Plus feature — unlock in Settings.',
 'pdf.download':'Download report (PDF)',
 'pdf.title':'Tax Summary',
 'pdf.generated':'Generated',
 'pdf.business':'Business',
 'pdf.structure':'Structure',
 'pdf.period':'Tax year',
 'pdf.income':'Total income',
 'pdf.expenses':'Total expenses (claimable)',
 'pdf.profit':'Profit',
 'pdf.estTax':'Estimated tax',
 'pdf.incomeDetail':'Income entries',
 'pdf.expenseDetail':'Expense entries',
 'pdf.taxCalc':'Tax calculation',
 'pdf.date':'Date',
 'pdf.category':'Category',
 'pdf.description':'Description',
 'pdf.amount':'Amount',
 'pdf.bizPct':'Biz %',
 'pdf.claimable':'Claimable',
 'pdf.pa':'Personal Allowance',
 'pdf.taxable':'Taxable income',
 'pdf.incomeTax':'Income Tax',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'Total bill',
 'pdf.disclaimer':'Estimate only — not tax advice. Confirm with HMRC or an accountant before filing.',
 'pdf.noEntries':'No entries for this period.',
 'mi.title':'Mileage vs actual expenses',
 'mi.sub':'HMRC lets you claim 55p/mile (first 10,000) and 25p/mile after — instead of logging every receipt. TaxMate compares both so you know which saves you more tax.',
 'mi.miles':'Miles driven this year',
 'mi.milesClaim':'Mileage claim',
 'mi.actual':'Your logged vehicle costs',
 'mi.diff':'Difference',
 'mi.bestMile':'Mileage wins',
 'mi.bestActual':'Actual expenses win',
 'mi.equal':'About equal',
 'mi.saveMile':'Mileage gives {x} more deduction',
 'mi.saveActual':'Actual expenses give {x} more deduction',
 'mi.adviceMile':'Switch to mileage claiming — it beats your logged receipts by {x}. You can still claim other non-vehicle expenses normally.',
 'mi.adviceActual':'Keep logging receipts — your actual costs beat the mileage rate by {x}. Every receipt counts.',
 'mi.adviceEqual':'Both methods give a similar result. Keep logging receipts to stay flexible.',
 'mi.noVehicle':'No vehicle or travel expenses logged yet — add some to compare.',
 'mi.enterMiles':'Enter miles to compare',
 'mi.carsOnly':'Applies to sole trader businesses only (not partnerships).',
 'mi.rate':'55p first 10,000 mi · 25p after',
 'sa.title':'Self Assessment reference',
 'sa.sub':'Numbers to copy into your tax return at gov.uk — saves looking them up yourself.',
 'sa.103':'SA103 · Self-employed (sole trader)',
 'sa.104':'SA104 · Partnership income',
 'sa.box':'Box',
 'sa.value':'Value',
 'sa.description':'What it means',
 'sa.copy':'Copy',
 'sa.copied':'Copied!',
 'sa.expBreakdown':'Expense breakdown (boxes 19–35)',
 'sa.taNote':'You used the £1,000 Trading Allowance — tick Box 38 on your return.',
 'sa.lossNote':'You made a loss this year — enter in Box 11, leave Box 10 blank.',
 'sa.partNote':'Complete one SA104 page per partnership.',
 'sa.govLink':'File your Self Assessment at gov.uk',
 'tip.title':'Helper',
 'tip.dismiss':'Dismiss',
 'tip.addNow':'Add now',
 'tip.home_t':'Claim home working allowance',
 'tip.home_b':'HMRC allows £6/week (£312/year) flat rate when you work from home — no receipts needed. You haven\'t logged any home working expenses yet.',
 'tip.phone_t':'Claim your phone bill',
 'tip.phone_b':'If you use your phone for work, you can claim the business portion. Even 50% of a £30/month bill saves you £36/year in tax. Nothing logged yet.',
 'tip.c2_t':'Protect your State Pension',
 'tip.c2_b':'Your profit is below the Class 2 NI threshold (£6,845). Pay £182/year voluntarily to protect your State Pension record — it\'s optional but worth it.',
 'tip.poa_t':'January surprise incoming',
 'tip.poa_b':'Your bill is over £1,000 — HMRC will ask for two advance payments towards next year (31 Jan + 31 Jul). Set aside {x} extra on top of your balancing payment.',
 'tip.mileage_t':'Compare mileage vs receipts',
 'tip.mileage_b':'You have vehicle costs logged but haven\'t entered your mileage. Scroll up to check if the 55p/mile rate beats your actual costs.',
 'tip.receipt_t':'Missing receipt photos',
 'tip.receipt_b':'{n} expense {e} no receipt photo. HMRC can ask for proof — attach photos while the receipts are fresh.',
 'tip.entry':'entry has',
 'acc.export':'Download accountant pack (CSV)',
 'acc.prepared':'Prepared by TaxMate UK — estimate only, not tax advice',
 'qt.title':'Quarterly breakdown',
 'qt.q1':'Q1  6 Apr – 5 Jul',
 'qt.q2':'Q2  6 Jul – 5 Oct',
 'qt.q3':'Q3  6 Oct – 5 Jan',
 'qt.q4':'Q4  6 Jan – 5 Apr',
 'qt.current':'current',
 'qt.income':'Income',
 'qt.expenses':'Expenses',
 'qt.profit':'Profit',
 'qt.noData':'No entries this quarter.',
 'mtd.title':'Making Tax Digital (MTD)',
 'mtd.50k':'MTD applies to you from April 2026 — your profit is over £50,000.',
 'mtd.30k':'MTD applies to you from April 2027 — your profit is over £30,000.',
 'mtd.20k':'MTD applies to you from April 2028 — your profit is over £20,000.',
 'mtd.ok':'MTD not required yet — threshold is £20,000. Keep records in case rules change.',
 'mtd.what':'TaxMate helps you keep records and prepare summaries. It does not submit MTD updates to HMRC. If MTD applies, use HMRC-compatible software for submission.',
 'mtd.required':'Based on gross qualifying income of {x}, MTD is expected to apply from {d}.',
 'mtd.notRequired':'Based on gross qualifying income of {x}, this year does not cross the {y} threshold.',
 'mtd.incomplete':'Add all gross property income before relying on this assessment.',
 'mtd.unsupported':'No assessment is shown because the official threshold mapping for this tax year is not bundled.',
 'sa.future':'The official short-form mapping for this tax year is not yet bundled. TaxMate will not guess future form boxes.',
 'cal.export':'Add tax dates to calendar (.ics)',
 'cal.desc':'UK tax deadlines with 7-day reminders — opens in your calendar app.',
 'nb.jan':'Self Assessment due in {n} day{s} — 31 January',
 'nb.jul':'Payment on account due in {n} day{s} — 31 July',
 'nb.today_jan':'Self Assessment due TODAY — 31 January',
 'nb.today_jul':'Payment on account due TODAY — 31 July',
 'nb.days':'days',
 'nb.day':'day',
 'toast.saved':'Saved',
 'toast.deleted':'Deleted',
 'toast.restored':'Backup restored',
 'toast.calAdded':'Calendar file downloaded',
 'm.theme':'Appearance',
 'theme.auto':'Auto',
 'theme.light':'Light',
 'theme.dark':'Dark',
 'cc.rename':'Rename categories',
 'cc.renameHint':'Tap a category to give it your own name.',
 'cc.editName':'Category name',
 'cc.reset':'Reset to default',
 'cc.renameDone':'Renamed',
 'cc.longPress':'Tap ＋ to add. Long-press (or tap ✎) any category to edit or remove.',
 'cc.action':'What would you like to do?',
 'cc.doRename':'Rename',
 'cc.doDelete':'Remove from list',
 'cc.deleted':'Removed',
 'cc.emojiHint':'Tap below and pick any emoji from your keyboard to use as the icon.','cc.emojiErr':'Please choose an icon',
 'cc.delDataT':'Remove this category?',
 'cc.delDataM':'This category has {n} entr{s}. Removing it won\'t delete those entries — they\'ll keep their category. You can re-add it later.',
 'cc.cantDeleteUsed':'This category has entries — it will stay visible until those are removed.',
 'b.trade':'Type of work',
 'b.tradeHint':'We\'ll suggest expense categories — you can change them anytime.',
 'trade.delivery':'Delivery / Driver',
 'trade.construction':'Construction / Trades',
 'trade.consultant':'Consultant / IT',
 'trade.creative':'Creative / Media',
 'trade.cleaning':'Cleaning / Domestic',
 'trade.beauty':'Beauty / Personal care',
 'trade.retail':'Retail / Online shop',
 'trade.other':'Other',
 'sug.title':'Suggested categories',
 'sug.hint':'Based on your type of work. Tap to add the ones you need — skip any you don\'t.',
 'sug.add':'Add selected',
 'sug.skip':'Skip',
 'sug.added':'{n} categories added',
 'f.repeat':'Repeat monthly',
 'f.repeatHint':'Fixed monthly cost? Add it for all 12 months of the tax year in one tap.',
 'f.dateLocked':'Pick a date within tax year {y}.',
 'f.repeatFrom':'Repeat from',
 'f.recQ':'This is a monthly repeating expense.',
 'f.recThis':'Only this month',
 'f.recFuture':'This + future months',
 'f.repeatAdded':'Added for {n} months',
 'f.repeatOff':'One-off',
 'f.repeatOn':'Every month',
 'f.repeatPick':'Which months? Tap to include.',
 'f.tbc':'TBC',
 'f.tbc2':'To be confirmed',
 'ob.h1':'Self-employed bookkeeping and tax, made simple.',
 'ob.chooseLang':'Choose your language',
 'ob.lede':'Add your income. Add your expenses. See your estimated tax.',
 'ob.signIn':'Sign in',
 'ob.signInS':'Save your data & sync across devices',
 'ob.noAcc':'Start without an account',
 'ob.noAccS':'Stays on this phone — sign in anytime',
 'ob.codeLogin':'Got a partner sync code? — please sign in first.',
 'ob.howStart':'How would you like to get started?',
 'ob.together':'Let\'s do this together',
 'ob.togetherS':'I\'ll walk you through it — then you\'ll know what you owe.',
 'ob.dash':'Go straight to dashboard',
 'ob.dashS':'I know what I\'m doing.',
 'ob.codeEntry':'Got a partner sync code? Choose “Go straight to dashboard”, then go to Settings to enter it.',
 'ob.run':'How do you run it?',
 'ob.partner':'With a partner',
 'ob.shareLabel':'Your share of the profit',
 'ob.shareHint':'Only this share of the profit is taxed as yours. Most equal partnerships are 50%.',
 'ob.syncTitle':'Sync with your partner',
 'ob.joinCode':'Joining code',
 'ob.remove':'Remove',
 'ob.syncHint':'If your partner already uses TaxMate, enter their partner sync code to keep both phones in sync.',
 'ob.enterCode':'Enter partner\'s code',
 'ob.later':'I\'ll do this later',
 'ob.syncPro':'Keeping both phones in sync is a Pro feature — sign in and upgrade any time in Settings. Your figures still work perfectly on this phone without it.',
 'ob.step1':'Step 1 of 3 · Your work',
 'ob.whatDo':'What do you do?',
 'ob.bizLede':'Your business name — most people just put their job.',
 'ob.bizName':'Business name',
 'ob.bizPh':'e.g. Evri driver',
 'ob.bizEg':'Uber driver · Cleaner · Handyman · Deliveroo',
 'ob.continue':'Continue',
 'ob.codePrompt':'Enter your partner\'s 8-character partner sync code:',
 'ob.catchBiz':'Catch up · pick a business',
 'ob.whichBiz':'Which business?',
 'ob.pickLede':'Add the past months to the right business. You can catch up the others separately.',
 'ob.soleTag':'Sole trader',
 'ob.partTag':'Partnership · your {s}%',
 'ob.addFrom':'Add my figures from {m}',
 'ob.catchMonth':'Catch up · pick a month',
 'ob.step2':'Step 2 of 3 · Start month',
 'ob.whereStart':'Where shall we start?',
 'ob.startLede':'Pick the first month you want to add figures for. We\'ll go month by month from there.',
 'ob.taxYearNote':'The UK tax year runs April → April.',
 'ob.step3':'Step 3 of 3 · {a} of {b} months',
 'ob.yourWork':'Your work',
 'ob.addAnother':'Add another',
 'ob.split':'Split into categories',
 'ob.addAgain':'Add again:',
 'ob.close':'Close',
 'ob.pickIcon':'Pick an icon and add a category — fuel, phone, insurance…',
 'ob.addCat':'Add category',
 'ob.details':'Details',
 'ob.from':'From?',
 'ob.catInPh':'e.g. Uber Eats, Evri, Amazon',
 'ob.catOutPh':'e.g. Fuel, Insurance, Phone',
 'ob.drive':'🚗 Did you drive for work?',
 'ob.addMiles':'Add mileage',
 'ob.milesIn':'Business miles in {m}',
 'ob.milesPh':'e.g. 850',
 'ob.mileHintA':'Claimed at {p}p per mile',
 'ob.mileHintB':' · ≈ £{x} deduction',
 'ob.mileHintC':'. Only if you haven\'t already added fuel as an expense.',
 'ob.noDrive':'No driving this month',
 'ob.soFar':'{m} so far',
 'ob.nextMonth':'Next month →',
 'ob.finishBtn':'Finish & see my tax',
 'ob.allCaught':'All caught up',
 'ob.estLabel':'Estimated tax set aside',
 'ob.basedOn':'based on {n} month(s) so far',
 'ob.monthsAdded':'Months added',
 'ob.totIn':'Total income',
 'ob.totOut':'Total expenses',
 'ob.mileRow':'Mileage ({n} mi)',
 'ob.profitFar':'Profit so far',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'You\'re all caught up. {n} item(s) can be tidied up later — you\'ll find them flagged on your dashboard. From here, just tap ＋ whenever money comes in or goes out.',
 'ob.cleanLine':'You\'re all caught up. From here, just tap ＋ whenever money comes in or goes out — TaxMate keeps the rest up to date.',
 'ob.goDash':'Go to my dashboard',
 'ob.estWarn':'⚠️ Estimate only — not your final tax. You still file with HMRC by 31 Jan.',
 'sec.account':'Account',
 'sec.biz':'Your businesses',
 'sec.prefs':'Preferences',
 'sec.data':'Backup & data',
 'sec.report':'Reports',
 'rep.desc':'A full year summary — for yourself, your accountant, or a mortgage application.',
 'sec.legal':'About & legal',
 'leg.privacy':'Privacy policy',
 'leg.terms':'Terms of use',
 'leg.disclaimer':'Tax disclaimer',
 'leg.disclaimerBody':'TaxMate gives estimates to help you plan. It is not tax advice and not a substitute for an accountant or HMRC. Always confirm figures before filing.',
 'leg.version':'Version',
 'leg.madeIn':'Made in the UK for self-employed people.',
 'f.catErr':'Pick a category',
 'f.dateOtherYear':'This date falls in tax year {y} — the entry will show there.',
 'tax.emptyT':'Add a business to see your tax estimate',
 'tax.emptyS':'Your tax picture appears here once you add a business and start logging income.',
 'tip.entries':'entries have',
 'fd.title':'Folder',
 'fd.add':'New folder',
 'fd.name':'Folder name',
 'fd.none':'No folder',
 'fd.manage':'Folders',
 'fd.deleteM':'Entries keep their data — they just lose this folder label.',
 'fd.all':'All folders',
 'cc.add':'New category',
 'cc.name':'Category name',
 'cc.colour':'Colour',
 'cc.emoji':'Icon',
 'cc.manage':'My categories',
 'cc.deleteM':'Entries using it will show as "Other".',
 'pro.title':'TaxMate plans','pro.sub':'Free does the basics forever. Upgrade for smarter, fuller features.','billing.monthly':'Monthly','billing.yearly':'Yearly','billing.billedYearly':'Billed yearly',
 'tier.free':'Free','tier.plus':'Plus','tier.pro':'Pro',
 'tier.freeSub':'Everything to track and file it yourself','tier.plusSub':'Save more, work smarter','tier.proSub':'For partnerships & serious traders',
 'tier.current':'Current plan','tier.choose':'Choose {p}','tier.active':'Active',
 'feat.records':'Income & expenses','feat.taxcalc':'Tax estimate','feat.onebiz':'One business','feat.mileageBasic':'Mileage total','feat.sa103view':'SA103 reference','feat.sync':'Cloud sync','feat.backup':'Backup & restore',
 'feat.mileageCompare':'Mileage comparison','feat.aiTips':'Helper (tips & reminders)','feat.multiBiz':'Multiple businesses','feat.receiptPhoto':'Receipt photos','feat.pdfReport':'PDF tax report',
 'feat.partnerSync':'Partner Sync','feat.sa104':'SA104 partnership working paper','feat.receiptPack':'Receipt Pack PDF','feat.mtdReady':'Quarterly record summary (no HMRC submission)',
 'lock.title':'A {p} feature','lock.body':'This is part of TaxMate {p}. Upgrade to unlock it.','lock.upgrade':'See plans','home.signinTitle':'Back up your data','home.signinSub':'Sign in to save your records to the cloud and sync across devices.','home.signinBtn':'Sign in','pwa.install':'Download','pwa.installSub':'Get the app on your phone.','pwa.iosTitle':'Add to Home Screen','pwa.iosBody':'To install on iPhone, do it from Safari:','pwa.iosStep1':'Tap the Share button (the square with an arrow) at the bottom of Safari','pwa.iosStep2':'Scroll down and tap \"Add to Home Screen\"','pwa.iosStep3':'Tap \"Add\" — done! The TaxMate icon appears on your home screen','pwa.iosNote':'Note: this only works in Safari, not Chrome or other browsers on iPhone.','pwa.andTitle':'Install the app','pwa.andBody':'Your browser did not show the install button automatically. You can still install it:','pwa.andStep1':'Tap the menu (⋮) at the top-right of Chrome','pwa.andStep2':'Tap \"Install app\" or \"Add to Home screen\"','pwa.andStep3':'Confirm — the TaxMate icon appears on your home screen','pwa.andTip':'Tip: if you only see \"Add to Home screen\" (a shortcut), close this site, clear the browser cache for it, reopen and wait a few seconds — then \"Install app\" should appear for a cleaner app.','pdf.enHint':'PDF reports are generated in English. Names you type in other languages may not appear — use English for anything you want shown in the PDF.','lang.pdfHint':'Tip: PDF reports export in English only. Type business and category names in English if you need them in your PDF.','pro.titleOld':'TaxMate Pro','rp.title':'Receipt Pack','rp.desc':'Bundle every receipt photo into one PDF for HMRC — one receipt per page with its details.','rp.btn':'Export Receipt Pack','rp.none':'No receipt photos in this period yet.','rp.building':'Building Receipt Pack…','rp.page':'Receipt {i} of {n}',
 'pro.sub':'Free for the essentials. Upgrade when you need more.',
 'sy.title':'Partner sync',
 'sy.enable':'Sync with my partner',
 'sy.code':'Partnership code',
 'sy.invite':'Invite my partner',
 'sy.inviteMsg':'Hey! This is the partner sync code for "{n}" on TaxMate UK. 🤝\nGo to taxmate.uk\n1. Tap "Sign in"\n2. Choose "🚀 Go straight to dashboard"\n3. Tap "Settings" — lower right corner 😉\n4. Upgrade to Pro\n5. Then enter code: {c}',
 'sy.join':'Got a code from your partner? Enter it and everything syncs automatically.',
 'sy.enterCode':'Enter the code',
 'sy.synced':'Synced',
 'sy.badCode':'Code not found — check it and try again.',
 'sy.needPro':'Partner sync is a Pro feature — unlock it in More.',
 'sy.needNet':'Couldn\'t reach the sync service — check your connection.',
 'sy.setup':'Sync isn\'t configured in this copy of the app yet.',
 'sy.leave':'Stop syncing on this device',
 'sy.copied':'Copied!',
 'sy.saveFirst':'Save the business first, then turn on sync.',
 'ac.title':'Account & cloud',
 'ac.why':'Sign in and your figures follow you — new phone, same data. Free.',
 'ac.google':'Continue with Google',
 'ac.signedAs':'Signed in as',
 'ac.signout':'Sign out',
 'ac.signoutM':'Your data stays on this phone and in your cloud. Sign in again anytime.',
 'ac.local':'This device only — sign in to back up automatically.',
 'ac.needSignInTitle':'Sign in required',
 'ac.needSignInBody':'Plus and Pro need an account, so your plan follows you across devices. Sign in below, then choose your plan.',
 'ac.cloudOn':'Cloud backup on',
 'ac.err':'Sign-in didn\'t work — try again.',
 'ac.needNet':'Sign-in needs a connection.'
},
zh:{
 'nav.home':'主頁',
 'nav.income':'收入',
 'nav.expenses':'開支',
 'nav.tax':'稅務',
 'nav.more':'設定',
 'c.save':'儲存',
 'c.cancel':'取消','c.discardConfirm':'放棄更改？','c.discardConfirmM':'你未儲存嘅資料將會消失。',
 'c.edit':'編輯',
 'c.yes':'確定',
 'c.active':'使用中',
 'home.hi':'你好 👋',
 'home.profit':'你的利潤 · {y}',
 'home.in':'收入',
 'home.out':'開支',
 'home.taxT':'預留交稅',
 'home.taxS':'根據目前利潤估算的稅款',
 'home.oweLine':'預計需要繳交嘅稅項',
 'home.biz':'你的業務',
 'home.addBiz':'新增業務',
 'home.recent':'最近記錄',
 'home.share':'你的份額',
 'tag.sole':'個體經營',
 'tag.part':'合夥',
 'tag.your':'你佔 {n}%',
 'w.title':'歡迎使用 TaxMate 👋',
 'w.sub':'知道自己要留幾多稅 — 唔使等到 1 月 31 日先驚。免費、私密、無需註冊。',
 'w.priv':'🔒 私隱至上。數據只屬於你 — 留喺裝置,登入先會安全同步上雲。',
 'w.steps':'1 · 揀你做咩(司機、清潔等)\n2 · 撳 ＋ 記低收入同支出\n3 · 即時睇到稅款估算 — 唔使計數，唔使煩',
 'w.start':'新增第一個業務',
 'inc.title':'收入',
 'inc.add':'新增收入',
 'inc.empty':'未有收入記錄',
 'inc.emptyS':'隨時記錄收入 — 稅款估算即時更新。',
 'exp.title':'開支',
 'exp.add':'新增開支',
 'exp.empty':'未有開支記錄',
 'exp.emptyS':'每筆開支均有助減低應繳稅款。',
 'flt.all':'全部',
 'f.amount':'金額',
 'f.date':'日期',
 'f.business':'生意',
 'f.category':'類別',
 'f.note':'備註',
 'f.optional':'(可不填)',
 'f.amountErr':'請輸入大於 0 的金額',
 'f.bizUse':'業務用途比例','f.bizUsePartial':'部分私人使用?',
 'f.bizUseHint':'部分私人使用(例如電話)?只申報業務部分 — HMRC 要求合理分攤。',
 'f.addIncome':'新增收入',
 'f.editIncome':'編輯收入',
 'f.addExpense':'新增開支',
 'f.editExpense':'編輯開支',
 'f.deleteEntry':'刪除此記錄',
 'b.add':'新增生意',
 'b.edit':'編輯生意',
 'b.name':'生意名稱',
 'b.nameErr':'請輸入名稱',
 'b.setup':'經營模式',
 'b.justMe':'淨係我',
 'b.partnership':'合夥',
 'b.soleHint':'自己一個做,利潤全歸你。',
 'b.partHint':'同人合夥分利潤,只有你嗰份需要交稅。',
 'b.share':'你的利潤份額 (%)',
 'b.delete':'刪除此業務及所有記錄',
 'tax.bill':'估算稅款 · {y}',
 'tax.it':'入息稅',
 'tax.c4':'Class 4 國民保險',
 'tax.fileBy':'{d} 前報稅及繳款',
 'tax.taT':'實報開支 vs £1,000 免稅額',
 'tax.taHint':'HMRC允許以 £1,000 統一扣除額代替實際開支（Trading Allowance，不適用於合夥）。以利潤較低的方式計算為佳 — TaxMate自動為你比較。',
 'tax.taActual':'實報開支後利潤',
 'tax.taAllow':'用 £1,000 免稅額後利潤',
 'tax.taBest':'最抵選擇',
 'tax.taSave':'節省 {x} 利潤',
 'tax.auto':'自動',
 'tax.allowance':'免稅額',
 'tax.expensesOpt':'實報',
 'tax.using':'使用中:{x}',
 'tax.autoNote':'「自動」永遠幫你揀最抵嗰個。',
 'tax.usingAllow':'£1,000 trading allowance',
 'tax.usingExp':'實報開支',
 'tax.how':'計算明細',
 'tax.taxableP':'你的應稅利潤',
 'tax.pa':'個人免稅額',
 'tax.paHint':'人人均有的免稅額',
 'tax.paRed':'已調低 — 收入超過 £100,000',
 'tax.taxable':'應稅收入',
 'tax.basic':'基本稅率',
 'tax.higher':'高稅率',
 'tax.addl':'附加稅率',
 'tax.on':'於',
 'tax.c4Hint':'利潤 £12,570–£50,270 收 6%,以上收 2%',
 'tax.c2':'Class 2 國民保險',
 'tax.c2Paid':'利潤超過 £{x},自動當已繳 — 免費取得國家退休金供款記錄',
 'tax.c2Vol':'利潤低於 £{x} — 可自願繳 £{v} 保障國家退休金記錄',
 'tax.opt':'自選',
 'tax.total':'總稅款',
 'tax.payT':'實際要畀幾多',
 'tax.editPos':'編輯',
 'tax.thisBill':'今年稅款(上面)',
 'tax.priorAdj':'上年度調整',
 'tax.priorAdjS':'上年多交/少交滾存',
 'tax.poaPaid':'已繳 Payments on Account',
 'tax.balancing':'1月31日尾數 (Balancing Payment)',
 'tax.refund':'💚 似乎有得退稅。報稅後如果仍係負數,HMRC 會退錢畀你。',
 'tax.datesT':'繳款日期',
 'tax.poaWhy':'稅款超過 £1,000,HMRC 會要求預繳下年度兩期 Payments on Account — 每期一半。',
 'tax.janS':'尾數 + 下年度第一期預繳',
 'tax.julS':'下年度第二期預繳',
 'tax.poaReduce':'預計下年利潤會跌?可以向 HMRC 申請調低預繳 — 但調得太低會收利息。',
 'tax.noPoa':'全數繳付 — 稅款不足 £1,000,毋須預繳',
 'tax.accT':'呢個估算有幾準?',
 'tax.accB':'採用 {y} 年度英格蘭、威爾斯及北愛爾蘭稅率(蘇格蘭入息稅階不同)。假設自僱係你唯一收入 — 受僱 (PAYE)、利息、股息及學生貸款未計算在內。只屬規劃估算,並非稅務意見:報稅前請向 HMRC 或會計師核實。',
 'tax.disc':'只屬估算 — 並非稅務意見。','tax.estimateWarn':'呢個係估算,唔係你最終稅額。你仍然要喺 1 月 31 日前向 HMRC 報稅。與 HMRC 無關。',
 'a.title':'你的 HMRC 狀況',
 'a.sub':'來自上次 Self Assessment 的兩個數字，將影響你今年的實際應繳金額。',
 'a.poaLabel':'今年度已繳的 Payments on Account',
 'a.poaHint':'HMRC根據上年稅款要求的兩期預繳（1月31日+7月31日），請輸入總額；如無則填 0。',
 'a.priorLabel':'上年度調整',
 'a.priorHint':'上年交少咗滾存落今年?填正數。上年交多咗要扣減?填負數(例如 -120)。',
 'm.title':'設定',
 'm.biz':'生意',
 'm.lang':'語言',
 'm.backup':'備份與還原',
 'm.backupHint':'你的數據已自動備份至雲端。本地下載作為額外保障。',
 'm.export':'備份數據 (JSON)',
 'm.backupFull':'完整備份','m.backupFullS':'包含你的 TaxMate 數據同收據檔案（ZIP）',
 'm.backupData':'只備份數據','m.backupDataS':'只有 TaxMate 記錄；不包含收據檔案（JSON）',
 'm.csv':'匯出記錄 (CSV 可開 Excel)',
 'm.restore':'由備份還原',
 'm.danger':'危險地帶','m.eraseCloud':'刪除我所有資料（包括雲端）','m.eraseCloudT':'刪除你嘅 TaxMate 帳戶資料？','m.eraseCloudM':'呢個會永久刪除你喺本機同 TaxMate 雲端嘅個人生意、記錄、收據同設定。你會退出共享合夥；其他成員仍會保留共享記錄。供應商備份及法例要求嘅付款記錄可能有限期保留。請先匯出備份。','m.erasing':'正在刪除你嘅資料…','m.erasedAll':'你嘅個人 TaxMate 帳戶資料已從本機同雲端刪除；共享合夥記錄可能仍由其他成員保留。','m.erasedLocal':'本機資料已刪除。雲端資料無法連接 — 請喺有網絡時再試。',
 'm.reset':'刪除此裝置所有數據',
 'm.resetT':'刪除所有數據?',
 'm.resetM':'將清除此裝置上所有生意、記錄及設定,無法復原。如有疑問請先匯出備份。',
 'm.foot':'TaxMate UK · 免費、私隱、離線。只屬估算 — 並非稅務意見。',
 'd.entryT':'刪除此記錄?',
 'd.entryM':'將會永久移除。',
 'd.bizT':'刪除此生意?',
 'd.bizM':'其所有收入及開支記錄亦會一併刪除,無法復原。',
 'r.title':'還原此備份?',
 'r.msg':'將取代此裝置上現有所有數據。',
 'r.bad':'此檔案並非 TaxMate 備份。',
 'cat.vehicle':'車輛及燃油',
 'cat.travel':'交通及泊車',
 'cat.phone':'電話及網絡',
 'cat.home':'在家工作',
 'cat.equip':'設備及工具',
 'cat.office':'辦公及行政',
 'cat.stock':'存貨及材料',
 'cat.insure':'保險',
 'cat.fees':'專業費用',
 'cat.market':'宣傳及訂閱',
 'cat.repair':'維修',
 'cat.other':'其他開支',
 'cat.sales':'工作收入',
 'cat.tips':'小費及獎金',
 'cat.royalty':'版稅',
 'cat.otherin':'其他收入',
 'rc.add':'新增收據',
 'rc.take':'影相','rc.upload':'上載收據','rc.chooseExisting':'揀現有相片',
 'rc.imagesOnly':'只支援圖片檔',
 'rc.view':'查看收據',
 'rc.delete':'刪除收據',
 'rc.uploading':'上傳中…','rc.signinNeeded':'請重新登入以儲存到雲端',
 'rcb.tab':'收據',
 'rcb.title':'新增收據',
 'rcb.intro':'揀分類同月份,然後為每筆仲未有收據嘅開支加收據。',
 'rcb.cat':'分類',
 'rcb.month':'月份',
 'rcb.allMonths':'所有月份',
 'rcb.noMissing':'呢度每筆開支都已經有收據。🎉',
 'rcb.pickCat':'揀一個分類,睇下邊啲開支未有收據。',
 'rcb.noExpenses':'呢個分類仲未有開支。',
 'rcb.add':'新增',
 'rcb.done':'✓',
 'rcb.uploading':'上傳中…',
 'rcb.remaining':'仲有 {n} 筆未有收據',
 'rcb.allDone':'全部搞掂 — 呢度每筆開支都有收據。',
 'rcb.tip':'一筆開支有兩張單?將兩張並排放埋一張圖。',
 'car.rcTitle':'影低你啲收據',
 'car.rcBody':'喺同一個地方為開支貼上相片。',
 'car.rcCta':'新增收據 →',
 'car.rcLockedBody':'Plus 功能 — 為開支加上收據相片。',
 'car.rcLockedCta':'查看 Plus →',
 'rc.uploadErr':'上傳失敗，請再試',
 'rc.deleteConfirm':'刪除此收據相片？',
 'rc.proOnly':'收據相片為 Plus 功能，請在設定中解鎖。',
 'pdf.download':'下載報告 (PDF)',
 'pdf.title':'稅務摘要',
 'pdf.generated':'生成日期',
 'pdf.business':'業務',
 'pdf.structure':'類型',
 'pdf.period':'稅務年度',
 'pdf.income':'總收入',
 'pdf.expenses':'總開支（可申報）',
 'pdf.profit':'利潤',
 'pdf.estTax':'估算稅款',
 'pdf.incomeDetail':'收入明細',
 'pdf.expenseDetail':'開支明細',
 'pdf.taxCalc':'稅款計算',
 'pdf.date':'日期',
 'pdf.category':'類別',
 'pdf.description':'描述',
 'pdf.amount':'金額',
 'pdf.bizPct':'業務%',
 'pdf.claimable':'可申報',
 'pdf.pa':'個人免稅額',
 'pdf.taxable':'應稅收入',
 'pdf.incomeTax':'入息稅',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'總稅款',
 'pdf.disclaimer':'僅屬估算 — 並非稅務意見。申報前請向 HMRC 或會計師核實。',
 'pdf.noEntries':'此期間無記錄。',
 'mi.title':'里程 vs 實報開支',
 'mi.sub':'HMRC允許以每英里55p（首10,000英里）及25p（之後）代替逐筆收據申報。TaxMate自動比較兩種方案，找出最有利的選擇。',
 'mi.miles':'本年度行駛里程',
 'mi.milesClaim':'里程申報額',
 'mi.actual':'已記錄車輛開支',
 'mi.diff':'差額',
 'mi.bestMile':'里程方案較佳',
 'mi.bestActual':'實報方案較佳',
 'mi.equal':'兩者相若',
 'mi.saveMile':'里程方案多扣 {x}',
 'mi.saveActual':'實報方案多扣 {x}',
 'mi.adviceMile':'建議改用里程申報 — 比已記錄的收據多 {x}。其他非車輛開支仍可正常申報。',
 'mi.adviceActual':'建議繼續記錄收據 — 實際開支比里程方案多 {x}。每張收據都有價值。',
 'mi.adviceEqual':'兩種方法結果相若，繼續記錄收據可保持靈活性。',
 'mi.noVehicle':'尚未記錄車輛或交通開支 — 新增記錄後即可比較。',
 'mi.enterMiles':'輸入里程以比較',
 'mi.carsOnly':'僅適用於獨立經營業務（不適用於合夥）。',
 'mi.rate':'首10,000英里55p · 之後25p',
 'sa.title':'Self Assessment 報稅參考',
 'sa.sub':'直接將以下數字填入 gov.uk 嘅報稅表，省去自行查找。',
 'sa.103':'SA103 · 獨立經營（Sole Trader）',
 'sa.104':'SA104 · 合夥收入',
 'sa.box':'格',
 'sa.value':'數值',
 'sa.description':'說明',
 'sa.copy':'複製',
 'sa.copied':'已複製！',
 'sa.expBreakdown':'開支明細（第19–35格）',
 'sa.taNote':'你使用了 £1,000 Trading Allowance — 在報稅表第38格打剔。',
 'sa.lossNote':'今年錄得虧損 — 填入第11格，第10格留空。',
 'sa.partNote':'每個合夥填寫一頁 SA104。',
 'sa.govLink':'在 gov.uk 提交 Self Assessment',
 'tip.title':'小幫手',
 'tip.dismiss':'略過',
 'tip.addNow':'立即新增',
 'tip.home_t':'申報在家工作津貼',
 'tip.home_b':'HMRC 允許每週 £6（每年 £312）定額在家工作扣減，無需收據。你尚未記錄任何在家工作開支。',
 'tip.phone_t':'申報電話費',
 'tip.phone_b':'如果你用電話工作，可以申報業務部分。即使每月 £30 的 50% 也能每年省稅 £36。尚未記錄任何電話開支。',
 'tip.c2_t':'保障國家退休金記錄',
 'tip.c2_b':'你的利潤低於 Class 2 NI 起徵點（£6,845）。每年自願繳納 £182 可保障國家退休金記錄，可選擇但值得考慮。',
 'tip.poa_t':'注意1月份的額外繳款',
 'tip.poa_b':'你的稅款超過 £1,000 — HMRC 將要求預繳下年度兩期款項（1月31日 + 7月31日）。除尾數外，請額外預留 {x}。',
 'tip.mileage_t':'比較里程與實報開支',
 'tip.mileage_b':'你已記錄車輛開支，但尚未輸入里程。向上捲動查看 55p/英里方案是否比實際開支更合算。',
 'tip.receipt_t':'缺少收據相片',
 'tip.receipt_b':'{n} 筆開支{e}未附收據相片。HMRC 可能要求提供證明，請趁收據仍在手時補拍。',
 'tip.entry':'筆',
 'acc.export':'下載會計師報告 (CSV)',
 'acc.prepared':'由 TaxMate UK 生成 — 僅屬估算，並非稅務意見',
 'qt.title':'季度明細',
 'qt.q1':'第1季  4月6日 – 7月5日',
 'qt.q2':'第2季  7月6日 – 10月5日',
 'qt.q3':'第3季  10月6日 – 翌年1月5日',
 'qt.q4':'第4季  1月6日 – 4月5日',
 'qt.current':'當前',
 'qt.income':'收入',
 'qt.expenses':'開支',
 'qt.profit':'利潤',
 'qt.noData':'本季無記錄。',
 'mtd.title':'數碼報稅 (MTD)',
 'mtd.50k':'你的利潤超過 £50,000 — MTD 自2026年4月起適用。',
 'mtd.30k':'你的利潤超過 £30,000 — MTD 自2027年4月起適用。',
 'mtd.20k':'你的利潤超過 £20,000 — MTD 自2028年4月起適用。',
 'mtd.ok':'暫不需要 MTD — 起徵點為 £20,000。',
 'mtd.what':'MTD 要求每季透過 HMRC 認可軟件提交更新，代替每年一次申報。',
 'cal.export':'新增稅務日期至日曆 (.ics)',
 'cal.desc':'英國稅務截止日期，附7天前提醒。',
 'nb.jan':'{n}天後截止 Self Assessment — 1月31日',
 'nb.jul':'{n}天後繳交 Payment on account — 7月31日',
 'nb.today_jan':'今日截止 Self Assessment — 1月31日',
 'nb.today_jul':'今日截止 Payment on account — 7月31日',
 'nb.days':'天',
 'nb.day':'天',
 'toast.saved':'已儲存',
 'toast.deleted':'已刪除',
 'toast.restored':'備份已還原',
 'toast.calAdded':'日曆檔案已下載',
 'm.theme':'外觀',
 'theme.auto':'自動',
 'theme.light':'淺色',
 'theme.dark':'深色',
 'cc.rename':'重新命名分類',
 'cc.renameHint':'點按分類即可改成你自己的名稱。',
 'cc.editName':'分類名稱',
 'cc.reset':'還原預設',
 'cc.renameDone':'已重新命名',
 'cc.longPress':'撳 ＋ 新增。長按（或撳 ✎）任何分類可改名或移除。',
 'cc.action':'你想做什麼？',
 'cc.doRename':'重新命名',
 'cc.doDelete':'從列表移除',
 'cc.deleted':'已移除',
 'cc.emojiHint':'點下方輸入框，用鍵盤揀一個 emoji 做圖示。','cc.emojiErr':'請揀一個圖示',
 'cc.delDataT':'移除此分類？',
 'cc.delDataM':'此分類有 {n} 筆記錄。移除不會刪除這些記錄，它們會保留原分類。你可稍後再加回。',
 'cc.cantDeleteUsed':'此分類有記錄使用中 — 會繼續顯示直至相關記錄移除。',
 'b.trade':'工作類型',
 'b.tradeHint':'我們會建議開支分類 — 你可隨時更改。',
 'trade.delivery':'送貨 / 司機',
 'trade.construction':'建造 / 裝修',
 'trade.consultant':'顧問 / IT',
 'trade.creative':'創作 / 媒體',
 'trade.cleaning':'清潔 / 家居',
 'trade.beauty':'美容 / 個人護理',
 'trade.retail':'零售 / 網店',
 'trade.other':'其他',
 'sug.title':'建議分類',
 'sug.hint':'根據你的工作類型。點選你需要的，不需要的可略過。',
 'sug.add':'新增已選',
 'sug.skip':'略過',
 'sug.added':'已新增 {n} 個分類',
 'f.repeat':'每月重複',
 'f.repeatHint':'固定每月開支？一按即可為整個稅務年度的12個月一次過新增。',
 'f.dateLocked':'請選擇 {y} 稅務年度內的日期。',
 'f.repeatFrom':'從哪個月開始',
 'f.recQ':'這是一筆每月重複的開支。',
 'f.recThis':'只限這個月',
 'f.recFuture':'這個月及之後',
 'f.repeatAdded':'已新增 {n} 個月',
 'f.repeatOff':'單次',
 'f.repeatOn':'每月',
 'f.repeatPick':'邊幾個月？撳一下加入。',
 'f.tbc':'待定',
 'f.tbc2':'待定',
 'ob.h1':'幾秒之內<br>知道要交幾多稅',
 'ob.chooseLang':'選擇語言',
 'ob.lede':'收入、支出、稅項一目了然。唔使會計師，冇術語。',
 'ob.signIn':'登入',
 'ob.signInS':'儲存資料，多部裝置同步',
 'ob.noAcc':'唔開帳戶直接開始',
 'ob.noAccS':'資料只留喺呢部電話——隨時都可以登入',
 'ob.codeLogin':'有 partner sync code？請先登入。',
 'ob.howStart':'想點樣開始？',
 'ob.together':'一齊嚟啦',
 'ob.togetherS':'我會一步步陪你行——跟住你就知要交幾多稅。',
 'ob.dash':'直接去主頁',
 'ob.dashS':'我識㗎喇。',
 'ob.codeEntry':'有 partner sync code？揀「直接去主頁」，然後去「設定」輸入。',
 'ob.run':'你點樣經營？',
 'ob.partner':'同拍檔一齊',
 'ob.shareLabel':'你佔利潤幾多',
 'ob.shareHint':'只有你嗰份利潤先會當你嘅收入嚟計稅。大部分平分嘅合夥係 50%。',
 'ob.syncTitle':'同拍檔同步',
 'ob.joinCode':'加入代碼',
 'ob.remove':'移除',
 'ob.syncHint':'如果你拍檔已經用緊 TaxMate，輸入佢嘅 partner sync code 就可以兩部電話同步。',
 'ob.enterCode':'輸入拍檔嘅代碼',
 'ob.later':'遲啲先算',
 'ob.syncPro':'兩機同步係 Pro 功能——隨時喺「設定」登入同升級。冇佢，你嘅數字喺呢部電話一樣用得好好。',
 'ob.step1':'第 1 步（共 3 步）· 你嘅工作',
 'ob.whatDo':'你做邊行？',
 'ob.bizLede':'你嘅業務名——大部分人直接寫自己份工。',
 'ob.bizName':'業務名稱',
 'ob.bizPh':'例如：Evri 司機',
 'ob.bizEg':'Uber 司機 · 清潔 · 雜工 · Deliveroo',
 'ob.continue':'繼續',
 'ob.codePrompt':'輸入你拍檔嘅 8 位 partner sync code：',
 'ob.catchBiz':'補返舊數 · 揀業務',
 'ob.whichBiz':'邊個業務？',
 'ob.pickLede':'將過去嘅月份加落啱嘅業務。其他業務可以之後逐個補。',
 'ob.soleTag':'自僱經營',
 'ob.partTag':'合夥 · 你佔 {s}%',
 'ob.addFrom':'由 {m} 開始加數',
 'ob.catchMonth':'補返舊數 · 揀月份',
 'ob.step2':'第 2 步（共 3 步）· 起始月份',
 'ob.whereStart':'由邊個月開始？',
 'ob.startLede':'揀你想開始入數嘅第一個月，之後逐個月行。',
 'ob.taxYearNote':'英國稅年由 4 月至翌年 4 月。',
 'ob.step3':'第 3 步（共 3 步）· 第 {a}／{b} 個月',
 'ob.yourWork':'你嘅工作',
 'ob.addAnother':'加多一行',
 'ob.split':'拆分做分類',
 'ob.addAgain':'再加：',
 'ob.close':'關閉',
 'ob.pickIcon':'揀個 icon，加個分類——油費、電話、保險…',
 'ob.addCat':'加分類',
 'ob.details':'詳情',
 'ob.from':'邊度嚟？',
 'ob.catInPh':'例如：Uber Eats、Evri、Amazon',
 'ob.catOutPh':'例如：油費、保險、電話',
 'ob.drive':'🚗 呢個月有冇揸車開工？',
 'ob.addMiles':'加里數',
 'ob.milesIn':'{m} 嘅工作里數',
 'ob.milesPh':'例如：850',
 'ob.mileHintA':'每 mile 可扣 {p}p',
 'ob.mileHintB':' · ≈ 扣減 £{x}',
 'ob.mileHintC':'。如果已經入咗油費做支出就唔好重複。',
 'ob.noDrive':'呢個月冇揸車',
 'ob.soFar':'{m} 小計',
 'ob.nextMonth':'下一個月 →',
 'ob.finishBtn':'完成，睇我要交幾多稅',
 'ob.allCaught':'全部搞掂',
 'ob.estLabel':'預留稅款估算',
 'ob.basedOn':'按目前 {n} 個月計',
 'ob.monthsAdded':'已加月份',
 'ob.totIn':'總收入',
 'ob.totOut':'總支出',
 'ob.mileRow':'里數（{n} miles）',
 'ob.profitFar':'目前利潤',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'全部搞掂。有 {n} 項可以遲啲執靚——喺主頁會見到提示。之後有錢入或者出，撳 ＋ 就得。',
 'ob.cleanLine':'全部搞掂。之後有錢入或者出，撳 ＋ 就得——其餘 TaxMate 幫你搞。',
 'ob.goDash':'去我嘅主頁',
 'ob.estWarn':'⚠️ 只係估算，唔係最終稅款。你仍然要喺 1 月 31 日前向 HMRC 報稅。',
 'sec.account':'帳戶',
 'sec.biz':'你的業務',
 'sec.prefs':'偏好設定',
 'sec.data':'備份與數據',
 'sec.report':'報告',
 'rep.desc':'完整年度摘要 — 給自己、會計師或按揭申請使用。',
 'sec.legal':'關於與法律',
 'leg.privacy':'私隱政策',
 'leg.terms':'使用條款',
 'leg.disclaimer':'稅務免責聲明',
 'leg.disclaimerBody':'TaxMate 提供估算以協助你規劃。並非稅務意見，亦不能取代會計師或 HMRC。申報前請務必核實數字。',
 'leg.version':'版本',
 'leg.madeIn':'為英國自僱人士而設。',
 'f.catErr':'請選擇類別',
 'f.dateOtherYear':'此日期屬於 {y} 稅務年度 — 記錄將顯示在該年度。',
 'tax.emptyT':'新增業務後即可查看稅款估算',
 'tax.emptyS':'新增業務並開始記錄收入後，你的稅務概況將在此顯示。',
 'tip.entries':'筆',
 'fd.title':'資料夾',
 'fd.add':'新增資料夾',
 'fd.name':'資料夾名稱',
 'fd.none':'無資料夾',
 'fd.manage':'資料夾',
 'fd.deleteM':'資料夾內的記錄不會消失，只會移除資料夾標籤。',
 'fd.all':'全部資料夾',
 'cc.add':'新增類別',
 'cc.name':'類別名稱',
 'cc.colour':'顏色',
 'cc.emoji':'圖示',
 'cc.manage':'我的類別',
 'cc.deleteM':'使用中的記錄將顯示為「其他」。',
 'pro.title':'TaxMate 方案','pro.sub':'免費版永遠夠用。升級可享更智能、更全面的功能。','billing.monthly':'每月','billing.yearly':'每年','billing.billedYearly':'按年收費',
 'tier.free':'免費版','tier.plus':'進階版','tier.pro':'完整版',
 'tier.freeSub':'自己報稅所需的一切','tier.plusSub':'慳更多、做得更精明','tier.proSub':'為合夥與認真經營者而設',
 'tier.current':'目前方案','tier.choose':'選擇{p}','tier.active':'使用中',
 'feat.records':'收入與支出','feat.taxcalc':'稅務估算','feat.onebiz':'一個業務','feat.mileageBasic':'里程總數','feat.sa103view':'SA103 參考','feat.sync':'雲端同步','feat.backup':'備份與還原',
 'feat.mileageCompare':'里程與實際成本比較','feat.aiTips':'小幫手（提示）','feat.multiBiz':'多個業務','feat.receiptPhoto':'收據相片','feat.pdfReport':'PDF 稅務報告',
 'feat.partnerSync':'拍檔同步','feat.sa104':'SA104 合夥','feat.receiptPack':'整理收據 PDF','feat.mtdReady':'季度記錄摘要（不提交 HMRC）',
 'lock.title':'{p}功能','lock.body':'這是 TaxMate {p} 的功能，升級即可解鎖。','lock.upgrade':'查看方案','home.signinTitle':'備份你的資料','home.signinSub':'登入即可將記錄儲存到雲端，並跨裝置同步。','home.signinBtn':'登入','pwa.install':'下載','pwa.installSub':'將 app 安裝到手機。','pwa.iosTitle':'加到主畫面','pwa.iosBody':'喺 iPhone 安裝，要用 Safari 做：','pwa.iosStep1':'撳 Safari 底部嘅「分享」按鈕（一個方框加向上箭嘴 ⬆️）','pwa.iosStep2':'向下捲，撳「加入主畫面」','pwa.iosStep3':'撳「加入」— 搞掂！TaxMate 圖示會出現喺主畫面','pwa.iosNote':'注意：只可以喺 Safari 做，iPhone 上嘅 Chrome 或其他瀏覽器唔得。','pwa.andTitle':'安裝 app','pwa.andBody':'你個瀏覽器冇自動彈安裝掣。你仍然可以咁安裝：','pwa.andStep1':'撳 Chrome 右上角嘅選單（⋮）','pwa.andStep2':'撳「安裝應用程式」或「加到主畫面」','pwa.andStep3':'確認 — TaxMate 圖示會出現喺主畫面','pwa.andTip':'貼士：如果只見到「加到主畫面」（即係捷徑，icon 會有 Chrome 細圖），請關閉呢個網站、清除佢嘅瀏覽器快取、重新開啟並等幾秒 — 之後應該會出現「安裝應用程式」，裝出嚟先似真 app。','pdf.enHint':'PDF 報告以英文生成。你用中文輸入的名稱可能無法顯示 — 想在 PDF 中顯示的內容請用英文輸入。','lang.pdfHint':'提示：PDF 報告只以英文匯出。若需在 PDF 顯示業務或類別名稱，請用英文輸入。','rp.title':'收據包','rp.desc':'把所有收據相片整合成一個 PDF，供稅局查核 — 每頁一張收據連詳情。','rp.btn':'匯出收據包','rp.none':'此時段尚未有收據相片。','rp.building':'正在製作收據包…','rp.page':'收據 {i} / {n}','pro.titleOld':'TaxMate Pro',
 'pro.sub':'基本功能免費；有需要時先升級。',
 'sy.title':'合夥人同步',
 'sy.enable':'與合夥人同步',
 'sy.code':'合夥代碼',
 'sy.invite':'邀請合夥人',
 'sy.inviteMsg':'Hey！呢個係 TaxMate UK 上面「{n}」嘅 partner sync code。🤝\n去 taxmate.uk\n1. 撳「Sign in」\n2. 揀「🚀 Go straight to dashboard」\n3. 撳「Settings」——右下角 😉\n4. 升級做 Pro\n5. 然後輸入代碼：{c}',
 'sy.join':'收到合夥人的代碼？輸入後所有數據將自動同步。',
 'sy.enterCode':'輸入代碼',
 'sy.synced':'已同步',
 'sy.badCode':'找不到此代碼，請確認後重試。',
 'sy.needPro':'合夥人同步為 Pro 功能，請在「設定」中解鎖。',
 'sy.needNet':'無法連接同步服務，請檢查網絡。',
 'sy.setup':'此版本尚未設定同步服務。',
 'sy.leave':'在本裝置停止同步',
 'sy.copied':'已複製!',
 'sy.saveFirst':'請先儲存業務，再開啟同步。',
 'ac.title':'帳戶與雲端',
 'ac.why':'登入後數據隨你而行 — 更換新裝置，數據依然完好。免費。',
 'ac.google':'用 Google 繼續',
 'ac.signedAs':'已登入',
 'ac.signout':'登出',
 'ac.signoutM':'數據將保留於本裝置及雲端，可隨時重新登入。',
 'ac.local':'僅限本裝置 — 登入後即自動雲端備份。',
 'ac.needSignInTitle':'需要登入',
 'ac.needSignInBody':'Plus 同 Pro 需要帳戶,方案先可以跨裝置跟住你。喺下面登入,再揀方案。',
 'ac.cloudOn':'雲端備份開啟',
 'ac.err':'登入失敗,請再試。',
 'ac.needNet':'登入需要網絡連接。'
},
pl:{
 'nav.home':'Start',
 'nav.income':'Przychody',
 'nav.expenses':'Wydatki',
 'nav.tax':'Podatek',
 'nav.more':'Ustawienia',
 'c.save':'Zapisz',
 'c.cancel':'Anuluj','c.discardConfirm':'Odrzucić zmiany?','c.discardConfirmM':'Niezapisane dane zostaną utracone.',
 'c.edit':'Edytuj',
 'c.yes':'Tak, zrób to',
 'c.active':'Aktywny',
 'home.hi':'Cześć 👋',
 'home.profit':'Twój zysk · {y}',
 'home.in':'Przychody',
 'home.out':'Wydatki',
 'home.taxT':'Odłóż na podatek',
 'home.taxS':'Szacowany podatek od dotychczasowego zysku',
 'home.oweLine':'Szacowany podatek do zapłaty',
 'home.biz':'Twoje firmy',
 'home.addBiz':'Dodaj firmę',
 'home.recent':'Ostatnie wpisy',
 'home.share':'twój udział',
 'tag.sole':'Sole trader',
 'tag.part':'Spółka (partnership)',
 'tag.your':'twoje {n}%',
 'w.title':'Witaj w TaxMate 👋',
 'w.sub':'Zapisuj przychody i wydatki z samozatrudnienia i widź swój prawdziwy rachunek podatkowy — za darmo, prywatnie, bez rejestracji.',
 'w.priv':'🔒 Prywatność przede wszystkim. Twoje dane należą tylko do Ciebie — na urządzeniu, synchronizowane bezpiecznie tylko po zalogowaniu.',
 'w.steps':'1 · Dodaj swoją firmę\n2 · Zapisuj przychody i wydatki na bieżąco\n3 · Zakładka Podatek liczy rachunek na żywo — 31 stycznia już Cię nie zaskoczy',
 'w.start':'Dodaj pierwszą firmę',
 'inc.title':'Przychody',
 'inc.add':'Dodaj przychód',
 'inc.empty':'Brak przychodów',
 'inc.emptyS':'Zapisuj pieniądze na bieżąco — szacunek podatku aktualizuje się na żywo.',
 'exp.title':'Wydatki',
 'exp.add':'Dodaj wydatek',
 'exp.empty':'Brak wydatków',
 'exp.emptyS':'Każdy zapisany wydatek może zmniejszyć Twój podatek.',
 'flt.all':'Wszystko',
 'f.amount':'Kwota',
 'f.date':'Data',
 'f.business':'Firma',
 'f.category':'Kategoria',
 'f.note':'Notatka',
 'f.optional':'(opcjonalnie)',
 'f.amountErr':'Wpisz kwotę większą niż 0',
 'f.bizUse':'Użytek firmowy','f.bizUsePartial':'Częściowo prywatny?',
 'f.bizUseHint':'Częściowo prywatne (np. telefon)? Odlicz tylko część firmową — HMRC oczekuje uczciwego podziału.',
 'f.addIncome':'Dodaj przychód',
 'f.editIncome':'Edytuj przychód',
 'f.addExpense':'Dodaj wydatek',
 'f.editExpense':'Edytuj wydatek',
 'f.deleteEntry':'Usuń ten wpis',
 'b.add':'Dodaj firmę',
 'b.edit':'Edytuj firmę',
 'b.name':'Nazwa firmy',
 'b.nameErr':'Wpisz nazwę',
 'b.setup':'Forma działalności',
 'b.justMe':'Tylko ja',
 'b.partnership':'Spółka',
 'b.soleHint':'Pracujesz na własny rachunek i cały zysk jest Twój.',
 'b.partHint':'Prowadzisz z kimś i dzielicie zysk. Opodatkowany jest tylko Twój udział.',
 'b.share':'Twój udział w zysku (%)',
 'b.delete':'Usuń firmę i jej wpisy',
 'tax.bill':'Szacowany podatek · {y}',
 'tax.it':'Income Tax',
 'tax.c4':'Class 4 NI',
 'tax.fileBy':'Złóż i zapłać do {d}',
 'tax.taT':'Wydatki vs ulga £1,000',
 'tax.taHint':'HMRC pozwala odliczyć ryczałtem £1,000 od przychodu z samozatrudnienia zamiast realnych wydatków (nie dotyczy spółek). Wygrywa mniejszy zysk — TaxMate porównuje oba warianty.',
 'tax.taActual':'Zysk z realnymi wydatkami',
 'tax.taAllow':'Zysk z ulgą £1,000',
 'tax.taBest':'Najlepsze dla Ciebie',
 'tax.taSave':'oszczędza {x} zysku',
 'tax.auto':'Auto',
 'tax.allowance':'Ulga',
 'tax.expensesOpt':'Wydatki',
 'tax.using':'Używasz: {x}',
 'tax.autoNote':'Auto zawsze wybiera tańszą opcję.',
 'tax.usingAllow':'ulga £1,000 (trading allowance)',
 'tax.usingExp':'realne wydatki',
 'tax.how':'Jak to policzono',
 'tax.taxableP':'Twój zysk do opodatkowania',
 'tax.pa':'Personal Allowance',
 'tax.paHint':'kwota wolna od podatku dla każdego',
 'tax.paRed':'obniżona — dochód ponad £100,000',
 'tax.taxable':'Dochód do opodatkowania',
 'tax.basic':'Stawka podstawowa',
 'tax.higher':'Stawka wyższa',
 'tax.addl':'Stawka dodatkowa',
 'tax.on':'od',
 'tax.c4Hint':'6% od zysku £12,570–£50,270, 2% powyżej',
 'tax.c2':'Class 2 National Insurance',
 'tax.c2Paid':'zysk ponad £{x}, więc liczy się jako opłacone — darmowy kredyt do State Pension',
 'tax.c2Vol':'zysk poniżej £{x} — możesz dobrowolnie płacić £{v}, by chronić swoją State Pension',
 'tax.opt':'opcjonalne',
 'tax.total':'Razem do zapłaty',
 'tax.payT':'Ile faktycznie zapłacisz',
 'tax.editPos':'Edytuj',
 'tax.thisBill':'Tegoroczny rachunek (powyżej)',
 'tax.priorAdj':'Korekta z zeszłego roku',
 'tax.priorAdjS':'niedopłata/nadpłata przeniesiona',
 'tax.poaPaid':'Wpłacone już payments on account',
 'tax.balancing':'Dopłata (balancing payment) do 31 sty',
 'tax.refund':'💚 Wygląda na zwrot. Jeśli po złożeniu zeznania nadal będzie ujemne, HMRC odda Ci pieniądze.',
 'tax.datesT':'Terminy płatności',
 'tax.poaWhy':'Rachunek przekracza £1,000, więc HMRC poprosi też o dwie zaliczki (payments on account) na przyszły rok — po połowie.',
 'tax.janS':'dopłata + 1. zaliczka na przyszły rok',
 'tax.julS':'2. zaliczka na przyszły rok',
 'tax.poaReduce':'Spodziewasz się niższego zysku? Możesz poprosić HMRC o obniżenie zaliczek — ale za zbyt niskie naliczą odsetki.',
 'tax.noPoa':'cały rachunek — zaliczki niepotrzebne (poniżej £1,000)',
 'tax.accT':'Jak dokładny jest ten szacunek?',
 'tax.accB':'Stawki {y} dla Anglii, Walii i Irlandii Płn. (Szkocja ma inne progi). Zakłada, że samozatrudnienie to Twój jedyny dochód — etat (PAYE), odsetki, dywidendy i kredyt studencki nie są jeszcze uwzględnione. To szacunek do planowania, nie porada podatkowa — przed złożeniem potwierdź z HMRC lub księgowym.',
 'tax.disc':'Tylko szacunek — to nie porada podatkowa.','tax.estimateWarn':'To szacunek, nie ostateczny podatek. Nadal musisz złożyć zeznanie do HMRC do 31 stycznia. Niezwiązane z HMRC.',
 'a.title':'Twoja sytuacja z HMRC',
 'a.sub':'Dwie liczby z ostatniego Self Assessment, które zmieniają to, ile faktycznie zapłacisz.',
 'a.poaLabel':'Wpłacone już zaliczki na ten rok',
 'a.poaHint':'Zaliczki (31 sty + 31 lip) wyliczone z zeszłorocznego rachunku. Wpisz sumę lub 0.',
 'a.priorLabel':'Korekta z zeszłego roku',
 'a.priorHint':'Niedopłata przeniesiona na ten rok? Wpisz na plus. Nadpłata do odliczenia? Wpisz na minus (np. -120).',
 'm.title':'Ustawienia',
 'm.biz':'Firmy',
 'm.lang':'Język',
 'm.backup':'Kopia zapasowa',
 'm.backupHint':'Twoje dane są już w chmurze. Pobierz lokalną kopię jako dodatkowe zabezpieczenie.',
 'm.export':'Kopia zapasowa (JSON)',
 'm.backupFull':'Pełna kopia zapasowa','m.backupFullS':'Zawiera dane TaxMate i pliki paragonów (ZIP)',
 'm.backupData':'Kopia tylko z danymi','m.backupDataS':'Tylko zapisy TaxMate; pliki paragonów nie są dołączone (JSON)',
 'm.csv':'Eksport wpisów (CSV do Excela)',
 'm.restore':'Przywróć z kopii',
 'm.danger':'Strefa ryzyka','m.eraseCloud':'Usuń wszystkie moje dane (też w chmurze)','m.eraseCloudT':'Usunąć dane konta TaxMate?','m.eraseCloudM':'To trwale usuwa Twoje osobiste firmy, wpisy, paragony i ustawienia z urządzenia i chmury TaxMate. Członkostwo we wspólnych spółkach zostanie usunięte, ale dane pozostaną dla innych członków. Kopie dostawców i wymagane prawem dane płatnicze mogą pozostać przez ograniczony czas. Najpierw wyeksportuj kopię.','m.erasing':'Usuwanie danych…','m.erasedAll':'Twoje osobiste dane konta TaxMate zostały usunięte z urządzenia i chmury; wspólne dane spółki mogą pozostać dla innych członków.','m.erasedLocal':'Dane lokalne usunięte. Nie można połączyć z chmurą — spróbuj ponownie online.',
 'm.reset':'Usuń wszystkie dane z urządzenia',
 'm.resetT':'Usunąć wszystko?',
 'm.resetM':'Usunie wszystkie firmy, wpisy i ustawienia z tego urządzenia. Nie da się tego cofnąć. W razie wątpliwości najpierw zrób kopię.',
 'm.foot':'TaxMate UK · darmowy, prywatny, offline. Tylko szacunki — nie porada podatkowa.',
 'd.entryT':'Usunąć ten wpis?',
 'd.entryM':'Zostanie trwale usunięty.',
 'd.bizT':'Usunąć tę firmę?',
 'd.bizM':'Wszystkie jej przychody i wydatki też zostaną usunięte. Nie da się tego cofnąć.',
 'r.title':'Przywrócić tę kopię?',
 'r.msg':'Zastąpi wszystko, co jest teraz na urządzeniu.',
 'r.bad':'To nie jest kopia TaxMate.',
 'cat.vehicle':'Pojazd i paliwo',
 'cat.travel':'Podróże i parking',
 'cat.phone':'Telefon i internet',
 'cat.home':'Praca z domu',
 'cat.equip':'Sprzęt i narzędzia',
 'cat.office':'Biuro i administracja',
 'cat.stock':'Towar i materiały',
 'cat.insure':'Ubezpieczenie',
 'cat.fees':'Usługi profesjonalne',
 'cat.market':'Marketing i subskrypcje',
 'cat.repair':'Naprawy',
 'cat.other':'Inny wydatek',
 'cat.sales':'Przychód z pracy',
 'cat.tips':'Napiwki i bonusy',
 'cat.royalty':'Tantiemy',
 'cat.otherin':'Inny przychód',
 'rc.add':'Dodaj paragon',
 'rc.take':'Zrób zdjęcie','rc.upload':'Wgraj paragon','rc.chooseExisting':'Wybierz istniejące zdjęcie',
 'rc.imagesOnly':'Tylko pliki graficzne',
 'rc.view':'Zobacz paragon',
 'rc.delete':'Usuń paragon',
 'rc.uploading':'Przesyłanie…','rc.signinNeeded':'Zaloguj się ponownie, aby zapisać w chmurze',
 'rcb.tab':'Paragony',
 'rcb.title':'Dodaj paragony',
 'rcb.intro':'Wybierz kategorię i miesiąc, a następnie dodaj paragon do każdego wydatku, który go potrzebuje.',
 'rcb.cat':'Kategoria',
 'rcb.month':'Miesiąc',
 'rcb.allMonths':'Wszystkie miesiące',
 'rcb.noMissing':'Każdy wydatek tutaj ma już paragon. 🎉',
 'rcb.pickCat':'Wybierz kategorię, aby zobaczyć wydatki bez paragonu.',
 'rcb.noExpenses':'Brak wydatków w tej kategorii.',
 'rcb.add':'Dodaj',
 'rcb.done':'✓',
 'rcb.uploading':'Przesyłanie…',
 'rcb.remaining':'{n} nadal potrzebuje paragonu',
 'rcb.allDone':'Gotowe — każdy wydatek ma paragon.',
 'rcb.tip':'Dwa paragony za jeden wydatek? Umieść je obok siebie na jednym obrazie.',
 'car.rcTitle':'Zrób zdjęcia paragonów',
 'car.rcBody':'Dołącz zdjęcia do wydatków w jednym miejscu.',
 'car.rcCta':'Dodaj paragony →',
 'car.rcLockedBody':'Funkcja Plus — dołącz zdjęcie paragonu do wydatku.',
 'car.rcLockedCta':'Zobacz Plus →',
 'rc.uploadErr':'Błąd przesyłania — spróbuj ponownie',
 'rc.deleteConfirm':'Usunąć to zdjęcie paragonu?',
 'rc.proOnly':'Zdjęcia paragonów to funkcja Plus — odblokuj w Ustawieniach.',
 'pdf.download':'Pobierz raport PDF',
 'pdf.title':'Podsumowanie podatkowe',
 'pdf.generated':'Wygenerowano',
 'pdf.business':'Firma',
 'pdf.structure':'Forma',
 'pdf.period':'Rok podatkowy',
 'pdf.income':'Łączne przychody',
 'pdf.expenses':'Łączne wydatki (do odliczenia)',
 'pdf.profit':'Zysk',
 'pdf.estTax':'Szacowany podatek',
 'pdf.incomeDetail':'Przychody',
 'pdf.expenseDetail':'Wydatki',
 'pdf.taxCalc':'Obliczenie podatku',
 'pdf.date':'Data',
 'pdf.category':'Kategoria',
 'pdf.description':'Opis',
 'pdf.amount':'Kwota',
 'pdf.bizPct':'Firmowe %',
 'pdf.claimable':'Do odliczenia',
 'pdf.pa':'Personal Allowance',
 'pdf.taxable':'Dochód do opodatkowania',
 'pdf.incomeTax':'Income Tax',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'Łącznie do zapłaty',
 'pdf.disclaimer':'Tylko szacunek — nie porada podatkowa. Potwierdź z HMRC lub księgowym.',
 'pdf.noEntries':'Brak wpisów w tym okresie.',
 'mi.title':'Kilometry vs rzeczywiste wydatki',
 'mi.sub':'HMRC pozwala odliczyć 55p/milę (pierwsze 10 000) i 25p/milę po tym limicie — zamiast gromadzić każdy paragon. TaxMate porównuje obie metody.',
 'mi.miles':'Przejechane mile w tym roku',
 'mi.milesClaim':'Odliczenie za kilometry',
 'mi.actual':'Twoje zarejestrowane koszty pojazdów',
 'mi.diff':'Różnica',
 'mi.bestMile':'Kilometry wygrywają',
 'mi.bestActual':'Rzeczywiste wydatki wygrywają',
 'mi.equal':'Mniej więcej równe',
 'mi.saveMile':'Kilometry dają {x} więcej odliczenia',
 'mi.saveActual':'Rzeczywiste wydatki dają {x} więcej odliczenia',
 'mi.adviceMile':'Przejdź na odliczenie za kilometry — bije Twoje paragony o {x}.',
 'mi.adviceActual':'Kontynuuj zbieranie paragonów — rzeczywiste koszty biją ryczałt o {x}.',
 'mi.adviceEqual':'Obie metody dają podobny wynik. Zbieraj paragony dla elastyczności.',
 'mi.noVehicle':'Brak wydatków na pojazdy — dodaj wpisy, by porównać.',
 'mi.enterMiles':'Wpisz mile, by porównać',
 'mi.carsOnly':'Dotyczy tylko sole trader (nie spółek).',
 'mi.rate':'55p pierwsze 10 000 mil · 25p powyżej',
 'sa.title':'Referencja Self Assessment',
 'sa.sub':'Przepisz te liczby do zeznania podatkowego na gov.uk.',
 'sa.103':'SA103 · Samozatrudnienie (sole trader)',
 'sa.104':'SA104 · Dochód ze spółki',
 'sa.box':'Poz.',
 'sa.value':'Wartość',
 'sa.description':'Opis',
 'sa.copy':'Kopiuj',
 'sa.copied':'Skopiowano!',
 'sa.expBreakdown':'Podział wydatków (poz. 19–35)',
 'sa.taNote':'Używasz ulgi £1,000 Trading Allowance — zaznacz Poz. 38 w zeznaniu.',
 'sa.lossNote':'W tym roku poniosłeś stratę — wpisz w Poz. 11, zostaw Poz. 10 puste.',
 'sa.partNote':'Wypełnij jeden formularz SA104 dla każdej spółki.',
 'sa.govLink':'Złóż Self Assessment na gov.uk',
 'tip.title':'Pomocnik',
 'tip.dismiss':'Odrzuć',
 'tip.addNow':'Dodaj teraz',
 'tip.home_t':'Odlicz pracę z domu',
 'tip.home_b':'HMRC pozwala odliczyć £6/tydzień (£312/rok) ryczałtem za pracę z domu — bez paragonów. Nie masz jeszcze żadnych wydatków na ten cel.',
 'tip.phone_t':'Odlicz rachunek za telefon',
 'tip.phone_b':'Jeśli używasz telefonu do pracy, możesz odliczyć część służbową. Nawet 50% z £30/miesiąc to £36 mniej podatku. Brak wpisów.',
 'tip.c2_t':'Chroń emeryturę państwową',
 'tip.c2_b':'Twój zysk jest poniżej progu Class 2 NI (£6,845). Płać £182/rok dobrowolnie, by chronić staż emerytalny.',
 'tip.poa_t':'Niespodzianka w styczniu',
 'tip.poa_b':'Twój rachunek przekracza £1,000 — HMRC poprosi o dwie zaliczki na przyszły rok (31 sty + 31 lip). Odłóż {x} extra.',
 'tip.mileage_t':'Porównaj kilometry z wydatkami',
 'tip.mileage_b':'Masz wydatki na pojazd, ale nie wpisałeś mil. Przewiń w górę i sprawdź stawkę 55p/milę.',
 'tip.receipt_t':'Brakuje zdjęć paragonów',
 'tip.receipt_b':'{n} wydatk{e} bez zdjęcia. HMRC może poprosić o dowody.',
 'tip.entry':'i',
 'acc.export':'Pobierz raport dla księgowego (CSV)',
 'acc.prepared':'Wygenerowano przez TaxMate UK — tylko szacunek, nie porada podatkowa',
 'qt.title':'Podział kwartalny',
 'qt.q1':'K1  6 kwi – 5 lip',
 'qt.q2':'K2  6 lip – 5 paź',
 'qt.q3':'K3  6 paź – 5 sty',
 'qt.q4':'K4  6 sty – 5 kwi',
 'qt.current':'bieżący',
 'qt.income':'Przychody',
 'qt.expenses':'Wydatki',
 'qt.profit':'Zysk',
 'qt.noData':'Brak wpisów w tym kwartale.',
 'mtd.title':'Making Tax Digital (MTD)',
 'mtd.50k':'MTD dotyczy Cię od kwietnia 2026 — zysk ponad £50,000.',
 'mtd.30k':'MTD dotyczy Cię od kwietnia 2027 — zysk ponad £30,000.',
 'mtd.20k':'MTD dotyczy Cię od kwietnia 2028 — zysk ponad £20,000.',
 'mtd.ok':'MTD jeszcze nie wymagane — próg to £20,000.',
 'mtd.what':'MTD wymaga kwartalnych aktualizacji przez zatwierdzone oprogramowanie zamiast rocznego zeznania.',
 'cal.export':'Dodaj terminy podatkowe do kalendarza (.ics)',
 'cal.desc':'Terminy podatkowe UK z przypomnieniami 7 dni wcześniej.',
 'nb.jan':'Self Assessment za {n} dzień/dni — 31 stycznia',
 'nb.jul':'Payment on account za {n} dzień/dni — 31 lipca',
 'nb.today_jan':'Dziś termin Self Assessment — 31 stycznia',
 'nb.today_jul':'Dziś termin Payment on account — 31 lipca',
 'nb.days':'dni',
 'nb.day':'dzień',
 'toast.saved':'Zapisano',
 'toast.deleted':'Usunięto',
 'toast.restored':'Przywrócono kopię',
 'toast.calAdded':'Pobrano plik kalendarza',
 'm.theme':'Wygląd',
 'theme.auto':'Auto',
 'theme.light':'Jasny',
 'theme.dark':'Ciemny',
 'cc.rename':'Zmień nazwy kategorii',
 'cc.renameHint':'Dotknij kategorię, aby nadać własną nazwę.',
 'cc.editName':'Nazwa kategorii',
 'cc.reset':'Przywróć domyślne',
 'cc.renameDone':'Zmieniono nazwę',
 'cc.longPress':'Dotknij ＋, aby dodać. Przytrzymaj (lub dotknij ✎) kategorię, aby edytować.',
 'cc.action':'Co chcesz zrobić?',
 'cc.doRename':'Zmień nazwę',
 'cc.doDelete':'Usuń z listy',
 'cc.deleted':'Usunięto',
 'cc.emojiHint':'Dotknij poniżej i użyj klawiatury, aby wybrać emoji.','cc.emojiErr':'Wybierz emoji',
 'cc.delDataT':'Usunąć tę kategorię?',
 'cc.delDataM':'Ta kategoria ma {n} wpisów. Usunięcie ich nie skasuje.',
 'cc.cantDeleteUsed':'Ta kategoria ma wpisy — pozostanie widoczna.',
 'b.trade':'Rodzaj pracy',
 'b.tradeHint':'Zasugerujemy kategorie wydatków — możesz je zmienić w każdej chwili.',
 'trade.delivery':'Dostawa / Kierowca',
 'trade.construction':'Budownictwo / Rzemiosło',
 'trade.consultant':'Konsultant / IT',
 'trade.creative':'Kreatywne / Media',
 'trade.cleaning':'Sprzątanie / Dom',
 'trade.beauty':'Uroda / Pielęgnacja',
 'trade.retail':'Handel / Sklep online',
 'trade.other':'Inne',
 'sug.title':'Sugerowane kategorie',
 'sug.hint':'Na podstawie rodzaju pracy. Dotknij, aby dodać potrzebne.',
 'sug.add':'Dodaj wybrane',
 'sug.skip':'Pomiń',
 'sug.added':'Dodano {n} kategorii',
 'f.repeat':'Powtarzaj miesięcznie',
 'f.repeatHint':'Stały koszt miesięczny? Dodaj go dla wszystkich 12 miesięcy jednym dotknięciem.',
 'f.dateLocked':'Wybierz datę w roku podatkowym {y}.',
 'f.repeatFrom':'Powtarzaj od',
 'f.recQ':'To jest miesięczny powtarzający się wydatek.',
 'f.recThis':'Tylko ten miesiąc',
 'f.recFuture':'Ten i kolejne miesiące',
 'f.repeatAdded':'Dodano na {n} miesięcy',
 'f.repeatOff':'Jednorazowo',
 'f.repeatOn':'Co miesiąc',
 'f.repeatPick':'Które miesiące? Dotknij, aby dodać.',
 'f.tbc':'Do ustalenia',
 'f.tbc2':'Do ustalenia',
 'ob.h1':'Poznaj swój podatek<br>w kilka sekund',
 'ob.chooseLang':'Wybierz język',
 'ob.lede':'Przychody, wydatki, podatek — wszystko jasne. Bez księgowego, bez żargonu.',
 'ob.signIn':'Zaloguj się',
 'ob.signInS':'Zapisuj dane i synchronizuj między urządzeniami',
 'ob.noAcc':'Zacznij bez konta',
 'ob.noAccS':'Dane zostają na tym telefonie — zaloguj się kiedy chcesz',
 'ob.codeLogin':'Masz partner sync code? Najpierw się zaloguj.',
 'ob.howStart':'Jak chcesz zacząć?',
 'ob.together':'Zróbmy to razem',
 'ob.togetherS':'Poprowadzę Cię krok po kroku — zobaczysz, ile podatku odłożyć.',
 'ob.dash':'Przejdź od razu do pulpitu',
 'ob.dashS':'Wiem, co robię.',
 'ob.codeEntry':'Masz partner sync code? Wybierz „Przejdź od razu do pulpitu”, a potem wpisz go w Ustawieniach.',
 'ob.run':'Jak prowadzisz działalność?',
 'ob.partner':'Ze wspólnikiem',
 'ob.shareLabel':'Twój udział w zysku',
 'ob.shareHint':'Tylko Twoja część zysku jest opodatkowana jako Twoja. Większość równych spółek to 50%.',
 'ob.syncTitle':'Synchronizacja ze wspólnikiem',
 'ob.joinCode':'Kod dołączenia',
 'ob.remove':'Usuń',
 'ob.syncHint':'Jeśli wspólnik już używa TaxMate, wpisz jego partner sync code, aby oba telefony były zsynchronizowane.',
 'ob.enterCode':'Wpisz kod wspólnika',
 'ob.later':'Zrobię to później',
 'ob.syncPro':'Synchronizacja dwóch telefonów to funkcja Pro — zaloguj się i przejdź na Pro w Ustawieniach. Bez tego liczby na tym telefonie działają bez zarzutu.',
 'ob.step1':'Krok 1 z 3 · Twoja praca',
 'ob.whatDo':'Czym się zajmujesz?',
 'ob.bizLede':'Nazwa działalności — większość wpisuje po prostu swój zawód.',
 'ob.bizName':'Nazwa działalności',
 'ob.bizPh':'np. kurier Evri',
 'ob.bizEg':'Kierowca Uber · Sprzątanie · Złota rączka · Deliveroo',
 'ob.continue':'Dalej',
 'ob.codePrompt':'Wpisz 8-znakowy partner sync code wspólnika:',
 'ob.catchBiz':'Nadrób zaległości · wybierz działalność',
 'ob.whichBiz':'Która działalność?',
 'ob.pickLede':'Dodaj minione miesiące do właściwej działalności. Pozostałe możesz uzupełnić osobno.',
 'ob.soleTag':'Działalność jednoosobowa',
 'ob.partTag':'Spółka · Twoje {s}%',
 'ob.addFrom':'Dodaj moje liczby od: {m}',
 'ob.catchMonth':'Nadrób zaległości · wybierz miesiąc',
 'ob.step2':'Krok 2 z 3 · Miesiąc startowy',
 'ob.whereStart':'Od czego zaczynamy?',
 'ob.startLede':'Wybierz pierwszy miesiąc, który chcesz uzupełnić. Dalej pójdziemy miesiąc po miesiącu.',
 'ob.taxYearNote':'Rok podatkowy w UK trwa od kwietnia do kwietnia.',
 'ob.step3':'Krok 3 z 3 · {a} z {b} mies.',
 'ob.yourWork':'Twoja praca',
 'ob.addAnother':'Dodaj kolejny',
 'ob.split':'Podziel na kategorie',
 'ob.addAgain':'Dodaj ponownie:',
 'ob.close':'Zamknij',
 'ob.pickIcon':'Wybierz ikonę i dodaj kategorię — paliwo, telefon, ubezpieczenie…',
 'ob.addCat':'Dodaj kategorię',
 'ob.details':'Szczegóły',
 'ob.from':'Od kogo?',
 'ob.catInPh':'np. Uber Eats, Evri, Amazon',
 'ob.catOutPh':'np. Paliwo, Ubezpieczenie, Telefon',
 'ob.drive':'🚗 Jeździłeś w pracy w tym miesiącu?',
 'ob.addMiles':'Dodaj mile',
 'ob.milesIn':'Mile służbowe: {m}',
 'ob.milesPh':'np. 850',
 'ob.mileHintA':'Odliczenie {p}p za milę',
 'ob.mileHintB':' · ≈ £{x} odliczenia',
 'ob.mileHintC':'. Tylko jeśli nie dodałeś już paliwa jako wydatku.',
 'ob.noDrive':'Brak jazdy w tym miesiącu',
 'ob.soFar':'{m} — razem',
 'ob.nextMonth':'Następny miesiąc →',
 'ob.finishBtn':'Zakończ i zobacz podatek',
 'ob.allCaught':'Wszystko uzupełnione',
 'ob.estLabel':'Szacowany podatek do odłożenia',
 'ob.basedOn':'na podstawie {n} mies.',
 'ob.monthsAdded':'Dodane miesiące',
 'ob.totIn':'Łączny przychód',
 'ob.totOut':'Łączne wydatki',
 'ob.mileRow':'Mile ({n} mi)',
 'ob.profitFar':'Zysk dotychczas',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'Wszystko uzupełnione. {n} pozycji możesz doszlifować później — znajdziesz je oznaczone na pulpicie. Od teraz po prostu stukaj ＋, gdy pieniądze wpływają lub wypływają.',
 'ob.cleanLine':'Wszystko uzupełnione. Od teraz po prostu stukaj ＋, gdy pieniądze wpływają lub wypływają — resztą zajmie się TaxMate.',
 'ob.goDash':'Przejdź do pulpitu',
 'ob.estWarn':'⚠️ To tylko szacunek — nie ostateczny podatek. Rozliczasz się z HMRC do 31 stycznia.',
 'sec.account':'Konto',
 'sec.biz':'Twoje firmy',
 'sec.prefs':'Preferencje',
 'sec.data':'Kopia i dane',
 'sec.report':'Raporty',
 'rep.desc':'Pełne podsumowanie roku — dla Ciebie, księgowego lub wniosku kredytowego.',
 'sec.legal':'O aplikacji i prawne',
 'leg.privacy':'Polityka prywatności',
 'leg.terms':'Warunki użytkowania',
 'leg.disclaimer':'Zastrzeżenie podatkowe',
 'leg.disclaimerBody':'TaxMate podaje szacunki, by pomóc w planowaniu. To nie porada podatkowa ani zamiennik księgowego czy HMRC. Zawsze potwierdź dane przed złożeniem.',
 'leg.version':'Wersja',
 'leg.madeIn':'Stworzone w UK dla osób samozatrudnionych.',
 'f.catErr':'Wybierz kategorię',
 'f.dateOtherYear':'Ta data należy do roku podatkowego {y} — wpis pojawi się tam.',
 'tax.emptyT':'Dodaj firmę, aby zobaczyć podatek',
 'tax.emptyS':'Twój obraz podatkowy pojawi się tutaj po dodaniu firmy i rozpoczęciu rejestrowania przychodów.',
 'tip.entries':'ów',
 'fd.title':'Folder',
 'fd.add':'Nowy folder',
 'fd.name':'Nazwa folderu',
 'fd.none':'Bez folderu',
 'fd.manage':'Foldery',
 'fd.deleteM':'Wpisy zachowają dane — stracą tylko etykietę folderu.',
 'fd.all':'Wszystkie foldery',
 'cc.add':'Nowa kategoria',
 'cc.name':'Nazwa kategorii',
 'cc.colour':'Kolor',
 'cc.emoji':'Ikona',
 'cc.manage':'Moje kategorie',
 'cc.deleteM':'Wpisy z tą kategorią pokażą się jako „Inne".',
 'pro.title':'Plany TaxMate','pro.sub':'Wersja darmowa wystarcza na zawsze. Ulepsz, by uzyskać więcej.','billing.monthly':'Miesięcznie','billing.yearly':'Rocznie','billing.billedYearly':'Rozliczane rocznie',
 'tier.free':'Darmowy','tier.plus':'Plus','tier.pro':'Pro',
 'tier.freeSub':'Wszystko, by rozliczyć się samodzielnie','tier.plusSub':'Oszczędzaj więcej, pracuj sprytniej','tier.proSub':'Dla spółek i poważnych przedsiębiorców',
 'tier.current':'Obecny plan','tier.choose':'Wybierz {p}','tier.active':'Aktywny',
 'feat.records':'Przychody i wydatki','feat.taxcalc':'Szacowany podatek','feat.onebiz':'Jedna firma','feat.mileageBasic':'Suma przebiegu','feat.sa103view':'Odniesienie SA103','feat.sync':'Synchronizacja w chmurze','feat.backup':'Kopia i przywracanie',
 'feat.mileageCompare':'Porównanie przebiegu z kosztami','feat.aiTips':'Pomocnik','feat.multiBiz':'Wiele firm','feat.receiptPhoto':'Zdjęcia paragonów','feat.pdfReport':'Raport podatkowy PDF',
 'feat.partnerSync':'Synchronizacja partnera','feat.sa104':'SA104 spółka','feat.receiptPack':'Uporządkowany pakiet paragonów PDF','feat.mtdReady':'Kwartalne podsumowanie ewidencji (bez wysyłki do HMRC)',
 'lock.title':'Funkcja {p}','lock.body':'To część TaxMate {p}. Ulepsz, aby odblokować.','lock.upgrade':'Zobacz plany','home.signinTitle':'Utwórz kopię zapasową','home.signinSub':'Zaloguj się, aby zapisać dane w chmurze i synchronizować.','home.signinBtn':'Zaloguj się','pwa.install':'Pobierz','pwa.installSub':'Zainstaluj aplikację na telefonie.','pwa.iosTitle':'Dodaj do ekranu głównego','pwa.iosBody':'Na iPhonie zainstaluj z Safari:','pwa.iosStep1':'Dotknij przycisku Udostępnij (kwadrat ze strzałką) na dole Safari','pwa.iosStep2':'Przewiń w dół i dotknij „Do ekranu głównego”','pwa.iosStep3':'Dotknij „Dodaj” — gotowe! Ikona TaxMate pojawi się na ekranie','pwa.iosNote':'Uwaga: działa tylko w Safari, nie w Chrome.','pwa.andTitle':'Zainstaluj aplikację','pwa.andBody':'Przeglądarka nie pokazała przycisku instalacji. Nadal możesz zainstalować:','pwa.andStep1':'Dotknij menu (⋮) w prawym górnym rogu Chrome','pwa.andStep2':'Dotknij „Zainstaluj aplikację” lub „Dodaj do ekranu”','pwa.andStep3':'Potwierdź — ikona TaxMate pojawi się na ekranie','pwa.andTip':'Wskazówka: jeśli widzisz tylko „Dodaj do ekranu” (skrót), zamknij stronę, wyczyść pamięć podręczną, otwórz ponownie i poczekaj.','pdf.enHint':'Raporty PDF są generowane po angielsku. Nazwy wpisane w innych językach mogą się nie pojawić.','lang.pdfHint':'Wskazówka: raporty PDF eksportują się tylko po angielsku.','rp.title':'Pakiet paragonów','rp.desc':'Połącz wszystkie zdjęcia paragonów w jeden plik PDF dla HMRC.','rp.btn':'Eksportuj pakiet','rp.none':'Brak zdjęć paragonów w tym okresie.','rp.building':'Tworzenie pakietu…','rp.page':'Paragon {i} z {n}','pro.titleOld':'TaxMate Pro',
 'pro.sub':'Podstawy są bezpłatne. Ulepsz, gdy potrzebujesz więcej.',
 'sy.title':'Synchronizacja z partnerem',
 'sy.enable':'Synchronizuj z partnerem',
 'sy.code':'Kod spółki',
 'sy.invite':'Zaproś partnera',
 'sy.inviteMsg':'Cześć! To jest kod synchronizacji partnera dla „{n}" w TaxMate UK. 🤝\nWejdź na taxmate.uk\n1. Kliknij „Sign in"\n2. Wybierz „🚀 Go straight to dashboard"\n3. Kliknij „Settings" — prawy dolny róg 😉\n4. Przejdź na Pro\n5. Następnie wpisz kod: {c}',
 'sy.join':'Masz kod od partnera? Wpisz go, a wszystko zsynchronizuje się automatycznie.',
 'sy.enterCode':'Wpisz kod',
 'sy.synced':'Zsynchronizowano',
 'sy.badCode':'Nie znaleziono kodu — sprawdź i spróbuj ponownie.',
 'sy.needPro':'Synchronizacja to funkcja Pro — odblokuj w Więcej.',
 'sy.needNet':'Brak połączenia z usługą — sprawdź internet.',
 'sy.setup':'Ta kopia aplikacji nie ma jeszcze skonfigurowanej synchronizacji.',
 'sy.leave':'Przestań synchronizować na tym urządzeniu',
 'sy.copied':'Skopiowano!',
 'sy.saveFirst':'Najpierw zapisz firmę, potem włącz synchronizację.',
 'ac.title':'Konto i chmura',
 'ac.why':'Zaloguj się, a Twoje dane pójdą za Tobą — nowy telefon, te same dane. Za darmo.',
 'ac.google':'Kontynuuj z Google',
 'ac.signedAs':'Zalogowano jako',
 'ac.signout':'Wyloguj',
 'ac.signoutM':'Dane zostają na tym telefonie i w chmurze. Zaloguj się ponownie kiedy chcesz.',
 'ac.local':'Tylko to urządzenie — zaloguj się, by mieć automatyczną kopię.',
 'ac.needSignInTitle':'Wymagane logowanie',
 'ac.needSignInBody':'Plus i Pro wymagają konta, aby Twój plan działał na wszystkich urządzeniach. Zaloguj się poniżej, a następnie wybierz plan.',
 'ac.cloudOn':'Kopia w chmurze włączona',
 'ac.err':'Logowanie nie powiodło się — spróbuj ponownie.',
 'ac.needNet':'Logowanie wymaga połączenia.'
},
ro:{
 'nav.home':'Acasă',
 'nav.income':'Venituri',
 'nav.expenses':'Cheltuieli',
 'nav.tax':'Taxe',
 'nav.more':'Setări',
 'c.save':'Salvează',
 'c.cancel':'Anulează','c.discardConfirm':'Renunțați la modificări?','c.discardConfirmM':'Datele nesalvate se vor pierde.',
 'c.edit':'Editează',
 'c.yes':'Da, continuă',
 'c.active':'Activ',
 'home.hi':'Salut 👋',
 'home.profit':'Profitul tău · {y}',
 'home.in':'Venituri',
 'home.out':'Cheltuieli',
 'home.taxT':'Pune deoparte pentru taxe',
 'home.taxS':'Taxa estimată pe profitul de până acum',
 'home.oweLine':'Impozit estimat de plată',
 'home.biz':'Afacerile tale',
 'home.addBiz':'Adaugă o afacere',
 'home.recent':'Activitate recentă',
 'home.share':'partea ta',
 'tag.sole':'Sole trader',
 'tag.part':'Parteneriat',
 'tag.your':'partea ta {n}%',
 'w.title':'Bun venit la TaxMate 👋',
 'w.sub':'Urmărește banii din activitatea independentă și vezi factura reală de taxe — gratuit, privat, fără cont.',
 'w.priv':'🔒 Privat prin design. Datele tale îți aparțin — pe dispozitiv, sincronizate securizat doar dacă te autentifici.',
 'w.steps':'1 · Adaugă afacerea ta\n2 · Notează veniturile și cheltuielile pe parcurs\n3 · Fila Taxe ține factura la zi — 31 ianuarie nu te mai ia prin surprindere',
 'w.start':'Adaugă prima afacere',
 'inc.title':'Venituri',
 'inc.add':'Adaugă venit',
 'inc.empty':'Niciun venit înregistrat',
 'inc.emptyS':'Notează banii pe măsură ce intră — estimarea taxei se actualizează live.',
 'exp.title':'Cheltuieli',
 'exp.add':'Adaugă cheltuială',
 'exp.empty':'Nicio cheltuială încă',
 'exp.emptyS':'Fiecare cheltuială notată îți poate micșora taxa.',
 'flt.all':'Toate',
 'f.amount':'Suma',
 'f.date':'Data',
 'f.business':'Afacere',
 'f.category':'Categorie',
 'f.note':'Notă',
 'f.optional':'(opțional)',
 'f.amountErr':'Introdu o sumă mai mare de 0',
 'f.bizUse':'Utilizare pentru afacere','f.bizUsePartial':'Parțial personal?',
 'f.bizUseHint':'Parțial personal (de ex. telefonul)? Deduce doar partea de afacere — HMRC așteaptă o împărțire corectă.',
 'f.addIncome':'Adaugă venit',
 'f.editIncome':'Editează venit',
 'f.addExpense':'Adaugă cheltuială',
 'f.editExpense':'Editează cheltuială',
 'f.deleteEntry':'Șterge această înregistrare',
 'b.add':'Adaugă o afacere',
 'b.edit':'Editează afacerea',
 'b.name':'Numele afacerii',
 'b.nameErr':'Introdu un nume',
 'b.setup':'Cum este organizată?',
 'b.justMe':'Doar eu',
 'b.partnership':'Parteneriat',
 'b.soleHint':'Lucrezi pe cont propriu și păstrezi tot profitul.',
 'b.partHint':'O conduci cu altcineva și împărțiți profitul. Doar partea ta este impozitată.',
 'b.share':'Partea ta din profit (%)',
 'b.delete':'Șterge afacerea și înregistrările ei',
 'tax.bill':'Factura estimată · {y}',
 'tax.it':'Income Tax',
 'tax.c4':'Class 4 NI',
 'tax.fileBy':'Depune și plătește până la {d}',
 'tax.taT':'Cheltuieli vs alocația de £1,000',
 'tax.taHint':'HMRC îți permite să scazi £1,000 fix din venitul independent în loc de cheltuielile reale (nu pentru parteneriate). Câștigă profitul mai mic — TaxMate le compară pentru tine.',
 'tax.taActual':'Profit cu cheltuieli reale',
 'tax.taAllow':'Profit cu alocația £1,000',
 'tax.taBest':'Cel mai bun pentru tine',
 'tax.taSave':'economisește {x} din profit',
 'tax.auto':'Auto',
 'tax.allowance':'Alocație',
 'tax.expensesOpt':'Cheltuieli',
 'tax.using':'Folosești: {x}',
 'tax.autoNote':'Auto alege mereu varianta mai ieftină pentru tine.',
 'tax.usingAllow':'alocația £1,000 (trading allowance)',
 'tax.usingExp':'cheltuieli reale',
 'tax.how':'Cum se calculează',
 'tax.taxableP':'Profitul tău impozabil',
 'tax.pa':'Personal Allowance',
 'tax.paHint':'suma neimpozabilă pe care o primește oricine',
 'tax.paRed':'redusă — venit peste £100,000',
 'tax.taxable':'Venit impozabil',
 'tax.basic':'Cota de bază',
 'tax.higher':'Cota superioară',
 'tax.addl':'Cota adițională',
 'tax.on':'la',
 'tax.c4Hint':'6% pe profit £12,570–£50,270, 2% peste',
 'tax.c2':'Class 2 National Insurance',
 'tax.c2Paid':'profit peste £{x}, deci contează ca plătit — credit gratuit la State Pension',
 'tax.c2Vol':'profit sub £{x} — poți plăti voluntar £{v} ca să-ți protejezi State Pension',
 'tax.opt':'opțional',
 'tax.total':'Total de plată',
 'tax.payT':'Cât plătești de fapt',
 'tax.editPos':'Editează',
 'tax.thisBill':'Factura acestui an (de mai sus)',
 'tax.priorAdj':'Ajustare de anul trecut',
 'tax.priorAdjS':'sub/supra-plată reportată',
 'tax.poaPaid':'Payments on account deja plătite',
 'tax.balancing':'Plata de regularizare până la 31 ian',
 'tax.refund':'💚 Pare o rambursare. Dacă rămâne negativ după depunere, HMRC îți datorează bani.',
 'tax.datesT':'Date de plată',
 'tax.poaWhy':'Factura depășește £1,000, deci HMRC cere și două plăți în avans (payments on account) pentru anul viitor — jumătate fiecare.',
 'tax.janS':'regularizare + prima plată în avans',
 'tax.julS':'a doua plată în avans',
 'tax.poaReduce':'Te aștepți la profit mai mic anul viitor? Poți cere HMRC să reducă plățile în avans — dar dacă reduci prea mult, percep dobândă.',
 'tax.noPoa':'toată factura — fără plăți în avans (sub £1,000)',
 'tax.accT':'Cât de exactă este estimarea?',
 'tax.accB':'Folosește cotele {y} pentru Anglia, Țara Galilor și Irlanda de Nord (Scoția are alte praguri). Presupune că activitatea independentă e singurul tău venit — joburile PAYE, dobânzile, dividendele și împrumutul de student nu sunt încă incluse. E o estimare de planificare, nu consultanță fiscală — confirmă cu HMRC sau un contabil înainte de depunere.',
 'tax.disc':'Doar estimare — nu este consultanță fiscală.','tax.estimateWarn':'Aceasta este o estimare, nu impozitul final. Trebuie totuși să declari la HMRC până la 31 ianuarie. Fără legătură cu HMRC.',
 'a.title':'Situația ta cu HMRC',
 'a.sub':'Două cifre din ultimul Self Assessment care schimbă cât plătești de fapt anul acesta.',
 'a.poaLabel':'Plăți în avans deja făcute pentru acest an',
 'a.poaHint':'Avansurile (31 ian + 31 iul) cerute de HMRC pe baza anului trecut. Introdu totalul sau 0.',
 'a.priorLabel':'Ajustare de anul trecut',
 'a.priorHint':'Ai plătit prea puțin și s-a reportat? Introdu cu plus. Ai plătit prea mult și se scade? Introdu cu minus (ex. -120).',
 'm.title':'Setări',
 'm.biz':'Afaceri',
 'm.lang':'Limbă',
 'm.backup':'Backup și restaurare',
 'm.backupHint':'Datele tale sunt deja în cloud. Descarcă o copie locală ca asigurare suplimentară.',
 'm.export':'Backup date (JSON)',
 'm.backupFull':'Backup complet','m.backupFullS':'Include datele TaxMate și fișierele bonurilor (ZIP)',
 'm.backupData':'Backup doar cu date','m.backupDataS':'Doar înregistrările TaxMate; fișierele bonurilor nu sunt incluse (JSON)',
 'm.csv':'Exportă înregistrări (CSV pentru Excel)',
 'm.restore':'Restaurează din backup',
 'm.danger':'Zonă periculoasă','m.eraseCloud':'Șterge toate datele mele (inclusiv cloud)','m.eraseCloudT':'Ștergi datele contului TaxMate?','m.eraseCloudM':'Aceasta șterge permanent afacerile, înregistrările, chitanțele și setările tale personale de pe dispozitiv și din cloudul TaxMate. Calitatea de membru în parteneriate comune este eliminată, dar datele rămân pentru ceilalți membri. Copiile furnizorilor și evidențele de plată cerute de lege pot rămâne o perioadă limitată. Exportă mai întâi o copie.','m.erasing':'Se șterg datele…','m.erasedAll':'Datele personale ale contului TaxMate au fost șterse de pe dispozitiv și din cloud; datele comune pot rămâne pentru ceilalți membri.','m.erasedLocal':'Date locale șterse. Cloud-ul nu a putut fi accesat — încearcă din nou online.',
 'm.reset':'Șterge toate datele de pe dispozitiv',
 'm.resetT':'Ștergi totul?',
 'm.resetM':'Șterge toate afacerile, înregistrările și setările de pe acest dispozitiv. Nu se poate anula. Fă un backup mai întâi dacă ai dubii.',
 'm.foot':'TaxMate UK · gratuit, privat, offline. Doar estimări — nu consultanță fiscală.',
 'd.entryT':'Ștergi această înregistrare?',
 'd.entryM':'Va fi eliminată definitiv.',
 'd.bizT':'Ștergi această afacere?',
 'd.bizM':'Toate veniturile și cheltuielile ei vor fi șterse. Nu se poate anula.',
 'r.title':'Restaurezi acest backup?',
 'r.msg':'Va înlocui tot ce este acum pe dispozitiv.',
 'r.bad':'Fișierul nu este un backup TaxMate.',
 'cat.vehicle':'Vehicul și combustibil',
 'cat.travel':'Transport și parcare',
 'cat.phone':'Telefon și internet',
 'cat.home':'Lucru de acasă',
 'cat.equip':'Echipamente și unelte',
 'cat.office':'Birou și administrare',
 'cat.stock':'Stoc și materiale',
 'cat.insure':'Asigurare',
 'cat.fees':'Servicii profesionale',
 'cat.market':'Marketing și abonamente',
 'cat.repair':'Reparații',
 'cat.other':'Altă cheltuială',
 'cat.sales':'Venit din muncă',
 'cat.tips':'Bacșișuri și bonusuri',
 'cat.royalty':'Drepturi de autor',
 'cat.otherin':'Alt venit',
 'rc.add':'Adaugă bon',
 'rc.take':'Fotografiază','rc.upload':'Încarcă bonul','rc.chooseExisting':'Alege o poză existentă',
 'rc.imagesOnly':'Doar fișiere imagine',
 'rc.view':'Vezi bon',
 'rc.delete':'Șterge bon',
 'rc.uploading':'Se încarcă…','rc.signinNeeded':'Conectează-te din nou pentru a salva în cloud',
 'rcb.tab':'Bonuri',
 'rcb.title':'Adaugă bonuri',
 'rcb.intro':'Alege o categorie și o lună, apoi adaugă un bon pentru fiecare cheltuială care încă are nevoie.',
 'rcb.cat':'Categorie',
 'rcb.month':'Lună',
 'rcb.allMonths':'Toate lunile',
 'rcb.noMissing':'Fiecare cheltuială de aici are deja bon. 🎉',
 'rcb.pickCat':'Alege o categorie pentru a vedea cheltuielile fără bon.',
 'rcb.noExpenses':'Nicio cheltuială în această categorie.',
 'rcb.add':'Adaugă',
 'rcb.done':'✓',
 'rcb.uploading':'Se încarcă…',
 'rcb.remaining':'{n} încă au nevoie de bon',
 'rcb.allDone':'Gata — fiecare cheltuială are bon.',
 'rcb.tip':'Două bonuri pentru o cheltuială? Pune-le alăturat într-o singură imagine.',
 'car.rcTitle':'Fotografiază bonurile',
 'car.rcBody':'Atașează poze la cheltuieli într-un singur loc.',
 'car.rcCta':'Adaugă bonuri →',
 'car.rcLockedBody':'O funcție Plus — atașează fotografia bonului la cheltuială.',
 'car.rcLockedCta':'Vezi Plus →',
 'rc.uploadErr':'Eroare la încărcare — încearcă din nou',
 'rc.deleteConfirm':'Ștergi această fotografie?',
 'rc.proOnly':'Pozele cu bonuri sunt o funcție Plus — deblocheaz-o în Setări.',
 'pdf.download':'Descarcă raport PDF',
 'pdf.title':'Sumar fiscal',
 'pdf.generated':'Generat',
 'pdf.business':'Afacere',
 'pdf.structure':'Tip',
 'pdf.period':'An fiscal',
 'pdf.income':'Venituri totale',
 'pdf.expenses':'Cheltuieli totale (deductibile)',
 'pdf.profit':'Profit',
 'pdf.estTax':'Taxă estimată',
 'pdf.incomeDetail':'Detalii venituri',
 'pdf.expenseDetail':'Detalii cheltuieli',
 'pdf.taxCalc':'Calcul taxe',
 'pdf.date':'Data',
 'pdf.category':'Categorie',
 'pdf.description':'Descriere',
 'pdf.amount':'Sumă',
 'pdf.bizPct':'Uz biz %',
 'pdf.claimable':'Deductibil',
 'pdf.pa':'Personal Allowance',
 'pdf.taxable':'Venit impozabil',
 'pdf.incomeTax':'Income Tax',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'Total de plată',
 'pdf.disclaimer':'Doar estimare — nu consultanță fiscală. Confirmă cu HMRC sau un contabil.',
 'pdf.noEntries':'Nicio înregistrare în această perioadă.',
 'mi.title':'Mile vs cheltuieli reale',
 'mi.sub':'HMRC îți permite să deduci 55p/milă (primele 10.000) și 25p/milă după — în loc să colectezi fiecare bon. TaxMate compară ambele metode.',
 'mi.miles':'Mile conduse în acest an',
 'mi.milesClaim':'Deducere kilometraj',
 'mi.actual':'Cheltuielile tale reale cu vehiculul',
 'mi.diff':'Diferență',
 'mi.bestMile':'Kilometrajul câștigă',
 'mi.bestActual':'Cheltuielile reale câștigă',
 'mi.equal':'Aproximativ egale',
 'mi.saveMile':'Kilometrajul oferă {x} mai mult',
 'mi.saveActual':'Cheltuielile reale oferă {x} mai mult',
 'mi.adviceMile':'Treci la deducerea de kilometraj — depășește bonurile cu {x}.',
 'mi.adviceActual':'Continuă să colectezi bonuri — cheltuielile reale depășesc rata cu {x}.',
 'mi.adviceEqual':'Ambele metode dau rezultate similare.',
 'mi.noVehicle':'Nicio cheltuială cu vehiculul — adaugă intrări pentru comparație.',
 'mi.enterMiles':'Introdu mile pentru comparație',
 'mi.carsOnly':'Se aplică doar pentru sole trader (nu parteneriate).',
 'mi.rate':'55p primele 10.000 mile · 25p după',
 'sa.title':'Referință Self Assessment',
 'sa.sub':'Copiază aceste numere în declarația fiscală de pe gov.uk.',
 'sa.103':'SA103 · Activitate independentă',
 'sa.104':'SA104 · Venit din parteneriat',
 'sa.box':'Câmp',
 'sa.value':'Valoare',
 'sa.description':'Descriere',
 'sa.copy':'Copiază',
 'sa.copied':'Copiat!',
 'sa.expBreakdown':'Detaliu cheltuieli (câmpurile 19–35)',
 'sa.taNote':'Folosești alocația £1,000 Trading Allowance — bifează Câmpul 38.',
 'sa.lossNote':'Ai înregistrat o pierdere — introdu la Câmpul 11, lasă Câmpul 10 gol.',
 'sa.partNote':'Completează un formular SA104 pentru fiecare parteneriat.',
 'sa.govLink':'Depune Self Assessment pe gov.uk',
 'tip.title':'Asistent',
 'tip.dismiss':'Respinge',
 'tip.addNow':'Adaugă acum',
 'tip.home_t':'Deduce lucrul de acasă',
 'tip.home_b':'HMRC permite £6/săptămână (£312/an) forfetar pentru lucrul de acasă — fără bonuri. Nu ai cheltuieli de tip acasă.',
 'tip.phone_t':'Deduce factura de telefon',
 'tip.phone_b':'Dacă folosești telefonul pentru muncă, poți deduce partea profesională. Chiar 50% din £30/lună economisește £36/an. Nicio intrare.',
 'tip.c2_t':'Protejează-ți pensia de stat',
 'tip.c2_b':'Profitul tău e sub pragul Class 2 NI (£6,845). Plătind voluntar £182/an îți protejezi stagiul de pensie.',
 'tip.poa_t':'Surpriză în ianuarie',
 'tip.poa_b':'Factura ta depășește £1,000 — HMRC va cere două plăți în avans (31 ian + 31 iul). Pune deoparte {x} extra.',
 'tip.mileage_t':'Compară kilometrajul cu cheltuielile',
 'tip.mileage_b':'Ai cheltuieli cu vehiculul dar nu ai introdus mile. Derulează în sus pentru comparație.',
 'tip.receipt_t':'Poze bonuri lipsă',
 'tip.receipt_b':'{n} cheltuial{e} fără poze. HMRC poate cere dovezi.',
 'tip.entry':'ă',
 'acc.export':'Descarcă raport contabil (CSV)',
 'acc.prepared':'Generat de TaxMate UK — doar estimare, nu consultanță fiscală',
 'qt.title':'Detalii trimestriale',
 'qt.q1':'T1  6 apr – 5 iul',
 'qt.q2':'T2  6 iul – 5 oct',
 'qt.q3':'T3  6 oct – 5 ian',
 'qt.q4':'T4  6 ian – 5 apr',
 'qt.current':'curent',
 'qt.income':'Venituri',
 'qt.expenses':'Cheltuieli',
 'qt.profit':'Profit',
 'qt.noData':'Nicio intrare în acest trimestru.',
 'mtd.title':'Making Tax Digital (MTD)',
 'mtd.50k':'MTD se aplică din aprilie 2026 — profit peste £50,000.',
 'mtd.30k':'MTD se aplică din aprilie 2027 — profit peste £30,000.',
 'mtd.20k':'MTD se aplică din aprilie 2028 — profit peste £20,000.',
 'mtd.ok':'MTD nu este necesar deocamdată — pragul este £20,000.',
 'mtd.what':'MTD înseamnă trimiterea de actualizări trimestriale prin software aprobat de HMRC.',
 'cal.export':'Adaugă date fiscale în calendar (.ics)',
 'cal.desc':'Date limită fiscale UK cu memento 7 zile înainte.',
 'nb.jan':'Self Assessment în {n} zi/zile — 31 ianuarie',
 'nb.jul':'Payment on account în {n} zi/zile — 31 iulie',
 'nb.today_jan':'Termen azi Self Assessment — 31 ianuarie',
 'nb.today_jul':'Termen azi Payment on account — 31 iulie',
 'nb.days':'zile',
 'nb.day':'zi',
 'toast.saved':'Salvat',
 'toast.deleted':'Șters',
 'toast.restored':'Backup restaurat',
 'toast.calAdded':'Fișier calendar descărcat',
 'm.theme':'Aspect',
 'theme.auto':'Auto',
 'theme.light':'Luminos',
 'theme.dark':'Întunecat',
 'cc.rename':'Redenumește categorii',
 'cc.renameHint':'Atinge o categorie pentru a-i da propriul nume.',
 'cc.editName':'Nume categorie',
 'cc.reset':'Resetează',
 'cc.renameDone':'Redenumit',
 'cc.longPress':'Apasă ＋ pentru a adăuga. Apasă lung (sau atinge ✎) o categorie pentru a edita.',
 'cc.action':'Ce vrei să faci?',
 'cc.doRename':'Redenumește',
 'cc.doDelete':'Elimină din listă',
 'cc.deleted':'Eliminat',
 'cc.emojiHint':'Atinge mai jos și folosește tastatura pentru a alege un emoji.','cc.emojiErr':'Alege un emoji',
 'cc.delDataT':'Elimini această categorie?',
 'cc.delDataM':'Această categorie are {n} intrări. Eliminarea nu le va șterge.',
 'cc.cantDeleteUsed':'Această categorie are intrări — va rămâne vizibilă.',
 'b.trade':'Tip de muncă',
 'b.tradeHint':'Vom sugera categorii de cheltuieli — le poți schimba oricând.',
 'trade.delivery':'Livrare / Șofer',
 'trade.construction':'Construcții / Meserii',
 'trade.consultant':'Consultant / IT',
 'trade.creative':'Creativ / Media',
 'trade.cleaning':'Curățenie / Domestic',
 'trade.beauty':'Frumusețe / Îngrijire',
 'trade.retail':'Retail / Magazin online',
 'trade.other':'Altele',
 'sug.title':'Categorii sugerate',
 'sug.hint':'Pe baza tipului tău de muncă. Atinge pentru a adăuga.',
 'sug.add':'Adaugă selectate',
 'sug.skip':'Sari peste',
 'sug.added':'{n} categorii adăugate',
 'f.repeat':'Repetă lunar',
 'f.repeatHint':'Cost lunar fix? Adaugă-l pentru toate cele 12 luni dintr-o atingere.',
 'f.dateLocked':'Alege o dată din anul fiscal {y}.',
 'f.repeatFrom':'Repetă din',
 'f.recQ':'Aceasta este o cheltuială lunară recurentă.',
 'f.recThis':'Doar luna aceasta',
 'f.recFuture':'Luna aceasta și următoarele',
 'f.repeatAdded':'Adăugat pentru {n} luni',
 'f.repeatOff':'O singură dată',
 'f.repeatOn':'Lunar',
 'f.repeatPick':'Ce luni? Atinge pentru a include.',
 'f.tbc':'De stabilit',
 'f.tbc2':'De stabilit',
 'ob.h1':'Află-ți taxele<br>în câteva secunde',
 'ob.chooseLang':'Alege limba',
 'ob.lede':'Bani intrați, bani ieșiți, taxe la zi. Fără contabil, fără jargon.',
 'ob.signIn':'Conectează-te',
 'ob.signInS':'Salvează datele și sincronizează între dispozitive',
 'ob.noAcc':'Începe fără cont',
 'ob.noAccS':'Rămâne pe acest telefon — te poți conecta oricând',
 'ob.codeLogin':'Ai un partner sync code? Conectează-te mai întâi.',
 'ob.howStart':'Cum vrei să începi?',
 'ob.together':'Hai să o facem împreună',
 'ob.togetherS':'Te ghidez pas cu pas — apoi știi exact cât ai de plătit.',
 'ob.dash':'Direct la panou',
 'ob.dashS':'Știu ce fac.',
 'ob.codeEntry':'Ai un partner sync code? Alege „Direct la panou”, apoi introdu-l în Setări.',
 'ob.run':'Cum lucrezi?',
 'ob.partner':'Cu un partener',
 'ob.shareLabel':'Partea ta din profit',
 'ob.shareHint':'Doar partea ta din profit se impozitează ca a ta. Majoritatea parteneriatelor egale sunt 50%.',
 'ob.syncTitle':'Sincronizare cu partenerul',
 'ob.joinCode':'Cod de alăturare',
 'ob.remove':'Elimină',
 'ob.syncHint':'Dacă partenerul folosește deja TaxMate, introdu partner sync code-ul lui ca ambele telefoane să fie sincronizate.',
 'ob.enterCode':'Introdu codul partenerului',
 'ob.later':'Mai târziu',
 'ob.syncPro':'Sincronizarea a două telefoane e funcție Pro — conectează-te și treci la Pro oricând din Setări. Fără ea, cifrele merg perfect pe acest telefon.',
 'ob.step1':'Pasul 1 din 3 · Munca ta',
 'ob.whatDo':'Cu ce te ocupi?',
 'ob.bizLede':'Numele activității — cei mai mulți pun pur și simplu meseria.',
 'ob.bizName':'Numele activității',
 'ob.bizPh':'ex. curier Evri',
 'ob.bizEg':'Șofer Uber · Curățenie · Meșter · Deliveroo',
 'ob.continue':'Continuă',
 'ob.codePrompt':'Introdu partner sync code-ul de 8 caractere al partenerului:',
 'ob.catchBiz':'Recuperează · alege activitatea',
 'ob.whichBiz':'Care activitate?',
 'ob.pickLede':'Adaugă lunile trecute la activitatea potrivită. Pe celelalte le poți recupera separat.',
 'ob.soleTag':'Activitate individuală',
 'ob.partTag':'Parteneriat · {s}% al tău',
 'ob.addFrom':'Adaugă cifrele din {m}',
 'ob.catchMonth':'Recuperează · alege luna',
 'ob.step2':'Pasul 2 din 3 · Luna de start',
 'ob.whereStart':'De unde începem?',
 'ob.startLede':'Alege prima lună pe care vrei să o completezi. Mergem apoi lună cu lună.',
 'ob.taxYearNote':'Anul fiscal UK ține din aprilie până în aprilie.',
 'ob.step3':'Pasul 3 din 3 · {a} din {b} luni',
 'ob.yourWork':'Munca ta',
 'ob.addAnother':'Adaugă încă unul',
 'ob.split':'Împarte pe categorii',
 'ob.addAgain':'Adaugă din nou:',
 'ob.close':'Închide',
 'ob.pickIcon':'Alege o pictogramă și adaugă o categorie — combustibil, telefon, asigurare…',
 'ob.addCat':'Adaugă categorie',
 'ob.details':'Detalii',
 'ob.from':'De la cine?',
 'ob.catInPh':'ex. Uber Eats, Evri, Amazon',
 'ob.catOutPh':'ex. Combustibil, Asigurare, Telefon',
 'ob.drive':'🚗 Ai condus pentru muncă?',
 'ob.addMiles':'Adaugă mile',
 'ob.milesIn':'Mile de lucru în {m}',
 'ob.milesPh':'ex. 850',
 'ob.mileHintA':'Deducere {p}p pe milă',
 'ob.mileHintB':' · ≈ £{x} deducere',
 'ob.mileHintC':'. Doar dacă nu ai adăugat deja combustibilul la cheltuieli.',
 'ob.noDrive':'Fără condus luna asta',
 'ob.soFar':'{m} până acum',
 'ob.nextMonth':'Luna următoare →',
 'ob.finishBtn':'Termină și vezi taxa',
 'ob.allCaught':'Totul la zi',
 'ob.estLabel':'Taxă estimată de pus deoparte',
 'ob.basedOn':'pe baza a {n} luni',
 'ob.monthsAdded':'Luni adăugate',
 'ob.totIn':'Venit total',
 'ob.totOut':'Cheltuieli totale',
 'ob.mileRow':'Mile ({n} mi)',
 'ob.profitFar':'Profit până acum',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'Totul la zi. {n} elemente pot fi aranjate mai târziu — le găsești marcate pe panou. De acum, apasă ＋ când intră sau ies bani.',
 'ob.cleanLine':'Totul la zi. De acum, apasă ＋ când intră sau ies bani — de restul se ocupă TaxMate.',
 'ob.goDash':'Mergi la panoul meu',
 'ob.estWarn':'⚠️ Doar estimare — nu taxa finală. Depui la HMRC până pe 31 ianuarie.',
 'sec.account':'Cont',
 'sec.biz':'Afacerile tale',
 'sec.prefs':'Preferințe',
 'sec.data':'Backup și date',
 'sec.report':'Rapoarte',
 'rep.desc':'Un sumar complet al anului — pentru tine, contabil sau cerere de credit.',
 'sec.legal':'Despre și legal',
 'leg.privacy':'Politica de confidențialitate',
 'leg.terms':'Termeni de utilizare',
 'leg.disclaimer':'Declinare fiscală',
 'leg.disclaimerBody':'TaxMate oferă estimări pentru a te ajuta să planifici. Nu este consultanță fiscală și nu înlocuiește un contabil sau HMRC. Confirmă întotdeauna cifrele înainte de depunere.',
 'leg.version':'Versiune',
 'leg.madeIn':'Creat în UK pentru persoane independente.',
 'f.catErr':'Alege o categorie',
 'f.dateOtherYear':'Această dată aparține anului fiscal {y} — intrarea va apărea acolo.',
 'tax.emptyT':'Adaugă o afacere pentru estimarea taxelor',
 'tax.emptyS':'Situația ta fiscală apare aici după ce adaugi o afacere și începi să înregistrezi venituri.',
 'tip.entries':'e',
 'fd.title':'Folder',
 'fd.add':'Folder nou',
 'fd.name':'Numele folderului',
 'fd.none':'Fără folder',
 'fd.manage':'Foldere',
 'fd.deleteM':'Înregistrările își păstrează datele — pierd doar eticheta de folder.',
 'fd.all':'Toate folderele',
 'cc.add':'Categorie nouă',
 'cc.name':'Numele categoriei',
 'cc.colour':'Culoare',
 'cc.emoji':'Pictogramă',
 'cc.manage':'Categoriile mele',
 'cc.deleteM':'Înregistrările cu această categorie vor apărea ca „Altele".',
 'pro.title':'Planuri TaxMate','pro.sub':'Versiunea gratuită face elementele de bază pentru totdeauna.','billing.monthly':'Lunar','billing.yearly':'Anual','billing.billedYearly':'Facturat anual',
 'tier.free':'Gratuit','tier.plus':'Plus','tier.pro':'Pro',
 'tier.freeSub':'Tot ce trebuie pentru a declara singur','tier.plusSub':'Economisește mai mult, lucrează mai inteligent','tier.proSub':'Pentru parteneriate și comercianți serioși',
 'tier.current':'Plan curent','tier.choose':'Alege {p}','tier.active':'Activ',
 'feat.records':'Venituri și cheltuieli','feat.taxcalc':'Estimare fiscală','feat.onebiz':'O afacere','feat.mileageBasic':'Total kilometraj','feat.sa103view':'Referință SA103','feat.sync':'Sincronizare cloud','feat.backup':'Copie și restaurare',
 'feat.mileageCompare':'Comparație kilometraj cu costuri','feat.aiTips':'Asistent','feat.multiBiz':'Mai multe afaceri','feat.receiptPhoto':'Foto bonuri','feat.pdfReport':'Raport fiscal PDF',
 'feat.partnerSync':'Sincronizare partener','feat.sa104':'SA104 parteneriat','feat.receiptPack':'Pachet PDF organizat de bonuri','feat.mtdReady':'Rezumat trimestrial al evidențelor (fără trimitere HMRC)',
 'lock.title':'Funcție {p}','lock.body':'Face parte din TaxMate {p}. Fă upgrade pentru a debloca.','lock.upgrade':'Vezi planuri','home.signinTitle':'Salvează-ți datele','home.signinSub':'Conectează-te pentru a salva în cloud și a sincroniza.','home.signinBtn':'Conectare','pwa.install':'Descarcă','pwa.installSub':'Instalează aplicația pe telefon.','pwa.iosTitle':'Adaugă pe ecranul principal','pwa.iosBody':'Pe iPhone, instalează din Safari:','pwa.iosStep1':'Atinge butonul Partajare (pătrat cu săgeată) jos în Safari','pwa.iosStep2':'Derulează și atinge „Adaugă la ecran principal”','pwa.iosStep3':'Atinge „Adaugă” — gata! Iconița TaxMate apare pe ecran','pwa.iosNote':'Notă: funcționează doar în Safari, nu în Chrome.','pwa.andTitle':'Instalează aplicația','pwa.andBody':'Browserul nu a afișat butonul de instalare. Poți instala totuși:','pwa.andStep1':'Atinge meniul (⋮) din dreapta sus în Chrome','pwa.andStep2':'Atinge „Instalează aplicația” sau „Adaugă la ecran”','pwa.andStep3':'Confirmă — iconița TaxMate apare pe ecran','pwa.andTip':'Sfat: dacă vezi doar „Adaugă la ecran” (scurtătură), închide site-ul, șterge cache-ul, redeschide și așteaptă.','pdf.enHint':'Rapoartele PDF sunt generate în engleză. Numele scrise în alte limbi pot să nu apară.','lang.pdfHint':'Sfat: rapoartele PDF se exportă doar în engleză.','rp.title':'Pachet bonuri','rp.desc':'Combină toate fotografiile bonurilor într-un PDF pentru HMRC.','rp.btn':'Exportă pachetul','rp.none':'Nicio fotografie de bon în această perioadă.','rp.building':'Se creează pachetul…','rp.page':'Bon {i} din {n}','pro.titleOld':'TaxMate Pro',
 'pro.sub':'Funcțiile esențiale sunt gratuite. Fă upgrade când ai nevoie.',
 'sy.title':'Sincronizare cu partenerul',
 'sy.enable':'Sincronizează cu partenerul meu',
 'sy.code':'Cod de parteneriat',
 'sy.invite':'Invită partenerul',
 'sy.inviteMsg':'Salut! Acesta este codul de sincronizare pentru „{n}" pe TaxMate UK. 🤝\nMergi pe taxmate.uk\n1. Apasă „Sign in"\n2. Alege „🚀 Go straight to dashboard"\n3. Apasă „Settings" — colțul din dreapta jos 😉\n4. Treci la Pro\n5. Apoi introdu codul: {c}',
 'sy.join':'Ai un cod de la partener? Introdu-l și totul se sincronizează automat.',
 'sy.enterCode':'Introdu codul',
 'sy.synced':'Sincronizat',
 'sy.badCode':'Codul nu a fost găsit — verifică și încearcă din nou.',
 'sy.needPro':'Sincronizarea este o funcție Pro — deblocheaz-o în Altele.',
 'sy.needNet':'Nu s-a putut contacta serviciul — verifică conexiunea.',
 'sy.setup':'Această copie a aplicației nu are sincronizarea configurată.',
 'sy.leave':'Oprește sincronizarea pe acest dispozitiv',
 'sy.copied':'Copiat!',
 'sy.saveFirst':'Salvează afacerea mai întâi, apoi pornește sincronizarea.',
 'ac.title':'Cont și cloud',
 'ac.why':'Conectează-te și datele te urmează — telefon nou, aceleași date. Gratuit.',
 'ac.google':'Continuă cu Google',
 'ac.signedAs':'Conectat ca',
 'ac.signout':'Deconectare',
 'ac.signoutM':'Datele rămân pe acest telefon și în cloud. Reconectează-te oricând.',
 'ac.local':'Doar acest dispozitiv — conectează-te pentru backup automat.',
 'ac.needSignInTitle':'Autentificare necesară',
 'ac.needSignInBody':'Plus și Pro necesită un cont, astfel încât planul tău să te urmeze pe toate dispozitivele. Conectează-te mai jos, apoi alege planul.',
 'ac.cloudOn':'Backup în cloud activ',
 'ac.err':'Conectarea a eșuat — încearcă din nou.',
 'ac.needNet':'Conectarea necesită internet.'
},
es:{
 'nav.home':'Inicio',
 'nav.income':'Ingresos',
 'nav.expenses':'Gastos',
 'nav.tax':'Impuestos',
 'nav.more':'Ajustes',
 'c.save':'Guardar',
 'c.cancel':'Cancelar','c.discardConfirm':'¿Descartar cambios?','c.discardConfirmM':'Los datos no guardados se perderán.',
 'c.edit':'Editar',
 'c.yes':'Sí, hazlo',
 'c.active':'Activo',
 'home.hi':'Hola 👋',
 'home.profit':'Tu beneficio · {y}',
 'home.in':'Ingresos',
 'home.out':'Gastos',
 'home.taxT':'Aparta para impuestos',
 'home.taxS':'Impuesto estimado sobre tu beneficio hasta ahora',
 'home.oweLine':'Impuesto estimado a pagar',
 'home.biz':'Tus negocios',
 'home.addBiz':'Añadir un negocio',
 'home.recent':'Actividad reciente',
 'home.share':'tu parte',
 'tag.sole':'Autónomo',
 'tag.part':'Sociedad (partnership)',
 'tag.your':'tu {n}%',
 'w.title':'Bienvenido a TaxMate 👋',
 'w.sub':'Registra tu dinero como autónomo y ve tu factura fiscal real — gratis, privado, sin registro.',
 'w.priv':'🔒 Privado por diseño. Tus datos son solo tuyos — en tu dispositivo, sincronizados de forma segura solo si inicias sesión.',
 'w.steps':'1 · Añade tu negocio\n2 · Apunta ingresos y gastos sobre la marcha\n3 · La pestaña Impuestos mantiene la factura al día — el 31 de enero ya no te sorprenderá',
 'w.start':'Añade tu primer negocio',
 'inc.title':'Ingresos',
 'inc.add':'Añadir ingreso',
 'inc.empty':'Sin ingresos registrados',
 'inc.emptyS':'Apunta el dinero según llega — la estimación se actualiza en vivo.',
 'exp.title':'Gastos',
 'exp.add':'Añadir gasto',
 'exp.empty':'Sin gastos todavía',
 'exp.emptyS':'Cada gasto registrado puede reducir tu factura fiscal.',
 'flt.all':'Todos',
 'f.amount':'Importe',
 'f.date':'Fecha',
 'f.business':'Negocio',
 'f.category':'Categoría',
 'f.note':'Nota',
 'f.optional':'(opcional)',
 'f.amountErr':'Introduce un importe mayor que 0',
 'f.bizUse':'Uso para el negocio','f.bizUsePartial':'¿Parcialmente personal?',
 'f.bizUseHint':'¿Parcialmente personal (como tu móvil)? Deduce solo la parte del negocio — HMRC espera un reparto justo.',
 'f.addIncome':'Añadir ingreso',
 'f.editIncome':'Editar ingreso',
 'f.addExpense':'Añadir gasto',
 'f.editExpense':'Editar gasto',
 'f.deleteEntry':'Eliminar esta entrada',
 'b.add':'Añadir un negocio',
 'b.edit':'Editar negocio',
 'b.name':'Nombre del negocio',
 'b.nameErr':'Introduce un nombre',
 'b.setup':'¿Cómo está organizado?',
 'b.justMe':'Solo yo',
 'b.partnership':'Sociedad',
 'b.soleHint':'Trabajas por tu cuenta y todo el beneficio es tuyo.',
 'b.partHint':'Lo llevas con alguien más y repartís el beneficio. Solo tu parte tributa.',
 'b.share':'Tu parte del beneficio (%)',
 'b.delete':'Eliminar este negocio y sus entradas',
 'tax.bill':'Factura estimada · {y}',
 'tax.it':'Income Tax',
 'tax.c4':'Class 4 NI',
 'tax.fileBy':'Presenta y paga antes del {d}',
 'tax.taT':'Gastos vs deducción de £1,000',
 'tax.taHint':'HMRC te permite restar £1,000 fijos de tus ingresos como autónomo en vez de los gastos reales (no para sociedades). Gana el beneficio menor — TaxMate compara ambos por ti.',
 'tax.taActual':'Beneficio con gastos reales',
 'tax.taAllow':'Beneficio con deducción de £1,000',
 'tax.taBest':'Lo mejor para ti',
 'tax.taSave':'ahorra {x} de beneficio',
 'tax.auto':'Auto',
 'tax.allowance':'Deducción',
 'tax.expensesOpt':'Gastos',
 'tax.using':'Usando: {x}',
 'tax.autoNote':'Auto siempre elige la opción más barata para ti.',
 'tax.usingAllow':'deducción £1,000 (trading allowance)',
 'tax.usingExp':'gastos reales',
 'tax.how':'Cómo se calcula',
 'tax.taxableP':'Tu beneficio imponible',
 'tax.pa':'Personal Allowance',
 'tax.paHint':'cantidad libre de impuestos para todos',
 'tax.paRed':'reducida — ingresos sobre £100,000',
 'tax.taxable':'Renta imponible',
 'tax.basic':'Tipo básico',
 'tax.higher':'Tipo superior',
 'tax.addl':'Tipo adicional',
 'tax.on':'sobre',
 'tax.c4Hint':'6% sobre beneficio £12,570–£50,270, 2% por encima',
 'tax.c2':'Class 2 National Insurance',
 'tax.c2Paid':'beneficio sobre £{x}, así que cuenta como pagado — crédito gratis para la State Pension',
 'tax.c2Vol':'beneficio bajo £{x} — puedes pagar £{v} voluntariamente para proteger tu State Pension',
 'tax.opt':'opcional',
 'tax.total':'Factura total',
 'tax.payT':'Lo que pagarás realmente',
 'tax.editPos':'Editar',
 'tax.thisBill':'Factura de este año (arriba)',
 'tax.priorAdj':'Ajuste del año pasado',
 'tax.priorAdjS':'pago de menos/de más arrastrado',
 'tax.poaPaid':'Payments on account ya realizados',
 'tax.balancing':'Pago de regularización el 31 ene',
 'tax.refund':'💚 Parece una devolución. Si sigue negativo tras presentar, HMRC te debe dinero.',
 'tax.datesT':'Fechas de pago',
 'tax.poaWhy':'Tu factura supera £1,000, así que HMRC también pide dos pagos a cuenta para el próximo año — mitad cada uno.',
 'tax.janS':'regularización + 1er pago a cuenta',
 'tax.julS':'2º pago a cuenta',
 'tax.poaReduce':'¿Esperas menos beneficio el próximo año? Puedes pedir a HMRC reducir los pagos a cuenta — pero si reduces de más, cobran intereses.',
 'tax.noPoa':'toda tu factura — sin pagos a cuenta (menos de £1,000)',
 'tax.accT':'¿Qué tan precisa es esta estimación?',
 'tax.accB':'Usa los tipos de {y} para Inglaterra, Gales e Irlanda del Norte (Escocia tiene tramos distintos). Asume que el trabajo autónomo es tu único ingreso — empleos PAYE, intereses, dividendos y préstamo estudiantil aún no se incluyen. Es una estimación de planificación, no asesoría fiscal — confirma con HMRC o un contable antes de presentar.',
 'tax.disc':'Solo estimación — no es asesoría fiscal.','tax.estimateWarn':'Esto es una estimación, no tu impuesto final. Aún debes declarar a HMRC antes del 31 de enero. No afiliado a HMRC.',
 'a.title':'Tu situación con HMRC',
 'a.sub':'Dos cifras de tu último Self Assessment que cambian lo que pagas realmente este año.',
 'a.poaLabel':'Pagos a cuenta ya hechos para este año',
 'a.poaHint':'Los anticipos (31 ene + 31 jul) que HMRC pidió según el año pasado. Pon el total, o 0 si ninguno.',
 'a.priorLabel':'Ajuste del año pasado',
 'a.priorHint':'¿Pagaste de menos y se arrastró? Pon positivo. ¿Pagaste de más y se descuenta? Pon negativo (ej. -120).',
 'm.title':'Ajustes',
 'm.biz':'Negocios',
 'm.lang':'Idioma',
 'm.backup':'Copia de seguridad',
 'm.backupHint':'Tus datos ya están en la nube. Descarga una copia local como seguro adicional.',
 'm.export':'Copia de seguridad (JSON)',
 'm.backupFull':'Copia completa','m.backupFullS':'Incluye tus datos de TaxMate y los archivos de recibos (ZIP)',
 'm.backupData':'Copia solo de datos','m.backupDataS':'Solo los registros de TaxMate; los archivos de recibos no se incluyen (JSON)',
 'm.csv':'Exportar entradas (CSV para Excel)',
 'm.restore':'Restaurar desde copia',
 'm.danger':'Zona de peligro','m.eraseCloud':'Borrar todos mis datos (incl. la nube)','m.eraseCloudT':'¿Borrar los datos de tu cuenta TaxMate?','m.eraseCloudM':'Esto elimina permanentemente tus negocios, entradas, recibos y ajustes personales del dispositivo y de la nube de TaxMate. Se elimina tu membresía en sociedades compartidas, pero los registros permanecen para otros miembros. Las copias del proveedor y los registros de pago exigidos por ley pueden conservarse durante un tiempo limitado. Exporta antes una copia.','m.erasing':'Borrando tus datos…','m.erasedAll':'Los datos personales de tu cuenta TaxMate se han borrado del dispositivo y de la nube; los registros compartidos pueden permanecer para otros miembros.','m.erasedLocal':'Datos locales borrados. No se pudo acceder a la nube — inténtalo de nuevo en línea.',
 'm.reset':'Borrar todos los datos del dispositivo',
 'm.resetT':'¿Borrar todo?',
 'm.resetM':'Borra todos los negocios, entradas y ajustes de este dispositivo. No se puede deshacer. Exporta una copia antes si tienes dudas.',
 'm.foot':'TaxMate UK · gratis, privado, sin conexión. Solo estimaciones — no asesoría fiscal.',
 'd.entryT':'¿Eliminar esta entrada?',
 'd.entryM':'Se eliminará permanentemente.',
 'd.bizT':'¿Eliminar este negocio?',
 'd.bizM':'Todas sus entradas también se eliminarán. No se puede deshacer.',
 'r.title':'¿Restaurar esta copia?',
 'r.msg':'Reemplazará todo lo que hay ahora en el dispositivo.',
 'r.bad':'Ese archivo no es una copia de TaxMate.',
 'cat.vehicle':'Vehículo y combustible',
 'cat.travel':'Viajes y parking',
 'cat.phone':'Teléfono e internet',
 'cat.home':'Trabajo en casa',
 'cat.equip':'Equipo y herramientas',
 'cat.office':'Oficina y administración',
 'cat.stock':'Stock y materiales',
 'cat.insure':'Seguro',
 'cat.fees':'Servicios profesionales',
 'cat.market':'Marketing y suscripciones',
 'cat.repair':'Reparaciones',
 'cat.other':'Otro gasto',
 'cat.sales':'Ingreso por trabajo',
 'cat.tips':'Propinas y bonus',
 'cat.royalty':'Regalías',
 'cat.otherin':'Otro ingreso',
 'rc.add':'Añadir recibo',
 'rc.take':'Hacer foto','rc.upload':'Subir recibo','rc.chooseExisting':'Elegir foto existente',
 'rc.imagesOnly':'Solo archivos de imagen',
 'rc.view':'Ver recibo',
 'rc.delete':'Eliminar recibo',
 'rc.uploading':'Subiendo…','rc.signinNeeded':'Inicia sesión de nuevo para guardar en la nube',
 'rcb.tab':'Recibos',
 'rcb.title':'Añadir recibos',
 'rcb.intro':'Elige una categoría y un mes, luego añade un recibo a cada gasto que aún lo necesite.',
 'rcb.cat':'Categoría',
 'rcb.month':'Mes',
 'rcb.allMonths':'Todos los meses',
 'rcb.noMissing':'Cada gasto aquí ya tiene recibo. 🎉',
 'rcb.pickCat':'Elige una categoría para ver los gastos sin recibo.',
 'rcb.noExpenses':'No hay gastos en esta categoría.',
 'rcb.add':'Añadir',
 'rcb.done':'✓',
 'rcb.uploading':'Subiendo…',
 'rcb.remaining':'{n} aún necesitan recibo',
 'rcb.allDone':'Listo — cada gasto tiene recibo.',
 'rcb.tip':'¿Dos recibos para un gasto? Ponlos uno al lado del otro en una sola imagen.',
 'car.rcTitle':'Fotografía tus recibos',
 'car.rcBody':'Adjunta fotos a tus gastos en un solo lugar.',
 'car.rcCta':'Añadir recibos →',
 'car.rcLockedBody':'Una función Plus — adjunta la foto del recibo al gasto.',
 'car.rcLockedCta':'Ver Plus →',
 'rc.uploadErr':'Error al subir — inténtalo de nuevo',
 'rc.deleteConfirm':'¿Eliminar esta foto del recibo?',
 'rc.proOnly':'Las fotos de recibos son una función Plus — desbloquéala en Ajustes.',
 'pdf.download':'Descargar informe PDF',
 'pdf.title':'Resumen fiscal',
 'pdf.generated':'Generado',
 'pdf.business':'Negocio',
 'pdf.structure':'Tipo',
 'pdf.period':'Año fiscal',
 'pdf.income':'Ingresos totales',
 'pdf.expenses':'Gastos totales (deducibles)',
 'pdf.profit':'Beneficio',
 'pdf.estTax':'Impuesto estimado',
 'pdf.incomeDetail':'Detalle de ingresos',
 'pdf.expenseDetail':'Detalle de gastos',
 'pdf.taxCalc':'Cálculo de impuestos',
 'pdf.date':'Fecha',
 'pdf.category':'Categoría',
 'pdf.description':'Descripción',
 'pdf.amount':'Importe',
 'pdf.bizPct':'Uso biz %',
 'pdf.claimable':'Deducible',
 'pdf.pa':'Personal Allowance',
 'pdf.taxable':'Renta imponible',
 'pdf.incomeTax':'Income Tax',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'Total a pagar',
 'pdf.disclaimer':'Solo estimación — no asesoría fiscal. Confirma con HMRC o un contable.',
 'pdf.noEntries':'Sin entradas en este período.',
 'mi.title':'Millaje vs gastos reales',
 'mi.sub':'HMRC te permite deducir 55p/milla (primeras 10.000) y 25p/milla después — en vez de guardar cada recibo. TaxMate compara ambos métodos.',
 'mi.miles':'Millas conducidas este año',
 'mi.milesClaim':'Deducción por millaje',
 'mi.actual':'Tus gastos de vehículo registrados',
 'mi.diff':'Diferencia',
 'mi.bestMile':'El millaje gana',
 'mi.bestActual':'Los gastos reales ganan',
 'mi.equal':'Aproximadamente igual',
 'mi.saveMile':'El millaje da {x} más de deducción',
 'mi.saveActual':'Los gastos reales dan {x} más de deducción',
 'mi.adviceMile':'Cambia a millaje — supera tus recibos en {x}.',
 'mi.adviceActual':'Sigue guardando recibos — tus costes reales superan la tarifa en {x}.',
 'mi.adviceEqual':'Ambos métodos dan resultados similares.',
 'mi.noVehicle':'Sin gastos de vehículo registrados — añade entradas para comparar.',
 'mi.enterMiles':'Introduce millas para comparar',
 'mi.carsOnly':'Solo aplica a sole trader (no sociedades).',
 'mi.rate':'55p primeras 10.000 millas · 25p después',
 'sa.title':'Referencia Self Assessment',
 'sa.sub':'Copia estos números en tu declaración en gov.uk.',
 'sa.103':'SA103 · Autónomo (sole trader)',
 'sa.104':'SA104 · Ingresos de sociedad',
 'sa.box':'Caja',
 'sa.value':'Valor',
 'sa.description':'Descripción',
 'sa.copy':'Copiar',
 'sa.copied':'¡Copiado!',
 'sa.expBreakdown':'Desglose de gastos (cajas 19–35)',
 'sa.taNote':'Usas la deducción £1,000 Trading Allowance — marca la Caja 38.',
 'sa.lossNote':'Has tenido pérdidas — ponlo en la Caja 11, deja la Caja 10 en blanco.',
 'sa.partNote':'Completa un formulario SA104 por cada sociedad.',
 'sa.govLink':'Presenta tu Self Assessment en gov.uk',
 'tip.title':'Asistente',
 'tip.dismiss':'Descartar',
 'tip.addNow':'Añadir ahora',
 'tip.home_t':'Deduce trabajo desde casa',
 'tip.home_b':'HMRC permite £6/semana (£312/año) a tanto alzado por trabajar desde casa — sin recibos. Aún no tienes gastos de ese tipo.',
 'tip.phone_t':'Deduce tu factura de móvil',
 'tip.phone_b':'Si usas el móvil para trabajar, puedes deducir la parte laboral. Incluso el 50% de £30/mes ahorra £36/año. Sin entradas.',
 'tip.c2_t':'Protege tu pensión del estado',
 'tip.c2_b':'Tu beneficio está por debajo del umbral Class 2 NI (£6,845). Pagar £182/año voluntariamente protege tu historial de pensión.',
 'tip.poa_t':'Sorpresa en enero',
 'tip.poa_b':'Tu factura supera £1,000 — HMRC pedirá dos pagos a cuenta (31 ene + 31 jul). Reserva {x} extra.',
 'tip.mileage_t':'Compara millaje vs gastos reales',
 'tip.mileage_b':'Tienes gastos de vehículo pero no has introducido millas. Sube para comparar.',
 'tip.receipt_t':'Fotos de recibos pendientes',
 'tip.receipt_b':'{n} gasto{e} sin foto. HMRC puede pedir pruebas.',
 'tip.entry':'',
 'acc.export':'Descargar informe contable (CSV)',
 'acc.prepared':'Generado por TaxMate UK — solo estimación, no asesoría fiscal',
 'qt.title':'Desglose trimestral',
 'qt.q1':'T1  6 abr – 5 jul',
 'qt.q2':'T2  6 jul – 5 oct',
 'qt.q3':'T3  6 oct – 5 ene',
 'qt.q4':'T4  6 ene – 5 abr',
 'qt.current':'actual',
 'qt.income':'Ingresos',
 'qt.expenses':'Gastos',
 'qt.profit':'Beneficio',
 'qt.noData':'Sin entradas este trimestre.',
 'mtd.title':'Making Tax Digital (MTD)',
 'mtd.50k':'MTD te aplica desde abril 2026 — beneficio sobre £50,000.',
 'mtd.30k':'MTD te aplica desde abril 2027 — beneficio sobre £30,000.',
 'mtd.20k':'MTD te aplica desde abril 2028 — beneficio sobre £20,000.',
 'mtd.ok':'MTD no requerido aún — umbral £20,000.',
 'mtd.what':'MTD significa enviar actualizaciones trimestriales a través de software aprobado por HMRC.',
 'cal.export':'Añadir fechas fiscales al calendario (.ics)',
 'cal.desc':'Fechas límite fiscales UK con recordatorio 7 días antes.',
 'nb.jan':'Self Assessment en {n} día/días — 31 enero',
 'nb.jul':'Payment on account en {n} día/días — 31 julio',
 'nb.today_jan':'Hoy vence Self Assessment — 31 enero',
 'nb.today_jul':'Hoy vence Payment on account — 31 julio',
 'nb.days':'días',
 'nb.day':'día',
 'toast.saved':'Guardado',
 'toast.deleted':'Eliminado',
 'toast.restored':'Copia restaurada',
 'toast.calAdded':'Archivo de calendario descargado',
 'm.theme':'Apariencia',
 'theme.auto':'Auto',
 'theme.light':'Claro',
 'theme.dark':'Oscuro',
 'cc.rename':'Renombrar categorías',
 'cc.renameHint':'Toca una categoría para darle tu propio nombre.',
 'cc.editName':'Nombre de categoría',
 'cc.reset':'Restablecer',
 'cc.renameDone':'Renombrado',
 'cc.longPress':'Toca ＋ para añadir. Mantén pulsada (o toca ✎) una categoría para editar.',
 'cc.action':'¿Qué quieres hacer?',
 'cc.doRename':'Renombrar',
 'cc.doDelete':'Quitar de la lista',
 'cc.deleted':'Quitado',
 'cc.emojiHint':'Toca abajo y usa tu teclado para elegir un emoji.','cc.emojiErr':'Elige un emoji',
 'cc.delDataT':'¿Quitar esta categoría?',
 'cc.delDataM':'Esta categoría tiene {n} entradas. Quitarla no las eliminará.',
 'cc.cantDeleteUsed':'Esta categoría tiene entradas — seguirá visible.',
 'b.trade':'Tipo de trabajo',
 'b.tradeHint':'Sugeriremos categorías de gastos — puedes cambiarlas cuando quieras.',
 'trade.delivery':'Reparto / Conductor',
 'trade.construction':'Construcción / Oficios',
 'trade.consultant':'Consultor / TI',
 'trade.creative':'Creativo / Medios',
 'trade.cleaning':'Limpieza / Doméstico',
 'trade.beauty':'Belleza / Cuidado personal',
 'trade.retail':'Comercio / Tienda online',
 'trade.other':'Otro',
 'sug.title':'Categorías sugeridas',
 'sug.hint':'Según tu tipo de trabajo. Toca para añadir las que necesites.',
 'sug.add':'Añadir seleccionadas',
 'sug.skip':'Omitir',
 'sug.added':'{n} categorías añadidas',
 'f.repeat':'Repetir mensualmente',
 'f.repeatHint':'¿Coste mensual fijo? Añádelo para los 12 meses con un toque.',
 'f.dateLocked':'Elige una fecha dentro del año fiscal {y}.',
 'f.repeatFrom':'Repetir desde',
 'f.recQ':'Este es un gasto mensual recurrente.',
 'f.recThis':'Solo este mes',
 'f.recFuture':'Este mes y los siguientes',
 'f.repeatAdded':'Añadido para {n} meses',
 'f.repeatOff':'Una vez',
 'f.repeatOn':'Cada mes',
 'f.repeatPick':'¿Qué meses? Toca para incluir.',
 'f.tbc':'Por confirmar',
 'f.tbc2':'Por confirmar',
 'ob.h1':'Conoce tu impuesto<br>en segundos',
 'ob.chooseLang':'Elige tu idioma',
 'ob.lede':'Dinero que entra, dinero que sale, impuestos claros. Sin contable, sin jerga.',
 'ob.signIn':'Iniciar sesión',
 'ob.signInS':'Guarda tus datos y sincroniza entre dispositivos',
 'ob.noAcc':'Empezar sin cuenta',
 'ob.noAccS':'Se queda en este teléfono — inicia sesión cuando quieras',
 'ob.codeLogin':'¿Tienes un partner sync code? Inicia sesión primero.',
 'ob.howStart':'¿Cómo quieres empezar?',
 'ob.together':'Hagámoslo juntos',
 'ob.togetherS':'Te guío paso a paso — y sabrás exactamente cuánto debes.',
 'ob.dash':'Ir directo al panel',
 'ob.dashS':'Sé lo que hago.',
 'ob.codeEntry':'¿Tienes un partner sync code? Elige «Ir directo al panel» y luego introdúcelo en Ajustes.',
 'ob.run':'¿Cómo trabajas?',
 'ob.partner':'Con un socio',
 'ob.shareLabel':'Tu parte del beneficio',
 'ob.shareHint':'Solo tu parte del beneficio tributa como tuya. La mayoría de sociedades igualitarias son 50%.',
 'ob.syncTitle':'Sincroniza con tu socio',
 'ob.joinCode':'Código de unión',
 'ob.remove':'Quitar',
 'ob.syncHint':'Si tu socio ya usa TaxMate, introduce su partner sync code para mantener ambos teléfonos sincronizados.',
 'ob.enterCode':'Introducir código del socio',
 'ob.later':'Lo haré más tarde',
 'ob.syncPro':'Sincronizar dos teléfonos es función Pro — inicia sesión y pásate a Pro cuando quieras en Ajustes. Sin ella, tus cifras funcionan perfectamente en este teléfono.',
 'ob.step1':'Paso 1 de 3 · Tu trabajo',
 'ob.whatDo':'¿A qué te dedicas?',
 'ob.bizLede':'El nombre de tu negocio — la mayoría pone simplemente su oficio.',
 'ob.bizName':'Nombre del negocio',
 'ob.bizPh':'p. ej. repartidor de Evri',
 'ob.bizEg':'Conductor de Uber · Limpieza · Manitas · Deliveroo',
 'ob.continue':'Continuar',
 'ob.codePrompt':'Introduce el partner sync code de 8 caracteres de tu socio:',
 'ob.catchBiz':'Ponte al día · elige negocio',
 'ob.whichBiz':'¿Qué negocio?',
 'ob.pickLede':'Añade los meses pasados al negocio correcto. Los demás puedes ponerlos al día por separado.',
 'ob.soleTag':'Autónomo individual',
 'ob.partTag':'Sociedad · tu {s}%',
 'ob.addFrom':'Añadir mis cifras desde {m}',
 'ob.catchMonth':'Ponte al día · elige mes',
 'ob.step2':'Paso 2 de 3 · Mes de inicio',
 'ob.whereStart':'¿Por dónde empezamos?',
 'ob.startLede':'Elige el primer mes que quieras completar. Iremos mes a mes desde ahí.',
 'ob.taxYearNote':'El año fiscal del Reino Unido va de abril a abril.',
 'ob.step3':'Paso 3 de 3 · {a} de {b} meses',
 'ob.yourWork':'Tu trabajo',
 'ob.addAnother':'Añadir otro',
 'ob.split':'Dividir en categorías',
 'ob.addAgain':'Añadir de nuevo:',
 'ob.close':'Cerrar',
 'ob.pickIcon':'Elige un icono y añade una categoría — gasolina, teléfono, seguro…',
 'ob.addCat':'Añadir categoría',
 'ob.details':'Detalles',
 'ob.from':'¿De quién?',
 'ob.catInPh':'p. ej. Uber Eats, Evri, Amazon',
 'ob.catOutPh':'p. ej. Gasolina, Seguro, Teléfono',
 'ob.drive':'🚗 ¿Condujiste por trabajo?',
 'ob.addMiles':'Añadir millas',
 'ob.milesIn':'Millas de trabajo en {m}',
 'ob.milesPh':'p. ej. 850',
 'ob.mileHintA':'Deducción de {p}p por milla',
 'ob.mileHintB':' · ≈ £{x} de deducción',
 'ob.mileHintC':'. Solo si no has añadido ya la gasolina como gasto.',
 'ob.noDrive':'Sin conducir este mes',
 'ob.soFar':'{m} hasta ahora',
 'ob.nextMonth':'Mes siguiente →',
 'ob.finishBtn':'Terminar y ver mi impuesto',
 'ob.allCaught':'Todo al día',
 'ob.estLabel':'Impuesto estimado a apartar',
 'ob.basedOn':'según {n} mes(es)',
 'ob.monthsAdded':'Meses añadidos',
 'ob.totIn':'Ingresos totales',
 'ob.totOut':'Gastos totales',
 'ob.mileRow':'Millas ({n} mi)',
 'ob.profitFar':'Beneficio hasta ahora',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'Todo al día. {n} elemento(s) puedes pulirlos después — los verás marcados en tu panel. Desde aquí, toca ＋ cuando entre o salga dinero.',
 'ob.cleanLine':'Todo al día. Desde aquí, toca ＋ cuando entre o salga dinero — del resto se encarga TaxMate.',
 'ob.goDash':'Ir a mi panel',
 'ob.estWarn':'⚠️ Solo estimación — no tu impuesto final. Debes declarar a HMRC antes del 31 de enero.',
 'sec.account':'Cuenta',
 'sec.biz':'Tus negocios',
 'sec.prefs':'Preferencias',
 'sec.data':'Copia y datos',
 'sec.report':'Informes',
 'rep.desc':'Un resumen anual completo — para ti, tu contable o una hipoteca.',
 'sec.legal':'Acerca y legal',
 'leg.privacy':'Política de privacidad',
 'leg.terms':'Términos de uso',
 'leg.disclaimer':'Aviso fiscal',
 'leg.disclaimerBody':'TaxMate ofrece estimaciones para ayudarte a planificar. No es asesoría fiscal ni sustituye a un contable o a HMRC. Confirma siempre las cifras antes de presentar.',
 'leg.version':'Versión',
 'leg.madeIn':'Hecho en el Reino Unido para autónomos.',
 'f.catErr':'Elige una categoría',
 'f.dateOtherYear':'Esta fecha pertenece al año fiscal {y} — la entrada aparecerá allí.',
 'tax.emptyT':'Añade un negocio para ver tu estimación',
 'tax.emptyS':'Tu panorama fiscal aparece aquí cuando añadas un negocio y registres ingresos.',
 'tip.entries':'s',
 'fd.title':'Carpeta',
 'fd.add':'Nueva carpeta',
 'fd.name':'Nombre de la carpeta',
 'fd.none':'Sin carpeta',
 'fd.manage':'Carpetas',
 'fd.deleteM':'Las entradas conservan sus datos — solo pierden la etiqueta.',
 'fd.all':'Todas las carpetas',
 'cc.add':'Nueva categoría',
 'cc.name':'Nombre de la categoría',
 'cc.colour':'Color',
 'cc.emoji':'Icono',
 'cc.manage':'Mis categorías',
 'cc.deleteM':'Las entradas que la usan aparecerán como «Otro».',
 'pro.title':'Planes TaxMate','pro.sub':'La versión gratuita hace lo básico para siempre.','billing.monthly':'Mensual','billing.yearly':'Anual','billing.billedYearly':'Facturado anualmente',
 'tier.free':'Gratis','tier.plus':'Plus','tier.pro':'Pro',
 'tier.freeSub':'Todo para declarar tú mismo','tier.plusSub':'Ahorra más, trabaja mejor','tier.proSub':'Para sociedades y autónomos serios',
 'tier.current':'Plan actual','tier.choose':'Elegir {p}','tier.active':'Activo',
 'feat.records':'Ingresos y gastos','feat.taxcalc':'Estimación fiscal','feat.onebiz':'Un negocio','feat.mileageBasic':'Total de kilometraje','feat.sa103view':'Referencia SA103','feat.sync':'Sincronización en la nube','feat.backup':'Copia y restauración',
 'feat.mileageCompare':'Comparación de kilometraje y costes','feat.aiTips':'Asistente','feat.multiBiz':'Múltiples negocios','feat.receiptPhoto':'Fotos de recibos','feat.pdfReport':'Informe fiscal PDF',
 'feat.partnerSync':'Sincronización de socio','feat.sa104':'SA104 sociedad','feat.receiptPack':'Paquete PDF organizado de recibos','feat.mtdReady':'Resumen trimestral de registros (sin envío a HMRC)',
 'lock.title':'Función {p}','lock.body':'Es parte de TaxMate {p}. Mejora para desbloquear.','lock.upgrade':'Ver planes','home.signinTitle':'Haz copia de seguridad','home.signinSub':'Inicia sesión para guardar en la nube y sincronizar.','home.signinBtn':'Iniciar sesión','pwa.install':'Descargar','pwa.installSub':'Instala la app en tu teléfono.','pwa.iosTitle':'Añadir a pantalla de inicio','pwa.iosBody':'En iPhone, instala desde Safari:','pwa.iosStep1':'Toca el botón Compartir (cuadrado con flecha) abajo en Safari','pwa.iosStep2':'Desplázate y toca „Añadir a pantalla de inicio”','pwa.iosStep3':'Toca „Añadir” — ¡listo! El icono de TaxMate aparece en tu pantalla','pwa.iosNote':'Nota: solo funciona en Safari, no en Chrome.','pwa.andTitle':'Instala la app','pwa.andBody':'Tu navegador no mostró el botón de instalación. Aún puedes instalarla:','pwa.andStep1':'Toca el menú (⋮) arriba a la derecha en Chrome','pwa.andStep2':'Toca „Instalar aplicación” o „Añadir a pantalla”','pwa.andStep3':'Confirma — el icono de TaxMate aparece en tu pantalla','pwa.andTip':'Consejo: si solo ves „Añadir a pantalla” (acceso directo), cierra el sitio, borra la caché, vuelve a abrir y espera.','pdf.enHint':'Los informes PDF se generan en inglés. Los nombres en otros idiomas pueden no aparecer.','lang.pdfHint':'Consejo: los informes PDF se exportan solo en inglés.','rp.title':'Pack de recibos','rp.desc':'Reúne todas las fotos de recibos en un PDF para HMRC.','rp.btn':'Exportar pack','rp.none':'No hay fotos de recibos en este periodo.','rp.building':'Creando pack…','rp.page':'Recibo {i} de {n}','pro.titleOld':'TaxMate Pro',
 'pro.sub':'Lo esencial es gratis. Mejora cuando necesites más.',
 'sy.title':'Sincronización con socio',
 'sy.enable':'Sincronizar con mi socio',
 'sy.code':'Código de la sociedad',
 'sy.invite':'Invitar a mi socio',
 'sy.inviteMsg':'¡Hola! Este es el código de sincronización para «{n}» en TaxMate UK. 🤝\nEntra en taxmate.uk\n1. Toca «Sign in»\n2. Elige «🚀 Go straight to dashboard»\n3. Toca «Settings» — esquina inferior derecha 😉\n4. Cambia a Pro\n5. Luego introduce el código: {c}',
 'sy.join':'¿Tienes un código de tu socio? Introdúcelo y todo se sincroniza automáticamente.',
 'sy.enterCode':'Introduce el código',
 'sy.synced':'Sincronizado',
 'sy.badCode':'Código no encontrado — revísalo e inténtalo de nuevo.',
 'sy.needPro':'La sincronización es una función Pro — desbloquéala en Más.',
 'sy.needNet':'No se pudo conectar — revisa tu conexión.',
 'sy.setup':'Esta copia de la app aún no tiene la sincronización configurada.',
 'sy.leave':'Dejar de sincronizar en este dispositivo',
 'sy.copied':'¡Copiado!',
 'sy.saveFirst':'Guarda el negocio primero y luego activa la sincronización.',
 'ac.title':'Cuenta y nube',
 'ac.why':'Inicia sesión y tus datos te siguen — móvil nuevo, mismos datos. Gratis.',
 'ac.google':'Continuar con Google',
 'ac.signedAs':'Sesión iniciada como',
 'ac.signout':'Cerrar sesión',
 'ac.signoutM':'Tus datos se quedan en este móvil y en tu nube. Vuelve a entrar cuando quieras.',
 'ac.local':'Solo este dispositivo — inicia sesión para copia automática.',
 'ac.needSignInTitle':'Inicio de sesión requerido',
 'ac.needSignInBody':'Plus y Pro necesitan una cuenta para que tu plan te acompañe en todos tus dispositivos. Inicia sesión abajo y luego elige tu plan.',
 'ac.cloudOn':'Copia en la nube activa',
 'ac.err':'No se pudo iniciar sesión — inténtalo de nuevo.',
 'ac.needNet':'Iniciar sesión requiere conexión.'
},
ur:{
 'nav.home':'ہوم',
 'nav.income':'آمدنی',
 'nav.expenses':'اخراجات',
 'nav.tax':'ٹیکس',
 'nav.more':'ترتیبات',
 'c.save':'محفوظ کریں',
 'c.cancel':'منسوخ','c.discardConfirm':'تبدیلیاں ختم کریں؟','c.discardConfirmM':'محفوظ نہ کردہ ڈیٹا ضائع ہو جائے گا۔',
 'c.edit':'ترمیم',
 'c.yes':'جی ہاں',
 'c.active':'فعال',
 'home.hi':'السلام علیکم 👋',
 'home.profit':'آپ کا منافع · {y}',
 'home.in':'آمدنی',
 'home.out':'اخراجات',
 'home.taxT':'ٹیکس کے لیے رقم الگ رکھیں',
 'home.taxS':'اب تک کے منافع پر تخمینی ٹیکس',
 'home.oweLine':'ادا کرنے کے لیے تخمینی ٹیکس',
 'home.biz':'آپ کے کاروبار',
 'home.addBiz':'کاروبار شامل کریں',
 'home.recent':'حالیہ اندراجات',
 'home.share':'آپ کا حصہ',
 'tag.sole':'سول ٹریڈر',
 'tag.part':'پارٹنرشپ',
 'tag.your':'آپ کا {n}%',
 'w.title':'TaxMate میں خوش آمدید 👋',
 'w.sub':'اپنی سیلف ایمپلائڈ آمدنی و اخراجات لکھیں اور اصل ٹیکس بل دیکھیں — مفت، نجی، بغیر اکاؤنٹ۔',
 'w.priv':'🔒 آپ کا ڈیٹا آپ کا اپنا ہے — آپ کے آلے پر، اور سائن اِن کرنے پر محفوظ طریقے سے سنک ہوتا ہے۔',
 'w.steps':'1 · اپنا کاروبار شامل کریں\n2 · آمدنی اور اخراجات ساتھ ساتھ لکھتے رہیں\n3 · ٹیکس ٹیب آپ کا بل ہر وقت تازہ رکھتا ہے — 31 جنوری اب حیران نہیں کرے گی',
 'w.start':'پہلا کاروبار شامل کریں',
 'inc.title':'آمدنی',
 'inc.add':'آمدنی شامل کریں',
 'inc.empty':'ابھی کوئی آمدنی درج نہیں',
 'inc.emptyS':'جیسے ہی پیسے آئیں لکھ لیں — ٹیکس کا تخمینہ خود بخود تازہ ہوتا ہے۔',
 'exp.title':'اخراجات',
 'exp.add':'خرچ شامل کریں',
 'exp.empty':'ابھی کوئی خرچ درج نہیں',
 'exp.emptyS':'ہر درج شدہ خرچ آپ کا ٹیکس کم کر سکتا ہے۔',
 'flt.all':'تمام',
 'f.amount':'رقم',
 'f.date':'تاریخ',
 'f.business':'کاروبار',
 'f.category':'زمرہ',
 'f.note':'نوٹ',
 'f.optional':'(اختیاری)',
 'f.amountErr':'0 سے زیادہ رقم درج کریں',
 'f.bizUse':'کاروباری استعمال','f.bizUsePartial':'جزوی طور پر ذاتی؟',
 'f.bizUseHint':'کچھ ذاتی استعمال بھی ہے (جیسے فون)؟ صرف کاروباری حصہ کلیم کریں — HMRC منصفانہ تقسیم چاہتا ہے۔',
 'f.addIncome':'آمدنی شامل کریں',
 'f.editIncome':'آمدنی میں ترمیم',
 'f.addExpense':'خرچ شامل کریں',
 'f.editExpense':'خرچ میں ترمیم',
 'f.deleteEntry':'یہ اندراج حذف کریں',
 'b.add':'کاروبار شامل کریں',
 'b.edit':'کاروبار میں ترمیم',
 'b.name':'کاروبار کا نام',
 'b.nameErr':'نام درج کریں',
 'b.setup':'کاروبار کی شکل',
 'b.justMe':'صرف میں',
 'b.partnership':'پارٹنرشپ',
 'b.soleHint':'آپ اکیلے کام کرتے ہیں اور سارا منافع آپ کا ہے۔',
 'b.partHint':'آپ کسی کے ساتھ چلاتے ہیں اور منافع بانٹتے ہیں۔ صرف آپ کے حصے پر ٹیکس لگتا ہے۔',
 'b.share':'منافع میں آپ کا حصہ (%)',
 'b.delete':'یہ کاروبار اور اس کے اندراجات حذف کریں',
 'tax.bill':'تخمینی بل · {y}',
 'tax.it':'انکم ٹیکس',
 'tax.c4':'کلاس 4 NI',
 'tax.fileBy':'{d} تک جمع کرائیں اور ادا کریں',
 'tax.taT':'اخراجات بمقابلہ £1,000 الاؤنس',
 'tax.taHint':'HMRC اجازت دیتا ہے کہ اصل اخراجات کے بجائے سیلف ایمپلائڈ آمدنی سے سیدھے £1,000 کاٹ لیں (پارٹنرشپ پر لاگو نہیں)۔ جس سے منافع کم ہو وہی بہتر — TaxMate دونوں کا موازنہ کرتا ہے۔',
 'tax.taActual':'اصل اخراجات کے ساتھ منافع',
 'tax.taAllow':'£1,000 الاؤنس کے ساتھ منافع',
 'tax.taBest':'آپ کے لیے بہترین',
 'tax.taSave':'{x} منافع کی بچت',
 'tax.auto':'خودکار',
 'tax.allowance':'الاؤنس',
 'tax.expensesOpt':'اخراجات',
 'tax.using':'استعمال میں: {x}',
 'tax.autoNote':'خودکار ہمیشہ آپ کے لیے سستا آپشن چنتا ہے۔',
 'tax.usingAllow':'£1,000 ٹریڈنگ الاؤنس',
 'tax.usingExp':'اصل اخراجات',
 'tax.how':'حساب کیسے ہوا',
 'tax.taxableP':'آپ کا قابلِ ٹیکس منافع',
 'tax.pa':'پرسنل الاؤنس',
 'tax.paHint':'ٹیکس فری رقم جو سب کو ملتی ہے',
 'tax.paRed':'کم کر دی گئی — آمدنی £100,000 سے زیادہ',
 'tax.taxable':'قابلِ ٹیکس آمدنی',
 'tax.basic':'بنیادی شرح',
 'tax.higher':'اعلیٰ شرح',
 'tax.addl':'اضافی شرح',
 'tax.on':'پر',
 'tax.c4Hint':'منافع £12,570–£50,270 پر 6%، اس سے اوپر 2%',
 'tax.c2':'کلاس 2 نیشنل انشورنس',
 'tax.c2Paid':'منافع £{x} سے زیادہ، لہٰذا ادا شدہ شمار ہوگا — اسٹیٹ پنشن کریڈٹ مفت',
 'tax.c2Vol':'منافع £{x} سے کم — اسٹیٹ پنشن ریکارڈ بچانے کے لیے رضاکارانہ £{v} دے سکتے ہیں',
 'tax.opt':'اختیاری',
 'tax.total':'کل بل',
 'tax.payT':'اصل میں کتنا دینا ہوگا',
 'tax.editPos':'ترمیم',
 'tax.thisBill':'اس سال کا بل (اوپر)',
 'tax.priorAdj':'پچھلے سال کی ایڈجسٹمنٹ',
 'tax.priorAdjS':'کم/زیادہ ادائیگی آگے منتقل',
 'tax.poaPaid':'پہلے سے ادا شدہ payments on account',
 'tax.balancing':'بقایا ادائیگی 31 جنوری تک',
 'tax.refund':'💚 لگتا ہے ریفنڈ بنتا ہے۔ فائل کرنے کے بعد بھی منفی رہا تو HMRC آپ کو پیسے واپس کرے گا۔',
 'tax.datesT':'ادائیگی کی تاریخیں',
 'tax.poaWhy':'بل £1,000 سے زیادہ ہے، اس لیے HMRC اگلے سال کے لیے دو پیشگی ادائیگیاں (payments on account) بھی مانگے گا — آدھی آدھی۔',
 'tax.janS':'بقایا + اگلے سال کی پہلی پیشگی قسط',
 'tax.julS':'اگلے سال کی دوسری پیشگی قسط',
 'tax.poaReduce':'اگلے سال منافع کم ہونے کی توقع؟ HMRC سے پیشگی ادائیگیاں کم کرنے کی درخواست کر سکتے ہیں — مگر زیادہ کم کرائیں تو سود لگے گا۔',
 'tax.noPoa':'پورا بل — پیشگی ادائیگی کی ضرورت نہیں (£1,000 سے کم)',
 'tax.accT':'یہ تخمینہ کتنا درست ہے؟',
 'tax.accB':'{y} کی شرحیں انگلینڈ، ویلز اور شمالی آئرلینڈ کے لیے (اسکاٹ لینڈ کے سلیب مختلف ہیں)۔ فرض ہے کہ سیلف ایمپلائمنٹ ہی آپ کی واحد آمدنی ہے — PAYE ملازمت، سود، ڈیویڈنڈ اور اسٹوڈنٹ لون ابھی شامل نہیں۔ یہ منصوبہ بندی کا تخمینہ ہے، ٹیکس مشورہ نہیں — فائل کرنے سے پہلے HMRC یا اکاؤنٹنٹ سے تصدیق کریں۔',
 'tax.disc':'صرف تخمینہ — ٹیکس مشورہ نہیں۔','tax.estimateWarn':'یہ ایک تخمینہ ہے، آپ کا حتمی ٹیکس نہیں۔ آپ کو پھر بھی 31 جنوری تک HMRC کو فائل کرنا ہوگا۔ HMRC سے وابستہ نہیں۔',
 'a.title':'HMRC کے ساتھ آپ کی پوزیشن',
 'a.sub':'پچھلے Self Assessment کے دو ہندسے جو بدلتے ہیں کہ اس سال آپ اصل میں کتنا دیں گے۔',
 'a.poaLabel':'اس سال کے لیے پہلے سے ادا شدہ پیشگی ادائیگیاں',
 'a.poaHint':'پچھلے سال کے بل کی بنیاد پر HMRC کی مانگی ہوئی قسطیں (31 جنوری + 31 جولائی)۔ کل رقم لکھیں، نہ ہو تو 0۔',
 'a.priorLabel':'پچھلے سال کی ایڈجسٹمنٹ',
 'a.priorHint':'پچھلے سال کم ادا کیا اور آگے آ گیا؟ مثبت لکھیں۔ زیادہ ادا کیا اور کٹ رہا ہے؟ منفی لکھیں (مثلاً ‎-120)۔',
 'm.title':'ترتیبات',
 'm.biz':'کاروبار',
 'm.lang':'زبان',
 'm.backup':'بیک اپ اور بحالی',
 'm.backupHint':'آپ کا ڈیٹا پہلے سے کلاؤڈ میں محفوظ ہے۔ اضافی تحفظ کے لیے مقامی کاپی ڈاؤن لوڈ کریں۔',
 'm.export':'ڈیٹا بیک اپ (JSON)',
 'm.backupFull':'مکمل بیک اپ','m.backupFullS':'آپ کا TaxMate ڈیٹا اور رسیدوں کی فائلیں شامل ہیں (ZIP)',
 'm.backupData':'صرف ڈیٹا کا بیک اپ','m.backupDataS':'صرف TaxMate ریکارڈ؛ رسیدوں کی فائلیں شامل نہیں (JSON)',
 'm.csv':'اندراجات ایکسپورٹ کریں (Excel کے لیے CSV)',
 'm.restore':'بیک اپ سے بحال کریں',
 'm.danger':'خطرے کا علاقہ','m.eraseCloud':'میرا تمام ڈیٹا حذف کریں (کلاؤڈ سمیت)','m.eraseCloudT':'اپنے TaxMate اکاؤنٹ کا ڈیٹا حذف کریں؟','m.eraseCloudM':'یہ آپ کے ذاتی کاروبار، اندراجات، رسیدیں اور ترتیبات ڈیوائس اور TaxMate کلاؤڈ سے مستقل طور پر حذف کرتا ہے۔ مشترکہ شراکت سے آپ کی رکنیت ہٹتی ہے، مگر ریکارڈ دوسرے ارکان کے لیے باقی رہتے ہیں۔ فراہم کنندہ بیک اپ اور قانونی ادائیگی ریکارڈ محدود مدت تک رہ سکتے ہیں۔ پہلے بیک اپ ایکسپورٹ کریں۔','m.erasing':'آپ کا ڈیٹا حذف ہو رہا ہے…','m.erasedAll':'آپ کے ذاتی TaxMate اکاؤنٹ کا ڈیٹا ڈیوائس اور کلاؤڈ سے حذف ہو گیا؛ مشترکہ ریکارڈ دوسرے ارکان کے لیے باقی رہ سکتے ہیں۔','m.erasedLocal':'مقامی ڈیٹا حذف ہو گیا۔ کلاؤڈ تک رسائی نہیں ہو سکی — آن لائن ہونے پر دوبارہ کوشش کریں۔',
 'm.reset':'اس ڈیوائس کا تمام ڈیٹا حذف کریں',
 'm.resetT':'سب کچھ حذف کریں؟',
 'm.resetM':'اس ڈیوائس کے تمام کاروبار، اندراجات اور ترتیبات مٹ جائیں گی۔ واپسی ممکن نہیں۔ شک ہو تو پہلے بیک اپ نکال لیں۔',
 'm.foot':'TaxMate UK · مفت، نجی، آف لائن۔ صرف تخمینے — ٹیکس مشورہ نہیں۔',
 'd.entryT':'یہ اندراج حذف کریں؟',
 'd.entryM':'مستقل طور پر حذف ہو جائے گا۔',
 'd.bizT':'یہ کاروبار حذف کریں؟',
 'd.bizM':'اس کی تمام آمدنی و اخراجات بھی حذف ہو جائیں گے۔ واپسی ممکن نہیں۔',
 'r.title':'یہ بیک اپ بحال کریں؟',
 'r.msg':'ڈیوائس پر موجود سب کچھ بدل جائے گا۔',
 'r.bad':'یہ فائل TaxMate بیک اپ نہیں ہے۔',
 'cat.vehicle':'گاڑی اور ایندھن',
 'cat.travel':'سفر اور پارکنگ',
 'cat.phone':'فون اور انٹرنیٹ',
 'cat.home':'گھر سے کام',
 'cat.equip':'سامان اور اوزار',
 'cat.office':'دفتر اور انتظام',
 'cat.stock':'اسٹاک اور مواد',
 'cat.insure':'انشورنس',
 'cat.fees':'پیشہ ورانہ فیس',
 'cat.market':'مارکیٹنگ اور سبسکرپشن',
 'cat.repair':'مرمت',
 'cat.other':'دیگر خرچ',
 'cat.sales':'کام کی آمدنی',
 'cat.tips':'ٹپس اور بونس',
 'cat.royalty':'رائلٹی',
 'cat.otherin':'دیگر آمدنی',
 'rc.add':'رسید شامل کریں',
 'rc.take':'تصویر لیں','rc.upload':'رسید اپ لوڈ کریں','rc.chooseExisting':'موجودہ تصویر منتخب کریں',
 'rc.imagesOnly':'صرف تصویری فائلیں',
 'rc.view':'رسید دیکھیں',
 'rc.delete':'رسید حذف کریں',
 'rc.uploading':'اپلوڈ ہو رہا ہے…','rc.signinNeeded':'کلاؤڈ میں محفوظ کرنے کے لیے دوبارہ سائن ان کریں',
 'rcb.tab':'رسیدیں',
 'rcb.title':'رسیدیں شامل کریں',
 'rcb.intro':'ایک زمرہ اور مہینہ منتخب کریں، پھر ہر اُس خرچ کے لیے رسید شامل کریں جسے ابھی درکار ہے۔',
 'rcb.cat':'زمرہ',
 'rcb.month':'مہینہ',
 'rcb.allMonths':'تمام مہینے',
 'rcb.noMissing':'یہاں ہر خرچ کی رسید پہلے سے موجود ہے۔ 🎉',
 'rcb.pickCat':'رسید کے بغیر خرچ دیکھنے کے لیے ایک زمرہ منتخب کریں۔',
 'rcb.noExpenses':'اس زمرے میں ابھی کوئی خرچ نہیں۔',
 'rcb.add':'شامل کریں',
 'rcb.done':'✓',
 'rcb.uploading':'اپلوڈ ہو رہا ہے…',
 'rcb.remaining':'{n} کو ابھی رسید درکار ہے',
 'rcb.allDone':'مکمل — یہاں ہر خرچ کی رسید موجود ہے۔',
 'rcb.tip':'ایک خرچ کے لیے دو رسیدیں؟ انہیں ایک ہی تصویر میں ساتھ ساتھ رکھیں۔',
 'car.rcTitle':'اپنی رسیدوں کی تصویر لیں',
 'car.rcBody':'اپنے اخراجات کے ساتھ تصاویر ایک جگہ منسلک کریں۔',
 'car.rcCta':'رسیدیں شامل کریں →',
 'car.rcLockedBody':'ایک Plus فیچر — اخراجات کے ساتھ رسید کی تصویر لگائیں۔',
 'car.rcLockedCta':'Plus دیکھیں →',
 'rc.uploadErr':'اپلوڈ ناکام — دوبارہ کوشش کریں',
 'rc.deleteConfirm':'یہ رسید کی تصویر حذف کریں؟',
 'rc.proOnly':'رسید فوٹو Plus فیچر ہے — ترتیبات میں کھولیں۔',
 'pdf.download':'PDF رپورٹ ڈاؤن لوڈ کریں',
 'pdf.title':'ٹیکس خلاصہ',
 'pdf.generated':'تاریخ تخلیق',
 'pdf.business':'کاروبار',
 'pdf.structure':'قسم',
 'pdf.period':'ٹیکس سال',
 'pdf.income':'کل آمدنی',
 'pdf.expenses':'کل اخراجات (قابل دعویٰ)',
 'pdf.profit':'منافع',
 'pdf.estTax':'تخمینی ٹیکس',
 'pdf.incomeDetail':'آمدنی کی تفصیل',
 'pdf.expenseDetail':'اخراجات کی تفصیل',
 'pdf.taxCalc':'ٹیکس حساب',
 'pdf.date':'تاریخ',
 'pdf.category':'زمرہ',
 'pdf.description':'تفصیل',
 'pdf.amount':'رقم',
 'pdf.bizPct':'کاروباری %',
 'pdf.claimable':'قابل دعویٰ',
 'pdf.pa':'پرسنل الاؤنس',
 'pdf.taxable':'قابل ٹیکس آمدنی',
 'pdf.incomeTax':'انکم ٹیکس',
 'pdf.class4':'Class 4 NI',
 'pdf.total':'کل بل',
 'pdf.disclaimer':'صرف تخمینہ — ٹیکس مشورہ نہیں۔ دائر کرنے سے پہلے HMRC یا اکاؤنٹنٹ سے تصدیق کریں۔',
 'pdf.noEntries':'اس مدت میں کوئی اندراج نہیں۔',
 'mi.title':'میل بمقابلہ اصل اخراجات',
 'mi.sub':'HMRC آپ کو ہر رسید کی بجائے 55p فی میل (پہلے 10,000) اور 25p فی میل (اس کے بعد) کا دعویٰ کرنے کی اجازت دیتا ہے۔ TaxMate دونوں کا موازنہ کرتا ہے۔',
 'mi.miles':'اس سال چلائے گئے میل',
 'mi.milesClaim':'میل کا دعویٰ',
 'mi.actual':'آپ کے درج شدہ گاڑی کے اخراجات',
 'mi.diff':'فرق',
 'mi.bestMile':'میل بہتر ہے',
 'mi.bestActual':'اصل اخراجات بہتر ہیں',
 'mi.equal':'تقریباً برابر',
 'mi.saveMile':'میل سے {x} زیادہ کٹوتی',
 'mi.saveActual':'اصل اخراجات سے {x} زیادہ کٹوتی',
 'mi.adviceMile':'میل کے دعوے پر جائیں — رسیدوں سے {x} زیادہ ہے۔',
 'mi.adviceActual':'رسیدیں جمع کرتے رہیں — اصل اخراجات {x} زیادہ ہیں۔',
 'mi.adviceEqual':'دونوں طریقے ملتے جلتے نتائج دیتے ہیں۔',
 'mi.noVehicle':'ابھی کوئی گاڑی کا خرچ درج نہیں — موازنے کے لیے اندراجات شامل کریں۔',
 'mi.enterMiles':'موازنے کے لیے میل درج کریں',
 'mi.carsOnly':'صرف sole trader کے لیے (پارٹنرشپ نہیں)۔',
 'mi.rate':'پہلے 10,000 میل 55p · اس کے بعد 25p',
 'sa.title':'Self Assessment حوالہ',
 'sa.sub':'یہ نمبر gov.uk پر اپنے ٹیکس ریٹرن میں براہ راست درج کریں۔',
 'sa.103':'SA103 · خود روزگار (Sole Trader)',
 'sa.104':'SA104 · پارٹنرشپ آمدنی',
 'sa.box':'باکس',
 'sa.value':'قدر',
 'sa.description':'تفصیل',
 'sa.copy':'کاپی',
 'sa.copied':'کاپی ہو گیا!',
 'sa.expBreakdown':'اخراجات کی تفصیل (باکس 19–35)',
 'sa.taNote':'آپ £1,000 Trading Allowance استعمال کر رہے ہیں — باکس 38 پر ٹک کریں۔',
 'sa.lossNote':'اس سال نقصان ہوا — باکس 11 میں درج کریں، باکس 10 خالی چھوڑیں۔',
 'sa.partNote':'ہر پارٹنرشپ کے لیے ایک SA104 فارم پُر کریں۔',
 'sa.govLink':'gov.uk پر Self Assessment جمع کریں',
 'tip.title':'مددگار',
 'tip.dismiss':'نظرانداز',
 'tip.addNow':'ابھی شامل کریں',
 'tip.home_t':'گھر سے کام کا الاؤنس لیں',
 'tip.home_b':'HMRC ہر ہفتے £6 (سالانہ £312) گھر سے کام کرنے کی فلیٹ ریٹ کٹوتی دیتا ہے — رسیدوں کی ضرورت نہیں۔ آپ نے ابھی تک گھر کا کوئی خرچ درج نہیں کیا۔',
 'tip.phone_t':'فون بل کا دعویٰ کریں',
 'tip.phone_b':'اگر آپ کام کے لیے فون استعمال کرتے ہیں تو کاروباری حصہ کلیم کر سکتے ہیں۔ £30/ماہ کا 50% بھی سالانہ £36 ٹیکس بچاتا ہے۔',
 'tip.c2_t':'اسٹیٹ پنشن ریکارڈ بچائیں',
 'tip.c2_b':'آپ کا منافع Class 2 NI کی حد (£6,845) سے کم ہے۔ سالانہ £182 رضاکارانہ ادا کریں تاکہ پنشن ریکارڈ محفوظ رہے۔',
 'tip.poa_t':'جنوری میں اضافی ادائیگی',
 'tip.poa_b':'آپ کا بل £1,000 سے زیادہ ہے — HMRC اگلے سال کے لیے دو پیشگی قسطیں مانگے گا (31 جنوری + 31 جولائی)۔ {x} اضافی الگ رکھیں۔',
 'tip.mileage_t':'میل بمقابلہ اخراجات چیک کریں',
 'tip.mileage_b':'آپ نے گاڑی کے اخراجات درج کیے ہیں لیکن میل نہیں بھرے۔ اوپر سکرول کریں اور 55p/میل کا موازنہ کریں۔',
 'tip.receipt_t':'رسید کی تصاویر غائب',
 'tip.receipt_b':'{n} اخراجات{e} بغیر تصویر۔ HMRC ثبوت مانگ سکتا ہے۔',
 'tip.entry':'',
 'acc.export':'Descargar informe contable (CSV)',
 'acc.prepared':'Generado por TaxMate UK — solo estimación, no asesoría fiscal',
 'qt.title':'Desglose trimestral',
 'qt.q1':'T1  6 abr – 5 jul',
 'qt.q2':'T2  6 jul – 5 oct',
 'qt.q3':'T3  6 oct – 5 ene',
 'qt.q4':'T4  6 ene – 5 abr',
 'qt.current':'actual',
 'qt.income':'Ingresos',
 'qt.expenses':'Gastos',
 'qt.profit':'Beneficio',
 'qt.noData':'Sin entradas este trimestre.',
 'mtd.title':'Making Tax Digital (MTD)',
 'mtd.50k':'MTD te aplica desde abril 2026 — beneficio sobre £50,000.',
 'mtd.30k':'MTD te aplica desde abril 2027 — beneficio sobre £30,000.',
 'mtd.20k':'MTD te aplica desde abril 2028 — beneficio sobre £20,000.',
 'mtd.ok':'MTD no requerido aún — umbral £20,000.',
 'mtd.what':'MTD significa enviar actualizaciones trimestriales a través de software aprobado por HMRC.',
 'cal.export':'Añadir fechas fiscales al calendario (.ics)',
 'cal.desc':'Fechas límite fiscales UK con recordatorio 7 días antes.',
 'nb.jan':'Self Assessment en {n} día/días — 31 enero',
 'nb.jul':'Payment on account en {n} día/días — 31 julio',
 'nb.today_jan':'Hoy vence Self Assessment — 31 enero',
 'nb.today_jul':'Hoy vence Payment on account — 31 julio',
 'nb.days':'días',
 'nb.day':'día',
 'toast.saved':'Guardado',
 'toast.deleted':'Eliminado',
 'toast.restored':'Copia restaurada',
 'toast.calAdded':'Archivo de calendario descargado',
 'm.theme':'Apariencia',
 'theme.auto':'Auto',
 'theme.light':'Claro',
 'theme.dark':'Oscuro',
 'cc.rename':'Renombrar categorías',
 'cc.renameHint':'Toca una categoría para darle tu propio nombre.',
 'cc.editName':'Nombre de categoría',
 'cc.reset':'Restablecer',
 'cc.renameDone':'Renombrado',
  'cc.longPress':'شامل کرنے کے لیے ＋ دبائیں۔ تدوین کے لیے زمرے کو دبائے رکھیں (یا ✎ چھوئیں)۔',
 'cc.action':'¿Qué quieres hacer?',
 'cc.doRename':'Renombrar',
 'cc.doDelete':'Quitar de la lista',
 'cc.deleted':'Quitado',
 'cc.emojiHint':'نیچے ٹیپ کریں اور اپنے کی بورڈ سے ایموجی منتخب کریں۔','cc.emojiErr':'ایک ایموجی منتخب کریں','cc.delDataT':'یہ زمرہ ہٹائیں؟','cc.delDataM':'اس زمرے میں {n} اندراجات ہیں۔ ہٹانے سے وہ حذف نہیں ہوں گے۔',
 'cc.cantDeleteUsed':'اس زمرے میں اندراجات ہیں — یہ نظر آتا رہے گا۔',
 'b.trade':'Tipo de trabajo',
 'b.tradeHint':'Sugeriremos categorías de gastos — puedes cambiarlas cuando quieras.',
 'trade.delivery':'Reparto / Conductor',
 'trade.construction':'Construcción / Oficios',
 'trade.consultant':'Consultor / TI',
 'trade.creative':'Creativo / Medios',
 'trade.cleaning':'Limpieza / Doméstico',
 'trade.beauty':'Belleza / Cuidado personal',
 'trade.retail':'Comercio / Tienda online',
 'trade.other':'Otro',
 'sug.title':'Categorías sugeridas',
 'sug.hint':'Según tu tipo de trabajo. Toca para añadir las que necesites.',
 'sug.add':'Añadir seleccionadas',
 'sug.skip':'Omitir',
 'sug.added':'{n} categorías añadidas',
 'f.repeat':'Repetir mensualmente',
 'f.repeatHint':'ہر ماہ کا مقررہ خرچ؟ ایک ٹیپ سے پورے ٹیکس سال کے 12 مہینوں کے لیے شامل کریں۔',
 'f.dateLocked':'ٹیکس سال {y} کے اندر کی تاریخ منتخب کریں۔',
 'f.repeatFrom':'اس مہینے سے شروع کریں',
 'f.recQ':'یہ ہر ماہ دہرایا جانے والا خرچ ہے۔',
 'f.recThis':'صرف یہی مہینہ',
 'f.recFuture':'یہ اور آنے والے مہینے',
 'f.repeatAdded':'{n} مہینوں کے لیے شامل کر دیا گیا',
 'f.repeatOff':'Una vez',
 'f.repeatOn':'ہر ماہ',
 'f.repeatPick':'کون سے مہینے؟ شامل کرنے کے لیے ٹیپ کریں۔',
 'f.tbc':'زیر التوا',
 'f.tbc2':'زیر التوا',
 'ob.h1':'اپنا ٹیکس جانیں<br>چند سیکنڈ میں',
 'ob.chooseLang':'اپنی زبان منتخب کریں',
 'ob.lede':'آمدنی، اخراجات، ٹیکس — سب صاف۔ نہ اکاؤنٹنٹ، نہ مشکل الفاظ۔',
 'ob.signIn':'سائن ان',
 'ob.signInS':'اپنا ڈیٹا محفوظ کریں اور آلات کے درمیان سنک کریں',
 'ob.noAcc':'بغیر اکاؤنٹ شروع کریں',
 'ob.noAccS':'ڈیٹا اسی فون پر رہتا ہے — جب چاہیں سائن ان کریں',
 'ob.codeLogin':'partner sync code ہے؟ پہلے سائن ان کریں۔',
 'ob.howStart':'آپ کیسے شروع کرنا چاہیں گے؟',
 'ob.together':'آئیں مل کر کریں',
 'ob.togetherS':'میں قدم بہ قدم ساتھ چلوں گا — پھر آپ کو معلوم ہوگا کہ کتنا ٹیکس بنتا ہے۔',
 'ob.dash':'سیدھا ڈیش بورڈ پر جائیں',
 'ob.dashS':'مجھے معلوم ہے۔',
 'ob.codeEntry':'partner sync code ہے؟ «سیدھا ڈیش بورڈ پر جائیں» چنیں، پھر Settings میں درج کریں۔',
 'ob.run':'آپ کام کیسے چلاتے ہیں؟',
 'ob.partner':'پارٹنر کے ساتھ',
 'ob.shareLabel':'منافع میں آپ کا حصہ',
 'ob.shareHint':'صرف آپ کے حصے کے منافع پر آپ کا ٹیکس لگتا ہے۔ زیادہ تر برابر پارٹنرشپ 50% ہوتی ہیں۔',
 'ob.syncTitle':'اپنے پارٹنر کے ساتھ سنک',
 'ob.joinCode':'جوائننگ کوڈ',
 'ob.remove':'ہٹائیں',
 'ob.syncHint':'اگر آپ کا پارٹنر پہلے سے TaxMate استعمال کرتا ہے تو اس کا partner sync code درج کریں تاکہ دونوں فون سنک رہیں۔',
 'ob.enterCode':'پارٹنر کا کوڈ درج کریں',
 'ob.later':'بعد میں کروں گا',
 'ob.syncPro':'دو فون سنک رکھنا Pro فیچر ہے — Settings میں کبھی بھی سائن ان کر کے اپ گریڈ کریں۔ اس کے بغیر بھی آپ کے اعداد اسی فون پر بالکل ٹھیک چلتے ہیں۔',
 'ob.step1':'مرحلہ 1 از 3 · آپ کا کام',
 'ob.whatDo':'آپ کیا کام کرتے ہیں؟',
 'ob.bizLede':'اپنے کاروبار کا نام — زیادہ تر لوگ بس اپنا پیشہ لکھتے ہیں۔',
 'ob.bizName':'کاروبار کا نام',
 'ob.bizPh':'مثلاً Evri ڈرائیور',
 'ob.bizEg':'Uber ڈرائیور · صفائی · ہینڈی مین · Deliveroo',
 'ob.continue':'جاری رکھیں',
 'ob.codePrompt':'اپنے پارٹنر کا 8 حرفی partner sync code درج کریں:',
 'ob.catchBiz':'پرانے مہینے · کاروبار چنیں',
 'ob.whichBiz':'کون سا کاروبار؟',
 'ob.pickLede':'گزرے مہینے صحیح کاروبار میں شامل کریں۔ باقی الگ سے مکمل کر سکتے ہیں۔',
 'ob.soleTag':'انفرادی کاروبار',
 'ob.partTag':'پارٹنرشپ · آپ کا {s}%',
 'ob.addFrom':'{m} سے میرے اعداد شامل کریں',
 'ob.catchMonth':'پرانے مہینے · مہینہ چنیں',
 'ob.step2':'مرحلہ 2 از 3 · شروع کا مہینہ',
 'ob.whereStart':'کہاں سے شروع کریں؟',
 'ob.startLede':'پہلا مہینہ چنیں جس کے اعداد ڈالنے ہیں۔ پھر ہم مہینہ بہ مہینہ چلیں گے۔',
 'ob.taxYearNote':'برطانیہ کا ٹیکس سال اپریل سے اپریل تک چلتا ہے۔',
 'ob.step3':'مرحلہ 3 از 3 · {a} از {b} مہینے',
 'ob.yourWork':'آپ کا کام',
 'ob.addAnother':'ایک اور شامل کریں',
 'ob.split':'زمروں میں تقسیم کریں',
 'ob.addAgain':'دوبارہ شامل کریں:',
 'ob.close':'بند کریں',
 'ob.pickIcon':'آئیکن چنیں اور زمرہ شامل کریں — پیٹرول، فون، انشورنس…',
 'ob.addCat':'زمرہ شامل کریں',
 'ob.details':'تفصیل',
 'ob.from':'کس سے؟',
 'ob.catInPh':'مثلاً Uber Eats، Evri، Amazon',
 'ob.catOutPh':'مثلاً پیٹرول، انشورنس، فون',
 'ob.drive':'🚗 اس مہینے کام کے لیے گاڑی چلائی؟',
 'ob.addMiles':'میل شامل کریں',
 'ob.milesIn':'{m} کے کام کے میل',
 'ob.milesPh':'مثلاً 850',
 'ob.mileHintA':'فی میل {p}p کٹوتی',
 'ob.mileHintB':' · ≈ £{x} کٹوتی',
 'ob.mileHintC':'۔ صرف اگر پیٹرول پہلے خرچ میں شامل نہیں کیا۔',
 'ob.noDrive':'اس مہینے گاڑی نہیں چلائی',
 'ob.soFar':'{m} اب تک',
 'ob.nextMonth':'اگلا مہینہ ←',
 'ob.finishBtn':'مکمل کریں اور ٹیکس دیکھیں',
 'ob.allCaught':'سب مکمل',
 'ob.estLabel':'الگ رکھنے کا تخمینی ٹیکس',
 'ob.basedOn':'اب تک {n} مہینوں کی بنیاد پر',
 'ob.monthsAdded':'شامل کیے گئے مہینے',
 'ob.totIn':'کل آمدنی',
 'ob.totOut':'کل اخراجات',
 'ob.mileRow':'میل ({n} mi)',
 'ob.profitFar':'اب تک کا منافع',
 'ob.partnerSync':'Partner sync',
 'ob.revLine':'سب مکمل۔ {n} اندراج بعد میں سنوار سکتے ہیں — ڈیش بورڈ پر نشان زد ملیں گے۔ اب جب بھی پیسہ آئے یا جائے، ＋ دبائیں۔',
 'ob.cleanLine':'سب مکمل۔ اب جب بھی پیسہ آئے یا جائے، ＋ دبائیں — باقی TaxMate سنبھالتا ہے۔',
 'ob.goDash':'میرے ڈیش بورڈ پر جائیں',
 'ob.estWarn':'⚠️ صرف تخمینہ — حتمی ٹیکس نہیں۔ HMRC کو 31 جنوری تک فائل کرنا آپ کی ذمہ داری ہے۔',
 'sec.account':'Cuenta',
 'sec.biz':'Tus negocios',
 'sec.prefs':'Preferencias',
 'sec.data':'Copia y datos',
 'sec.report':'Informes',
 'rep.desc':'Un resumen anual completo — para ti, tu contable o una hipoteca.',
 'sec.legal':'Acerca y legal',
 'leg.privacy':'Política de privacidad',
 'leg.terms':'Términos de uso',
 'leg.disclaimer':'Aviso fiscal',
 'leg.disclaimerBody':'TaxMate ofrece estimaciones para ayudarte a planificar. No es asesoría fiscal ni sustituye a un contable o a HMRC. Confirma siempre las cifras antes de presentar.',
 'leg.version':'Versión',
 'leg.madeIn':'Hecho en el Reino Unido para autónomos.',
 'f.catErr':'Elige una categoría',
 'f.dateOtherYear':'یہ تاریخ ٹیکس سال {y} کی ہے — اندراج وہاں نظر آئے گا۔',
 'tax.emptyT':'Añade un negocio para ver tu estimación',
 'tax.emptyS':'Tu panorama fiscal aparece aquí cuando añadas un negocio y registres ingresos.',
 'tip.entries':'',
 'fd.title':'فولڈر',
 'fd.add':'نیا فولڈر',
 'fd.name':'فولڈر کا نام',
 'fd.none':'کوئی فولڈر نہیں',
 'fd.manage':'فولڈرز',
 'fd.deleteM':'اندراجات کا ڈیٹا محفوظ رہے گا — صرف فولڈر کا لیبل ہٹے گا۔',
 'fd.all':'تمام فولڈرز',
 'cc.add':'نیا زمرہ',
 'cc.name':'زمرے کا نام',
 'cc.colour':'رنگ',
 'cc.emoji':'آئیکن',
 'cc.manage':'میرے زمرے',
 'cc.deleteM':'اس زمرے والے اندراجات «دیگر» میں دکھیں گے۔',
 'pro.title':'TaxMate پلانز','pro.sub':'مفت ورژن ہمیشہ بنیادی کام کرتا ہے۔ مزید کے لیے اپ گریڈ کریں۔','billing.monthly':'ماہانہ','billing.yearly':'سالانہ','billing.billedYearly':'سالانہ بلنگ',
 'tier.free':'مفت','tier.plus':'پلس','tier.pro':'پرو',
 'tier.freeSub':'خود فائل کرنے کے لیے سب کچھ','tier.plusSub':'زیادہ بچائیں، سمجھداری سے کام کریں','tier.proSub':'شراکت اور سنجیدہ تاجروں کے لیے',
 'tier.current':'موجودہ پلان','tier.choose':'{p} منتخب کریں','tier.active':'فعال',
 'feat.records':'آمدنی اور اخراجات','feat.taxcalc':'ٹیکس تخمینہ','feat.onebiz':'ایک کاروبار','feat.mileageBasic':'کل مائلیج','feat.sa103view':'SA103 حوالہ','feat.sync':'کلاؤڈ سنک','feat.backup':'بیک اپ اور بحالی',
 'feat.mileageCompare':'مائلیج اور اصل لاگت کا موازنہ','feat.aiTips':'مددگار','feat.multiBiz':'متعدد کاروبار','feat.receiptPhoto':'رسید کی تصاویر','feat.pdfReport':'PDF ٹیکس رپورٹ',
 'feat.partnerSync':'پارٹنر سنک','feat.sa104':'SA104 شراکت','feat.receiptPack':'منظم رسید پیک PDF','feat.mtdReady':'سہ ماہی ریکارڈ خلاصہ (HMRC کو جمع نہیں ہوتا)',
 'lock.title':'{p} فیچر','lock.body':'یہ TaxMate {p} کا حصہ ہے۔ اَن لاک کرنے کے لیے اپ گریڈ کریں۔','lock.upgrade':'پلانز دیکھیں','home.signinTitle':'اپنا ڈیٹا بیک اپ کریں','home.signinSub':'کلاؤڈ میں محفوظ کرنے اور سنک کے لیے سائن ان کریں۔','home.signinBtn':'سائن ان','pwa.install':'ڈاؤن لوڈ','pwa.installSub':'ایپ کو اپنے فون پر انسٹال کریں۔','pwa.iosTitle':'ہوم اسکرین پر شامل کریں','pwa.iosBody':'iPhone پر، Safari سے انسٹال کریں:','pwa.iosStep1':'Safari کے نیچے شیئر بٹن (تیر والا مربع) دبائیں','pwa.iosStep2':'نیچے سکرول کریں اور „ہوم اسکرین پر شامل کریں” دبائیں','pwa.iosStep3':'„شامل کریں” دبائیں — ہو گیا! TaxMate آئیکن آپ کی اسکرین پر آ جائے گا','pwa.iosNote':'نوٹ: یہ صرف Safari میں کام کرتا ہے، Chrome میں نہیں۔','pwa.andTitle':'ایپ انسٹال کریں','pwa.andBody':'آپ کے براؤزر نے انسٹال بٹن خود نہیں دکھایا۔ آپ پھر بھی انسٹال کر سکتے ہیں:','pwa.andStep1':'Chrome کے اوپر دائیں مینو (⋮) دبائیں','pwa.andStep2':'„ایپ انسٹال کریں” یا „ہوم اسکرین پر شامل کریں” دبائیں','pwa.andStep3':'تصدیق کریں — TaxMate آئیکن آپ کی اسکرین پر آ جائے گا','pwa.andTip':'تجویز: اگر صرف „ہوم اسکرین پر شامل کریں” (شارٹ کٹ) نظر آئے تو سائٹ بند کریں، کیش صاف کریں، دوبارہ کھولیں اور انتظار کریں۔','pdf.enHint':'PDF رپورٹس انگریزی میں بنتی ہیں۔ دیگر زبانوں میں ٹائپ کیے نام ظاہر نہیں ہو سکتے۔','lang.pdfHint':'تجویز: PDF رپورٹس صرف انگریزی میں ایکسپورٹ ہوتی ہیں۔','rp.title':'رسید پیک','rp.desc':'تمام رسید کی تصاویر کو HMRC کے لیے ایک PDF میں جمع کریں۔','rp.btn':'رسید پیک ایکسپورٹ کریں','rp.none':'اس مدت میں کوئی رسید تصویر نہیں۔','rp.building':'رسید پیک بن رہا ہے…','rp.page':'رسید {i} از {n}','pro.titleOld':'TaxMate Pro',
 'pro.sub':'بنیادی ضروریات مفت ہیں۔ ضرورت پر اپ گریڈ کریں۔',
 'sy.title':'پارٹنر سنک',
 'sy.enable':'اپنے پارٹنر سے سنک کریں',
 'sy.code':'پارٹنرشپ کوڈ',
 'sy.invite':'پارٹنر کو دعوت دیں',
 'sy.inviteMsg':'Hey! یہ TaxMate UK پر «{n}» کے لیے پارٹنر سنک کوڈ ہے۔ 🤝\ntaxmate.uk پر جائیں\n1. «Sign in» پر ٹیپ کریں\n2. «🚀 Go straight to dashboard» منتخب کریں\n3. «Settings» پر ٹیپ کریں — نیچے دائیں کونہ 😉\n4. Pro میں اپ گریڈ کریں\n5. پھر کوڈ درج کریں: {c}',
 'sy.join':'پارٹنر سے کوڈ ملا؟ درج کریں اور سب کچھ خودبخود سنک ہو جائے گا۔',
 'sy.enterCode':'کوڈ درج کریں',
 'sy.synced':'سنک ہو گیا',
 'sy.badCode':'کوڈ نہیں ملا — چیک کر کے دوبارہ کوشش کریں۔',
 'sy.needPro':'پارٹنر سنک Pro فیچر ہے — «مزید» میں کھولیں۔',
 'sy.needNet':'سروس سے رابطہ نہیں ہو سکا — کنکشن چیک کریں۔',
 'sy.setup':'اس کاپی میں سنک ابھی سیٹ اپ نہیں ہوا۔',
 'sy.leave':'اس ڈیوائس پر سنک بند کریں',
 'sy.copied':'کاپی ہو گیا!',
 'sy.saveFirst':'پہلے کاروبار محفوظ کریں، پھر سنک آن کریں۔',
 'ac.title':'اکاؤنٹ اور کلاؤڈ',
 'ac.why':'سائن ان کریں اور ڈیٹا آپ کے ساتھ چلے گا — نیا فون، وہی ڈیٹا۔ مفت۔',
 'ac.google':'Google سے جاری رکھیں',
 'ac.signedAs':'سائن ان بطور',
 'ac.signout':'سائن آؤٹ',
 'ac.signoutM':'ڈیٹا اس فون اور آپ کے کلاؤڈ میں محفوظ رہے گا۔ جب چاہیں دوبارہ سائن ان کریں۔',
 'ac.local':'صرف یہ ڈیوائس — خودکار بیک اپ کے لیے سائن ان کریں۔',
 'ac.needSignInTitle':'سائن اِن ضروری ہے',
 'ac.needSignInBody':'Plus اور Pro کے لیے اکاؤنٹ ضروری ہے، تاکہ آپ کا پلان تمام ڈیوائسز پر آپ کے ساتھ رہے۔ نیچے سائن اِن کریں، پھر اپنا پلان منتخب کریں۔',
 'ac.cloudOn':'کلاؤڈ بیک اپ آن',
 'ac.err':'سائن ان ناکام — دوبارہ کوشش کریں۔',
 'ac.needNet':'سائن ان کے لیے انٹرنیٹ درکار ہے۔'
}
};;
Object.assign(I18N.en,{
  'promo.redeem':'Redeem promotion code',
  'rp.desc':'Organise available receipt photos into a working-paper PDF. It is not an HMRC filing or proof that an expense is allowable.'
});
Object.assign(I18N.zh,{
  'mtd.required':'根據 {x} 的合資格總收入，預計 MTD 將由 {d} 起適用。','mtd.notRequired':'根據 {x} 的合資格總收入，本年度未超過 {y} 門檻。','mtd.incomplete':'請先加入所有物業總收入，才依賴此評估。','mtd.unsupported':'此課稅年度的官方門檻對照尚未收錄，因此不會顯示評估。','sa.future':'此課稅年度的官方短表對照尚未收錄。TaxMate 不會猜測未來表格欄位。','mtd.what':'TaxMate 協助你保存記錄和準備摘要，但不會向 HMRC 提交 MTD 更新。如 MTD 適用，請使用兼容 HMRC 的軟件提交。','feat.mtdReady':'季度記錄摘要（不會提交至 HMRC）','promo.redeem':'兌換推廣代碼'
});
Object.assign(I18N.pl,{
  'mtd.required':'Na podstawie kwalifikującego się przychodu brutto w wysokości {x} przewiduje się, że MTD będzie obowiązywać od {d}.','mtd.notRequired':'Przy kwalifikującym się przychodzie brutto {x} próg {y} nie został w tym roku przekroczony.','mtd.incomplete':'Dodaj cały przychód brutto z nieruchomości, zanim oprzesz się na tej ocenie.','mtd.unsupported':'Ocena nie jest wyświetlana, ponieważ oficjalne progi dla tego roku podatkowego nie są jeszcze dołączone.','sa.future':'Oficjalne mapowanie krótkiego formularza dla tego roku podatkowego nie jest jeszcze dołączone. TaxMate nie będzie zgadywać pól przyszłych formularzy.','mtd.what':'TaxMate pomaga prowadzić ewidencję i przygotowywać podsumowania. Nie wysyła aktualizacji MTD do HMRC. Jeśli MTD Cię dotyczy, użyj do wysyłki oprogramowania zgodnego z HMRC.','feat.mtdReady':'Kwartalne podsumowania ewidencji (bez wysyłki do HMRC)','promo.redeem':'Zrealizuj kod promocyjny'
});
Object.assign(I18N.ro,{
  'mtd.required':'Pe baza venitului brut eligibil de {x}, se estimează că MTD se va aplica din {d}.','mtd.notRequired':'Pe baza venitului brut eligibil de {x}, pragul de {y} nu este depășit în acest an.','mtd.incomplete':'Adaugă toate veniturile brute din proprietăți înainte de a te baza pe această evaluare.','mtd.unsupported':'Evaluarea nu este afișată deoarece pragurile oficiale pentru acest an fiscal nu sunt incluse.','sa.future':'Corespondența oficială a formularului scurt pentru acest an fiscal nu este încă inclusă. TaxMate nu va ghici rubricile formularelor viitoare.','mtd.what':'TaxMate te ajută să păstrezi evidențe și să pregătești rezumate. Nu trimite actualizări MTD către HMRC. Dacă ți se aplică MTD, folosește software compatibil HMRC pentru trimitere.','feat.mtdReady':'Rezumate trimestriale ale evidențelor (fără trimitere la HMRC)','promo.redeem':'Folosește codul promoțional'
});
Object.assign(I18N.es,{
  'mtd.required':'Según unos ingresos brutos admisibles de {x}, se prevé que MTD se aplique desde {d}.','mtd.notRequired':'Con unos ingresos brutos admisibles de {x}, este año no se supera el umbral de {y}.','mtd.incomplete':'Añade todos los ingresos brutos por alquileres antes de basarte en esta evaluación.','mtd.unsupported':'No se muestra una evaluación porque no se incluye la tabla oficial de umbrales de este ejercicio fiscal.','sa.future':'La correspondencia oficial del formulario abreviado para este ejercicio fiscal aún no está incluida. TaxMate no adivinará las casillas de formularios futuros.','mtd.what':'TaxMate te ayuda a llevar registros y preparar resúmenes. No envía actualizaciones MTD a HMRC. Si se te aplica MTD, usa software compatible con HMRC para enviarlas.','feat.mtdReady':'Resúmenes trimestrales de registros (sin envío a HMRC)','promo.redeem':'Canjear código promocional'
});
Object.assign(I18N.ur,{
  'm.theme':'ظاہری شکل','theme.auto':'خودکار','theme.light':'روشن','theme.dark':'تاریک','sec.biz':'آپ کے کاروبار','sec.prefs':'ترجیحات','sec.data':'بیک اپ اور ڈیٹا','sec.report':'رپورٹس','sec.legal':'تعارف اور قانونی','sec.account':'اکاؤنٹ','leg.version':'ورژن','leg.madeIn':'برطانیہ میں خود روزگار افراد کے لیے بنایا گیا۔','leg.privacy':'رازداری کی پالیسی','leg.terms':'استعمال کی شرائط','leg.disclaimer':'ٹیکس سے متعلق دستبرداری','leg.disclaimerBody':'TaxMate منصوبہ بندی میں مدد کے لیے تخمینے فراہم کرتا ہے۔ یہ ٹیکس مشورہ نہیں اور نہ ہی اکاؤنٹنٹ یا HMRC کا متبادل ہے۔ جمع کرانے سے پہلے ہمیشہ اعداد کی تصدیق کریں۔',
  'qt.title':'سہ ماہی تفصیل','qt.q1':'سہ ماہی 1  6 اپریل – 5 جولائی','qt.q2':'سہ ماہی 2  6 جولائی – 5 اکتوبر','qt.q3':'سہ ماہی 3  6 اکتوبر – 5 جنوری','qt.q4':'سہ ماہی 4  6 جنوری – 5 اپریل','qt.current':'موجودہ','qt.income':'آمدنی','qt.expenses':'اخراجات','qt.profit':'منافع','qt.noData':'اس سہ ماہی میں کوئی اندراج نہیں۔',
  'acc.export':'اکاؤنٹنٹ رپورٹ ڈاؤن لوڈ کریں (CSV)','acc.prepared':'TaxMate UK کی جانب سے تیار کردہ — صرف تخمینہ، ٹیکس مشورہ نہیں','cal.export':'ٹیکس کی تاریخیں کیلنڈر میں شامل کریں (.ics)','cal.desc':'برطانیہ کی ٹیکس آخری تاریخیں، 7 دن پہلے یاد دہانی کے ساتھ — آپ کی کیلنڈر ایپ میں کھلیں گی۔','toast.saved':'محفوظ ہو گیا','toast.deleted':'حذف ہو گیا','toast.restored':'بیک اپ بحال ہو گیا','toast.calAdded':'کیلنڈر فائل ڈاؤن لوڈ ہو گئی',
  'mtd.50k':'آپ کی مجموعی اہل آمدنی £50,000 سے زیادہ ہے — توقع ہے کہ MTD اپریل 2026 سے لاگو ہوگا۔','mtd.30k':'آپ کی مجموعی اہل آمدنی £30,000 سے زیادہ ہے — توقع ہے کہ MTD اپریل 2027 سے لاگو ہوگا۔','mtd.20k':'آپ کی مجموعی اہل آمدنی £20,000 سے زیادہ ہے — توقع ہے کہ MTD اپریل 2028 سے لاگو ہوگا۔','mtd.ok':'ابھی MTD درکار نہیں — حد £20,000 ہے۔ قواعد بدلنے کی صورت میں ریکارڈ محفوظ رکھیں۔','mtd.what':'TaxMate ریکارڈ رکھنے اور خلاصے تیار کرنے میں مدد کرتا ہے۔ یہ MTD اپ ڈیٹس HMRC کو جمع نہیں کراتا۔ اگر MTD لاگو ہو تو جمع کرانے کے لیے HMRC سے ہم آہنگ سافٹ ویئر استعمال کریں۔','mtd.required':'{x} کی مجموعی اہل آمدنی کی بنیاد پر توقع ہے کہ MTD {d} سے لاگو ہوگا۔','mtd.notRequired':'{x} کی مجموعی اہل آمدنی کی بنیاد پر اس سال {y} کی حد عبور نہیں ہوئی۔','mtd.incomplete':'اس جائزے پر انحصار کرنے سے پہلے جائیداد کی تمام مجموعی آمدنی شامل کریں۔','mtd.unsupported':'کوئی جائزہ نہیں دکھایا گیا کیونکہ اس ٹیکس سال کی سرکاری حدوں کی نقشہ بندی شامل نہیں ہے۔','sa.future':'اس ٹیکس سال کے سرکاری مختصر فارم کی نقشہ بندی ابھی شامل نہیں ہے۔ TaxMate مستقبل کے فارم خانوں کا اندازہ نہیں لگائے گا۔','feat.mtdReady':'سہ ماہی ریکارڈ خلاصے (HMRC کو جمع کرانا شامل نہیں)','promo.redeem':'پروموشن کوڈ استعمال کریں',
  'nb.jan':'Self Assessment کی آخری تاریخ میں {n} دن — 31 جنوری','nb.jul':'Payment on account کی آخری تاریخ میں {n} دن — 31 جولائی','nb.today_jan':'Self Assessment آج واجب الادا ہے — 31 جنوری','nb.today_jul':'Payment on account آج واجب الادا ہے — 31 جولائی','nb.days':'دن','nb.day':'دن',
  'cc.rename':'زمروں کے نام بدلیں','cc.renameHint':'کسی زمرے کو اپنا نام دینے کے لیے اسے چھوئیں۔','cc.editName':'زمرے کا نام','cc.reset':'پہلے سے طے شدہ حالت بحال کریں','cc.renameDone':'نام بدل گیا','cc.action':'آپ کیا کرنا چاہتے ہیں؟','cc.doRename':'نام بدلیں','cc.doDelete':'فہرست سے ہٹائیں','cc.deleted':'ہٹا دیا گیا','f.catErr':'ایک زمرہ منتخب کریں','f.repeat':'ہر ماہ دہرائیں','f.repeatOff':'ایک بار',
  'b.trade':'کام کی قسم','b.tradeHint':'ہم اخراجات کے زمرے تجویز کریں گے — آپ انہیں کسی بھی وقت تبدیل کر سکتے ہیں۔','trade.delivery':'ڈیلیوری / ڈرائیور','trade.construction':'تعمیرات / ہنرمند کام','trade.consultant':'مشاورت / آئی ٹی','trade.creative':'تخلیقی / میڈیا','trade.cleaning':'صفائی / گھریلو کام','trade.beauty':'خوبصورتی / ذاتی نگہداشت','trade.retail':'ریٹیل / آن لائن دکان','trade.other':'دیگر',
  'sug.title':'تجویز کردہ زمرے','sug.hint':'آپ کے کام کی قسم کی بنیاد پر۔ جن زمروں کی ضرورت ہو انہیں شامل کرنے کے لیے چھوئیں۔','sug.add':'منتخب زمرے شامل کریں','sug.skip':'چھوڑ دیں','sug.added':'{n} زمرے شامل ہو گئے','ob.partnerSync':'پارٹنر سنک','rep.desc':'آپ، آپ کے اکاؤنٹنٹ یا رہن کے لیے مکمل سالانہ خلاصہ۔','tax.emptyT':'اپنا تخمینہ دیکھنے کے لیے کاروبار شامل کریں','tax.emptyS':'کاروبار شامل کرنے اور آمدنی درج کرنے کے بعد آپ کی ٹیکس صورتحال یہاں دکھائی دے گی۔'
});

const HEALTH_COPY={
  'promo.signIn':'Sign in with Google first, then redeem this code.',
  'promo.title':'Redeem promotion code','promo.body':'Enter the code exactly as you received it.','promo.placeholder':'Promotion code','promo.apply':'Redeem code','promo.invalid':"This promotion code isn't valid.",'promo.notStarted':"This promotion isn't available yet.",'promo.expired':'This promotion has ended.','promo.full':'This promotion has reached its limit.','promo.duplicate':"You've already used this promotion code.",'promo.service':'Promotion access is temporarily unavailable. Please try again.','promo.success':'Promotion applied',
  'billing.unavailable':'Payments are temporarily unavailable. Please try again.','tier.manage':'Manage subscription','tier.permanent':'Permanent Pro access','plan.freeSub':'Bookkeeping and tax estimates for one business.','plan.plusSub':'For receipts, reports and more than one business.','plan.proSub':'For partnerships and one active Limited Company.','plan.includesFree':'Everything in Free, plus:','plan.includesPlus':'Everything in Plus, plus:','plan.renewal':'Subscriptions renew on the interval shown at Checkout until cancelled.','plan.promoUntil':'{p} access until {d}','plan.renews':'{p} renews on {d}','plan.ends':'{p} ends on {d}','plan.proBillingPending':'Pro checkout will open after launch billing is configured','feat.ltd':'One active Limited Company','sec.help':'Help & support','sy.joinTitle':'Join a partnership','sy.readOnly':'Shared partnership records are read-only without Pro. Your data is still here.','biz.readOnly':'This business is read-only on your current plan. Your data is still here.','ltd.backupProOnly':'Limited company sync, backup and restore are available on Pro. Your local data was not changed.'
};
Object.assign(I18N.en,HEALTH_COPY);
for(const language of ['zh','pl','ro','es','ur'])Object.assign(I18N[language],HEALTH_COPY);
Object.assign(I18N.zh,{'promo.title':'兌換推廣代碼','promo.body':'請輸入你收到嘅完整代碼。','promo.placeholder':'推廣代碼','promo.apply':'兌換代碼','promo.invalid':'呢個推廣代碼無效。','promo.notStarted':'呢個推廣尚未開始。','promo.expired':'呢個推廣已經完結。','promo.full':'呢個推廣已達使用上限。','promo.duplicate':'你已經使用過呢個推廣代碼。','promo.service':'暫時未能處理推廣，請稍後再試。','promo.success':'推廣已套用','billing.unavailable':'付款服務暫時未能使用，請稍後再試。','tier.manage':'管理訂閱','tier.permanent':'永久 Pro 權限','plan.freeSub':'一個業務嘅簿記同稅務估算。','plan.plusSub':'適合需要收據、報告同多個業務。','plan.proSub':'適合合夥同進階記錄。','plan.includesFree':'包括免費版全部功能，另加：','plan.includesPlus':'包括 Plus 全部功能，另加：','plan.renewal':'月費及年費訂閱會自動續期，直至取消。','plan.promoUntil':'{p} 權限至 {d}','plan.renews':'{p} 將於 {d} 續期','plan.ends':'{p} 將於 {d} 完結','sec.help':'幫助與支援','sy.joinTitle':'加入合夥業務','sy.readOnly':'冇 Pro 時，共享合夥記錄只供閱讀；你嘅資料仍然保留。','biz.readOnly':'你目前方案只可閱讀呢個業務；資料仍然保留。'});
Object.assign(I18N.pl,{'promo.title':'Zrealizuj kod promocyjny','promo.body':'Wpisz kod dokładnie tak, jak go otrzymano.','promo.placeholder':'Kod promocyjny','promo.apply':'Zrealizuj kod','promo.invalid':'Ten kod promocyjny jest nieprawidłowy.','promo.notStarted':'Ta promocja nie jest jeszcze dostępna.','promo.expired':'Ta promocja zakończyła się.','promo.full':'Ta promocja osiągnęła limit.','promo.duplicate':'Ten kod promocyjny został już użyty.','promo.service':'Dostęp promocyjny jest chwilowo niedostępny. Spróbuj ponownie.','promo.success':'Promocja zastosowana','billing.unavailable':'Płatności są chwilowo niedostępne. Spróbuj ponownie.','tier.manage':'Zarządzaj subskrypcją','tier.permanent':'Stały dostęp Pro','plan.freeSub':'Księgowość i szacunki podatku dla jednej firmy.','plan.plusSub':'Dla paragonów, raportów i więcej niż jednej firmy.','plan.proSub':'Dla spółek i zaawansowanej ewidencji.','plan.includesFree':'Wszystko z planu Darmowego, plus:','plan.includesPlus':'Wszystko z Plus, plus:','plan.renewal':'Subskrypcje miesięczne i roczne odnawiają się do anulowania.','plan.promoUntil':'Dostęp {p} do {d}','plan.renews':'{p} odnawia się {d}','plan.ends':'{p} kończy się {d}','sec.help':'Pomoc i wsparcie','sy.joinTitle':'Dołącz do spółki','sy.readOnly':'Wspólne dane spółki są bez Pro tylko do odczytu. Dane pozostają zachowane.','biz.readOnly':'Ta firma jest tylko do odczytu w obecnym planie. Dane pozostają zachowane.'});
Object.assign(I18N.ro,{'promo.title':'Folosește codul promoțional','promo.body':'Introdu codul exact așa cum l-ai primit.','promo.placeholder':'Cod promoțional','promo.apply':'Folosește codul','promo.invalid':'Acest cod promoțional nu este valid.','promo.notStarted':'Această promoție nu este încă disponibilă.','promo.expired':'Această promoție s-a încheiat.','promo.full':'Această promoție și-a atins limita.','promo.duplicate':'Ai folosit deja acest cod promoțional.','promo.service':'Accesul promoțional este indisponibil momentan. Încearcă din nou.','promo.success':'Promoție aplicată','billing.unavailable':'Plățile sunt indisponibile momentan. Încearcă din nou.','tier.manage':'Gestionează abonamentul','tier.permanent':'Acces Pro permanent','plan.freeSub':'Evidență și estimări fiscale pentru o afacere.','plan.plusSub':'Pentru bonuri, rapoarte și mai multe afaceri.','plan.proSub':'Pentru parteneriate și evidențe avansate.','plan.includesFree':'Tot ce include Gratuit, plus:','plan.includesPlus':'Tot ce include Plus, plus:','plan.renewal':'Abonamentele lunare și anuale se reînnoiesc până la anulare.','plan.promoUntil':'Acces {p} până la {d}','plan.renews':'{p} se reînnoiește la {d}','plan.ends':'{p} se termină la {d}','sec.help':'Ajutor și asistență','sy.joinTitle':'Alătură-te unui parteneriat','sy.readOnly':'Înregistrările comune sunt doar pentru citire fără Pro. Datele rămân aici.','biz.readOnly':'Această afacere este doar pentru citire în planul curent. Datele rămân aici.'});
Object.assign(I18N.es,{'promo.title':'Canjear código promocional','promo.body':'Introduce el código exactamente como lo recibiste.','promo.placeholder':'Código promocional','promo.apply':'Canjear código','promo.invalid':'Este código promocional no es válido.','promo.notStarted':'Esta promoción aún no está disponible.','promo.expired':'Esta promoción ha terminado.','promo.full':'Esta promoción ha alcanzado su límite.','promo.duplicate':'Ya has usado este código promocional.','promo.service':'El acceso promocional no está disponible temporalmente. Inténtalo de nuevo.','promo.success':'Promoción aplicada','billing.unavailable':'Los pagos no están disponibles temporalmente. Inténtalo de nuevo.','tier.manage':'Gestionar suscripción','tier.permanent':'Acceso Pro permanente','plan.freeSub':'Contabilidad y estimación fiscal para un negocio.','plan.plusSub':'Para recibos, informes y más de un negocio.','plan.proSub':'Para sociedades y registros avanzados.','plan.includesFree':'Todo lo de Gratis, más:','plan.includesPlus':'Todo lo de Plus, más:','plan.renewal':'Las suscripciones mensuales y anuales se renuevan hasta su cancelación.','plan.promoUntil':'Acceso {p} hasta {d}','plan.renews':'{p} se renueva el {d}','plan.ends':'{p} termina el {d}','sec.help':'Ayuda y soporte','sy.joinTitle':'Unirse a una sociedad','sy.readOnly':'Los registros compartidos son de solo lectura sin Pro. Tus datos siguen aquí.','biz.readOnly':'Este negocio es de solo lectura con tu plan actual. Tus datos siguen aquí.'});
Object.assign(I18N.ur,{'promo.title':'پروموشن کوڈ استعمال کریں','promo.body':'کوڈ بالکل ویسے درج کریں جیسے آپ کو ملا۔','promo.placeholder':'پروموشن کوڈ','promo.apply':'کوڈ استعمال کریں','promo.invalid':'یہ پروموشن کوڈ درست نہیں۔','promo.notStarted':'یہ پروموشن ابھی دستیاب نہیں۔','promo.expired':'یہ پروموشن ختم ہو چکی ہے۔','promo.full':'یہ پروموشن اپنی حد تک پہنچ چکی ہے۔','promo.duplicate':'آپ یہ پروموشن کوڈ پہلے استعمال کر چکے ہیں۔','promo.service':'پروموشن رسائی عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔','promo.success':'پروموشن لاگو ہو گئی','billing.unavailable':'ادائیگیاں عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔','tier.manage':'سبسکرپشن سنبھالیں','tier.permanent':'مستقل Pro رسائی','plan.freeSub':'ایک کاروبار کے لیے حساب کتاب اور ٹیکس تخمینہ۔','plan.plusSub':'رسیدوں، رپورٹس اور ایک سے زیادہ کاروبار کے لیے۔','plan.proSub':'شراکت اور جدید ریکارڈز کے لیے۔','plan.includesFree':'مفت پلان کی سب خصوصیات، مزید:','plan.includesPlus':'Plus کی سب خصوصیات، مزید:','plan.renewal':'ماہانہ اور سالانہ سبسکرپشن منسوخی تک تجدید ہوتی ہیں۔','plan.promoUntil':'{p} رسائی {d} تک','plan.renews':'{p} کی تجدید {d} کو','plan.ends':'{p} {d} کو ختم ہوگا','sec.help':'مدد اور معاونت','sy.joinTitle':'شراکت میں شامل ہوں','sy.readOnly':'Pro کے بغیر مشترکہ ریکارڈ صرف پڑھنے کے لیے ہیں۔ ڈیٹا موجود رہے گا۔','biz.readOnly':'موجودہ پلان پر یہ کاروبار صرف پڑھنے کے لیے ہے۔ ڈیٹا موجود رہے گا۔'});
Object.assign(I18N.zh,{'promo.signIn':'請先用 Google 登入，再兌換呢個代碼。'});
Object.assign(I18N.pl,{'promo.signIn':'Najpierw zaloguj się przez Google, a następnie użyj kodu.'});
Object.assign(I18N.ro,{'promo.signIn':'Conectează-te mai întâi cu Google, apoi folosește codul.'});
Object.assign(I18N.es,{'promo.signIn':'Primero inicia sesión con Google y luego canjea el código.'});
Object.assign(I18N.ur,{'promo.signIn':'پہلے Google سے سائن ان کریں، پھر یہ کوڈ استعمال کریں۔'});
Object.assign(I18N.zh,{'ltd.backupProOnly':'有限公司同步、備份同還原只供 Pro 使用；你嘅本機資料冇被更改。'});
Object.assign(I18N.pl,{'ltd.backupProOnly':'Synchronizacja, kopia zapasowa i przywracanie danych spółki z o.o. są dostępne w Pro. Dane lokalne nie zostały zmienione.'});
Object.assign(I18N.ro,{'ltd.backupProOnly':'Sincronizarea, backupul și restaurarea societății cu răspundere limitată sunt disponibile în Pro. Datele locale nu au fost modificate.'});
Object.assign(I18N.es,{'ltd.backupProOnly':'La sincronización, copia de seguridad y restauración de la sociedad limitada están disponibles en Pro. Tus datos locales no se han modificado.'});
Object.assign(I18N.ur,{'ltd.backupProOnly':'لمیٹڈ کمپنی کی سنک، بیک اپ اور بحالی Pro میں دستیاب ہیں۔ آپ کا مقامی ڈیٹا تبدیل نہیں ہوا۔'});
Object.assign(I18N.zh,{'plan.proBillingPending':'設定好推出收費後先會開放 Pro 結帳','feat.ltd':'一間營運中有限公司'});
Object.assign(I18N.pl,{'plan.proBillingPending':'Płatność Pro będzie dostępna po skonfigurowaniu ceny startowej','feat.ltd':'Jedna aktywna spółka z o.o.'});
Object.assign(I18N.ro,{'plan.proBillingPending':'Plata Pro va fi disponibilă după configurarea prețului de lansare','feat.ltd':'O societate cu răspundere limitată activă'});
Object.assign(I18N.es,{'plan.proBillingPending':'El pago de Pro se abrirá tras configurar el precio de lanzamiento','feat.ltd':'Una sociedad limitada activa'});
Object.assign(I18N.ur,{'plan.proBillingPending':'لانچ بلنگ ترتیب دینے کے بعد Pro چیک آؤٹ کھلے گا','feat.ltd':'ایک فعال لمیٹڈ کمپنی'});

Object.assign(I18N.en,{
  'pwa.homeTitle':'Install TaxMate',
  'pwa.homeBody':'Keep TaxMate on your Home Screen for faster access and core bookkeeping offline.',
  'pwa.installCta':'Install',
  'pwa.notNow':'Not now',
  'pwa.iosStep1':'Tap Share',
  'pwa.iosStep2':'Tap “Add to Home Screen”',
  'pwa.iosStep3':'Tap “Add”'
});
Object.assign(I18N.zh,{
  'pwa.homeTitle':'安裝 TaxMate',
  'pwa.homeBody':'將 TaxMate 放到主畫面，更快開啟，核心簿記功能亦可離線使用。',
  'pwa.installCta':'安裝',
  'pwa.notNow':'稍後先',
  'pwa.iosStep1':'撳「分享」',
  'pwa.iosStep2':'撳「加到主畫面」',
  'pwa.iosStep3':'撳「加入」'
});
Object.assign(I18N.pl,{
  'pwa.homeTitle':'Zainstaluj TaxMate',
  'pwa.homeBody':'Dodaj TaxMate do ekranu głównego, aby szybciej otwierać aplikację i korzystać offline z podstawowej księgowości.',
  'pwa.installCta':'Zainstaluj',
  'pwa.notNow':'Nie teraz',
  'pwa.iosStep1':'Dotknij Udostępnij',
  'pwa.iosStep2':'Dotknij „Dodaj do ekranu głównego”',
  'pwa.iosStep3':'Dotknij „Dodaj”'
});
Object.assign(I18N.ro,{
  'pwa.homeTitle':'Instalează TaxMate',
  'pwa.homeBody':'Păstrează TaxMate pe ecranul principal pentru acces mai rapid și evidența contabilă de bază offline.',
  'pwa.installCta':'Instalează',
  'pwa.notNow':'Nu acum',
  'pwa.iosStep1':'Atinge Partajare',
  'pwa.iosStep2':'Atinge „Adaugă pe ecranul principal”',
  'pwa.iosStep3':'Atinge „Adaugă”'
});
Object.assign(I18N.es,{
  'pwa.homeTitle':'Instala TaxMate',
  'pwa.homeBody':'Añade TaxMate a tu pantalla de inicio para acceder más rápido y usar la contabilidad básica sin conexión.',
  'pwa.installCta':'Instalar',
  'pwa.notNow':'Ahora no',
  'pwa.iosStep1':'Toca Compartir',
  'pwa.iosStep2':'Toca “Añadir a pantalla de inicio”',
  'pwa.iosStep3':'Toca “Añadir”'
});
Object.assign(I18N.ur,{
  'pwa.homeTitle':'TaxMate انسٹال کریں',
  'pwa.homeBody':'تیز رسائی اور بنیادی حساب کتاب آف لائن استعمال کرنے کے لیے TaxMate کو ہوم اسکرین پر رکھیں۔',
  'pwa.installCta':'انسٹال کریں',
  'pwa.notNow':'ابھی نہیں',
  'pwa.iosStep1':'شیئر دبائیں',
  'pwa.iosStep2':'”ہوم اسکرین پر شامل کریں“ دبائیں',
  'pwa.iosStep3':'”شامل کریں“ دبائیں'
});

function t(key, vars){
  let s = (I18N[S.settings.lang] && I18N[S.settings.lang][key]) || I18N.en[key] || key;
  if(vars) for(const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}
// English-only lookup for PDF output (jsPDF core fonts can't render CJK/Arabic)
function tEN(key, vars){
  let s = I18N.en[key] || key;
  if(vars) for(const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  return s;
}
// Strip characters jsPDF's core fonts can't render (CJK/Arabic/etc) → keep Latin
function pdfSafe(str){
  if(str==null) return '';
  return String(str).replace(/[^\x00-\x7F£€]/g, '').trim() || '(non-Latin text)';
}
function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.documentElement.lang = S.settings.lang;
  document.documentElement.dir = S.settings.lang==='ur' ? 'rtl' : 'ltr';
}
function locale(){ return LOCALES[S.settings.lang] || 'en-GB'; }

/* ═══════════ constants ═══════════ */
const PCT_OPTIONS = [100,75,50,25,10];
const CATS = {
  expense:[
    {id:'vehicle',e:'⛽',dot:'#E5484D'},{id:'travel',e:'🅿️',dot:'#F47738'},{id:'phone',e:'📱',dot:'#3478F6'},
    {id:'home',e:'🏠',dot:'#9B59B6'},{id:'equip',e:'🧰',dot:'#0AA968'},{id:'office',e:'🗂️',dot:'#6B7686'},
    {id:'stock',e:'📦',dot:'#85994B'},{id:'insure',e:'🛡️',dot:'#0D8C86'},{id:'fees',e:'💼',dot:'#1F4E9C'},
    {id:'market',e:'📣',dot:'#B47D12'},{id:'repair',e:'🔧',dot:'#7B8794'},{id:'other',e:'🧾',dot:'#16202B'}
  ],
  income:[
    {id:'sales',e:'💷',dot:'#0AA968'},{id:'tips',e:'✨',dot:'#85994B'},
    {id:'royalty',e:'🎵',dot:'#9B59B6'},{id:'otherin',e:'➕',dot:'#6B7686'}
  ]
};

// UK self-employed trade types (ONS data) → suggested expense categories (existing cat ids)
const TRADES = [
  {id:'delivery', e:'🚚', cats:['vehicle','travel','insure','repair','phone']},
  {id:'construction', e:'🔨', cats:['stock','equip','vehicle','insure','repair']},
  {id:'consultant', e:'💻', cats:['office','phone','home','travel','market']},
  {id:'creative', e:'🎨', cats:['equip','office','market','travel','home']},
  {id:'cleaning', e:'🧹', cats:['stock','travel','insure','equip','phone']},
  {id:'beauty', e:'✂️', cats:['stock','equip','home','insure','market']},
  {id:'retail', e:'🛍️', cats:['stock','office','fees','market','travel']},
  {id:'other', e:'📦', cats:[]}
];
// ── Per-business category helpers ──
function bizCustom(bizId, kind){
  if(!S.customCats[bizId]) S.customCats[bizId] = {income:[],expense:[]};
  if(!S.customCats[bizId][kind]) S.customCats[bizId][kind] = [];
  return S.customCats[bizId][kind];
}
function bizActive(bizId, kind){
  if(!S.activeCats[bizId]) S.activeCats[bizId] = {income:[],expense:[]};
  if(!S.activeCats[bizId][kind]) S.activeCats[bizId][kind] = [];
  return S.activeCats[bizId][kind];
}
function allCats(kind, bizId){
  // categories for ONE business only
  const ac = bizId ? bizActive(bizId, kind) : [];
  const cc = bizId ? bizCustom(bizId, kind) : [];
  // Built-in cats shown only if activated for this biz OR has entries (this biz) using them
  const usedIds = new Set(S.entries.filter(e=>e.kind===kind && (!bizId||e.bizId===bizId)).map(e=>e.cat));
  const builtin = CATS[kind].filter(c=> ac.includes(c.id) || usedIds.has(c.id));
  // 'other' is always available as a fallback
  const other = CATS[kind].find(c=>c.id==='other'||c.id==='otherin');
  let result = builtin.concat(cc);
  if(other && !result.find(c=>c.id===other.id)) result.push(other);
  return result;
}
function catById(id){
  // search built-ins + every business's custom cats
  let custom = [];
  Object.keys(S.customCats||{}).forEach(bid=>{
    const bc = S.customCats[bid]||{};
    custom = custom.concat(bc.income||[], bc.expense||[]);
  });
  const all = CATS.expense.concat(CATS.income, custom);
  return all.find(c=>c.id===id) || {id:'other',e:'🧾',dot:'#B1B4B6'};
}
// ─────────── Pro tier system ───────────
// free < plus < pro. Each tier unlocks the ones below it.
const TIER_RANK = { free:0, plus:1, pro:2 };
const TIER_PRICE = Object.freeze({monthly:{free:'£0',plus:'£3.99 / month',pro:'Launch price £9.99/month · Standard price £11.99/month'},yearly:{free:'£0',plus:'£29.99 / year',pro:'Pro annual price not yet available'}});
let BILLING_CADENCE='monthly';
function tierPrice(tier){return TIER_PRICE[BILLING_CADENCE][tier];}
function setBillingCadence(cadence){
  if(!['monthly','yearly'].includes(cadence)||cadence===BILLING_CADENCE)return;
  BILLING_CADENCE=cadence;
  document.querySelectorAll('[data-billing-cadence]').forEach(button=>{const on=button.dataset.billingCadence===cadence;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
  document.querySelectorAll('[data-plan-price]').forEach(node=>{node.textContent=tierPrice(node.dataset.planPrice);});
  const note=document.querySelector('[data-billing-yearly]');if(note){note.textContent=cadence==='yearly'?t('billing.billedYearly'):'';note.style.visibility=cadence==='yearly'?'visible':'hidden';note.setAttribute('aria-hidden',String(cadence!=='yearly'));}
}
// Which tier each gated feature needs
const FEATURE_TIER = {
  mileageCompare:'plus',   // 45p vs actual auto-compare
  // Helper (formerly "aiTips") is FREE for everyone — intentionally not gated
  multiBiz:'plus',         // more than one business
  receiptPhoto:'plus',     // receipt photos
  pdfReport:'plus',        // PDF report export
  partnerSync:'pro',       // partner sync
  sa104:'pro',             // SA104 partnership
  receiptPack:'pro',       // Receipt Pack PDF
  mtdReady:'pro',          // quarterly record summary; no HMRC submission
  ltd:'pro'                // one active Limited Company
};
let ENTITLEMENT={snapshot:null,loaded:false};
function trackEvent(name){try{if(!window.TaxMateAnalytics||!TaxMateAnalytics.enabled())return;const e=TaxMateTelemetry.analyticsEvent(name);if(typeof gtag==='function')gtag('event',e.name,e.params);}catch(_){} }

async function loadEntitlementFromCloud(uid){
  try{
    const doc = await userRoot(uid).collection('entitlements').doc('current').get();
    if(doc.exists){
      ENTITLEMENT.snapshot=doc.data()||null;
      try{ localStorage.setItem('taxmateuk_entitlement_cache',JSON.stringify(ENTITLEMENT.snapshot)); }catch(e){}
    }else ENTITLEMENT.snapshot=null;
    ENTITLEMENT.loaded=true;
    if(!doc.exists){
      try{ const c=JSON.parse(localStorage.getItem('taxmateuk_entitlement_cache')); if(c) ENTITLEMENT.snapshot=c; }catch(e){}
    }
  }catch(e){ try{ ENTITLEMENT.snapshot=JSON.parse(localStorage.getItem('taxmateuk_entitlement_cache')); }catch(_){} ENTITLEMENT.loaded=true; }
}

function currentTier(){
  return TaxMateEntitlement.resolve(ENTITLEMENT.snapshot,Date.now(),!navigator.onLine).tier;
}
function ltdAccessDecision(action,state=S){return TaxMateCompanyAccess.decide({action,snapshot:ENTITLEMENT.snapshot,now:Date.now(),offline:typeof navigator!=='undefined'&&navigator.onLine===false,hasExistingLtdData:ltdStateHasRecords(state)});}
function ltdStateHasRecords(state=S){const domain=state&&state.domain||{};return TaxMateLtdSync.COLLECTIONS.some(collection=>collection==='companyProfileRevisions'||collection==='companyOwnershipVersions'?false:Array.isArray(domain[collection])&&domain[collection].length>0)||Array.isArray(domain.companyProfiles)&&domain.companyProfiles.some(profile=>Array.isArray(profile.profileRevisionHistory)&&profile.profileRevisionHistory.length||Array.isArray(profile.ownershipHistory)&&profile.ownershipHistory.length);}
function ltdBackupAllowed(action,state=S){if(!ltdStateHasRecords(state))return true;const decision=ltdAccessDecision(action,state);if(decision.allowed)return true;showNotice(t('tier.pro'),t('ltd.backupProOnly'));return false;}
function hasFeature(key){
  const need = FEATURE_TIER[key];
  if(!need) return true; // ungated = free
  return TIER_RANK[currentTier()] >= TIER_RANK[need];
}
function tierFeatureList(tier){
  const free = ['feat.records','feat.taxcalc','feat.onebiz','feat.mileageBasic','feat.sa103view','feat.sync','feat.backup'];
  const plus = ['feat.multiBiz','feat.receiptPhoto','feat.mileageCompare','feat.pdfReport'];
  const pro  = ['feat.partnerSync','feat.sa104','feat.receiptPack','feat.mtdReady','feat.ltd'];
  if(tier==='free') return free;
  if(tier==='plus') return plus;
  return pro;
}
function planBlock(tier){
  const access=TaxMateEntitlement.resolve(ENTITLEMENT.snapshot,Date.now(),!navigator.onLine);
  const cur=access.tier,isCurrent=cur===tier,snapshot=ENTITLEMENT.snapshot||{};
  const name = t('tier.'+tier);
  const sub = t('plan.'+tier+'Sub');
  const includes=tier==='plus'?t('plan.includesFree'):tier==='pro'?t('plan.includesPlus'):'';
  const feats = tierFeatureList(tier).map(k=>
    `<div class="frow" style="padding:4px 0;border-bottom:none"><span class="fl" style="font-size:13.5px">${tierTick(tier)} ${t(k)}</span></div>`
  ).join('');
  const badge = isCurrent
    ? `<span class="tagchip green" style="margin-inline-start:auto">${t('tier.current')}</span>`
    : '';
  const permanent=TaxMateEntitlement.hasPermanentPro(ENTITLEMENT.snapshot,Date.now());
  const paid=access.source==='stripe';
  let status='';
  if(isCurrent&&permanent)status=t('tier.permanent');
  else if(isCurrent&&access.source==='promotion'&&access.expiresAt)status=t('plan.promoUntil',{p:name,d:new Date(access.expiresAt-1).toLocaleDateString(locale(),{day:'numeric',month:'short',year:'numeric'})});
  else if(isCurrent&&paid&&snapshot.currentPeriodEnd){const date=new Date(Number(snapshot.currentPeriodEnd)).toLocaleDateString(locale(),{day:'numeric',month:'short',year:'numeric'});status=t(snapshot.cancelAtPeriodEnd?'plan.ends':'plan.renews',{p:name,d:date});}
  let btn='';
  if(paid&&tier!=='free')btn=`<button class="btn ghost" style="margin-top:12px;width:100%" data-tm-click="openBillingPortal()">${t('tier.manage')}</button>`;
  else if(!permanent&&!isCurrent&&tier==='pro')btn=`<button class="btn ink" style="margin-top:12px;width:100%" disabled aria-disabled="true">${t('plan.proBillingPending')}</button>`;
  else if(!permanent&&!isCurrent&&tier!=='free')btn=`<button class="btn ink" style="margin-top:12px;width:100%" data-tm-click="setTier('${tier}')">${t('tier.choose',{p:name})}</button>`;
  const ring = isCurrent ? 'border:1px solid var(--brand);' : 'border:1px solid var(--line);';
  return `<div class="card" style="${ring}margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <div class="t" style="font-size:17px">${name}</div>
      ${badge}
    </div>
    <div class="t" data-plan-price="${tier}" style="font-size:15px;color:var(--brand-deep);margin-bottom:4px">${tierPrice(tier)}</div>
    <div class="s" style="margin-bottom:10px">${sub}</div>
    ${includes?`<div class="s" style="font-weight:700;margin-bottom:5px">${includes}</div>`:''}
    ${feats}
    ${status?`<div class="notice green" style="margin-top:10px">${status}</div>`:''}
    ${btn}
  </div>`;
}
function tierTick(tier){ return '✓'; }
function lockGuard(key){
  // returns true if BLOCKED (and shows the upgrade sheet); false if allowed
  if(hasFeature(key)) return false;
  const need = FEATURE_TIER[key];
  const pname = t('tier.'+need);
  const badgeCls = need==='pro' ? 'max' : 'pro';
  document.getElementById('lock-badge').textContent = pname;
  document.getElementById('lock-badge').className = 'planbadge '+badgeCls;
  document.getElementById('lock-title').textContent = t('lock.title',{p:pname});
  document.getElementById('lock-body').textContent = t('lock.body',{p:pname});
  openSheet('lock');
  return true;
}
function featBadge(key){
  if(hasFeature(key)) return '';
  const need = FEATURE_TIER[key];
  const cls = need==='pro' ? 'max' : 'pro';
  return `<span class="feat-lock-badge ${cls}">${t('tier.'+need)}</span>`;
}
function lockSeeplans(){
  trackEvent('upgrade_viewed');
  closeSheet('lock');
  S.tab='more'; render();
  setTimeout(()=>{ const el=document.getElementById('plans-anchor'); if(el) el.scrollIntoView({behavior:'smooth'}); }, 150);
}
// Plus/Pro 一定要真正登入(唔係匿名 session)先可以 switch——otherwise 個「方案」淨係綁死喺呢部電話,
// 換機/清 cache 就會走數,亦同將來 Stripe 要求嘅「帳戶先有得畀錢」對唔上。降返 free 唔受影響。
function requireLoginForTier(){
  if(cloudUser()) return true;
  confirmAction(
    t('ac.needSignInTitle'),
    t('ac.needSignInBody'),
    ()=>{ const el=document.getElementById('account-anchor'); if(el) el.scrollIntoView({behavior:'smooth'}); }
  );
  return false;
}
function setTier(tier){
  if(tier!=='free' && !requireLoginForTier()) return;
  if(tier==='free'){ openBillingPortal(); return; }
  if(TaxMateEntitlement.hasPermanentPro(ENTITLEMENT.snapshot,Date.now())){ toast('You already have permanent Pro access.'); return; }
  startBillingAction('createCheckoutSession',{tier,cadence:BILLING_CADENCE});
}
function openPromotionSheet(){
  const input=document.getElementById('promo-code'),error=document.getElementById('promo-error');
  input.value='';error.textContent='';error.classList.remove('show');openSheet('promo');
}
const SAFE_BILLING_FAILURES=new Set(['app-check-unavailable','app-check-rejected','auth-required','billing-config','stripe-customer','stripe-checkout','network']);
function secureFunctionError(category,code='UNKNOWN',reason=null){const error=new Error('Service unavailable');error.code=code;error.reason=reason;error.billingCategory=category;return error;}
async function callSecureFunction(name,data){
    const u=cloudUser(); if(!u) throw secureFunctionError('auth-required','UNAUTHENTICATED');
    let token;try{token=await u.getIdToken();}catch(_){throw secureFunctionError('auth-required','UNAUTHENTICATED');}
    let appCheck;try{appCheck=await firebase.appCheck().getToken(false);}catch(_){throw secureFunctionError('app-check-unavailable');}
    if(!appCheck||!appCheck.token)throw secureFunctionError('app-check-unavailable');
    const configuredOrigin=String(FIREBASE_ENVIRONMENT.functionsOrigin||'').replace(/\/$/,'');
    const endpoint=configuredOrigin?configuredOrigin+'/'+FIREBASE_CONFIG.projectId+'/europe-west2/'+name:'https://europe-west2-'+FIREBASE_CONFIG.projectId+'.cloudfunctions.net/'+name;
    let res;try{res=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token,'X-Firebase-AppCheck':appCheck.token},body:JSON.stringify({data})});}catch(_){throw secureFunctionError('network');}
    let body;try{body=await res.json();}catch(_){throw secureFunctionError('network');}
    if(!res.ok||body.error){const code=body.error&&body.error.status||'UNKNOWN',reason=body.error&&body.error.details&&body.error.details.reason||null,category=SAFE_BILLING_FAILURES.has(reason)?reason:code==='UNAUTHENTICATED'?'app-check-rejected':code==='FAILED_PRECONDITION'?'billing-config':'network';throw secureFunctionError(category,code,reason);}
    return body.result||{};
}
let BILLING_ACTION_PENDING=false;
async function startBillingAction(name,data){
  if(BILLING_ACTION_PENDING)return;
  BILLING_ACTION_PENDING=true;
  try{
    const result=await callSecureFunction(name,data);
    if(result.url)location.assign(result.url);
  }catch(e){
    if(name==='createCheckoutSession'&&e.code==='ALREADY_EXISTS'){
      if(TaxMateEntitlement.hasPermanentPro(ENTITLEMENT.snapshot,Date.now()))showNotice(t('tier.permanent'),'You already have permanent Pro access.');
      else openBillingPortal();
      return;
    }
    const category=SAFE_BILLING_FAILURES.has(e&&e.billingCategory)?e.billingCategory:'network';
    console.warn('billing-failure',{category});
    showNotice(t('pro.title'),t('billing.unavailable'));
  }finally{
    BILLING_ACTION_PENDING=false;
  }
}
function openBillingPortal(){ if(requireLoginForTier()) startBillingAction('createBillingPortal',{}); }
async function redeemPromotionCode(){
  const input=document.getElementById('promo-code'),error=document.getElementById('promo-error'),button=document.getElementById('promo-submit'),code=(input.value||'').trim().toUpperCase();
  const fail=message=>{error.textContent=message;error.classList.add('show');};
  error.textContent='';error.classList.remove('show');
  if(!TaxMateEntitlement.validatePromotionCode(code)){fail(t('promo.invalid'));return;}
  if(!cloudUser()){fail(t('promo.signIn'));return;}
  button.disabled=true;
  try{const result=await callSecureFunction('redeemPromotion',{code}),user=cloudUser();await loadEntitlementFromCloud(user.uid);closeSheet('promo');render();showNotice(t('promo.success'),result.message||t('promo.success'));}
  catch(e){const message=e.reason==='not-started'?t('promo.notStarted'):e.reason==='expired'?t('promo.expired'):e.reason==='redemption-limit-reached'?t('promo.full'):e.reason==='duplicate'||e.code==='ALREADY_EXISTS'?t('promo.duplicate'):e.reason==='invalid'||e.code==='NOT_FOUND'?t('promo.invalid'):t('promo.service');fail(message);}
  finally{button.disabled=false;}
}
const PWA_KEYS=TaxMatePwaInstall.KEYS;
let deferredInstall=null;
let installing=false;
let pwaHomeViewTracked=false;
let pwaProactivePending=false;
function pwaLocalGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
function pwaLocalSet(key,value){try{localStorage.setItem(key,String(value));}catch(_){}}
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
}
function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function isIOSSafari(){
  return isIOS()&&/Safari/i.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
}
function pwaInstallOptions(){
  const displayModeStandalone=window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone=window.navigator.standalone===true;
  if(displayModeStandalone||navigatorStandalone)pwaLocalSet(PWA_KEYS.installed,'1');
  return {
    state:S,
    now:Date.now(),
    dismissedAt:pwaLocalGet(PWA_KEYS.dismissedAt),
    displayModeStandalone,
    navigatorStandalone,
    persistedInstalled:pwaLocalGet(PWA_KEYS.installed)==='1',
    hasDeferredPrompt:!!deferredInstall,
    isIOSSafari:isIOSSafari(),
    proactiveShown:pwaLocalGet(PWA_KEYS.proactiveShown)==='1'
  };
}
function isPwaInstalled(){return TaxMatePwaInstall.isInstalled(pwaInstallOptions());}
function canShowHomeInstallPromotion(){return TaxMatePwaInstall.canPromote(pwaInstallOptions());}
function recordPwaPromptViewed(){
  if(pwaHomeViewTracked)return;
  pwaHomeViewTracked=true;
  trackEvent('pwa_install_prompt_viewed');
}
function homeInstallCard(){
  if(!canShowHomeInstallPromotion())return '';
  recordPwaPromptViewed();
  return `<div class="card pwa-home-install" data-pwa-install-promotion="home">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <span style="font-size:22px;line-height:1.2">📲</span>
      <div class="grow">
        <div class="t" style="font-size:15px;margin-bottom:4px">${t('pwa.homeTitle')}</div>
        <div class="s">${t('pwa.homeBody')}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn ink" style="flex:1;padding:11px 14px" data-tm-click="doInstall()">${t('pwa.installCta')}</button>
      <button class="btn ghost" style="flex:1;padding:11px 14px" data-tm-click="dismissInstallPromotion()">${t('pwa.notNow')}</button>
    </div>
  </div>`;
}
function installCard(){
  if(isPwaInstalled()) return '';
  return `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:20px">📲</span>
      <span class="t" style="font-size:15px">${t('pwa.install')}</span>
    </div>
    <div class="s" style="margin-bottom:14px">${t('pwa.installSub')}</div>
    <button class="btn ink" data-tm-click="doInstall()">${t('pwa.install')}</button>
  </div>`;
}
function closePwaInstallSurfaces(){
  ['pwainstall','iosinstall','andinstall'].forEach(id=>{
    const surface=document.getElementById('sb-'+id);
    if(surface)surface.classList.remove('open');
  });
  if(!document.querySelector('.sb.open'))document.body.classList.remove('sheet-open');
}
function dismissInstallPromotion(){
  pwaLocalSet(PWA_KEYS.dismissedAt,Date.now());
  trackEvent('pwa_install_dismissed');
  closePwaInstallSurfaces();
  render();
}
function markPwaInstalled(){
  const already=pwaLocalGet(PWA_KEYS.installed)==='1';
  pwaLocalSet(PWA_KEYS.installed,'1');
  deferredInstall=null;
  closePwaInstallSurfaces();
  if(!already)trackEvent('pwa_install_completed');
  render();
}
function maybeOpenPendingPwaSuggestion(){
  if(!pwaProactivePending||anySheetOpen())return;
  pwaProactivePending=false;
  const options=pwaInstallOptions();
  if(!TaxMatePwaInstall.canPromptProactively(options))return;
  pwaLocalSet(PWA_KEYS.proactiveShown,'1');
  trackEvent('pwa_install_prompt_viewed');
  openSheet('pwainstall');
}
function schedulePwaInstallSuggestion(firstMeaningfulAction){
  if(!firstMeaningfulAction)return;
  pwaProactivePending=true;
  setTimeout(maybeOpenPendingPwaSuggestion,650);
}
function proPlansCard(){
  return `<div class="card" style="background:transparent;border:none;padding:0;box-shadow:none">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:0 2px">
      <div class="t">${t('pro.title')}</div>
    </div>
    <div class="s" style="margin:0 2px 14px">${t('pro.sub')}</div>
    <div class="seg" role="group" aria-label="Billing cadence" style="margin-bottom:8px">
      <button type="button" class="${BILLING_CADENCE==='monthly'?'on':''}" data-billing-cadence="monthly" aria-pressed="${BILLING_CADENCE==='monthly'}" data-tm-click="setBillingCadence('monthly')">${t('billing.monthly')}</button>
      <button type="button" class="${BILLING_CADENCE==='yearly'?'on':''}" data-billing-cadence="yearly" aria-pressed="${BILLING_CADENCE==='yearly'}" data-tm-click="setBillingCadence('yearly')">${t('billing.yearly')}</button>
    </div>
    <div class="s" data-billing-yearly aria-hidden="${BILLING_CADENCE!=='yearly'}" style="text-align:center;margin:0 2px 10px;min-height:19px;visibility:${BILLING_CADENCE==='yearly'?'visible':'hidden'}">${BILLING_CADENCE==='yearly'?t('billing.billedYearly'):''}</div>
    <button class="btn ghost promo-redeem" style="margin-bottom:14px;width:100%" data-tm-click="openPromotionSheet()">${t('promo.redeem')}</button>
    ${planBlock('free')}
    ${planBlock('plus')}
    ${planBlock('pro')}
    <div class="s" style="margin:2px 8px 14px;line-height:1.55">${t('plan.renewal')} <a class="link" href="/terms.html">${t('leg.terms')}</a></div>
  </div>`;
}
function catName(id){ const c = catById(id); if(c.custom) return c.name; const rn=(S.catRenames||{})[c.id]; return rn||t('cat.'+c.id); }
function folderById(id){ return S.folders.find(f=>f.id===id); }

const TAXCFG = TaxMateCore.buildLegacyTaxConfig();
function cfgFor(yr){ return TAXCFG[yr] || TAXCFG['2025-26']; }
// Shared estimate used by both the main app path and onboarding — same maths, dynamic cfg.
function estimateIncomeAndNIC(profit, cfg){
  const myProfit = Math.max(0, profit);
  let pa = cfg.pa;
  if(myProfit>cfg.paTaperFrom) pa = Math.max(0, cfg.pa - Math.floor((myProfit-cfg.paTaperFrom)/2));
  const taxable = Math.max(0, myProfit-pa);
  const higherLimit = Math.max(cfg.basicBand, cfg.addlFrom-pa);
  const basicAmt = Math.min(taxable,cfg.basicBand);
  const higherAmt = Math.min(Math.max(taxable-cfg.basicBand,0), higherLimit-cfg.basicBand);
  const addlAmt = Math.max(taxable-higherLimit,0);
  const incomeTax = basicAmt*cfg.basic + higherAmt*cfg.higher + addlAmt*cfg.addl;
  const c4 = Math.min(Math.max(myProfit-cfg.c4Low,0), cfg.c4High-cfg.c4Low)*cfg.c4Main
           + Math.max(myProfit-cfg.c4High,0)*cfg.c4Upper;
  return incomeTax + c4;
}

/* ═══════════ state ═══════════ */
const STORE_KEY = 'taxmateuk_v1';
const DEVICE_KEY = 'taxmateuk_device_v1';
const DEVICE_ID = (()=>{ try{ let id=localStorage.getItem(DEVICE_KEY); if(!id){ id='dev-'+crypto.getRandomValues(new Uint32Array(2)).join('-'); localStorage.setItem(DEVICE_KEY,id); } return id; }catch(e){ return 'dev-local'; } })();
const DEFAULT_STATE = {
  v:5, tab:'home', year:currentTaxYear(), incFilter:'all', expFilter:'all', incCat:'all', expCat:'all',
  businesses:[], businessTombstones:[], entries:[], tombstones:[], yearData:{}, customCats:{}, folders:[], folderTombstones:[], expFolder:'all', catRenames:{}, activeCats:{}, metaVersions:{}, metaUpdatedAt:0, settings:{lang:'en', tier:'free', theme:'auto'}
};
let STATE_LOAD_ERROR = null;
let S = load();
let META_SYNC_SHADOW = metaSyncSnapshot(S);
function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    const pendingKey=STORE_KEY+':atomic-pending';
    if(!raw){try{localStorage.removeItem(pendingKey);}catch(_){}return TaxMateState.migrate(JSON.parse(JSON.stringify(DEFAULT_STATE)),Date.now(),DEVICE_ID);}
    const s = JSON.parse(raw);
    if(Number(s.v||1)>Number(TaxMateState.STATE_SCHEMA_VERSION)||Number(s.companyStateSchemaVersion||0)>Number(TaxMateState.COMPANY_STATE_SCHEMA_VERSION)||Number(s.domain&&s.domain.schemaVersion||0)>Number(TaxMateDomain.DOMAIN_SCHEMA_VERSION))throw Object.assign(new Error('This TaxMate data was created by a newer app version.'),{code:'future-state-schema'});
    const merged = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), s);
    merged.settings = Object.assign({lang:'en', pro:false}, s.settings||{});
    merged.catRenames = s.catRenames || {};
    merged.customCats = s.customCats || {};
    merged.activeCats = s.activeCats || {};
    if(!Array.isArray(merged.folders)) merged.folders = [];

    // ── Migration v2 → v3: global categories → per-business ──
    // Old shape: customCats/activeCats = {income:[], expense:[]} (global)
    // New shape: customCats/activeCats = { [bizId]: {income:[], expense:[]} }
    const isOldShape = obj => obj && (Array.isArray(obj.income) || Array.isArray(obj.expense));
    if(isOldShape(merged.customCats) || isOldShape(merged.activeCats)){
      const oldCustom = isOldShape(merged.customCats) ? merged.customCats : {income:[],expense:[]};
      const oldActive = isOldShape(merged.activeCats) ? merged.activeCats : {income:[],expense:[]};
      // For existing users with entries but no activeCats, activate all built-ins (legacy behaviour)
      const legacyActive = (!s.activeCats && (s.entries||[]).length>0)
        ? {income:CATS.income.map(c=>c.id), expense:CATS.expense.map(c=>c.id)}
        : oldActive;
      const newCustom = {}, newActive = {};
      (merged.businesses||[]).forEach(b=>{
        // give every existing business a COPY of the old global cats (so nothing disappears)
        newCustom[b.id] = {
          income:  JSON.parse(JSON.stringify(oldCustom.income||[])),
          expense: JSON.parse(JSON.stringify(oldCustom.expense||[]))
        };
        newActive[b.id] = {
          income:  (legacyActive.income||[]).slice(),
          expense: (legacyActive.expense||[]).slice()
        };
      });
      merged.customCats = newCustom;
      merged.activeCats = newActive;
    }
    Object.keys(merged.yearData||{}).forEach(year=>{
      merged.yearData[year] = Object.assign({grossPropertyIncome:0,propertyIncomeComplete:false,poaOutsidePercent:0}, merged.yearData[year]||{});
    });
    merged.v = 5;
    const migrated=TaxMateState.migrate(merged,Date.now(),DEVICE_ID);TaxMateState.validateState(migrated);
    if(JSON.stringify(s)!==JSON.stringify(migrated))persistCanonicalState(migrated);
    try{localStorage.removeItem(pendingKey);}catch(_){}
    return migrated;
  }catch(e){STATE_LOAD_ERROR=e;console.error('TaxMate state load blocked',e&&e.code||e);return TaxMateState.migrate(JSON.parse(JSON.stringify(DEFAULT_STATE)),Date.now(),DEVICE_ID);}
}
function metaSyncSnapshot(state){
  return {
    customCats:JSON.parse(JSON.stringify(state&&state.customCats||{})),
    activeCats:JSON.parse(JSON.stringify(state&&state.activeCats||{})),
    yearData:JSON.parse(JSON.stringify(state&&state.yearData||{})),
    settings:{lang:state&&state.settings&&state.settings.lang||'en',theme:state&&state.settings&&state.settings.theme||'auto'}
  };
}
function stampVersionedMetaChanges(now){
  const at=Number(now)||Date.now(),before=META_SYNC_SHADOW||metaSyncSnapshot({}),after=metaSyncSnapshot(S);
  if(!S.metaVersions||typeof S.metaVersions!=='object') S.metaVersions={};
  let changed=false;
  [['customCats','customCats:'],['activeCats','activeCats:'],['yearData','yearData:']].forEach(pair=>{
    const field=pair[0],prefix=pair[1],keys=new Set([...Object.keys(before[field]||{}),...Object.keys(after[field]||{})]);
    keys.forEach(key=>{
      if(JSON.stringify((before[field]||{})[key])===JSON.stringify((after[field]||{})[key])) return;
      const deleted=!Object.prototype.hasOwnProperty.call(after[field]||{},key);
      S.metaVersions[prefix+key]={updatedAt:at,deviceId:DEVICE_ID,deletedAt:deleted?at:null}; changed=true;
    });
  });
  if(JSON.stringify(before.settings)!==JSON.stringify(after.settings)){
    S.metaVersions['settings:account']={updatedAt:at,deviceId:DEVICE_ID,deletedAt:null}; changed=true;
  }
  if(changed) S.metaUpdatedAt=at;
  META_SYNC_SHADOW=after;
}
function persistRemoteState(){
  S=TaxMateState.migrate(S,Date.now(),DEVICE_ID);
  META_SYNC_SHADOW=metaSyncSnapshot(S);
  try{ persistCanonicalState(S); }catch(e){}
  window.dispatchEvent(new CustomEvent('taxmate:canonical-state-updated'));
}
function persistCanonicalState(state){
  if(STATE_LOAD_ERROR)throw Object.assign(new Error('Canonical state writes are blocked until the stored data is recovered safely.'),{code:'state-load-blocked'});
  TaxMateState.validateState(state);const encoded=JSON.stringify(state),prior=localStorage.getItem(STORE_KEY),rollbackKey='taxmateuk_pre_ltd_v15_migration',pendingKey=STORE_KEY+':atomic-pending';
  localStorage.setItem(pendingKey,encoded);if(prior){try{const previous=JSON.parse(prior);if(Number(previous.companyStateSchemaVersion||0)<Number(state.companyStateSchemaVersion||0)&&!localStorage.getItem(rollbackKey))localStorage.setItem(rollbackKey,prior);}catch(_){}}
  localStorage.setItem(STORE_KEY,encoded);localStorage.removeItem(pendingKey);
}
function save(){
  if(STATE_LOAD_ERROR){showNotice('TaxMate data needs checking','This device contains data from an unsupported or damaged state. TaxMate has not replaced it. Update or recover the data before making changes.');return false;}
  const now=Date.now(),persistedBefore=localStorage.getItem(STORE_KEY); stampVersionedMetaChanges(now); S=TaxMateState.migrate(S,now,DEVICE_ID);const encodedAfter=JSON.stringify(S),stateChanged=persistedBefore!==encodedAfter;
  try{ persistCanonicalState(S); }catch(e){
    showNotice('TaxMate could not save this change','Your existing data is still on this device. Check the information and try again before closing TaxMate.');
    return false;
  }
  if(!stateChanged)return true;
  CLOUD.localEditAt=now;
  if(typeof scheduleCloudPush==='function') scheduleCloudPush();return true;
}
window.TaxMateLtdProductionBridge=Object.freeze({
  loadState:()=>JSON.parse(JSON.stringify(S)),
  replaceState(next){
    const migrated=TaxMateState.migrate(next,Date.now(),DEVICE_ID);TaxMateState.validateState(migrated);persistCanonicalState(migrated);S=migrated;CLOUD.localEditAt=Date.now();
    window.dispatchEvent(new CustomEvent('taxmate:canonical-state-updated'));
    if(typeof scheduleCloudPush==='function')scheduleCloudPush();
    return JSON.parse(JSON.stringify(S));
  },
  rollbackSnapshot(){try{return JSON.parse(localStorage.getItem('taxmateuk_pre_ltd_v15_migration')||'null');}catch(_){return null;}},
  entitlementSnapshot:()=>JSON.parse(JSON.stringify(ENTITLEMENT.snapshot||{})),
  hasExistingCompany:()=>!!activeLtdProfile(),
  activeCompanyId:()=>CLOUD.ltdAnchor&&CLOUD.ltdAnchor.activeCompanyId||null,
  personalTaxJurisdiction:()=>{const rules=TaxMateCore.TAX_RULESETS&&TaxMateCore.TAX_RULESETS[S.year];return rules&&rules.jurisdiction||null;},
  deviceId:()=>DEVICE_ID,
  locale:()=>({en:'en',zh:'zh-HK',pl:'pl',ro:'ro',es:'es',ur:'ur'})[S.settings.lang]||'en',
  theme:()=>S.settings.theme==='dark'?'dark':S.settings.theme==='light'?'light':matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',
  mount:()=>document.getElementById('taxmate-ltd-ui-root'),
  enterLtd(){for(const selector of ['.top','#page','#nav']){const element=document.querySelector(selector);if(element)element.hidden=true;}const mount=this.mount();mount.hidden=false;document.body.classList.add('ltd-active');window.scrollTo(0,0);},
  exitToBusinesses(){const mount=this.mount();mount.hidden=true;document.body.classList.remove('ltd-active');for(const selector of ['.top','#page','#nav']){const element=document.querySelector(selector);if(element)element.hidden=false;}S.tab='home';save();render();window.scrollTo(0,0);},
  exitToLegacyBusiness(structure,businessId){const mount=this.mount();mount.hidden=true;document.body.classList.remove('ltd-active');for(const selector of ['.top','#page','#nav']){const element=document.querySelector(selector);if(element)element.hidden=false;}render();openBiz(businessId||null,structure||'sole');},
  callTrusted:(name,data)=>callSecureFunction(name,data),
  downloadWorkingPack(data){const blob=new Blob([JSON.stringify(data.payload,null,2)],{type:data.mimeType||'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=data.fileName||'taxmate-company-working-pack.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
  refreshShell:()=>render(),
  sentryEnabled:()=>typeof window.Sentry!=='undefined',
  analyticsEnabled:()=>{try{return localStorage.getItem('taxmateuk_analytics_consent')==='granted';}catch(_){return false;}}
});
function yd(){
  if(!S.yearData[S.year]) S.yearData[S.year] = {poaPaid:0,priorAdj:0,taMode:'auto',mileage:0,dismissedTips:[],grossPropertyIncome:0,propertyIncomeComplete:false,poaOutsidePercent:0};
  return S.yearData[S.year];
}

/* ═══════════ helpers ═══════════ */
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt = n => (n<0?'−':'')+'£'+Math.abs(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt0 = n => (n<0?'−':'')+'£'+Math.abs(n).toLocaleString('en-GB',{maximumFractionDigits:0});
const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

function currentTaxYear(){
  const d = new Date(); const y = d.getFullYear();
  const after = (d.getMonth()>3)||(d.getMonth()===3&&d.getDate()>=6);
  const start = after ? y : y-1;
  return start+'-'+String((start+1)%100).padStart(2,'0');
}
function yearRange(yr){
  const s = parseInt(yr.slice(0,4),10);
  return {from:s+'-04-06', to:(s+1)+'-04-05'};
}
function inYear(dateISO, yr){ const r = yearRange(yr); return dateISO>=r.from && dateISO<=r.to; }
function yearOptions(){
  const set = new Set([currentTaxYear(), S.year]);
  const cy = parseInt(currentTaxYear().slice(0,4),10);
  set.add((cy-1)+'-'+String(cy%100).padStart(2,'0'));
  set.add((cy+1)+'-'+String((cy+2)%100).padStart(2,'0'));
  S.entries.forEach(e=>{
    const d = new Date(e.date+'T12:00:00'); if(isNaN(d)) return;
    let y = d.getFullYear();
    const after = (d.getMonth()>3)||(d.getMonth()===3&&d.getDate()>=6);
    if(!after) y-=1;
    set.add(y+'-'+String((y+1)%100).padStart(2,'0'));
  });
  return Array.from(set).sort();
}
function effExact(e){
  if(e.kind!=='expense') return Math.max(0,e.amount);
  const p = (e.pct==null?100:e.pct);
  return Math.max(0,e.amount)*p/100;
}
function entriesFor(yr,bizId,kind){
  return S.entries.filter(e=> inYear(e.date,yr) && (bizId==null||e.bizId===bizId) && (kind==null||e.kind===kind));
}
function bizById(id){ return S.businesses.find(b=>b.id===id); }
const AVATAR_COLORS = ['#0AA968','#3478F6','#9B59B6','#F47738','#0D8C86','#E5484D'];
const CAT_COLOURS = ['#E5484D','#F47738','#3478F6','#9B59B6','#0AA968','#6B7686','#85994B','#0D8C86','#1F4E9C','#B47D12'];
const CAT_EMOJIS = ['⛽','🅿️','🚗','🔧','🛡️','📱','🏠','🧰','🗂️','📦','💼','📣','💷','🧾','✨','🎵','🍔','☕','✈️','🏨','📚','💡','🧹','✂️','💊','🎨','🛒','📮','🔨','🌱'];
function bizColor(b){ const i = S.businesses.indexOf(b); return AVATAR_COLORS[(i<0?0:i)%AVATAR_COLORS.length]; }

/* ═══════════ tax engine (tested) ═══════════ */
function bizFigures(b,yr){
  const inc = entriesFor(yr,b.id,'income').reduce((s,e)=>s+e.amount,0);
  const exp = entriesFor(yr,b.id,'expense').reduce((s,e)=>s+effExact(e),0);
  return {income:inc, expenses:exp, profit:inc-exp};
}
function calcTax(yr){
  const cfg = cfgFor(yr);
  const d = S.yearData[yr] || {poaPaid:0,priorAdj:0,taMode:'auto'};
  let soleIncome=0, soleExpenses=0, partShareProfit=0;
  const perBiz = S.businesses.map(b=>{
    const f = bizFigures(b,yr);
    if(b.structure==='partnership') partShareProfit += f.profit*(b.share||50)/100;
    else { soleIncome+=Math.max(0,f.income); soleExpenses+=Math.max(0,f.expenses); }
    return Object.assign({biz:b},f);
  });
  const profitActual = soleIncome - soleExpenses;
  const profitAllowance = Math.max(0, soleIncome - Math.min(cfg.tradingAllowance, soleIncome));
  const allowanceAvailable = soleIncome>0;
  const allowanceBetter = allowanceAvailable && (profitAllowance < profitActual);
  let taMode = d.taMode||'auto', taUsed;
  if(taMode==='allowance') taUsed=true;
  else if(taMode==='expenses') taUsed=false;
  else taUsed = allowanceBetter;
  if(!allowanceAvailable) taUsed=false;
  const soleProfit = taUsed ? profitAllowance : profitActual;
  const myProfit = soleProfit + partShareProfit;
  const priorAdj = Number(d.priorAdj)||0;
  const poaPaid = Number(d.poaPaid)||0;
  const coreTax = TaxMateCore.calculateTaxEstimate({taxYear:yr,profit:myProfit,priorAdjustment:priorAdj,paymentsAlreadyMade:poaPaid,collectedOutsideSaPercent:Number(d.poaOutsidePercent)||0});
  const pa = coreTax.personalAllowance, taxable = coreTax.taxable;
  const basicAmt = coreTax.basicAmount, higherAmt = coreTax.higherAmount, addlAmt = coreTax.additionalAmount;
  const incomeTax = coreTax.incomeTax, c4 = coreTax.class4;
  const class2TreatedPaid = coreTax.class2TreatedPaid, class2Voluntary = coreTax.class2Voluntary;
  const liability = coreTax.liability, balancing = coreTax.balancing;
  const poaRequired = coreTax.paymentsOnAccount.required, poaEach = coreTax.paymentsOnAccount.each;
  const poaReason = coreTax.paymentsOnAccount.reason, janTotal = coreTax.januaryTotal;
  return {cfg,perBiz,soleIncome,soleExpenses,profitActual,profitAllowance,allowanceAvailable,allowanceBetter,
          taUsed,taMode,soleProfit,partShareProfit,myProfit,pa,taxable,basicAmt,higherAmt,addlAmt,
          incomeTax,class4:c4,class2TreatedPaid,class2Voluntary,liability,priorAdj,poaPaid,balancing,
          poaRequired,poaEach,poaReason,poaOutsidePercent:Number(d.poaOutsidePercent)||0,janTotal};
}

/* ═══════════ navigation ═══════════ */
const NAV_ICONS = {
  home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  income:'<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>',
  expenses:'<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>',
  tax:'<svg viewBox="0 0 24 24"><path d="M9 14l6-6"/><circle cx="9.5" cy="8.5" r="1.4"/><circle cx="14.5" cy="13.5" r="1.4"/><rect x="4" y="3" width="16" height="18" rx="4"/></svg>',
  more:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};
function renderNav(){
  document.getElementById('nav').innerHTML = ['home','income','expenses','tax','more'].map(n=>{
    const on = (S.tab===n) || (n==='expenses' && S.tab==='receipts'); // receipts 係開支嘅子頁
    return `<button class="${on?'on':''}" data-tm-click="go('${n}')">${NAV_ICONS[n]}<span>${t('nav.'+n)}</span></button>`;
  }).join('');
}
function go(tab){ S.tab=tab; save(); render(); window.scrollTo(0,0); }
function setYear(y){ S.year=y; save(); render(); }
function renderYearSel(){
  document.getElementById('yearSel').innerHTML =
    yearOptions().map(y=>`<option value="${y}" ${y===S.year?'selected':''}>${y}</option>`).join('');
}

function render(){
  applyStaticI18n(); renderYearSel(); renderNav();
  const page = document.getElementById('page');
  if(STATE_LOAD_ERROR){page.innerHTML='<div class="notice amber"><strong>TaxMate data needs checking</strong><br>This device contains data from an unsupported or damaged state. Your stored data has not been replaced and cloud sync is paused on this device.</div>';renderSyncStatus();return;}
  if(!S.businesses.length && !activeLtdProfile() && S.tab!=='more'){ page.innerHTML = welcome(); return; }
  if(S.tab==='home') page.innerHTML = pageHome();
  else if(S.tab==='income') page.innerHTML = pageList('income');
  else if(S.tab==='expenses') page.innerHTML = pageList('expense');
  else if(S.tab==='tax') page.innerHTML = pageTax();
  else if(S.tab==='receipts') page.innerHTML = pageReceipts();
  else page.innerHTML = pageMore();
  renderSyncStatus();
}

/* ═══════════ welcome ═══════════ */
function welcome(){
  const steps = t('w.steps').split('\n').map(s=>`<div style="margin-bottom:8px;font-size:14.5px">${esc(s)}</div>`).join('');
  return `
  ${proBanner()}
  <div class="hero">
    <div class="hi" style="font-size:22px;font-weight:800">${t('w.title')}</div>
    <div style="margin-top:8px;font-size:14.5px;opacity:.95;line-height:1.55">${t('w.sub')}</div>
  </div>
  <div class="notice green">${t('w.priv')}</div>
  <div class="card">${steps}
    <button class="btn" style="margin-top:14px" data-tm-click="openAddBusinessFlow()">${t('w.start')}</button>
  </div>`;
}

/* Home cards from onboarding: review reminder + catch-up re-entry */
function obReviewCard(){
  const ids = (S.obReview||[]).filter(id=>S.entries.find(e=>e.id===id && e._review));
  if(!ids.length){ if(S.obReview&&S.obReview.length){ S.obReview=[]; } return ''; }
  return `<div class="card" style="border:1px solid var(--amber);background:var(--amber-soft);cursor:pointer" data-tm-click="go('expenses')">
    <div class="row" style="align-items:flex-start">
      <div class="ico" style="background:rgba(180,125,18,.18)">🔔</div>
      <div class="grow">
        <div class="t" style="color:var(--amber)">${ids.length} item${ids.length>1?'s':''} to review</div>
        <div class="s">Add dates or categories when you have a moment — it keeps your tax estimate accurate.</div>
      </div>
      <div class="chev">›</div>
    </div>
  </div>`;
}
function obCatchupCard(){
  // show only to people who skipped onboarding (explore) — gentle re-entry
  let done=null; try{ done=localStorage.getItem('tmOnboardDone'); }catch(e){}
  if(done!=='explore') return '';
  return `<div class="card catchup-card" style="cursor:pointer" data-tm-click="obReopenCatchup()">
    <div class="row">
      <div class="ico" style="background:var(--brand-soft)">🧹</div>
      <div class="grow">
        <div class="t">Catch up on earlier months</div>
        <div class="s">Add income &amp; expenses from before you started here</div>
      </div>
      <div class="chev">›</div>
    </div>
  </div>`;
}
function obReopenCatchup(){
  // 已有 business 嘅現有用戶「補返之前月份」——唔可以由 login 螢幕重頭嚟（嗰個係全新用戶用、冇退出掣，會卡死）。
  OB = obDefaultState(!!cloudUser());
  OB._catchup = true;
  if(S.businesses.length>1){
    // 多過一個 business → 要先揀補邊個
    OB._catchupBizId = null;
    OB.screen = 'pickbiz';
  }else{
    // 得一個 → 直接去揀月份
    OB._catchupBizId = S.businesses.length ? S.businesses[0].id : null;
    OB.screen = 'start';
  }
  const r = TaxMateOnboardingRoot.open(document);
  obRender();
}

/* ═══════════ HOME (dashboard only) ═══════════ */
function proBanner(){
  // Paid access is shown only from a server-verified entitlement.
  if(currentTier()!=='free') return '';
  // 今次 session 撳咗 ✕ → 唔出（下次開 app 又會出）
  try{ if(sessionStorage.getItem('tmProBannerHidden')==='1') return ''; }catch(e){}
  return `<div id="pro-banner" style="display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);color:var(--ink);padding:12px 14px;border-radius:14px;margin-bottom:14px;font-weight:600;font-size:14px;cursor:pointer" data-tm-click="lockSeeplans()">
    <span style="flex:1;line-height:1.35">Explore TaxMate Plus and Pro →</span>
    <button data-tm-click="event.stopPropagation();hideProBanner()" style="background:var(--bg);border:none;color:var(--muted);width:26px;height:26px;border-radius:50%;font-size:16px;font-weight:800;cursor:pointer;flex-shrink:0;line-height:1">✕</button>
  </div>`;
}
function hideProBanner(){
  try{ sessionStorage.setItem('tmProBannerHidden','1'); }catch(e){}
  const el=document.getElementById('pro-banner'); if(el) el.remove();
}

/* ─── 主頁頂部宣傳輪播（手動 slide、最多幾張、可 dismiss）───
   每張卡係一個 promo，唔同 tipsCard（tipsCard 係稅頁、被動、睇你資料先觸發）。*/
function carouselDismissed(){
  try{ return JSON.parse(sessionStorage.getItem('tmCarouselDismissed')||'[]'); }catch(e){ return []; }
}
function dismissCarouselCard(id){
  try{
    const d=carouselDismissed(); if(!d.includes(id)) d.push(id);
    sessionStorage.setItem('tmCarouselDismissed', JSON.stringify(d));
  }catch(e){}
  render();
}
function carouselCards(){
  const dismissed = carouselDismissed();
  const cards = [];
  const canReceipt = hasFeature('receiptPhoto');

  // 卡 1：影收據 —— Plus/Pro 直接去補收據頁；Free 去方案頁。
  // 升級／推廣碼入口保留喺「設定 › 方案」同各處 lockGuard。
  if(!dismissed.includes('receipt')){
    cards.push({ id:'receipt', bg:'var(--card)', fg:'var(--ink)', accent:'var(--blue)', emoji:'📸',
      title:t('car.rcTitle'),
      body: canReceipt ? t('car.rcBody') : t('car.rcLockedBody'),
      cta:  canReceipt ? t('car.rcCta') : t('car.rcLockedCta'),
      onclick: canReceipt ? "go('receipts')" : "lockGuard('receiptPhoto')" });
  }

  // 卡 2：最相關嘅一條 context tip（借用 tipsCard 嘅資料，但淨係抽一條擺喺輪播）
  if(!dismissed.includes('tip')){
    const tip = topContextTip();
    if(tip){
      cards.push({ id:'tip', bg:'var(--card)', fg:'var(--ink)', accent:'var(--brand-deep)', emoji:tip.icon,
        title:tip.t, body:tip.b, cta:t('home.taxT'), onclick:"go('tax')" });
    }
  }
  return cards;
}
function homeCarousel(){
  const cards = carouselCards();
  if(!cards.length) return '';
  const slides = cards.map((c,i)=>`
    <div class="cxr-card" style="background:${c.bg};color:${c.fg};border:1px solid var(--line)">
      <button class="cxr-x" data-tm-click="event.stopPropagation();dismissCarouselCard('${c.id}')" aria-label="Dismiss">✕</button>
      <div class="cxr-inner" data-tm-click="${c.onclick}">
        <div class="cxr-emoji">${c.emoji}</div>
        <div class="cxr-txt">
          <div class="cxr-title">${c.title}</div>
          <div class="cxr-body">${c.body}</div>
          <div class="cxr-cta" style="color:${c.accent}">${c.cta}</div>
        </div>
      </div>
    </div>`).join('');
  const dots = cards.length>1
    ? `<div class="cxr-dots">${cards.map((c,i)=>`<span class="cxr-dot${i===0?' on':''}" data-i="${i}"></span>`).join('')}</div>`
    : '';
  return `<div class="cxr-wrap">
    <div class="cxr-track" id="cxr-track" data-tm-scroll="cxrOnScroll(this)">${slides}</div>
    ${dots}
  </div>`;
}
function cxrOnScroll(el){
  // 更新指示點（純顯示，唔影響任何資料）
  const dots = el.parentElement.querySelectorAll('.cxr-dot');
  if(!dots.length) return;
  const i = Math.round(el.scrollLeft / el.clientWidth);
  dots.forEach((d,idx)=>d.classList.toggle('on', idx===i));
}
/* 由 tipsCard 嘅同一套規則抽「最相關嗰一條」，畀輪播用（唔改 tipsCard 本身）*/
function topContextTip(){
  const yr = S.year;
  const d = yd();
  const dismissed = d.dismissedTips || [];
  const hasIncome = entriesFor(yr,null,'income').length>0 || calcTax(yr).myProfit!==0;
  if(!hasIncome) return null;
  const hasSole = S.businesses.some(b=>b.structure==='sole');
  const exp = entriesFor(yr,null,'expense');
  // 收據提示（Pro）——一疊未補相就係最實際嗰條
  if(hasFeature('receiptPhoto') && !dismissed.includes('receipt_missing')){
    const noR = exp.filter(e=>!e.receiptUrl);
    if(noR.length>=3){
      const suf = noR.length===1?t('tip.entry'):t('tip.entries');
      return {icon:'📸', t:t('tip.receipt_t'), b:t('tip.receipt_b',{n:noR.length,e:' '+suf})};
    }
  }
  if(!dismissed.includes('home_working') && hasSole && !exp.some(e=>e.cat==='home'))
    return {icon:'🏠', t:t('tip.home_t'), b:t('tip.home_b')};
  if(!dismissed.includes('phone_claim') && hasSole && !exp.some(e=>e.cat==='phone'))
    return {icon:'📱', t:t('tip.phone_t'), b:t('tip.phone_b')};
  return null;
}
function activeLtdProfile(state=S){return(state&&state.domain&&state.domain.companyProfiles||[]).find(profile=>profile.deletedAt==null)||null;}
function ltdHomeBusinessCards(){
  const profile=activeLtdProfile();if(!profile)return'';
  const snapshot=window.TaxMateLtdProductionAdapter&&TaxMateLtdProductionAdapter.getSnapshot&&TaxMateLtdProductionAdapter.getSnapshot();
  const row=snapshot&&snapshot.businessList&&snapshot.businessList.find(item=>item.businessType==='limited_company')||null;
  const name=row&&row.name||profile.legalName||'Limited company',draft=profile.lifecycleStatus!=='confirmed',amount=row&&row.summary&&Number.isSafeInteger(row.summary.amountMinor)?row.summary.amountMinor:null,share=row&&row.share&&row.share.percent;
  const readOnly=currentTier()!=='pro';
  return `<div class="row">
    <div class="avatar" style="background:var(--brand-soft);color:var(--brand-deep)">${esc(name.trim().charAt(0).toUpperCase()||'L')}</div>
    <div class="grow"><div class="t">${esc(name)}</div><div class="s">Limited company${share!=null?' · '+esc(String(share))+'%':''}${draft?' · Setup pending':''}${readOnly?' · Read-only':''}</div></div>
    <div style="text-align:end">${amount==null?'':`<div class="v num ${amount>=0?'pos':'neg'}">${fmt(amount/100)}</div>`}<button class="link" data-tm-click="openLtdCompany()">${draft?'Finish setup':'Open'}</button></div>
  </div>`;
}
function openAddBusinessFlow(){
  if(!window.TaxMateLtdProductionAdapter){showNotice('Limited company','The company workspace could not be loaded. Reload TaxMate and try again.');return;}
  TaxMateLtdProductionAdapter.openAddBusiness().catch(error=>{console.error(error);showNotice('Limited company','The company workspace could not be opened. Your data was not changed.');});
}
function openLtdCompany(){
  if(!window.TaxMateLtdProductionAdapter){showNotice('Limited company','The company workspace could not be loaded. Reload TaxMate and try again.');return;}
  TaxMateLtdProductionAdapter.openExistingCompany().catch(error=>{console.error(error);showNotice('Limited company','The company workspace could not be opened. Your data was not changed.');});
}
function pageHome(){
  const tx = calcTax(S.year);
  const totalIn = entriesFor(S.year,null,'income').reduce((s,e)=>s+e.amount,0);
  const totalOut = entriesFor(S.year,null,'expense').reduce((s,e)=>s+effExact(e),0);
  const owe = Math.max(0,tx.liability);

  const bizCards = tx.perBiz.map(p=>{
    const col = bizColor(p.biz);
    return `<div class="row">
      <div class="avatar" style="background:${col}">${esc((p.biz.name||'?').trim().charAt(0).toUpperCase())}</div>
      <div class="grow">
        <div class="t">${esc(p.biz.name)}</div>
        <div class="s">${p.biz.structure==='partnership' ? t('tag.part')+' · '+t('tag.your',{n:p.biz.share||50}) : t('tag.sole')}</div>
      </div>
      <div style="text-align:end">
        <div class="v num ${p.profit>=0?'pos':'neg'}">${fmt(p.profit)}</div>
        <button class="link" data-tm-click="openBiz('${p.biz.id}')">${t('c.edit')}</button>
      </div>
    </div>`;
  }).join('')+ltdHomeBusinessCards();

  const recent = S.entries.filter(e=>inYear(e.date,S.year)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  const recentHTML = recent.length ? `
    <div class="h2">${t('home.recent')}</div>
    <div class="elist">${recent.map(entryRow).join('')}</div>` : '';

  return `
  ${homeCarousel()}
  <div class="hero">
    <div class="hi">${t('home.hi')}</div>
    <div class="label">${t('home.profit',{y:S.year})}</div>
    <div class="big num">${fmt(tx.myProfit)}</div>
    <div class="hero-owe" data-tm-click="go('tax')">
      <span class="ho-label">🐷 ${t('home.oweLine')}</span>
      <span class="ho-val num">${fmt0(owe)} ›</span>
    </div>
    <div class="pills">
      <button class="pill" data-tm-click="go('income')"><div class="pl">${t('home.in')}</div><div class="pv num">${fmt(totalIn)}</div></button>
      <button class="pill" data-tm-click="go('expenses')"><div class="pl">${t('home.out')}</div><div class="pv num">−${fmt(totalOut).replace('−','')}</div></button>
    </div>
    ${(()=>{
      const ci=currentQuarterIdx(S.year);
      if(ci<0) return '';
      const qr=quarterRange(ci,S.year);
      const qP=S.entries.filter(e=>e.date>=qr.from&&e.date<=qr.to).reduce((a,e)=>e.kind==='income'?a+Math.max(0,e.amount):a-Math.max(0,effExact(e)),0);
      return '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.2)">'
        +'<span style="font-size:12px;font-weight:600;opacity:.85">'+qr.id+'</span>'
        +'<span class="num" style="font-size:13px;font-weight:800">'+(qP>=0?'':'−')+'\xa3'+Math.abs(qP).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span></div>';
    })()}
  </div>

  ${deadlineBanner()}
  ${entitlementBanner()}

  <div class="homecta">
    <button class="btn" data-tm-click="openEntry('income')">＋ ${t('f.addIncome')}</button>
    <button class="btn danger-soft" data-tm-click="openEntry('expense')">＋ ${t('f.addExpense')}</button>
  </div>

  ${homeInstallCard()}

  ${obReviewCard()}

  <div class="h2">${t('home.biz')}</div>
  <div class="card">${bizCards}</div>
  <button class="btn soft home-add-business" data-tm-click="openAddBusinessFlow()">+ ${t('home.addBiz')}</button>

  ${recentHTML}

  ${obCatchupCard()}
  <p class="small">${t('w.priv')}</p>`;
}

/* ═══════════ INCOME / EXPENSES lists ═══════════ */
function entryRow(e){
  const c = catById(e.cat);
  const b = bizById(e.bizId);
  const pctNote = (e.kind==='expense'&&e.pct!=null&&e.pct<100) ? ` · ${e.pct}%` : '';
  const d = e.dateTBC ? t('f.tbc') : new Date(e.date+'T12:00:00').toLocaleDateString(locale(),{day:'numeric',month:'short'});
  return `<button class="entry" data-tm-click="openEntry('${e.kind}','${e.id}')">
    <div class="edot" style="background:${c.dot}1A">${c.e||'🏷️'}</div>
    <div class="grow">
      <div class="t">${esc(e.desc)||esc(catName(c.id))}</div>
      <div class="s">${d}${e.desc?' · '+esc(catName(c.id)):''}${b?' · '+esc(b.name):''}${pctNote}</div>
    </div>
    ${e.receiptUrl?`<img class="receipt-thumb" style="width:36px;height:36px;margin-inline-start:8px" src="${e.receiptUrl}" data-tm-click="event.stopPropagation();openLightbox('${e.receiptUrl}','${e.receiptPath||''}')">`:``}
    <div class="v num ${e.kind==='income'?'pos':'neg'}" style="margin-inline-start:${e.receiptUrl?4:0}px">${e.kind==='income'?'+':'−'}${fmt(e.kind==='income'?e.amount:effExact(e)).replace('−','')}</div>
  </button>`;
}

function pageList(kind){
  const isInc = kind==='income';
  const fKey = isInc?'incFilter':'expFilter';
  const filt = S[fKey];

  const chips = S.businesses.length>1 ?
    `<div class="chips">
      <button class="chip ${filt==='all'?'on':''}" data-tm-click="setFilter('${fKey}','all')">${t('flt.all')}</button>
      ${S.businesses.map(b=>`<button class="chip ${filt===b.id?'on':''}" data-tm-click="setFilter('${fKey}','${b.id}')">${esc(b.name)}</button>`).join('')}
    </div>` : '';

  const fchips = (!isInc && S.folders.length) ?
    `<div class="chips">
      <button class="chip ${S.expFolder==='all'?'on':''}" data-tm-click="setFilter('expFolder','all')">${t('fd.all')}</button>
      ${S.folders.map(f=>`<button class="chip ${S.expFolder===f.id?'on':''}" data-tm-click="setFilter('expFolder','${f.id}')">📁 ${esc(f.name)}</button>`).join('')}
    </div>` : '';

  // category filter — e.g. tap "⛽ Fuel" to see only fuel entries
  const cKey = isInc?'incCat':'expCat';
  const baseList = entriesFor(S.year, filt==='all'?null:filt, kind);
  const seenCat = new Set();
  const usedCats = [...new Set(baseList.map(e=>e.cat))].map(catById)
    .filter(c=>{ if(seenCat.has(c.id)) return false; seenCat.add(c.id); return true; })
    .sort((a,b)=>catName(a.id).localeCompare(catName(b.id)));
  const selCat = usedCats.some(c=>c.id===S[cKey]) ? S[cKey] : 'all';
  const cchips = usedCats.length>1 ?
    `<div class="chips">
      <button class="chip ${selCat==='all'?'on':''}" data-tm-click="setFilter('${cKey}','all')">${t('flt.all')}</button>
      ${usedCats.map(c=>`<button class="chip ${selCat===c.id?'on':''}" data-tm-click="setFilter('${cKey}','${c.id}')">${c.e||'🏷️'} ${esc(catName(c.id))}</button>`).join('')}
    </div>` : '';

  let list = baseList.sort((a,b)=>b.date.localeCompare(a.date));
  if(!isInc && S.expFolder!=='all') list = list.filter(e=>e.folderId===S.expFolder);
  if(selCat!=='all') list = list.filter(e=>e.cat===selCat);
  const total = list.reduce((s,e)=>s+(isInc?e.amount:effExact(e)),0);
  let body='';
  if(!list.length){
    body = `<div class="empty"><div class="big-emoji">${isInc?'🌱':'🧾'}</div>
      <div class="t">${t(isInc?'inc.empty':'exp.empty')}</div>
      <div class="s">${t(isInc?'inc.emptyS':'exp.emptyS')}</div></div>`;
  } else {
    const groups={};
    list.forEach(e=>{ const k=e.date.slice(0,7); (groups[k]=groups[k]||[]).push(e); });
    body = Object.keys(groups).sort((a,b)=>{
      const cur = todayISO().slice(0,7);
      const aFut = a>cur, bFut = b>cur;
      // Past/current months first (newest→oldest), future months last (oldest→newest)
      if(aFut && !bFut) return 1;
      if(!aFut && bFut) return -1;
      if(aFut && bFut) return a.localeCompare(b);
      return b.localeCompare(a);
    }).map(k=>{
      const lbl = new Date(k+'-15T12:00:00').toLocaleDateString(locale(),{month:'long',year:'numeric'});
      const sub = groups[k].reduce((s,e)=>s+(isInc?e.amount:effExact(e)),0);
      return `<div class="month"><span>${lbl}</span><span class="num ${isInc?'pos':'neg'}">${isInc?'+':'−'}${fmt(sub).replace('−','')}</span></div>
        <div class="elist">${groups[k].map(entryRow).join('')}</div>`;
    }).join('');
  }

  return `
  <div class="h1" style="display:flex;align-items:baseline;justify-content:space-between">
    <span>${t(isInc?'inc.title':'exp.title')}</span>
    <span class="num ${isInc?'pos':'neg'}" style="font-size:18px">${isInc?'+':'−'}${fmt(total).replace('−','')}</span>
  </div>
  ${chips}
  ${cchips}
  ${fchips}
  ${body}
  <button class="fab" data-tm-click="openEntry('${kind}')" aria-label="Add"><span class="fab-plus" aria-hidden="true">+</span></button>`;
}
function setFilter(key,v){ S[key]=v; save(); render(); }

/* ═══════════ TAX ═══════════ */
function pageTax(){
  trackEvent('tax_estimate_viewed');
  if(!S.businesses.length){
    return '<div class="h1">'+t('nav.tax')+'</div>'
      +'<div class="card" style="text-align:center;padding:40px 24px">'
      +'<div style="font-size:44px;margin-bottom:12px">📊</div>'
      +'<div class="t" style="margin-bottom:8px">'+t('tax.emptyT')+'</div>'
      +'<div class="s" style="margin-bottom:18px">'+t('tax.emptyS')+'</div>'
      +'<button class="btn" data-tm-click="openBiz()">+ '+t('home.addBiz')+'</button></div>';
  }
  const tx = calcTax(S.year);
  const cfg = tx.cfg;

  let taBlock='';
  if(tx.allowanceAvailable){
    const saving = Math.abs(tx.profitActual - tx.profitAllowance);
    taBlock = `
    <div class="card">
      <div class="t" style="margin-bottom:6px">${t('tax.taT')}</div>
      <div class="s" style="margin-bottom:12px">${t('tax.taHint')}</div>
      <div class="frow"><span class="fl">${t('tax.taActual')}</span><span class="fv num">${fmt(tx.profitActual)}</span></div>
      <div class="frow"><span class="fl">${t('tax.taAllow')}</span><span class="fv num">${fmt(tx.profitAllowance)}</span></div>
      <div class="frow"><span class="fl" style="font-weight:800">${t('tax.taBest')}</span>
        <span class="tagchip green">${tx.allowanceBetter ? t('tax.allowance') : t('tax.expensesOpt')}${saving>0.005?' · '+t('tax.taSave',{x:fmt0(saving)}):''}</span></div>
      <div style="margin-top:14px">
        <div class="seg">
          <button type="button" class="${tx.taMode==='auto'?'on':''}" data-tm-click="setTaMode('auto')">${t('tax.auto')}</button>
          <button type="button" class="${tx.taMode==='allowance'?'on':''}" data-tm-click="setTaMode('allowance')">${t('tax.allowance')}</button>
          <button type="button" class="${tx.taMode==='expenses'?'on':''}" data-tm-click="setTaMode('expenses')">${t('tax.expensesOpt')}</button>
        </div>
        <div class="s" style="margin-top:8px">${t('tax.using',{x: tx.taUsed?t('tax.usingAllow'):t('tax.usingExp')})} · ${t('tax.autoNote')}</div>
      </div>
    </div>`;
  }

  const class2Row = tx.class2TreatedPaid
    ? `<div class="frow"><span class="fl">${t('tax.c2')} <small>${t('tax.c2Paid',{x:cfg.c2SmallProfits.toLocaleString()})}</small></span><span class="fv num">£0.00</span></div>`
    : `<div class="frow"><span class="fl">${t('tax.c2')} <small>${t('tax.c2Vol',{x:cfg.c2SmallProfits.toLocaleString(),v:tx.class2Voluntary.toFixed(2)})}</small></span><span class="fv mut">${t('tax.opt')}</span></div>`;

  return `
  <div class="hero tax-hero">
    <div class="label">${t('tax.bill',{y:S.year})}</div>
    <div class="big num">${fmt(Math.max(tx.liability,0))}</div>
    <div class="hi" style="opacity:.8">${t('tax.it')} ${fmt(tx.incomeTax)} · ${t('tax.c4')} ${fmt(tx.class4)}<br>${t('tax.fileBy',{d:cfg.fileDeadline})}</div>
    <div style="margin-top:12px;padding:8px 12px;background:rgba(255,255,255,.12);border-radius:10px;font-size:12.5px;font-weight:600;opacity:.95">⚠️ ${t('tax.estimateWarn')}</div>
  </div>

  ${deadlineBanner()}
  ${taBlock}
  ${mileageCard()}
<div class="card">
    <div class="t" style="margin-bottom:10px">${t('tax.how')}</div>
    ${tx.perBiz.map(p=>`<div class="frow"><span class="fl">${esc(p.biz.name)}${p.biz.structure==='partnership'?` <small>${t('tag.your',{n:p.biz.share||50})} = ${fmt(p.profit*(p.biz.share||50)/100)}</small>`:''}</span><span class="fv num ${p.profit>=0?'pos':'neg'}">${fmt(p.profit)}</span></div>`).join('')}
    <div class="frow total"><span class="fl">${t('tax.taxableP')}</span><span class="fv num">${fmt(tx.myProfit)}</span></div>
  </div>

  <div class="card">
    <div class="frow"><span class="fl">${t('tax.pa')} <small>${tx.pa<cfg.pa?t('tax.paRed'):t('tax.paHint')}</small></span><span class="fv num">−${fmt(tx.pa).replace('−','')}</span></div>
    <div class="frow"><span class="fl">${t('tax.taxable')}</span><span class="fv num">${fmt(tx.taxable)}</span></div>
    ${tx.basicAmt>0?`<div class="frow"><span class="fl">${t('tax.basic')} · 20% ${t('tax.on')} ${fmt0(tx.basicAmt)}</span><span class="fv num">${fmt(tx.basicAmt*cfg.basic)}</span></div>`:''}
    ${tx.higherAmt>0?`<div class="frow"><span class="fl">${t('tax.higher')} · 40% ${t('tax.on')} ${fmt0(tx.higherAmt)}</span><span class="fv num">${fmt(tx.higherAmt*cfg.higher)}</span></div>`:''}
    ${tx.addlAmt>0?`<div class="frow"><span class="fl">${t('tax.addl')} · 45% ${t('tax.on')} ${fmt0(tx.addlAmt)}</span><span class="fv num">${fmt(tx.addlAmt*cfg.addl)}</span></div>`:''}
    <div class="frow"><span class="fl">${t('tax.c4')} <small>${t('tax.c4Hint')}</small></span><span class="fv num">${fmt(tx.class4)}</span></div>
    ${class2Row}
    <div class="frow total"><span class="fl">${t('tax.total')}</span><span class="fv num">${fmt(tx.liability)}</span></div>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="t">${t('tax.payT')}</div>
      <button class="link" data-tm-click="openAdj()">${t('tax.editPos')}</button>
    </div>
    <div class="frow"><span class="fl">${t('tax.thisBill')}</span><span class="fv num">${fmt(tx.liability)}</span></div>
    <div class="frow"><span class="fl">${t('tax.priorAdj')} <small>${t('tax.priorAdjS')}</small></span><span class="fv num ${tx.priorAdj>0?'neg':(tx.priorAdj<0?'pos':'')}">${fmt(tx.priorAdj)}</span></div>
    <div class="frow"><span class="fl">${t('tax.poaPaid')}</span><span class="fv num pos">−${fmt(tx.poaPaid).replace('−','')}</span></div>
    <div class="frow total"><span class="fl">${t('tax.balancing')}</span><span class="fv num ${tx.balancing>0?'neg':'pos'}">${fmt(tx.balancing)}</span></div>
    ${tx.balancing<-0.005?`<div class="notice green" style="margin:12px 0 0">${t('tax.refund')}</div>`:''}
  </div>

  <div class="card">
    <div class="t" style="margin-bottom:10px">${t('tax.datesT')}</div>
    ${tx.poaRequired?`
      <div class="s" style="margin-bottom:10px">${t('tax.poaWhy')}</div>
      <div class="frow"><span class="fl"><b>31 Jan</b> <small>${t('tax.janS')}</small></span><span class="fv num neg">${fmt(tx.janTotal)}</span></div>
      <div class="frow"><span class="fl"><b>31 Jul</b> <small>${t('tax.julS')}</small></span><span class="fv num neg">${fmt(tx.poaEach)}</span></div>
      <div class="s" style="margin-top:10px">${t('tax.poaReduce')}</div>
    `:`
      <div class="frow"><span class="fl"><b>31 Jan</b> <small>${t('tax.noPoa')}</small></span><span class="fv num ${tx.balancing>0?'neg':''}">${fmt(Math.max(tx.balancing,0))}</span></div>
    `}
  </div>

  <details class="help"><summary>${t('tax.accT')}</summary><div class="hb">${t('tax.accB',{y:S.year})}</div></details>
  ${tipsCard()}
  ${quarterlyCard()}
  ${mtdCard()}
  ${sa103Card()}
  ${sa104Card()}
  <p class="small">${t('tax.disc')}</p>`;
}
function setTaMode(m){ yd().taMode=m; save(); render(); }

/* ═══════════ BATCH RECEIPTS (independent page) ═══════════
   補收據頁：揀分類＋月份 → 列出「同類、未有收據」嘅開支 → 逐行影相貼上。
   唔製造新 data（純補相落已存在嘅開支），一筆一相。Pro 功能。*/
function receiptsUI(){ return {cat: RCB.cat, month: RCB.month}; }
let RCB = { cat:'all', month:'all' };
function rcbSetCat(v){ RCB.cat=v; render(); }
function rcbSetMonth(v){ RCB.month=v; render(); }

function pageReceipts(){
  const yr = S.year;
  const backBtn = `<button class="btn ghost" style="width:auto;padding:8px 14px;margin-bottom:12px" data-tm-click="go('expenses')">‹ ${t('nav.expenses')}</button>`;

  // Pro gate：未夠 Pro 就唔畀入，引導升級
  if(!hasFeature('receiptPhoto')){
    return `${backBtn}
    <div class="h1">${t('rcb.title')}</div>
    <div class="card" style="text-align:center;padding:28px 18px">
      <div style="font-size:40px;margin-bottom:8px">📸</div>
      <div class="t" style="margin-bottom:6px">${t('car.rcTitle')}</div>
      <div class="s" style="margin-bottom:16px">${t('car.rcLockedBody')}</div>
      <button class="btn ink" data-tm-click="lockSeeplans()">${t('car.rcLockedCta')}</button>
    </div>`;
  }

  // 所有「開支 + 未有收據」entries（本年度）
  let missing = entriesFor(yr,null,'expense').filter(e=>!e.receiptUrl);

  // 分類選項（由「未補相」嗰堆開支本身抽出，唔會列出無關分類）
  const catIds = [...new Set(missing.map(e=>e.cat))];
  const catOpts = catIds.map(cid=>`<option value="${cid}" ${RCB.cat===cid?'selected':''}>${(catById(cid).e||'🏷️')+' '+catName(cid)}</option>`).join('');

  // 月份選項（同樣由未補相開支抽出）
  const monthsSet = [...new Set(missing.map(e=>e.date.slice(0,7)))].sort().reverse();
  const monthLabel = ym => { const [y,m]=ym.split('-'); return new Date(+y,+m-1,1).toLocaleDateString(locale(),{month:'long',year:'numeric'}); };
  const monthOpts = monthsSet.map(ym=>`<option value="${ym}" ${RCB.month===ym?'selected':''}>${monthLabel(ym)}</option>`).join('');

  // 套用篩選
  let list = missing.slice();
  if(RCB.cat!=='all') list = list.filter(e=>e.cat===RCB.cat);
  if(RCB.month!=='all') list = list.filter(e=>e.date.slice(0,7)===RCB.month);
  list.sort((a,b)=>b.date.localeCompare(a.date));

  const controls = `<div class="card" style="padding:14px">
    <div class="s" style="margin-bottom:12px">${t('rcb.intro')}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <label style="display:block;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:4px">${t('rcb.cat')}</label>
        <select data-tm-change="rcbSetCat(this.value)">
          <option value="all" ${RCB.cat==='all'?'selected':''}>${t('flt.all')}</option>
          ${catOpts}
        </select>
      </div>
      <div style="flex:1;min-width:140px">
        <label style="display:block;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:4px">${t('rcb.month')}</label>
        <select data-tm-change="rcbSetMonth(this.value)">
          <option value="all" ${RCB.month==='all'?'selected':''}>${t('rcb.allMonths')}</option>
          ${monthOpts}
        </select>
      </div>
    </div>
  </div>`;

  // 一疊都補晒 → 恭喜；未揀到嘢 → 提示
  let body;
  if(!missing.length){
    body = `<div class="card" style="text-align:center;padding:24px"><div style="font-size:32px;margin-bottom:6px">🎉</div><div class="s">${t('rcb.allDone')}</div></div>`;
  } else if(!list.length){
    body = `<div class="card" style="text-align:center;padding:24px"><div class="s">${t('rcb.noMissing')}</div></div>`;
  } else {
    const rows = list.map(e=>{
      const c = catById(e.cat);
      const b = bizById(e.bizId);
      const d = e.dateTBC ? t('f.tbc') : new Date(e.date+'T12:00:00').toLocaleDateString(locale(),{day:'numeric',month:'short'});
      return `<div class="frow" style="align-items:center;padding:10px 0">
        <div class="edot" style="background:${c.dot}1A;flex-shrink:0">${c.e||'🏷️'}</div>
        <div class="grow" style="min-width:0;margin-inline-start:10px">
          <div class="t" style="font-size:14px">${esc(e.desc)||esc(catName(c.id))}</div>
          <div class="s">${d}${b?' · '+esc(b.name):''} · ${fmt(effExact(e)).replace('−','')}</div>
        </div>
        <label class="btn soft" style="width:auto;padding:8px 14px;flex-shrink:0;cursor:pointer;margin:0" id="rcb-btn-${e.id}">
          <span id="rcb-label-${e.id}">${t('rcb.add')}</span>
          <input type="file" accept="image/*"${canCaptureWithCamera()?' capture="environment"':''} style="display:none" data-tm-change="onBatchReceiptFile('${e.id}', this)">
        </label>
      </div>`;
    }).join('');
    const remain = list.length;
    body = `<div class="card">
      <div class="row" style="margin-bottom:6px">
        <div class="grow"><div class="t" style="font-size:14px">${t('rcb.remaining',{n:remain})}</div></div>
      </div>
      ${rows}
      <div class="s" style="margin-top:12px;opacity:.8">💡 ${t('rcb.tip')}</div>
    </div>`;
  }

  return `${backBtn}
  <div class="h1">${t('rcb.title')}</div>
  ${controls}
  ${body}`;
}

async function onBatchReceiptFile(entryId, inputEl){
  const file = inputEl.files[0]; if(!file) return;
  inputEl.value='';
  if(!hasFeature('receiptPhoto')){ lockGuard('receiptPhoto'); return; }
  const e = S.entries.find(x=>x.id===entryId);
  if(!e) return;
  const business=bizById(e.bizId);if(business&&business.syncCode&&!hasFeature('partnerSync')){showNotice(t('sy.title'),t('sy.readOnly'));return;}
  const labelEl = document.getElementById('rcb-label-'+entryId);
  const btnEl = document.getElementById('rcb-btn-'+entryId);
  if(labelEl) labelEl.textContent = '⏳ '+t('rcb.uploading');
  if(btnEl) btnEl.style.opacity = '0.6';
  try{
    const compressed = await compressImage(file, 1200, 0.82);
    const db = await ensureFB(); if(!db) throw new Error('no-db');
    const u = await ensureAuth(); if(!u) throw new Error('no-auth');
    try{ await u.getIdToken(); }catch(_){}
    const path = `receipts/${u.uid}/${entryId}.jpg`;   // 同單筆上載完全一致嘅路徑規則
    const ref = firebase.storage().ref(path);
    await ref.put(compressed, {contentType:'image/jpeg'});
    const url = await ref.getDownloadURL();
    e.receiptUrl = url;
    e.receiptPath = path;
    Object.assign(e,TaxMateSync.touch(e,DEVICE_ID,Date.now()));
    pushEntryRemote(e);  // partnership sync（如有）
    save();              // 個人雲端 sync 由 save() 自動觸發
    render();            // 補完該筆會由未補清單消失
    toast(t('rcb.done'));
  }catch(err){
    console.warn(err);
    if(labelEl) labelEl.textContent = t('rcb.add');
    if(btnEl) btnEl.style.opacity = '';
    toast(t('rc.uploadErr')||'Upload failed');
  }
}

/* ═══════════ MORE ═══════════ */
function pageMore(){
  const GOOGLE_SVG = `<svg width="17" height="17" viewBox="0 0 48 48" style="flex-shrink:0"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;
  const secHead = key => `<div style="font-size:12px;font-weight:800;color:var(--muted);letter-spacing:.6px;padding:22px 4px 10px">${t(key)}</div>`;

  const accountCard = `<div class="card" id="account-anchor">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div class="t">${t('ac.title')}</div>
    </div>
    ${cloudUser() ? `
      <div class="row">
        <div class="avatar" style="background:var(--brand)">${esc(((cloudUser().displayName||cloudUser().email||'?').trim().charAt(0)||'?').toUpperCase())}</div>
        <div class="grow">
          <div class="t" style="font-size:14.5px">${esc(cloudUser().displayName||t('ac.signedAs'))}</div>
          <div class="s">${esc(cloudUser().email||'')}</div>
          <div class="s" id="cloud-sync-status" style="font-weight:700;margin-top:2px">${esc(syncStatus().message)}</div>
        </div>
      </div>
      <div class="notice green" style="margin-top:12px;font-size:12.5px">
        Changes are kept on this device until the server confirms them. Pending changes retry when TaxMate reopens or comes back online.
      </div>
      <button class="link danger" style="margin-top:14px;display:block" data-tm-click="confirmAction(t('ac.signout'),t('ac.signoutM'),doSignOut)">${t('ac.signout')}</button>
    ` : `
      <div class="s" style="margin-bottom:14px">${t('ac.why')}</div>
      <button class="btn ghost" style="gap:10px" data-tm-click="signIn('google')">${GOOGLE_SVG}${t('ac.google')}</button>
      <div class="s" style="margin-top:12px">${t('ac.local')}</div>
    `}
  </div>`;

  const proCard = proPlansCard();

  const bizCard = `<div class="card">
    ${S.businesses.length? S.businesses.map(b=>`
      <div class="row">
        <div class="avatar" style="background:${bizColor(b)};width:38px;height:38px;font-size:15px">${esc((b.name||'?').trim().charAt(0).toUpperCase())}</div>
        <div class="grow">
          <div class="t" style="font-size:14.5px">${esc(b.name)}</div>
          <div class="s">${b.structure==='partnership'?t('tag.part')+' · '+t('tag.your',{n:b.share||50}):t('tag.sole')}${b.syncCode?' · <span style="color:var(--brand);font-weight:700">🔗 '+t('sy.synced')+'</span>':''}</div>
        </div>
        <button class="link" data-tm-click="openBiz('${b.id}')">${t('c.edit')}</button>
      </div>`).join(''):''}
    ${activeLtdProfile()?ltdHomeBusinessCards():''}
    <button class="btn soft" style="margin-top:${S.businesses.length||activeLtdProfile()?14:0}px" data-tm-click="openAddBusinessFlow()">+ ${t('home.addBiz')}</button>
    <div class="frow" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
      <span class="fl">${t('sy.joinTitle')}${featBadge('partnerSync')}</span>
      <button class="link" data-tm-click="${hasFeature('partnerSync')?'openJoinPartnership()':`lockGuard('partnerSync')`}">${hasFeature('partnerSync')?'›':'🔒'}</button>
    </div>
  </div>`;

  const organiseSection = [
    (()=>{
      // gather all custom cats across businesses, grouped by business
      const rows = [];
      S.businesses.forEach(b=>{
        const bc = S.customCats[b.id]||{};
        const cats = (bc.expense||[]).concat(bc.income||[]);
        if(!cats.length) return;
        rows.push(`<div style="font-size:12px;font-weight:700;color:var(--muted);padding:8px 0 4px">${esc(b.name)}</div>`);
        cats.forEach(c=>{
          rows.push(`<div class="frow"><span class="fl">${c.e||'🏷️'} ${esc(c.name)}</span>
            <button class="link danger" data-tm-click="confirmAction('${esc(c.name).replace(/'/g,"\\'")}',t('cc.deleteM'),()=>deleteCustomCat('${c.id}'))">✕</button></div>`);
        });
      });
      return rows.length ? `<div class="card">
        <div class="t" style="margin-bottom:10px">${t('cc.manage')}</div>${rows.join('')}
      </div>` : '';
    })(),
    S.folders.length?`<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="t">${t('fd.manage')}</div>
        <button class="link" data-tm-click="openFolderSheet()">+ ${t('fd.add')}</button>
      </div>
      ${S.folders.map(f=>`
        <div class="frow"><span class="fl">📁 ${esc(f.name)}</span>
        <button class="link danger" data-tm-click="confirmAction('${esc(f.name).replace(/'/g,"\\'")}',t('fd.deleteM'),()=>deleteFolder('${f.id}'))">✕</button></div>`).join('')}
    </div>`:`<button class="btn soft" data-tm-click="openFolderSheet()">+ ${t('fd.add')}</button>`
  ].join('');

  return `
  <div class="h1">${t('m.title')}</div>

  ${accountCard}<div id="plans-anchor"></div>${proCard}

  <details class="sec">
    <summary>${t('sec.biz')}</summary>
    <div class="sec-body">
      ${bizCard}
    </div>
  </details>

  <details class="sec">
    <summary>${t('sec.prefs')}</summary>
    <div class="sec-body">
      <div class="card">
        <div class="t" style="margin-bottom:10px">${t('m.theme')}</div>
        <div class="seg">
          <button class="${(S.settings.theme||'auto')==='auto'?'on':''}" data-tm-click="setTheme('auto')">${t('theme.auto')}</button>
          <button class="${S.settings.theme==='light'?'on':''}" data-tm-click="setTheme('light')">${t('theme.light')}</button>
          <button class="${S.settings.theme==='dark'?'on':''}" data-tm-click="setTheme('dark')">${t('theme.dark')}</button>
        </div>
      </div>
      <div class="card">
        <div class="t" style="margin-bottom:10px">${t('m.lang')}</div>
        <div class="catgrid">${Object.keys(LANG_NAMES).map(l=>`<button class="catbtn ${S.settings.lang===l?'on':''}" data-tm-click="setLang('${l}')">${LANG_NAMES[l]}</button>`).join('')}</div>
        ${S.settings.lang!=='en'?`<div class="fhint" style="margin-top:10px">ℹ️ ${t('lang.pdfHint')}</div>`:''}
      </div>
      <div class="card">
        <div class="t" style="margin-bottom:4px">Optional analytics</div>
        <div class="s" style="margin-bottom:12px">Off by default. If enabled, TaxMate sends only approved value-free usage events. No bookkeeping values, business names, notes, receipts or account identity are included.</div>
        <label style="display:flex;align-items:center;gap:10px;font-weight:700"><input type="checkbox" ${window.TaxMateAnalytics&&TaxMateAnalytics.enabled()?'checked':''} data-tm-change="setAnalyticsConsent(this.checked)"> Share anonymous usage analytics</label>
      </div>
      ${installCard()}
      ${organiseSection}
    </div>
  </details>

  <details class="sec">
    <summary>${t('sec.report')}</summary>
    <div class="sec-body">
      <div class="card">
        <div class="t" style="margin-bottom:6px">${t('pdf.download')}${featBadge('pdfReport')}</div>
        <div class="s" style="margin-bottom:12px">${t('rep.desc')}</div>
        ${S.settings.lang!=='en'?`<div class="fhint" style="margin-bottom:12px">ℹ️ ${t('pdf.enHint')}</div>`:''}
        <button class="btn soft" style="margin-bottom:10px" data-tm-click="${hasFeature('pdfReport')?'generatePDF()':`lockGuard('pdfReport')`}">${t('pdf.download')}${hasFeature('pdfReport')?'':' 🔒'}</button>
        <button class="btn ghost" data-tm-click="exportCalendar()">${t('cal.export')}</button>
        <div class="s" style="margin-top:8px">${t('cal.desc')}</div>
      </div>
      <div class="card">
        <div class="t" style="margin-bottom:6px">${t('rp.title')}${featBadge('receiptPack')}</div>
        <div class="s" style="margin-bottom:12px">${t('rp.desc')}</div>
        <button class="btn soft" data-tm-click="${hasFeature('receiptPack')?'exportReceiptPack()':`lockGuard('receiptPack')`}">${t('rp.btn')}${hasFeature('receiptPack')?'':' 🔒'}</button>
      </div>
    </div>
  </details>

  <details class="sec">
    <summary>${t('sec.data')}</summary>
    <div class="sec-body">
      <div class="card">
        <div class="t" style="margin-bottom:6px">${t('m.backup')}</div>
        <div class="s" style="margin-bottom:12px">${cloudUser()
          ? '<span data-cloud-sync-status style=\"font-weight:700\">'+esc(syncStatus().message)+'</span> — '
          : ''}${t('m.backupHint')}</div>
        <button class="btn soft" data-tm-click="exportPortableBackup()">${t('m.backupFull')}</button>
        <div class="s" style="margin:6px 2px 12px">${t('m.backupFullS')}</div>
        <button class="btn ghost" data-tm-click="exportJSON()">${t('m.backupData')}</button>
        <div class="s" style="margin:6px 2px 12px">${t('m.backupDataS')}</div>
        <input type="file" id="importFile" accept=".zip,.json,application/zip,application/json" style="display:none" data-tm-change="importBackupFile(event)">
        <button class="btn ghost" data-tm-click="document.getElementById('importFile').click()">${t('m.restore')}</button>
      </div>
      <div class="card" style="text-align:center">
        <button class="link danger" data-tm-click="confirmAction(t('m.resetT'),t('m.resetM'),resetAll)">${t('m.reset')}</button>
      </div>
      ${(fbConfigured() && FB.ready && firebase.auth().currentUser) ? `<div class="card" style="text-align:center">
        <button class="link danger" data-tm-click="confirmAction(t('m.eraseCloudT'),t('m.eraseCloudM'),eraseEverything)">${t('m.eraseCloud')}</button>
      </div>` : ''}
    </div>
  </details>

  <details class="sec">
    <summary>${t('sec.help')}</summary>
    <div class="sec-body">
      <div class="card">
        <div class="t" style="margin-bottom:6px">Help & support</div>
        <div class="s" style="margin-bottom:12px">Task-based help for records, tax estimates, receipts, plans, backups and partnerships.</div>
        <button class="btn soft" data-tm-click="openLegal('help')">Open Help & support</button>
        <a href="mailto:support@taxmate.uk" style="display:block;margin-top:10px;color:var(--brand-deep);font-weight:700;text-align:center">support@taxmate.uk</a>
      </div>
    </div>
  </details>

  <details class="sec">
    <summary>${t('sec.legal')}</summary>
    <div class="sec-body">
      <div class="card">
        <div class="t" style="margin-bottom:4px">About TaxMate</div>
        <div class="s">Bookkeeping and tax-planning tools for UK sole traders and partnerships.</div>
      </div>
      <div class="card" style="padding:6px 18px">
        <button class="link" style="display:block;width:100%;text-align:start;padding:13px 0;border-bottom:1px solid var(--line)" data-tm-click="openLegal('privacy')">${t('leg.privacy')} ›</button>
        <button class="link" style="display:block;width:100%;text-align:start;padding:13px 0" data-tm-click="openLegal('terms')">${t('leg.terms')} ›</button>
      </div>
      <div class="card">
        <details class="help"><summary>${t('leg.disclaimer')}</summary><div class="hb">${t('leg.disclaimerBody')}</div></details>
      </div>
      <div class="card">
        <div class="t" style="margin-bottom:4px">App information</div>
        <div class="s" style="font-weight:700">TaxMate ${TaxMateCore.VERSIONS.APP_VERSION}</div>
        <details class="help" style="margin-top:10px"><summary>Build information</summary><div class="hb"><code>${TaxMateCore.VERSIONS.BUILD_ID}</code></div></details>
      </div>
    </div>
  </details>

  <p class="small" style="text-align:center">TaxMate ${TaxMateCore.VERSIONS.APP_VERSION}</p>`;
}
function openLegal(which){
  const el = document.getElementById('legal-content');
  if(!el) return;
  if(!window.TaxMateLegal){showNotice('About & legal','This information is temporarily unavailable. Use the Help, Privacy or Terms link instead.');return;}
  el.innerHTML=which==='help'?TaxMateLegal.helpHtml:which==='privacy'?TaxMateLegal.privacyHtml:TaxMateLegal.termsHtml;
  openSheet('legal');
}

function applyTheme(){
  const th = (S.settings&&S.settings.theme)||'auto';
  if(th==='auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
}
function setTheme(th){
  S.settings.theme = th; save(); applyTheme(); render();
}
function setAnalyticsConsent(enabled){
  if(window.TaxMateAnalytics)TaxMateAnalytics.setConsent(enabled===true);
  render();
}
function setLang(l){ S.settings.lang=l; save(); render(); }
function obSetLang(l){ S.settings.lang=l; save(); OB._langOpen=false; obRender(); }

/* ═══════════ entry sheet ═══════════ */
let EN = {id:null, kind:'expense', cat:null, pct:100};
function openEntry(kind, id){
  const e = id ? S.entries.find(x=>x.id===id) : null;
  if(e){const business=bizById(e.bizId);if(business&&business.syncCode&&!hasFeature('partnerSync')){showNotice(t('sy.title'),t('sy.readOnly'));return;}}
  EN = e ? {id:e.id, kind:e.kind, cat:e.cat, pct:(e.pct==null?100:e.pct), folderId:(e.folderId||null), receiptUrl:(e.receiptUrl||null), receiptPath:(e.receiptPath||null), repeat:false}
         : {id:null, kind:kind||'expense', cat:null, pct:100, repeat:false, folderId:(kind==='expense'&&S.expFolder!=='all')?S.expFolder:null, receiptUrl:null, receiptPath:null};
  const isInc = EN.kind==='income';
  document.getElementById('en-title').textContent = e ? t(isInc?'f.editIncome':'f.editExpense') : t(isInc?'f.addIncome':'f.addExpense');
  document.getElementById('en-amount').value = e?e.amount:'';
  document.getElementById('en-amount').classList.remove('err');
  document.getElementById('en-amount-err').classList.remove('show');
  const _dEl = document.getElementById('en-date');
  const _tr = taxYearRange(e ? dateToTaxYear(e.date) : S.year);
  _dEl.min = _tr.min; _dEl.max = _tr.max;
  if(e){ _dEl.value = e.date; }
  else { const _td = todayISO(); _dEl.value = _td<_tr.min?_tr.min:(_td>_tr.max?_tr.max:_td); }
  const _dh = document.getElementById('en-date-hint');
  if(_dh){ _dh.style.display='none'; _dh.style.color='var(--amber)'; }
  EN.repeatMonths = null;
  document.getElementById('en-desc').value = e?(e.desc||''):'';
  document.getElementById('en-delete').style.display = e?'inline':'none';
  const sel = document.getElementById('en-biz');
  sel.innerHTML = S.businesses.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  if(e) sel.value = e.bizId;
  else { const f = isInc?S.incFilter:S.expFilter; if(f!=='all'&&bizById(f)) sel.value=f; }
  document.getElementById('en-biz-group').style.display = S.businesses.length>1?'block':'none';
  paintEntry(); openSheet('entry');
}
function paintEntry(){
  const bizId = (document.getElementById('en-biz')||{}).value || (S.businesses[0]&&S.businesses[0].id);
  const cats = allCats(EN.kind, bizId);
  if(!EN.cat || !cats.find(c=>c.id===EN.cat)) EN.cat = cats[0].id;
  document.getElementById('en-pct-group').style.display = EN.kind==='expense'?'block':'none';
  document.getElementById('en-cats').innerHTML = cats.map(c=>
    `<button type="button" class="catbtn ${EN.cat===c.id?'on':''}" data-tm-click="setCat('${c.id}')" data-tm-contextmenu="event.preventDefault();renameCat('${c.id}')"><span style="font-size:17px;margin-inline-end:2px">${c.e||'🏷️'}</span>${esc(catName(c.id))}</button>`).join('')
    + `<button type="button" class="catbtn" style="border-style:dashed;color:var(--muted)" data-tm-click="openCatSheet()">＋ ${t('cc.add')}</button>`;
  document.getElementById('en-pcts').innerHTML = PCT_OPTIONS.map(p=>
    `<button type="button" class="chip ${EN.pct===p?'on':''}" data-tm-click="setPct(${p})">${p}%</button>`).join('');
  // 商業用途 %：預設 100% 摺埋,只在非 100% 時展開
  const pctCol = document.getElementById('en-pct-collapsed');
  const pctExp = document.getElementById('en-pct-expanded');
  if(pctCol && pctExp){
    const show = EN.pct!==100;
    pctCol.style.display = show ? 'none' : 'block';
    pctExp.style.display = show ? 'block' : 'none';
  }
  // 收據相簿
  const rg = document.getElementById('en-receipt-group');
  rg.style.display = EN.kind==='expense' ? 'block' : 'none';
  const rw = document.getElementById('en-receipt-thumb-wrap');
  if(EN.receiptUrl){
    rw.innerHTML = `<img class="receipt-thumb" src="${EN.receiptUrl}" data-tm-click="openLightbox('${EN.receiptUrl}','${EN.receiptPath||''}')">`;
  } else if(!hasFeature('receiptPhoto')){
    rw.innerHTML = `<div class="receipt-add" data-tm-click="lockGuard('receiptPhoto')" title="${t('lock.title',{p:t('tier.plus')})}">🔒</div>`;
  } else if(canCaptureWithCamera()){
    // touch device — two matching buttons, camera first, no separate icon tile
    rw.innerHTML = `<div class="rc-actions">
        <button type="button" class="btn soft" data-tm-click="document.getElementById('en-receipt-file').click()">${t('rc.take')}</button>
        <button type="button" class="btn ghost" data-tm-click="document.getElementById('en-receipt-pick').click()">${t('rc.chooseExisting')}</button>
      </div>`;
  } else {
    // pointer device — file upload is the primary (and only genuine) route
    rw.innerHTML = `<div class="rc-actions">
        <button type="button" class="btn soft" data-tm-click="document.getElementById('en-receipt-pick').click()">${t('rc.upload')}</button>
        <div class="fhint">${t('rc.imagesOnly')}</div>
      </div>`;
  }
  document.getElementById('en-receipt-status').textContent = '';
  const fg = document.getElementById('en-folder-group');
  fg.style.display = EN.kind==='expense' ? 'block' : 'none';
  const rpg = document.getElementById('en-repeat-group');
  if(rpg){
    rpg.style.display = (EN.kind==='expense' && !EN.id) ? 'block' : 'none';
    setRepeat(false);
  }
  const fsel = document.getElementById('en-folder');
  fsel.innerHTML = `<option value="">${t('fd.none')}</option>` +
    S.folders.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');
  fsel.value = EN.folderId || '';
}
let CC_EMOJI = CAT_EMOJIS[0];
// 攞字串入面「最後一個」grapheme（正確處理 variation selector、ZWJ sequences 等）
// 用途：emoji 輸入框永遠只保留一個 emoji — 新揀嘅自動取代舊嘅
function lastGrapheme(v){
  const s = (v||'').trim();
  if(!s) return '';
  try{
    const segs = [...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(s)];
    return segs.length ? segs[segs.length-1].segment : '';
  }catch(e){
    const arr = [...s];
    return arr[arr.length-1] || '';
  }
}
function onEmojiInput(v){
  CC_EMOJI = lastGrapheme(v);
  const ei=document.getElementById('cc-emoji-input');
  if(ei){ ei.value = CC_EMOJI; ei.classList.remove('err'); }
  const ee=document.getElementById('cc-emoji-err'); if(ee) ee.classList.remove('show');
}
function openCatSheet(){
  document.getElementById('cc-name').value='';
  CC_EMOJI = '';
  const ei=document.getElementById('cc-emoji-input'); if(ei){ ei.value=''; ei.classList.remove('err'); }
  const ee=document.getElementById('cc-emoji-err'); if(ee) ee.classList.remove('show');
  document.getElementById('cc-name').classList.remove('err');
  document.getElementById('cc-name-err').classList.remove('show');
  openSheet('cat');
}
let CAT_ACTION_ID = null;
function catLongPress(id){
  CAT_ACTION_ID = id;
  document.getElementById('cat-action-name').textContent = catName(id);
  // reset rename state
  const rr = document.getElementById('cat-rename-row');
  const ab = document.getElementById('cat-action-btns');
  if(rr) rr.style.display='none';
  if(ab) ab.style.display='block';
  openSheet('catact');
}
let CAT_RENAME_EMOJI = '';
function onCatRenameEmoji(v){
  // 只保留最新揀嗰個 emoji — 舊嗰個自動被取代，唔使手動剷
  CAT_RENAME_EMOJI = lastGrapheme(v);
  const ei=document.getElementById('cat-rename-emoji');
  if(ei) ei.value = CAT_RENAME_EMOJI;
}
function catStartRename(){
  const id = CAT_ACTION_ID;
  const c = catById(id);
  const cur = catName(id);
  CAT_RENAME_EMOJI = (c && c.e) || '';
  document.getElementById('cat-rename-row').style.display='block';
  document.getElementById('cat-action-btns').style.display='none';
  const inp = document.getElementById('cat-rename-input');
  const eInp = document.getElementById('cat-rename-emoji');
  inp.value = cur;
  if(eInp) eInp.value = CAT_RENAME_EMOJI;
  setTimeout(()=>inp.focus(),80);
}
function catCancelRename(){
  document.getElementById('cat-rename-row').style.display='none';
  document.getElementById('cat-action-btns').style.display='block';
  CAT_RENAME_EMOJI = '';
}
function catConfirmRename(){
  const id = CAT_ACTION_ID;
  const trimmed = (document.getElementById('cat-rename-input').value||'').trim();
  if(!trimmed) return;
  const c = catById(id);
  if(c && c.custom){
    c.name = trimmed;
    if(CAT_RENAME_EMOJI) c.e = CAT_RENAME_EMOJI;
  } else {
    if(!S.catRenames) S.catRenames = {};
    if(trimmed===t('cat.'+id)) delete S.catRenames[id];
    else S.catRenames[id] = trimmed;
  }
  save();
  closeSheet('catact');
  catCancelRename();
  if(document.getElementById('sb-entry').classList.contains('open')) paintEntry();
  render();
  toast(t('cc.renameDone'));
}
function catDoDelete(){
  const id = CAT_ACTION_ID;
  const n = S.entries.filter(e=>e.cat===id).length;
  closeSheet('catact');
  if(n > 0){
    // Has entries → warn before removing
    const plural = n===1 ? 'y' : 'ies';
    confirmAction(
      t('cc.delDataT'),
      t('cc.delDataM',{n, s:plural}),
      ()=>doCatDelete(id)
    );
  } else {
    doCatDelete(id);
  }
}
function doCatDelete(id){
  const c = catById(id);
  const bizId = entryBizId();
  const kind = CATS.income.find(x=>x.id===id) || bizCustom(bizId,'income').find(x=>x.id===id) ? 'income' : 'expense';
  if(c.custom){
    // remove from the owning business
    const owner = c.bizId || bizId;
    if(S.customCats[owner] && S.customCats[owner][kind]){
      S.customCats[owner][kind] = S.customCats[owner][kind].filter(x=>x.id!==id);
    }
  } else {
    // deactivate built-in for this business only
    if(S.activeCats[bizId] && S.activeCats[bizId][kind]){
      S.activeCats[bizId][kind] = S.activeCats[bizId][kind].filter(x=>x!==id);
    }
  }
  save();
  if(document.getElementById('sb-entry').classList.contains('open')) paintEntry();
  render();
  toast(t('cc.deleted'));
}
// keep renameCat name for backward-compat (entry sheet long-press calls it)
function renameCat(id){ catLongPress(id); }
// current business id in the entry sheet
function entryBizId(){
  return (document.getElementById('en-biz')||{}).value || (S.businesses[0]&&S.businesses[0].id);
}
function saveCat(){
  const name = document.getElementById('cc-name').value.trim();
  if(!name){
    document.getElementById('cc-name').classList.add('err');
    document.getElementById('cc-name-err').classList.add('show');
    return;
  }
  if(!CC_EMOJI){
    const ei=document.getElementById('cc-emoji-input'); if(ei) ei.classList.add('err');
    document.getElementById('cc-emoji-err').classList.add('show');
    return;
  }
  const bizId = entryBizId();
  const list = bizCustom(bizId, EN.kind);
  const c = {id:'c_'+uid(), name, e:CC_EMOJI, dot:CAT_COLOURS[list.length%CAT_COLOURS.length], custom:true, bizId};
  list.push(c);
  EN.cat = c.id;
  save(); closeSheet('cat'); paintEntry();
}
function deleteCustomCat(id){
  Object.keys(S.customCats||{}).forEach(bid=>{
    const bc = S.customCats[bid]; if(!bc) return;
    if(bc.expense) bc.expense = bc.expense.filter(c=>c.id!==id);
    if(bc.income)  bc.income  = bc.income.filter(c=>c.id!==id);
  });
  save(); render();
}
function openFolderSheet(){
  document.getElementById('fd-name').value='';
  document.getElementById('fd-name').classList.remove('err');
  document.getElementById('fd-name-err').classList.remove('show');
  openSheet('folder');
}
function saveFolder(){
  const name = document.getElementById('fd-name').value.trim();
  if(!name){
    document.getElementById('fd-name').classList.add('err');
    document.getElementById('fd-name-err').classList.add('show');
    return;
  }
  const f = TaxMateSync.touch({id:'f_'+uid(),name,recordType:'folder'},DEVICE_ID,Date.now());
  S.folders.push(f); save(); closeSheet('folder');
  if(document.getElementById('sb-entry').classList.contains('open')){ EN.folderId=f.id; paintEntry(); }
  else render();
}
function deleteFolder(id){
  const folder=S.folders.find(f=>f.id===id);
  if(folder) S.folderTombstones.push(TaxMateSync.tombstone(folder,DEVICE_ID,Date.now()));
  S.folders = S.folders.filter(f=>f.id!==id);
  S.entries.forEach(e=>{if(e.folderId===id){e.folderId=null;Object.assign(e,TaxMateSync.touch(e,DEVICE_ID,Date.now()));pushEntryRemote(e);}});
  if(S.expFolder===id) S.expFolder='all';
  save(); render();
}
function setCat(c){ EN.cat=c; paintEntry(); }
function setPct(p){ EN.pct=p; paintEntry(); }
function expandPct(){
  // 撳「部分私人使用」→ 展開 %,預設揀 75%(最常見部分使用)
  EN.pct = 75; paintEntry();
}
function dateToTaxYear(dateStr){
  const d = new Date(dateStr+'T12:00:00');
  const y = d.getFullYear();
  const apr6 = new Date(y,3,6);
  const startY = d >= apr6 ? y : y-1;
  return startY + '-' + String((startY+1)%100).padStart(2,'0');
}
function taxYearRange(y){ const a=parseInt(String(y).slice(0,4)); return {min:a+'-04-06', max:(a+1)+'-04-05'}; }
function checkEntryDate(dateStr){
  const hint = document.getElementById('en-date-hint');
  if(!hint || !dateStr) return;
  const entryYr = dateToTaxYear(dateStr);
  if(entryYr !== S.year){
    hint.textContent = t('f.dateOtherYear',{y:entryYr});
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

function setRepeat(on){
  EN.repeat = on;
  document.getElementById('en-repeat-off').classList.toggle('on', !on);
  document.getElementById('en-repeat-on').classList.toggle('on', on);
  document.getElementById('en-repeat-hint').style.display = on ? 'block' : 'none';
  const fr = document.getElementById('en-repeat-from');
  if(fr){ fr.style.display = on ? 'block' : 'none'; if(on) paintRepeatMonths(); }
}
function paintRepeatMonths(){
  const wrap = document.getElementById('en-repeat-months'); if(!wrap) return;
  const yrS = parseInt(S.year.slice(0,4));
  if(!EN.repeatMonths){
    // default: from the entry's month through end of the tax year
    let start = 0;
    const dv = document.getElementById('en-date').value;
    const src = (dv && dateToTaxYear(dv)===S.year) ? dv : (dateToTaxYear(todayISO())===S.year ? todayISO() : null);
    if(src){ start = (parseInt(src.slice(5,7)) - 4 + 12) % 12; }
    EN.repeatMonths = new Set(); for(let m=start;m<12;m++) EN.repeatMonths.add(m);
  }
  let html='';
  for(let m=0;m<12;m++){
    const mi = (3+m)%12 + 1;
    html += `<button type="button" class="${EN.repeatMonths.has(m)?'on':''}" data-tm-click="toggleRepeatMonth(${m})">${obMonShort(mi)}</button>`;
  }
  wrap.innerHTML = html;
}
function toggleRepeatMonth(m){
  if(!EN.repeatMonths) EN.repeatMonths=new Set();
  if(EN.repeatMonths.has(m)) EN.repeatMonths.delete(m); else EN.repeatMonths.add(m);
  paintRepeatMonths();
}
function recAsk(fn){
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  ov.innerHTML = `<div style="background:var(--card);border-radius:16px;padding:20px;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.3)">
    <div style="font-weight:800;margin-bottom:14px">${t('f.recQ')}</div>
    <button type="button" class="btn" style="width:100%;margin-bottom:8px" id="rec-one">${t('f.recThis')}</button>
    <button type="button" class="btn" style="width:100%;margin-bottom:8px" id="rec-fut">${t('f.recFuture')}</button>
    <button type="button" class="btn ghost" style="width:100%" id="rec-cxl">${t('c.cancel')}</button></div>`;
  document.body.appendChild(ov);
  const done = v => { ov.remove(); if(v) fn(v); };
  ov.querySelector('#rec-one').onclick = ()=>done('one');
  ov.querySelector('#rec-fut').onclick = ()=>done('future');
  ov.querySelector('#rec-cxl').onclick = ()=>done(null);
}
function saveEntry(){
  // 收據仲上載緊 → 唔好即刻儲存，等上載完會自動幫你 save
  if(EN.uploading){
    EN._pendingSave = true;
    const st = document.getElementById('en-receipt-status');
    if(st){ st.textContent = '⏳ ' + t('rc.uploading'); st.style.color='var(--coral)'; st.style.fontWeight='700'; }
    return;
  }
  const amt = parseFloat(document.getElementById('en-amount').value);
  if(!(amt>0) || amt>10000000){
    document.getElementById('en-amount').classList.add('err');
    document.getElementById('en-amount-err').classList.add('show');
    document.getElementById('en-amount').focus();
    return;
  }
  const _de = document.getElementById('en-date');
  let _dv = _de.value;
  if(!_dv){ const _td = todayISO(); _dv = (_de.min && _td<_de.min) ? _de.min : ((_de.max && _td>_de.max) ? _de.max : _td); }
  if((_de.min && _dv<_de.min) || (_de.max && _dv>_de.max)){
    const _h = document.getElementById('en-date-hint');
    if(_h){ _h.textContent = t('f.dateLocked',{y: dateToTaxYear(_de.min)}); _h.style.color='var(--coral)'; _h.style.display='block'; }
    _de.focus();
    return;
  }
  if(!EN.cat){
    const catGrid = document.getElementById('en-cats');
    if(catGrid){
      catGrid.style.outline='2px solid var(--coral)';
      catGrid.style.outlineOffset='4px';
      catGrid.style.borderRadius='12px';
      if(catGrid.scrollIntoView) catGrid.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>{ catGrid.style.outline=''; },2200);
    }
    toast(t('f.catErr'));
    return;
  }
  const existingEntryIndex=EN.id?S.entries.findIndex(entry=>entry.id===EN.id):-1;
  const firstMeaningfulEntry=existingEntryIndex<0&&!S.entries.some(entry=>entry&&(entry.kind==='income'||entry.kind==='expense'));
  const rec = {
    id:EN.id||uid(),
    bizId:document.getElementById('en-biz').value||(S.businesses[0]&&S.businesses[0].id),
    kind:EN.kind,
    date:_dv,
    amount:Math.round(amt*100)/100,
    cat:EN.cat,
    pct:EN.kind==='expense'?EN.pct:null,
    folderId:EN.kind==='expense'?(document.getElementById('en-folder').value||null):null,
    receiptUrl: EN.receiptUrl||null,
    receiptPath: EN.receiptPath||null,
    desc:document.getElementById('en-desc').value.trim()
  };
  const selectedBusiness=bizById(rec.bizId);
  if(selectedBusiness&&selectedBusiness.syncCode&&!hasFeature('partnerSync')){showNotice(t('sy.title'),t('sy.readOnly'));return;}
  Object.assign(rec,TaxMateSync.touch(Object.assign({},rec,{taxYear:dateToTaxYear(_dv),businessId:rec.bizId,source:'user',recordType:'entry'}),DEVICE_ID,Date.now()));
  if(EN.id){
    const i=S.entries.findIndex(x=>x.id===EN.id);
    if(i>-1){
      const orig = S.entries[i];
      rec.createdAt = orig.createdAt || rec.createdAt;
      if(orig.rgid) rec.rgid = orig.rgid;   // keep the monthly-group link
      const commit = (mode)=>{
        S.entries[i]=rec; pushEntryRemote(rec);
        if(mode==='future' && rec.rgid){
          S.entries.forEach(x=>{
            if(x.rgid===rec.rgid && x.id!==rec.id && x.date>orig.date){
              x.amount=rec.amount; x.cat=rec.cat; x.desc=rec.desc; x.pct=rec.pct; x.folderId=rec.folderId;
              Object.assign(x,TaxMateSync.touch(x,DEVICE_ID,Date.now()));
              pushEntryRemote(x);
            }
          });
        }
        save(); closeSheet('entry'); render(); toast(t('toast.saved'));
      };
      if(orig.rgid){ recAsk(commit); } else { commit('one'); }
    } else {
      // EN.id 係由 onReceiptFile 生成嘅，唔係 existing entry → 當新 entry 處理
      S.entries.push(rec);
      save(); pushEntryRemote(rec); closeSheet('entry'); render(); toast(t('toast.saved'));
      schedulePwaInstallSuggestion(firstMeaningfulEntry);
    }
  } else if(EN.repeat && EN.kind==='expense'){
    // Add for all 12 months of the current tax year
    const baseDay = new Date(rec.date+'T12:00:00').getDate();
    const yrStart = parseInt(S.year.slice(0,4));
    const pad = n => String(n).padStart(2,'0');
    let count=0;
    const _range = taxYearRange(S.year);
    const _rgid = uid();
    const months = (EN.repeatMonths && EN.repeatMonths.size) ? [...EN.repeatMonths].sort((a,b)=>a-b) : [];
    // each selected offset maps to a real calendar month within the tax year
    months.forEach(m=>{
      const monthIdx = (3+m) % 12;
      const realYear = (3+m) > 11 ? yrStart+1 : yrStart;
      const daysInMonth = new Date(realYear, monthIdx+1, 0).getDate();
      const day = Math.min(baseDay, daysInMonth);
      const dateStr = realYear+'-'+pad(monthIdx+1)+'-'+pad(day);
      if(dateStr < _range.min || dateStr > _range.max) return;
      const r = Object.assign({}, rec, {id:uid(), date:dateStr, rgid:_rgid});
      S.entries.push(r); pushEntryRemote(r); count++;
    });
    if(!count){ S.entries.push(rec); pushEntryRemote(rec); count=1; } // safety: nothing picked => single entry
    save(); closeSheet('entry'); render(); toast(t('f.repeatAdded',{n:count}));
    schedulePwaInstallSuggestion(firstMeaningfulEntry);
  } else {
    S.entries.push(rec);
    save(); pushEntryRemote(rec); closeSheet('entry'); render(); toast(t('toast.saved'));
    schedulePwaInstallSuggestion(firstMeaningfulEntry);
  }
}
function deleteEntry(){
  const e = S.entries.find(x=>x.id===EN.id);
  const wipe = (mode)=>{
    const doomed = (mode==='future' && e && e.rgid)
      ? S.entries.filter(x=>x.rgid===e.rgid && x.date>=e.date)
      : (e ? [e] : []);
    doomed.forEach(x=>{ const tomb=TaxMateSync.tombstone(x,DEVICE_ID,Date.now()); S.tombstones.push(tomb); pushEntryRemote(tomb); });
    const ids = new Set(doomed.map(x=>x.id));
    S.entries = S.entries.filter(x=>!ids.has(x.id));
    save(); closeSheet('entry'); render();
  };
  if(e && e.rgid){ recAsk(wipe); }
  else confirmAction(t('d.entryT'), t('d.entryM'), ()=>wipe('one'));
}

/* ═══════════ business sheet ═══════════ */
let BZ = {id:null, structure:'sole'};
// suggested-categories feature removed — businesses start empty, users add their own
function paintTrades(){ /* trade selector removed */ }
function openBiz(id,initialStructure){
  // Gate: more than one business needs Plus
  if(!id && S.businesses.length>=1 && lockGuard('multiBiz')) return;
  const b = id?bizById(id):null;
  if(b&&((S.businesses.indexOf(b)>0&&!hasFeature('multiBiz'))||(b.syncCode&&!hasFeature('partnerSync')))){showNotice(t('sec.biz'),b.syncCode?t('sy.readOnly'):t('biz.readOnly'));return;}
  BZ = b ? {id:b.id, structure:b.structure||'sole', pendingCode:null, trade:b.trade||null} : {id:null, structure:initialStructure==='partnership'?'partnership':'sole', pendingCode:null, trade:null};
  document.getElementById('bz-title').textContent = b?t('b.edit'):t('b.add');
  document.getElementById('bz-name').value = b?b.name:'';
  document.getElementById('bz-name').classList.remove('err');
  document.getElementById('bz-name-err').classList.remove('show');
  document.getElementById('bz-share').value = b?(b.share||50):50;
  document.getElementById('bz-delete').style.display = b?'inline':'none';
  paintTrades(); paintStruct(); paintSync(); openSheet('biz');
}
function setStruct(s){ BZ.structure=s; paintStruct(); }
function paintStruct(){
  document.getElementById('bz-s-sole').classList.toggle('on', BZ.structure==='sole');
  document.getElementById('bz-s-part').classList.toggle('on', BZ.structure==='partnership');
  document.getElementById('bz-share-group').style.display = BZ.structure==='partnership'?'block':'none';
  document.getElementById('bz-struct-hint').textContent = BZ.structure==='partnership'?t('b.partHint'):t('b.soleHint');
  // 新生意揀咗 Partnership → 即刻預生成 code
  if(BZ.structure==='partnership' && !BZ.id && !BZ.pendingCode){
    BZ.pendingCode = genCode();
  }
  if(BZ.structure==='sole') BZ.pendingCode = null;
  paintSync();
}
function paintSync(){
  const el = document.getElementById('bz-sync');
  if(!el) return;
  el.innerHTML = '';
  if(BZ.structure!=='partnership') return;
  if(!BZ.id){ el.innerHTML = `<div class="s" style="margin-bottom:10px">💡 ${t('sy.saveFirst')}</div>`; return; }
  const b = bizById(BZ.id); if(!b) return;
  if(!hasFeature('partnerSync')){ el.innerHTML = `<div class="notice amber">🔒 ${t('sy.needPro')}</div>`; return; }
  if(!fbConfigured()){ el.innerHTML = `<div class="notice amber">⚙️ ${t('sy.setup')}</div>`; return; }
  // 新生意:顯示 pendingCode，儲存時自動啟用
  if(!BZ.id && BZ.pendingCode){
    el.innerHTML = `
      <div class="notice green" style="text-align:center">
        <div style="font-size:12px;font-weight:700">🤝 ${t('sy.code')} · Ready to activate</div>
        <div class="num" style="font-size:34px;font-weight:800;letter-spacing:7px;margin:8px 0 6px">${BZ.pendingCode}</div>
        <div style="font-size:12px;opacity:.8">Share this code with your partner — it activates when you save.</div>
      </div>`;
    return;
  }
  if(b && b.syncCode){
    el.innerHTML = `
      <div class="notice green" style="text-align:center">
        <div style="font-size:12px;font-weight:700">${t('sy.code')} · ${t('sy.synced')} ✓</div>
        <div class="num" style="font-size:32px;font-weight:800;letter-spacing:7px;margin:6px 0 10px">${b.syncCode}</div>
        <button class="btn" data-tm-click="invitePartner('${b.id}')">💌 ${t('sy.invite')}</button>
        <div style="margin-top:10px"><button class="link danger" data-tm-click="leaveSync('${b.id}')">${t('sy.leave')}</button></div>
      </div>`;
  } else {
    el.innerHTML = `<button class="btn ink" style="margin-bottom:12px" data-tm-click="enableSync('${BZ.id}')">🤝 ${t('sy.enable')}</button>`;
  }
}
function saveBiz(){
  const name = document.getElementById('bz-name').value.trim();
  if(!name){
    document.getElementById('bz-name').classList.add('err');
    document.getElementById('bz-name-err').classList.add('show');
    return;
  }
  let share = parseInt(document.getElementById('bz-share').value,10);
  if(!(share>=1&&share<=100)) share=50;
  let newId = null;
  const firstMeaningfulBusiness=!BZ.id&&S.businesses.length===0;
  if(BZ.id){
    const b = bizById(BZ.id);
    b.name=name; b.structure=BZ.structure; b.share=BZ.structure==='partnership'?share:100;
    Object.assign(b,TaxMateSync.touch(b,DEVICE_ID,Date.now()));
    pushBizRemote(b);
  } else {
    newId = uid();
    const newBiz = TaxMateSync.touch({id:newId,name,structure:BZ.structure,share:BZ.structure==='partnership'?share:100,recordType:'business'},DEVICE_ID,Date.now());
    // New business: seed a few universal defaults so the entry screen isn't blank.
    // These are built-in categories (not custom) — user can remove or add freely.
    S.customCats[newId] = {income:[],expense:[]};
    S.activeCats[newId] = {income:['sales'], expense:['vehicle','phone','home','other']};
    S.businesses.push(newBiz);
    trackEvent('business_created');
  }
  save(); closeSheet('biz'); render(); toast(t('toast.saved'));
  schedulePwaInstallSuggestion(firstMeaningfulBusiness);
  if(newId&&BZ.pendingCode&&hasFeature('partnerSync')&&fbConfigured()){
    enableSync(newId,BZ.pendingCode);
  } else if(newId && BZ.structure==='partnership'){
    // Pro 未開或無 Firebase:儲存後重開 sheet 讓用家見到 sync 掣
    setTimeout(()=>openBiz(newId), 260);
  }
}
function deleteBiz(){
  confirmAction(t('d.bizT'), t('d.bizM'), ()=>{
    const business=bizById(BZ.id);
    const doomed=S.entries.filter(e=>e.bizId===BZ.id);
    doomed.forEach(e=>{const tomb=TaxMateSync.tombstone(e,DEVICE_ID,Date.now());S.tombstones.push(tomb);pushEntryRemote(tomb);});
    if(business) S.businessTombstones.push(TaxMateSync.tombstone(business,DEVICE_ID,Date.now()));
    S.entries = S.entries.filter(e=>e.bizId!==BZ.id);
    S.businesses = S.businesses.filter(b=>b.id!==BZ.id);
    delete S.customCats[BZ.id];
    delete S.activeCats[BZ.id];
    if(S.incFilter===BZ.id) S.incFilter='all';
    if(S.expFilter===BZ.id) S.expFilter='all';
    save(); closeSheet('biz'); render();
  });
}

/* ═══════════ HMRC position sheet ═══════════ */
function openAdj(){
  const d = yd();
  document.getElementById('adj-poa').value = d.poaPaid||'';
  document.getElementById('adj-prior').value = d.priorAdj||'';
  document.getElementById('adj-poa-outside').value = d.poaOutsidePercent||'';
  document.getElementById('adj-property').value = d.grossPropertyIncome||'';
  document.getElementById('adj-property-complete').checked = d.propertyIncomeComplete===true;
  openSheet('adj');
}
function saveAdj(){
  const d = yd();
  d.poaPaid = Math.max(0, parseFloat(document.getElementById('adj-poa').value)||0);
  d.priorAdj = parseFloat(document.getElementById('adj-prior').value)||0;
  d.poaOutsidePercent = Math.min(100,Math.max(0,parseFloat(document.getElementById('adj-poa-outside').value)||0));
  d.grossPropertyIncome = Math.max(0,parseFloat(document.getElementById('adj-property').value)||0);
  d.propertyIncomeComplete = document.getElementById('adj-property-complete').checked===true;
  save(); closeSheet('adj'); render();
}

/* ═══════════ confirm / sheets ═══════════ */
function confirmAction(title,msg,fn){
  document.getElementById('cf-title').textContent = title;
  document.getElementById('cf-msg').textContent = msg;
  document.getElementById('cf-yes').onclick = ()=>{ closeSheet('confirm'); fn(); };
  openSheet('confirm');
}
function showNotice(title,msg,copyText=''){
  document.getElementById('notice-title').textContent=title||'TaxMate';
  document.getElementById('notice-message').textContent=msg||'';
  const wrap=document.getElementById('notice-copy-wrap'),field=document.getElementById('notice-copy');
  wrap.style.display=copyText?'block':'none';field.value=copyText||'';openSheet('notice');
}
async function copyNoticeText(){
  const field=document.getElementById('notice-copy');
  try{await navigator.clipboard.writeText(field.value);toast(t('sy.copied'));}
  catch(_){field.focus();field.select();field.setSelectionRange(0,field.value.length);}
}
async function deleteCloudData(){
  // GDPR erasure: wipe this user's cloud data (Firestore meta + entries, Storage receipts)
  if(!fbConfigured() || !FB.ready){ return false; }
  const u = (firebase.auth().currentUser);
  if(!u) return false;
  const uid = u.uid;
  try{
    // 1. delete all entries (subcollection) in batches
    const entSnap = await FB.db.collection('users').doc(uid).collection('entries').get();
    let batch = FB.db.batch(); let n=0;
    for(const d of entSnap.docs){
      batch.delete(d.ref); n++;
      if(n%400===0){ await batch.commit(); batch = FB.db.batch(); }
    }
    await batch.commit();
    // 2. delete meta doc
    try{ await FB.db.collection('users').doc(uid).collection('app').doc('meta').delete(); }catch(e){}
    // 3. delete receipt photos in Storage (one per entry id we know about)
    try{
      const stor = firebase.storage();
      for(const e of (S.entries||[])){
        try{ await stor.ref(`receipts/${uid}/${e.id}.jpg`).delete(); }catch(_){}
      }
    }catch(e){}
    return true;
  }catch(err){ console.warn('cloud delete failed', err); return false; }
}

async function eraseEverything(){
  // Stop sync listeners so deletions don't get re-synced
  try{ if(CLOUD.metaUnsub) CLOUD.metaUnsub(); }catch(e){}
  try{ if(CLOUD.entUnsub) CLOUD.entUnsub(); }catch(e){}
  CLOUD.metaUnsub = null; CLOUD.entUnsub = null;
  toast(t('m.erasing'));
  const accountUser=cloudUser();
  let cloudOk=false;
  if(accountUser){ try{ await callSecureFunction('deleteAccountData',{}); cloudOk=true; }catch(e){ cloudOk=false; } }
  else cloudOk=await deleteCloudData();
  // Local wipe includes hidden recovery/cache identifiers as well as visible state.
  clearLocalTaxMateData();
  // Delete the Auth identity only after server-side data cleanup succeeds.
  try{ if(cloudOk&&accountUser) await accountUser.delete(); else if(fbConfigured()&&firebase.auth().currentUser) await firebase.auth().signOut(); }catch(e){}
  S = JSON.parse(JSON.stringify(DEFAULT_STATE));
  S.tab='more';
  render();
  setTimeout(()=>showNotice(t('m.danger'),cloudOk?t('m.erasedAll'):t('m.erasedLocal')),200);
}

function resetAll(){
  clearLocalTaxMateData();
  S = JSON.parse(JSON.stringify(DEFAULT_STATE));
  render();
}
function clearLocalTaxMateData(){
  try{if(window.TaxMateAnalytics)TaxMateAnalytics.setConsent(false);}catch(_){}
  [STORE_KEY,DEVICE_KEY,'taxmateuk_entitlement_cache','taxmateuk_preimport_backup','taxmateuk_analytics_consent','tmOnboardDone','tmWasSignedIn',RATES_CACHE_KEY].forEach(key=>{try{localStorage.removeItem(key);}catch(_){}});
}
function sheetSnapshot(sheetEl){
  if(!sheetEl) return '';
  return Array.from(sheetEl.querySelectorAll('input,select,textarea')).map(f=>{
    if(f.type==='file') return '';
    if(f.type==='checkbox'||f.type==='radio') return f.checked?'1':'0';
    return f.value||'';
  }).join('\u0001');
}
let sheetOpener=null;
function openSheet(id){ const el=document.getElementById('sb-'+id); sheetOpener=document.activeElement; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.classList.add('open'); document.body.classList.add('sheet-open'); setTimeout(()=>{initSheetDrag(); const target=el.querySelector('input:not([type=hidden]),select,textarea,button,[href]'); if(target) target.focus();},50); const sh=el.querySelector('.sheet'); if(sh) sh.dataset.snap=sheetSnapshot(sh); history.pushState({tm:'sheet'}, ''); }
function closeParentSheet(el){
  const sb = el.closest('.sb');
  if(sb){ sb.classList.remove('open'); document.body.classList.remove('sheet-open'); setTimeout(maybeOpenPendingPwaSuggestion,0); }
}
// Drag-to-dismiss on grab handles
function initSheetDrag(){
  document.querySelectorAll('.sheet').forEach(sheet=>{
    const grab = sheet.querySelector('.grab');
    if(!grab || grab.dataset.dragInit) return;
    grab.dataset.dragInit='1';
    let startY=0, curY=0, dragging=false;
    const onStart=e=>{ dragging=true; startY=(e.touches?e.touches[0].clientY:e.clientY); sheet.style.transition='none'; };
    const onMove=e=>{ if(!dragging)return; curY=(e.touches?e.touches[0].clientY:e.clientY); const dy=Math.max(0,curY-startY); sheet.style.transform='translateY('+dy+'px)'; };
    const onEnd=()=>{ if(!dragging)return; dragging=false; sheet.style.transition=''; const dy=curY-startY; if(dy>100){ const sb=sheet.closest('.sb'); if(sb){sb.classList.remove('open');document.body.classList.remove('sheet-open');setTimeout(maybeOpenPendingPwaSuggestion,0);} } sheet.style.transform=''; };
    grab.addEventListener('touchstart',onStart,{passive:true});
    grab.addEventListener('touchmove',onMove,{passive:true});
    grab.addEventListener('touchend',onEnd);
    grab.addEventListener('mousedown',onStart);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onEnd);
  });
}
function closeSheet(id){ document.getElementById('sb-'+id).classList.remove('open'); document.body.classList.remove('sheet-open'); if(sheetOpener&&sheetOpener.focus)sheetOpener.focus(); setTimeout(maybeOpenPendingPwaSuggestion,0); }

/* Toast feedback */
let _toastTimer=null;
function toast(msg){
  let el = document.getElementById('taxmate-toast');
  if(!el){
    el = document.createElement('div');
    el.id='taxmate-toast'; el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>el.classList.remove('show'), 2000);
}
/* Sheet 只可以用 Cancel 掣或 back 關閉，撳 overlay 唔會關 */

/* ═══════════ export / import ═══════════ */
function exportJSON(){
  if(!ltdBackupAllowed('portable_backup'))return;
  trackEvent('backup_exported');
  // GDPR data portability: structured, machine-readable export of the user's own data
  const u = (fbConfigured() && FB.ready && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
  const receipts=(S.entries||[]).filter(e=>e.receiptPath||e.receiptUrl).map(e=>({entryId:e.id,path:e.receiptPath||null,urlReference:!!e.receiptUrl}));
  const payload = TaxMateState.createExport(S,{appVersion:TaxMateCore.VERSIONS.APP_VERSION,buildId:TaxMateCore.VERSIONS.BUILD_ID,deviceId:DEVICE_ID,account:u?(u.email||u.uid):'local-only'},receipts);
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'taxmate-backup-'+todayISO()+'.json';
  a.click(); URL.revokeObjectURL(a.href);
}
function downloadBackupBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);}
async function receiptBytesFromUrl(url){const response=await fetch(url);if(!response.ok)throw new Error('A receipt could not be downloaded');return{bytes:new Uint8Array(await response.arrayBuffer()),mimeType:(response.headers.get('content-type')||'image/jpeg').split(';')[0]};}
async function collectPortableReceipts(){
  const result=[],seen=new Set(),byPath=new Map();for(const item of TaxMateCompanyEvidence.requiredReceiptAssociations(S)){const list=byPath.get(item.originalPath)||[];list.push(item);byPath.set(item.originalPath,list);}for(const entry of S.entries||[]){const source=entry.receiptPath||entry.receiptUrl;if(!source)continue;const list=byPath.get(source)||[];list.push({recordType:'legacy_entry',recordId:entry.id,originalPath:source});byPath.set(source,list);}const linkedPaths=new Set(byPath.keys());
  for(const [source,associations] of byPath){let url=/^https?:\/\//i.test(source)?source:null;if(!url){if(!fbConfigured()||!firebase.auth().currentUser)throw new Error('Sign in and connect to the internet to back up cloud receipts and Ltd evidence');url=await firebase.storage().ref(source).getDownloadURL();}if(!url)throw new Error('Receipt is referenced but unavailable');const binary=await receiptBytesFromUrl(url),legacy=associations.filter(item=>item.recordType==='legacy_entry');result.push({entryId:associations.length===1&&legacy.length===1?legacy[0].recordId:null,originalPath:source,associations,...binary});if(!/^https?:\/\//i.test(source))seen.add(source);}
  if(fbConfigured()&&FB.ready&&firebase.auth().currentUser){const uid=firebase.auth().currentUser.uid,listing=await firebase.storage().ref('receipts/'+uid).listAll();for(const item of listing.items){if(seen.has(item.fullPath)||linkedPaths.has(item.fullPath))continue;const binary=await receiptBytesFromUrl(await item.getDownloadURL());result.push({entryId:null,originalPath:item.fullPath,...binary});}}
  return result;
}
async function buildPortableArchive(state=S){if(state===S&&!ltdBackupAllowed('full_backup',state))throw Object.assign(new Error('pro_required'),{code:'pro_required'});const receipts=state===S?await collectPortableReceipts():[];return TaxMatePortableBackup.createArchive({state,identity:{appVersion:TaxMateCore.VERSIONS.APP_VERSION,buildId:TaxMateCore.VERSIONS.BUILD_ID,deviceId:DEVICE_ID},receipts});}
async function exportPortableBackup(){if(!ltdBackupAllowed('full_backup'))return;try{const out=await buildPortableArchive();downloadBackupBlob(out.archive,'taxmate-full-backup-'+todayISO()+'.zip');trackEvent('backup_exported');toast('Full backup downloaded');}catch(error){console.error(error);showNotice(t('m.backup'),"A full backup couldn't be created. Your data was not changed.");}}
function replaceStateSafely(candidate){const before=JSON.stringify(S);try{localStorage.setItem('taxmateuk_preimport_backup',before);S=Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)),candidate);S.settings=Object.assign({lang:'en',tier:'free'},candidate.settings||{});save();render();toast(t('toast.restored'));}catch(error){S=JSON.parse(before);try{localStorage.setItem(STORE_KEY,before);}catch(_){}throw error;}}
async function restorePortableBackup(inspected){
  const needsStorage=inspected.receipts.length>0;if(needsStorage&&(!fbConfigured()||!FB.ready||!firebase.auth().currentUser))throw new Error('Sign in before restoring receipt files');
  const pre=await buildPortableArchive();downloadBackupBlob(pre.archive,'taxmate-pre-restore-'+todayISO()+'.zip');
  let candidate=JSON.parse(JSON.stringify(inspected.state));const uploaded=[];
  try{if(needsStorage){const uid=firebase.auth().currentUser.uid;for(let i=0;i<inspected.receipts.length;i++){const receipt=inspected.receipts[i],ext=(receipt.archivePath.split('.').pop()||'bin').toLowerCase(),entry=receipt.entryId&&candidate.entries.find(e=>e.id===receipt.entryId),name=entry?`restore-${inspected.metadata.backupId}-${entry.id}`:`evidence-${inspected.metadata.backupId}-${i}`,path=`receipts/${uid}/${name}.${ext}`,ref=firebase.storage().ref(path),blob=new Blob([receipt.bytes],{type:receipt.mimeType});await ref.put(blob,{contentType:receipt.mimeType});uploaded.push(path);if(entry){entry.receiptPath=path;entry.receiptUrl=await ref.getDownloadURL();}for(const association of receipt.associations||[])if(association.recordType!=='legacy_entry')candidate=TaxMateCompanyEvidence.replaceReceiptReference(candidate,association,path);}}replaceStateSafely(candidate);}catch(error){await Promise.all(uploaded.map(path=>firebase.storage().ref(path).delete().catch(()=>{})));throw error;}
}
function importBackupFile(ev){
  const file=ev.target.files[0];ev.target.value='';if(!file)return;
  (async()=>{try{if(file.name.toLowerCase().endsWith('.json')){const candidate=TaxMateState.importBackup(JSON.parse(await file.text()),Date.now(),DEVICE_ID);if(!ltdBackupAllowed('restore',candidate))return;confirmAction(t('r.title'),t('r.msg')+'\n\n'+candidate.businesses.length+' business(es), '+candidate.entries.length+' record(s). Receipt image binaries are not included in JSON backups.',()=>{try{replaceStateSafely(candidate);}catch(_){showNotice(t('r.title'),t('r.bad'));}});return;}const inspected=await TaxMatePortableBackup.inspectArchive(await file.arrayBuffer());if(!ltdBackupAllowed('restore',inspected.state))return;if(inspected.receipts.length&&!hasFeature('receiptPhoto')){lockGuard('receiptPhoto');return;}const p=inspected.preview,msg=`Restore ${p.businesses} business(es), ${p.entries} record(s), ${p.receipts} linked receipt(s) and ${p.orphans} orphan receipt file(s)?\n\nA complete pre-restore ZIP will download first. Nothing is replaced unless every receipt validates and uploads successfully.`;confirmAction(t('r.title'),msg,async()=>{try{await restorePortableBackup(inspected);}catch(error){console.error(error);showNotice(t('r.title'),'Restore stopped safely. Your existing data was not changed.');}});}catch(error){console.error(error);showNotice(t('r.title'),t('r.bad'));}})();
}

/* ═══════════ Firebase partner sync ═══════════ */
// Hosting build injects the project-specific Firebase environment before this runtime loads.
// Missing or wrong-host config keeps cloud features disabled while local bookkeeping remains available.
const FIREBASE_ENVIRONMENT = window.TAXMATE_FIREBASE_ENVIRONMENT || {};
const FIREBASE_CONFIG = FIREBASE_ENVIRONMENT.firebaseConfig || {};
const FIREBASE_APPCHECK_KEY = FIREBASE_ENVIRONMENT.appCheckKey || '';
const FIREBASE_HOSTS = new Set(FIREBASE_ENVIRONMENT.hosts || []);

let FB = { db:null, uid:null, ready:false, subs:{} };
function fbConfigured(){ return (typeof firebase!=='undefined') && !!FIREBASE_CONFIG.apiKey && FIREBASE_HOSTS.has(location.hostname); }
async function ensureFB(){
  if(!fbConfigured()) return null;
  if(FB.ready) return FB.db;
  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    // App Check — reCAPTCHA Enterprise token source. Callable Functions enforce valid tokens server-side.
    try{
      const appCheck = firebase.appCheck();
      appCheck.activate(
        new firebase.appCheck.ReCaptchaEnterpriseProvider(FIREBASE_APPCHECK_KEY),
        true // auto-refresh token
      );
    }catch(e){ console.warn('AppCheck init', e); }
    // Keep the user signed in across sessions / browser restarts
    try{ await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){ console.warn('persistence', e); }
    FB.db = firebase.firestore();
    try{ await FB.db.enablePersistence({synchronizeTabs:true}); }catch(e){}
    FB.ready = true;
    watchAuth();
    return FB.db;
  }catch(e){ console.warn('Sync init failed', e); return null; }
}
async function ensureAuth(){
  const db = await ensureFB(); if(!db) return null;
  const cur = firebase.auth().currentUser;
  if(cur) return cur;
  try{ const cred = await firebase.auth().signInAnonymously(); FB.uid = cred.user.uid; return cred.user; }
  catch(e){ console.warn(e); return null; }
}
function genCode(){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for(let i=0;i<8;i++) c += A[Math.floor(Math.random()*A.length)];
  return c;
}
async function enableSync(bizId,requestedCode){
  const b = bizById(bizId); if(!b) return;
  if(lockGuard('partnerSync')||!requireLoginForTier())return;
  const db = await ensureFB();
  if(!db){ showNotice(t('sy.title'),t(fbConfigured()?'sy.needNet':'sy.setup')); return; }
  const u = await ensureAuth();
  if(!u){ showNotice(t('sy.title'),t('sy.needNet')); return; }
  let code=requestedCode||genCode();
  try{
    try{await callSecureFunction('createPartnership',{code,bizId:b.id,name:b.name});}
    catch(error){if(error.code!=='ALREADY_EXISTS'||requestedCode)throw error;code=genCode();await callSecureFunction('createPartnership',{code,bizId:b.id,name:b.name});}
    b.syncCode=code;Object.assign(b,TaxMateSync.touch(b,DEVICE_ID,Date.now()));
    S.entries.filter(e=>e.bizId===b.id).forEach(pushEntryRemote);
    pushBizRemote(b);save();
    await flushSyncOutbox('enable-partnership');
    await subscribeSync(code, b.id);
    paintSync(); render();
  }catch(e){ console.warn(e); showNotice(t('sy.title'),e&&e.code==='PERMISSION_DENIED'?t('sy.needPro'):t('sy.needNet')); }
}
function subscribeSync(code, bizId){
  if(FB.subs[code]) return FB.subs[code].ready||Promise.resolve({code,bizId,reused:true});
  let resolveReady,rejectReady;
  const subscription={code,bizId,unsubs:[],businessReady:false,entriesReady:false,settled:false,ready:new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;})};
  FB.subs[code]=subscription;
  const finish=()=>{
    if(subscription.settled||!subscription.businessReady||!subscription.entriesReady)return;
    subscription.settled=true;resolveReady({code,bizId,entries:subscription.entryCount||0});
  };
  const fail=error=>{
    handleSyncListenerError(error);
    if(!subscription.settled){subscription.settled=true;rejectReady(error instanceof Error?error:new Error(String(error||'partnership-sync-failed')));}
  };
  ensureAuth().then(u=>{
    const db = FB.db;
    if(!u || !db)throw new Error('partnership-auth-unavailable');
    subscription.unsubs.push(db.collection('partnerships').doc(code).onSnapshot(doc=>{
      const d = doc.data();
      if(!d){fail(new Error('partnership-not-found'));return;}
      const b = bizById(bizId);
      const remoteVersion={updatedAt:d.businessUpdatedAt,deviceId:d.businessDeviceId};
      if(b&&d.name&&TaxMateSync.compare(b,remoteVersion)<0){
        b.name=d.name;b.updatedAt=remoteVersion.updatedAt;b.deviceId=remoteVersion.deviceId;persistRemoteState();render();
      }
      subscription.businessReady=true;finish();
    }, fail));
    subscription.unsubs.push(db.collection('partnerships').doc(code).collection('entries').onSnapshot(snap=>{
      const remote = [];
      snap.forEach(x=>remote.push(x.data()));
      const current=S.entries.filter(e=>e.bizId===bizId).concat((S.tombstones||[]).filter(e=>e.bizId===bizId));
      const reconciliation=TaxMateSync.reconcileRecords(current,remote),merged=reconciliation.merged;
      S.entries=S.entries.filter(e=>e.bizId!==bizId).concat(TaxMateSync.visible(merged));
      S.tombstones=(S.tombstones||[]).filter(e=>e.bizId!==bizId).concat(merged.filter(e=>e.deletedAt!=null));
      persistRemoteState();render();
      const owner=cloudUser();
      reconciliation.uploads.forEach(record=>enqueueSyncOperation({kind:'partnership-entry',ownerUid:owner&&owner.uid||null,code,bizId,record,updatedAt:record.updatedAt,deviceId:record.deviceId}));
      subscription.entryCount=remote.length;subscription.reconciliationCount=reconciliation.uploads.length;subscription.entriesReady=true;finish();
      if(reconciliation.uploads.length&&CLOUD.hydrationState!=='loading')scheduleOutboxFlush(0,'partnership-reconciliation');
    }, fail));
  }).catch(fail);
  return subscription.ready;
}
function openJoinPartnership(){
  if(lockGuard('partnerSync')||!requireLoginForTier())return;
  const input=document.getElementById('join-code'),msg=document.getElementById('join-msg');input.value='';msg.textContent='';msg.classList.remove('show');openSheet('partner');
}
async function joinPartnership(){
  const input = document.getElementById('join-code');
  const msg = document.getElementById('join-msg');
  const code = (input && input.value || '').trim().toUpperCase();
  // Code 由 6 位升級到 8 位；接受兩者（8=新，6=舊兼容）
  const fail=message=>{if(msg){msg.textContent=message;msg.classList.add('show');}};
  if(code.length !== 6 && code.length !== 8){fail(t('sy.enterCode'));return;}
  if(!hasFeature('partnerSync')){fail(t('sy.needPro'));return;}
  const db = await ensureFB();
  if(!db){fail(t(fbConfigured()?'sy.needNet':'sy.setup'));return;}
  const u = await ensureAuth();
  if(!u){fail(t('sy.needNet'));return;}
  try{
    const joined=await callSecureFunction('joinPartnership',{code});
    const existing = bizById(joined.bizId);
    if(!existing) S.businesses.push(TaxMateSync.touch({id:joined.bizId,name:joined.name,structure:'partnership',share:50,syncCode:code,recordType:'business'},DEVICE_ID,Date.now()));
    else{existing.syncCode=code;Object.assign(existing,TaxMateSync.touch(existing,DEVICE_ID,Date.now()));}
    save();
    await subscribeSync(code, joined.bizId);
    closeSheet('partner');render();toast(t('sy.synced'));
  }catch(e){console.warn(e);fail(e&&e.code==='NOT_FOUND'?t('sy.badCode'):e&&e.code==='PERMISSION_DENIED'?t('sy.needPro'):t('sy.needNet'));}
}
async function leaveSync(bizId){
  const b = bizById(bizId); if(!b || !b.syncCode) return;
  const code=b.syncCode;
  try{await callSecureFunction('leavePartnership',{code});}
  catch(e){console.warn(e);showNotice(t('sy.title'),t('sy.needNet'));return;}
  const subs = FB.subs[code],unsubs=Array.isArray(subs)?subs:(subs&&Array.isArray(subs.unsubs)?subs.unsubs:[]);
  unsubs.forEach(u=>{ try{u();}catch(e){} });
  delete FB.subs[code];
  delete b.syncCode;Object.assign(b,TaxMateSync.touch(b,DEVICE_ID,Date.now()));
  save(); paintSync(); render();
}
function invitePartner(bizId){
  const b = bizById(bizId); if(!b || !b.syncCode) return;
  const text = t('sy.inviteMsg',{n:b.name, c:b.syncCode}) + '\n' + location.href.split('#')[0];
  if(navigator.share){ navigator.share({text}).catch(()=>{}); }
  else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>toast(t('sy.copied'))).catch(()=>showNotice(t('sy.code'),t('sy.invite'),text));}
  else showNotice(t('sy.code'),t('sy.invite'),text);
}
function pushEntryRemote(rec){
  const b = bizById(rec.bizId);
  if(!b || !b.syncCode) return;
  const ready=TaxMateSync.touch(Object.assign({},rec,{businessId:rec.businessId||rec.bizId,recordType:'entry'}),rec.deviceId||DEVICE_ID,rec.updatedAt||Date.now());
  if(rec.deletedAt!=null){ ready.deletedAt=rec.deletedAt; ready.updatedAt=rec.updatedAt; }
  const owner=cloudUser();
  enqueueSyncOperation({kind:'partnership-entry',ownerUid:owner&&owner.uid||null,code:b.syncCode,bizId:b.id,record:ready,updatedAt:ready.updatedAt,deviceId:ready.deviceId});
  scheduleOutboxFlush(0,'partnership-entry');
}
function deleteEntryRemote(bizId, id){
  const b = bizById(bizId);
  if(!b || !b.syncCode || !FB.ready) return;
  const old=S.entries.find(e=>e.id===id)||{id,bizId,businessId:bizId,recordType:'entry'};
  pushEntryRemote(TaxMateSync.tombstone(old,DEVICE_ID,Date.now()));
}
function pushBizRemote(b){
  if(!b || !b.syncCode) return;
  const ready=TaxMateSync.touch(Object.assign({},b,{recordType:'business'}),b.deviceId||DEVICE_ID,b.updatedAt||Date.now());
  const owner=cloudUser();
  enqueueSyncOperation({kind:'partnership-business',ownerUid:owner&&owner.uid||null,code:b.syncCode,bizId:b.id,record:ready,updatedAt:ready.updatedAt,deviceId:ready.deviceId});
  scheduleOutboxFlush(0,'partnership-business');
}

/* ═══════════ Account & personal cloud sync ═══════════ */
const SYNC_OUTBOX_KEY='taxmateuk_sync_outbox_v1';
function loadSyncOutbox(){try{return TaxMateSync.normalizeOutbox(JSON.parse(localStorage.getItem(SYNC_OUTBOX_KEY)||'null'));}catch(_){return TaxMateSync.emptyOutbox();}}
let SYNC_OUTBOX=loadSyncOutbox();
let CLOUD = { metaUnsub:null, entUnsub:null, ltdUnsubs:[], ltdRemote:[], ltdAnchor:null, applying:false, pushTimer:null, retryTimer:null, hydrationRetryTimer:null, flushPromise:null, lastPushed:'', localEditAt:0, hydrationState:'idle', partnershipHydrationState:'idle', reconciliationState:'idle', ackState:'idle', hydrationError:null, inboundError:null, writeError:null, writeErrorKind:null, hydrationUid:null, hydrationPromise:null, hydrationResult:null, generation:0 };
function persistSyncOutbox(){
  try{localStorage.setItem(SYNC_OUTBOX_KEY,JSON.stringify(SYNC_OUTBOX));return true;}
  catch(e){CLOUD.writeError='outbox-storage';CLOUD.writeErrorKind='outbox';console.warn('sync outbox persistence failed',e);renderSyncStatus();return false;}
}
function enqueueSyncOperation(operation){SYNC_OUTBOX=TaxMateSync.enqueue(loadSyncOutbox(),operation,Date.now());persistSyncOutbox();renderSyncStatus();}
function syncStatus(){
  const user=cloudUser(),box=TaxMateSync.normalizeOutbox(SYNC_OUTBOX);
  if(user) box.items=box.items.filter(operation=>(operation.kind!=='personal-state'||operation.uid===user.uid)&&(!operation.ownerUid||operation.ownerUid===user.uid));
  return TaxMateSync.status({outbox:box,online:typeof navigator==='undefined'||navigator.onLine!==false,authReady:!!user&&FB.ready,hydrationState:CLOUD.hydrationState,partnershipHydrationState:CLOUD.partnershipHydrationState,reconciliationState:CLOUD.reconciliationState,ackState:CLOUD.ackState,hydrationError:CLOUD.hydrationError,inboundError:CLOUD.inboundError,writeError:CLOUD.writeError,writeErrorKind:CLOUD.writeErrorKind});
}
function renderSyncStatus(){
  const current=syncStatus(),col=current.state==='synced'?'var(--brand)':current.state==='failed'?'var(--coral)':'var(--muted)';
  const elements=Array.from(document.querySelectorAll('#cloud-sync-status,[data-cloud-sync-status]'));
  elements.forEach(el=>{el.textContent=current.message;el.style.color=col;el.dataset.state=current.state;});
}
function scheduleOutboxFlush(delay,reason){
  clearTimeout(CLOUD.retryTimer);
  CLOUD.retryTimer=setTimeout(()=>flushSyncOutbox(reason||'scheduled'),Math.max(0,Number(delay)||0));
}
function cloudUser(){
  try{
    if(typeof firebase==='undefined' || !firebase.apps || !firebase.apps.length) return null;
    const u = firebase.auth().currentUser;
    return (u && !u.isAnonymous) ? u : null;
  }catch(e){ return null; }
}
function onboardingDoneFlag(){try{return localStorage.getItem('tmOnboardDone');}catch(e){return null;}}
function applyHydratedAccountResult(result){
  if(!result||result.state!=='converged')return;
  if(result.existingCloudAccount){
    const exitingOnboarding=!!OB;
    if(exitingOnboarding){OB._signingInFlow=false;try{obClose();}catch(e){}S.tab='home';}
    render();return;
  }
  if(!OB&&!S.businesses.length&&!onboardingDoneFlag())startOnboarding();
}
function watchAuth(){
  if(watchAuth.done) return; watchAuth.done = true;
  firebase.auth().onAuthStateChanged(async u=>{
    if(u && !u.isAnonymous){
      try{ localStorage.setItem('tmWasSignedIn','1'); }catch(e){}
      // Signing in is not enough to classify somebody as new. Keep onboarding pending until
      // the existing account's meta, personal records and partnership snapshots converge.
      const result=await startUserSync(u);
      applyHydratedAccountResult(result);
    } else {
      try{ localStorage.removeItem('tmWasSignedIn'); }catch(e){}
      stopUserSync();
    }
    render();
  });
}
async function signIn(){
  const db = await ensureFB();
  if(!db){ showNotice(t('ac.title'),t(fbConfigured()?'ac.needNet':'sy.setup')); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  // 每次登入都畀用戶揀 Google 戶口（唔會自動入返上次嗰個）
  provider.setCustomParameters({ prompt: 'select_account' });
  try{
    const cur = firebase.auth().currentUser;
    // 如果係匿名 session，先記低佢嘅本機資料，登入後合併（唔再用 linkWithPopup —— 嗰個會喺 OAuth handler 爆白畫面）
    if(cur && cur.isAnonymous){
      try{ await firebase.auth().signOut(); }catch(_){}
    }
    const credential=await firebase.auth().signInWithPopup(provider);
    return credential&&credential.user||firebase.auth().currentUser;
  }catch(e){
    if(e && (e.code==='auth/popup-closed-by-user' || e.code==='auth/cancelled-popup-request')) return;
    console.warn(e);showNotice(t('ac.title'),t('ac.err'));
    return null;
  }
}
function doSignOut(){
  stopUserSync();
  try{ firebase.auth().signOut(); }catch(e){}
  render();
}
function userRoot(uid){ return FB.db.collection('users').doc(uid); }
function ltdCollectionRef(uid,collection){return userRoot(uid).collection('ltd').doc('v1').collection(collection);}
function normaliseLtdAnchor(value){if(!value)return null;if(value.schemaVersion!==1||value.status!=='active_slot_claimed'||typeof value.activeCompanyId!=='string'||!value.activeCompanyId)throw Object.assign(new Error('ltd-anchor-invalid'),{code:'ltd-anchor-invalid'});return{schemaVersion:1,status:value.status,activeCompanyId:value.activeCompanyId,releasePolicy:value.releasePolicy||null};}
function validateLtdAnchorConsistency(anchor,envelopes){const ids=new Set((envelopes||[]).map(item=>item.companyId)),localIds=new Set((S.domain&&S.domain.entities||[]).filter(item=>item.type==='limited_company'&&item.deletedAt==null).map(item=>item.id));if((ids.size||localIds.size)&&!anchor)throw Object.assign(new Error('ltd-anchor-missing'),{code:'ltd-anchor-missing'});if(anchor&&[...ids,...localIds].some(id=>id!==anchor.activeCompanyId))throw Object.assign(new Error('ltd-anchor-mismatch'),{code:'ltd-anchor-mismatch'});return true;}
function setLtdRemote(envelopes){CLOUD.ltdRemote=envelopes.slice().sort((a,b)=>String(a.collection).localeCompare(String(b.collection))||String(a.recordId).localeCompare(String(b.recordId)));}
function reconcileLtdState(uid,envelopes,{queue=true}={}){
  const hydrate=ltdAccessDecision('cloud_hydrate'),write=ltdAccessDecision('cloud_sync');
  if(!hydrate.allowed)return{uploads:[],downloads:[],conflicts:[],blocked:'pro_required'};
  const result=TaxMateLtdSync.reconcile(S,envelopes,uid);if(result.conflicts.length)throw Object.assign(new Error('ltd-sync-conflict'),{code:'ltd-sync-conflict',conflicts:result.conflicts});
  if(result.downloads.length){const next=TaxMateLtdSync.applyDownloads(S,result.downloads);S=TaxMateState.migrate(next,Date.now(),DEVICE_ID);TaxMateState.validateState(S);persistCanonicalState(S);}
  if(queue&&write.allowed)result.uploads.forEach(operation=>enqueueSyncOperation({...operation,ownerUid:uid}));
  return{...result,uploads:write.allowed?result.uploads:[],retainedLocalOnlyUploads:write.allowed?0:result.uploads.length,readOnly:!write.allowed};
}
async function readLtdCloud(uid){
  if(!ltdAccessDecision('cloud_hydrate').allowed){setLtdRemote([]);return{uploads:[],downloads:[],conflicts:[],blocked:'pro_required'};}
  const anchorDoc=await userRoot(uid).collection('ltdControl').doc('activeCompany').get(),anchor=anchorDoc.exists?normaliseLtdAnchor(anchorDoc.data()):null,batches=await Promise.all(TaxMateLtdSync.COLLECTIONS.map(async collection=>{const snap=await ltdCollectionRef(uid,collection).get(),rows=[];snap.forEach(doc=>rows.push(doc.data()));return rows;})),remote=batches.flat();remote.forEach(TaxMateLtdSync.validateEnvelope);validateLtdAnchorConsistency(anchor,remote);CLOUD.ltdAnchor=anchor;setLtdRemote(remote);return{...reconcileLtdState(uid,remote),anchor:anchor?{...anchor}:null};
}
function installLtdListeners(uid){
  if(!ltdAccessDecision('cloud_hydrate').allowed){(CLOUD.ltdUnsubs||[]).forEach(unsub=>{try{unsub();}catch(_){}});CLOUD.ltdUnsubs=[];return;}
  (CLOUD.ltdUnsubs||[]).forEach(unsub=>{try{unsub();}catch(_){}});CLOUD.ltdUnsubs=TaxMateLtdSync.COLLECTIONS.map(collection=>ltdCollectionRef(uid,collection).onSnapshot(snap=>{if(CLOUD.applying||CLOUD.hydrationUid!==uid)return;const other=(CLOUD.ltdRemote||[]).filter(item=>item.collection!==collection),rows=[];snap.forEach(doc=>rows.push(doc.data()));try{rows.forEach(TaxMateLtdSync.validateEnvelope);setLtdRemote(other.concat(rows));CLOUD.applying=true;reconcileLtdState(uid,CLOUD.ltdRemote);CLOUD.applying=false;persistRemoteState();render();scheduleOutboxFlush(0,'ltd-reconciliation');}catch(error){CLOUD.applying=false;handleSyncListenerError(error);}},handleSyncListenerError));
}

function cloudMetaFromState(){
  return {
    businesses:S.businesses||[],businessTombstones:S.businessTombstones||[],folders:S.folders||[],folderTombstones:S.folderTombstones||[],
    customCats:S.customCats||{},activeCats:S.activeCats||{},yearData:S.yearData||{},
    settings:{lang:S.settings.lang,theme:S.settings.theme},metaVersions:S.metaVersions||{},
    updatedAt:Number(S.metaUpdatedAt)||0,deviceId:DEVICE_ID
  };
}
function applyCloudMeta(remote){
  const merged=TaxMateSync.mergeMeta(cloudMetaFromState(),remote||{});
  S.businesses=merged.businesses;S.businessTombstones=merged.businessTombstones;
  S.folders=merged.folders;S.folderTombstones=merged.folderTombstones;
  S.customCats=merged.customCats;S.activeCats=merged.activeCats;S.yearData=merged.yearData;
  S.metaVersions=merged.metaVersions;S.metaUpdatedAt=merged.updatedAt;
  S.settings=Object.assign({},S.settings,merged.settings||{});
  persistRemoteState();
  return merged;
}
function personalRecordsFromState(){
  const partnerBiz=new Set(S.businesses.concat(S.businessTombstones||[]).filter(b=>b.syncCode).map(b=>b.id));
  return S.entries.concat(S.tombstones||[]).filter(e=>!partnerBiz.has(e.bizId));
}
function queuePersonalState(uid){
  if(!uid){const cu=cloudUser();if(!cu)return null;uid=cu.uid;}
  const meta=cloudMetaFromState(),records=personalRecordsFromState();
  const updatedAt=Math.max(Number(meta.updatedAt)||0,...records.map(x=>Number(x.updatedAt)||0));
  // The durable operation is deliberately a small marker. The canonical payload already lives
  // in STORE_KEY, so duplicating every record in localStorage would waste quota on larger books.
  enqueueSyncOperation({kind:'personal-state',uid,updatedAt,deviceId:DEVICE_ID});
  return uid;
}
async function writeRecordIfNewer(ref,record){
  return FB.db.runTransaction(async tx=>{
    const snap=await tx.get(ref),remote=snap.exists?snap.data():null;
    if(TaxMateSync.shouldWriteRecord(remote,record)) tx.set(ref,record);
  });
}
async function writeLtdRecordIfNewer(ref,envelope){
  TaxMateLtdSync.validateEnvelope(envelope);
  return FB.db.runTransaction(async tx=>{
    const snap=await tx.get(ref),remote=snap.exists?snap.data():null;
    if(!remote){tx.set(ref,envelope);return;}
    TaxMateLtdSync.validateEnvelope(remote);
    const order=TaxMateLtdSync.compare(envelope,remote);
    if(order>0){tx.set(ref,envelope);return;}
    if(order===0&&envelope.checksum!==remote.checksum)throw Object.assign(new Error('ltd-sync-conflict'),{code:'ltd-sync-conflict',collection:envelope.collection,recordId:envelope.recordId});
  });
}
async function sendSyncOperation(operation){
  if(operation.kind==='partnership-entry'){
    const ref=FB.db.collection('partnerships').doc(operation.code).collection('entries').doc(operation.record.id);
    await writeRecordIfNewer(ref,operation.record);return;
  }
  if(operation.kind==='partnership-business'){
    const ref=FB.db.collection('partnerships').doc(operation.code);
    await FB.db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)throw new Error('partnership-not-found');
      const current=snap.data()||{},remoteVersion={updatedAt:current.businessUpdatedAt,deviceId:current.businessDeviceId};
      if(TaxMateSync.compare(remoteVersion,operation.record)<0){
        tx.set(ref,{name:operation.record.name,businessUpdatedAt:operation.record.updatedAt,businessDeviceId:operation.record.deviceId},{merge:true});
      }
    });
    return;
  }
  if(operation.kind==='personal-state'){
    const operationMeta=cloudMetaFromState(),operationRecords=personalRecordsFromState();
    const metaRef=userRoot(operation.uid).collection('app').doc('meta');let serverMeta=operationMeta;
    await FB.db.runTransaction(async tx=>{
      const snap=await tx.get(metaRef),remote=snap.exists?snap.data():{};
      serverMeta=TaxMateSync.mergeMeta(operationMeta,remote);tx.set(metaRef,serverMeta);
    });
    for(let i=0;i<operationRecords.length;i+=12){
      await Promise.all(operationRecords.slice(i,i+12).map(record=>writeRecordIfNewer(userRoot(operation.uid).collection('entries').doc(record.id),record)));
    }
    applyCloudMeta(serverMeta);return;
  }
  if(operation.kind==='ltd-record'){
    if(!ltdAccessDecision('cloud_sync').allowed)throw Object.assign(new Error('pro_required'),{code:'pro_required'});
    TaxMateLtdSync.validateEnvelope(operation.record);await writeLtdRecordIfNewer(ltdCollectionRef(operation.uid||operation.ownerUid,operation.collection).doc(TaxMateLtdSync.docId(operation.recordId)),operation.record);return;
  }
  throw new Error('unsupported-sync-operation');
}
async function flushSyncOutbox(reason){
  if(CLOUD.flushPromise)return CLOUD.flushPromise;
  CLOUD.flushPromise=(async()=>{
    if(typeof navigator!=='undefined'&&navigator.onLine===false){renderSyncStatus();return;}
    const db=await ensureFB();const user=cloudUser();
    if(!db||!user){renderSyncStatus();return;}
    SYNC_OUTBOX=loadSyncOutbox();
    const ltdAllowed=ltdAccessDecision('cloud_sync').allowed,pending=TaxMateSync.due(SYNC_OUTBOX,Date.now()).filter(operation=>(operation.kind!=='personal-state'||operation.uid===user.uid)&&(!operation.ownerUid||operation.ownerUid===user.uid)&&(operation.kind!=='ltd-record'||ltdAllowed));
    for(const operation of pending){
      SYNC_OUTBOX=TaxMateSync.markAttempt(loadSyncOutbox(),operation.key,Date.now());persistSyncOutbox();renderSyncStatus();
      try{
        await user.getIdToken();await sendSyncOperation(operation);
        SYNC_OUTBOX=TaxMateSync.acknowledge(loadSyncOutbox(),operation.key,Date.now(),operation);
      }catch(error){
        console.warn('sync operation failed',operation.kind,TaxMateSync.classifyError(error));
        SYNC_OUTBOX=TaxMateSync.markFailure(loadSyncOutbox(),operation.key,error,Date.now(),operation);
        const code=TaxMateSync.classifyError(error);CLOUD.writeError=code;CLOUD.writeErrorKind=operation.kind;
        if(code==='unauthenticated'||code==='permission-denied')break;
      }
      persistSyncOutbox();renderSyncStatus();
    }
    const remaining=syncOperationsForUser(user.uid),failed=remaining.find(operation=>operation.status==='failed');
    CLOUD.reconciliationState=remaining.length?(failed?'retrying':'pending'):'converged';CLOUD.ackState=remaining.length?'waiting':'acked';
    if(failed){CLOUD.writeError=failed.lastError||CLOUD.writeError||'sync-failed';CLOUD.writeErrorKind=failed.kind||CLOUD.writeErrorKind;}
    else if(!remaining.length){CLOUD.writeError=null;CLOUD.writeErrorKind=null;}
    if(remaining.length){const next=Math.min(...remaining.map(x=>Number(x.nextAttemptAt)||Date.now()+5000));scheduleOutboxFlush(Math.max(500,next-Date.now()),'retry');}
  })().finally(()=>{CLOUD.flushPromise=null;renderSyncStatus();});
  return CLOUD.flushPromise;
}
function handleSyncListenerError(error){
  CLOUD.inboundError=TaxMateSync.classifyError(error);console.warn('sync listener failed',CLOUD.inboundError);renderSyncStatus();scheduleOutboxFlush(5000,'listener-retry');
}

function syncGenerationCurrent(uid,generation){return CLOUD.hydrationUid===uid&&CLOUD.generation===generation&&cloudUser()&&cloudUser().uid===uid;}
function syncOperationsForUser(uid){const ltdAllowed=ltdAccessDecision('cloud_sync').allowed;return TaxMateSync.normalizeOutbox(loadSyncOutbox()).items.filter(operation=>(operation.kind!=='personal-state'||operation.uid===uid)&&(!operation.ownerUid||operation.ownerUid===uid)&&(operation.kind!=='ltd-record'||ltdAllowed));}
function outboundConvergenceState(uid){
  const remaining=syncOperationsForUser(uid),failed=remaining.find(operation=>operation.status==='failed');
  CLOUD.reconciliationState=remaining.length?(failed?'retrying':'pending'):'converged';CLOUD.ackState=remaining.length?'waiting':'acked';
  if(failed){CLOUD.writeError=failed.lastError||CLOUD.writeError||'sync-failed';CLOUD.writeErrorKind=failed.kind||CLOUD.writeErrorKind;}
  else if(!remaining.length){CLOUD.writeError=null;CLOUD.writeErrorKind=null;}
  return{state:remaining.length?(failed?'retrying':'pending'):'acked',pending:remaining.length,error:failed&&failed.lastError||null,kind:failed&&failed.kind||null};
}
async function flushSyncForConvergence(uid){
  CLOUD.reconciliationState='pending';CLOUD.ackState='waiting';renderSyncStatus();
  for(let pass=0;pass<4;pass++){
    await flushSyncOutbox('account-convergence');
    const state=outboundConvergenceState(uid),remaining=syncOperationsForUser(uid);
    if(!remaining.length)return state;
    if(!remaining.some(operation=>!operation.nextAttemptAt||Number(operation.nextAttemptAt)<=Date.now()))break;
  }
  return outboundConvergenceState(uid);
}
function clearUserSyncListeners(){
  if(CLOUD.metaUnsub){try{CLOUD.metaUnsub();}catch(e){}CLOUD.metaUnsub=null;}
  if(CLOUD.entUnsub){try{CLOUD.entUnsub();}catch(e){}CLOUD.entUnsub=null;}
  (CLOUD.ltdUnsubs||[]).forEach(unsub=>{try{unsub();}catch(e){}});CLOUD.ltdUnsubs=[];CLOUD.ltdRemote=[];CLOUD.ltdAnchor=null;
  Object.keys(FB.subs).forEach(code=>{const sub=FB.subs[code],unsubs=Array.isArray(sub)?sub:(sub&&Array.isArray(sub.unsubs)?sub.unsubs:[]);unsubs.forEach(unsub=>{try{unsub();}catch(e){}});});
  FB.subs={};
}
function startUserSync(u){
  if(STATE_LOAD_ERROR)return Promise.resolve({state:'blocked',existingCloudAccount:false,error:'state-load-blocked'});
  if(!u||u.isAnonymous)return Promise.resolve({state:'idle',existingCloudAccount:false});
  const uid=u.uid;
  if(CLOUD.hydrationUid===uid&&CLOUD.hydrationState==='converged'&&CLOUD.hydrationResult)return Promise.resolve(CLOUD.hydrationResult);
  if(CLOUD.hydrationUid===uid&&CLOUD.hydrationPromise)return CLOUD.hydrationPromise;
  if(CLOUD.hydrationUid&&CLOUD.hydrationUid!==uid)stopUserSync();
  const generation=++CLOUD.generation;
  CLOUD.hydrationUid=uid;CLOUD.hydrationState='loading';CLOUD.partnershipHydrationState='loading';CLOUD.reconciliationState='idle';CLOUD.ackState='idle';CLOUD.hydrationResult=null;CLOUD.hydrationError=null;CLOUD.inboundError=null;CLOUD.writeError=null;CLOUD.writeErrorKind=null;
  clearTimeout(CLOUD.hydrationRetryTimer);renderSyncStatus();
  const hydration=(async()=>{
    try{
      await loadEntitlementFromCloud(uid);
      if(!syncGenerationCurrent(uid,generation))throw new Error('stale-hydration');

      /* 1 ── Read account truth before any push. A clean client must never publish its empty defaults first. */
      const metaDoc=await userRoot(uid).collection('app').doc('meta').get();
      const entSnap=await userRoot(uid).collection('entries').get();
      if(!syncGenerationCurrent(uid,generation))throw new Error('stale-hydration');
      const remote=[];entSnap.forEach(d=>{const re=d.data();if(re)remote.push(re);});
      const remoteMeta=metaDoc.exists?metaDoc.data():{};
      if(metaDoc.exists)applyCloudMeta(remoteMeta);
      const mergedEntries=TaxMateSync.mergeRecords(S.entries.concat(S.tombstones||[]),remote);
      S.entries=TaxMateSync.visible(mergedEntries);
      S.tombstones=mergedEntries.filter(e=>e.deletedAt!=null);
      persistRemoteState();
      const ltdReconciliation=ltdAccessDecision('cloud_hydrate').allowed?await readLtdCloud(uid):{uploads:[],downloads:[],conflicts:[],blocked:'pro_required'};
      if(!syncGenerationCurrent(uid,generation))throw new Error('stale-hydration');

      /* 2 ── Install live personal listeners, then await every partnership's first snapshots. */
      CLOUD.metaUnsub=userRoot(uid).collection('app').doc('meta').onSnapshot(doc=>{
        const m=doc.data();if(!m||CLOUD.applying||CLOUD.hydrationUid!==uid)return;
        CLOUD.applying=true;applyCloudMeta(m);CLOUD.applying=false;render();
        S.businesses.filter(b=>b.syncCode).forEach(b=>subscribeSync(b.syncCode,b.id).catch(()=>{}));
      },handleSyncListenerError);
      CLOUD.entUnsub=userRoot(uid).collection('entries').onSnapshot(snap=>{
        if(CLOUD.applying||CLOUD.hydrationUid!==uid)return;
        CLOUD.applying=true;
        const latest=[];snap.forEach(d=>latest.push(d.data()));
        const partnerBiz=new Set(S.businesses.filter(b=>b.syncCode).map(b=>b.id));
        const partnerEntries=S.entries.filter(e=>partnerBiz.has(e.bizId));
        const personal=S.entries.filter(e=>!partnerBiz.has(e.bizId)).concat((S.tombstones||[]).filter(e=>!partnerBiz.has(e.bizId)));
        const merged=TaxMateSync.mergeRecords(personal,latest);
        S.entries=TaxMateSync.visible(merged).filter(e=>!partnerBiz.has(e.bizId)).concat(partnerEntries);
        S.tombstones=(S.tombstones||[]).filter(e=>partnerBiz.has(e.bizId)).concat(merged.filter(e=>e.deletedAt!=null));
        persistRemoteState();CLOUD.applying=false;render();
      },handleSyncListenerError);
      if(ltdAccessDecision('cloud_hydrate').allowed)installLtdListeners(uid);
      const partnershipSubscriptions=S.businesses.filter(b=>b.syncCode).map(b=>subscribeSync(b.syncCode,b.id));
      const partnershipResults=await Promise.all(partnershipSubscriptions);
      if(!syncGenerationCurrent(uid,generation))throw new Error('stale-hydration');
      const partnershipRecordCount=partnershipResults.reduce((sum,row)=>sum+Number(row&&row.entries||0),0);
      const account=TaxMateSync.cloudAccountState({metaExists:metaDoc.exists,meta:remoteMeta,personalRecords:remote,partnershipRecords:partnershipRecordCount+(CLOUD.ltdRemote||[]).length+(CLOUD.ltdAnchor?1:0)});

      /* 3 ── Inbound account and partnership snapshots are complete before outbound reconciliation begins. */
      CLOUD.hydrationState='converged';CLOUD.partnershipHydrationState='converged';CLOUD.hydrationError=null;CLOUD.inboundError=null;
      const result={state:'converged',existingCloudAccount:account.established,account,businesses:S.businesses.length,records:S.entries.length,ltdRecords:(CLOUD.ltdRemote||[]).length,ltdReconciliation:{downloads:ltdReconciliation.downloads.length,uploads:ltdReconciliation.uploads.length,conflicts:0},syncState:{state:'pending',pending:syncOperationsForUser(uid).length}};
      CLOUD.hydrationResult=result;renderSyncStatus();

      /* 4 ── Only the fully merged state may enter the durable outbound queue. Pending writes do not invalidate inbound restore. */
      try{result.syncState=await pushUserState(uid,true)||outboundConvergenceState(uid);}
      catch(error){
        CLOUD.writeError=TaxMateSync.classifyError(error);CLOUD.writeErrorKind='reconciliation';CLOUD.reconciliationState='retrying';CLOUD.ackState='waiting';
        result.syncState=outboundConvergenceState(uid);scheduleOutboxFlush(5000,'account-convergence-retry');
      }
      if(!syncGenerationCurrent(uid,generation))throw new Error('stale-hydration');
      CLOUD.hydrationPromise=null;
      scheduleOutboxFlush(0,'auth-ready');renderSyncStatus();render();return result;
    }catch(error){
      if(String(error&&error.message||error)==='stale-hydration')return{state:'cancelled',existingCloudAccount:false};
      console.warn('user sync failed',error);
      if(syncGenerationCurrent(uid,generation)){
        clearUserSyncListeners();CLOUD.hydrationState='failed';CLOUD.partnershipHydrationState='failed';CLOUD.hydrationPromise=null;CLOUD.hydrationError=TaxMateSync.classifyError(error);CLOUD.inboundError=CLOUD.hydrationError;renderSyncStatus();
        CLOUD.hydrationRetryTimer=setTimeout(()=>{const current=cloudUser();if(current&&current.uid===uid)startUserSync(current).then(applyHydratedAccountResult);},5000);
      }
      return{state:'failed',existingCloudAccount:false,error:CLOUD.hydrationError||'sync-failed'};
    }
  })();
  CLOUD.hydrationPromise=hydration;return hydration;
}
function stopUserSync(){
  CLOUD.generation++;clearTimeout(CLOUD.hydrationRetryTimer);CLOUD.hydrationRetryTimer=null;
  clearUserSyncListeners();
  CLOUD.lastPushed='';
  CLOUD.hydrationState='idle';CLOUD.partnershipHydrationState='idle';CLOUD.reconciliationState='idle';CLOUD.ackState='idle';CLOUD.hydrationError=null;CLOUD.inboundError=null;CLOUD.writeError=null;CLOUD.writeErrorKind=null;CLOUD.hydrationUid=null;CLOUD.hydrationPromise=null;CLOUD.hydrationResult=null;
  renderSyncStatus();
}
async function pushUserState(uid, force){
  uid=queuePersonalState(uid);if(!uid)return;if(ltdAccessDecision('cloud_sync').allowed)reconcileLtdState(uid,CLOUD.ltdRemote||[]);
  if(force) return flushSyncForConvergence(uid);
}
function scheduleCloudPush(){
  if(!cloudUser() || CLOUD.applying) return;
  CLOUD.localEditAt = Date.now();
  queuePersonalState();
  const current=cloudUser();if(current&&ltdAccessDecision('cloud_sync').allowed)reconcileLtdState(current.uid,CLOUD.ltdRemote||[]);
  clearTimeout(CLOUD.pushTimer);
  CLOUD.pushTimer = setTimeout(()=>flushSyncOutbox('local-edit'), 1200);
}

/* ═══════════ Cloud tax rates (免重新上架嘅年度更新) ═══════════ */
const RATES_CACHE_KEY = 'taxmateuk_rates_v1';
function applyCachedRates(){
  try{
    const c = localStorage.getItem(RATES_CACHE_KEY);
    if(c) applyValidatedRules(JSON.parse(c));
  }catch(e){}
}
function applyValidatedRules(payload){
  if(!payload||payload.schemaVersion!==1||!Array.isArray(payload.rulesets)) throw new Error('Unrecognised remote tax rule envelope');
  const next={};
  payload.rulesets.forEach(rule=>{
    const check=TaxMateCore.validateTaxRuleset(rule);
    if(!check.valid||!TaxMateCore.TAX_RULESETS[rule.taxYear]) throw new Error('Rejected remote tax rules: '+check.errors.join('; '));
    next[rule.taxYear]=TaxMateCore.toLegacyTaxConfig(rule);
  });
  Object.assign(TAXCFG,next); return next;
}
async function loadCloudRates(){
  const db = await ensureFB(); if(!db) return;
  try{
    const doc = await db.collection('appConfig').doc('taxRates').get();
    if(doc.exists){
      const envelope=doc.data()||{};
      if(Array.isArray(envelope.rulesets)&&envelope.rulesets.length){
        applyValidatedRules(envelope);
        try{ localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(envelope)); }catch(e){}
        render();
      }
    }
  }catch(e){ console.warn('rates fetch failed', e); }
}

/* ═══════════ Mileage vs Actual Expenses ═══════════ */
function calcMileage(yr){
  const miles = Number(yd().mileage)||0;
  const mcfg = TAXCFG[yr] || TAXCFG['2026-27'];
  const r1 = mcfg.mileageRate1 || 0.45, r2 = mcfg.mileageRate2 || 0.25;
  const milesClaim = Math.min(miles,10000)*r1 + Math.max(miles-10000,0)*r2;
  // 只計 sole trader 嘅 vehicle + travel 開支
  const soleBizIds = S.businesses.filter(b=>b.structure==='sole').map(b=>b.id);
  const vehicleExp = entriesFor(yr,null,'expense')
    .filter(e=>soleBizIds.includes(e.bizId) && (e.cat==='vehicle'||e.cat==='travel'))
    .reduce((s,e)=>s+effExact(e),0);
  const diff = milesClaim - vehicleExp;
  const better = Math.abs(diff)<0.5 ? 'equal' : diff>0 ? 'mileage' : 'actual';
  return {miles, milesClaim, vehicleExp, diff:Math.abs(diff), better};
}
/* ═══════════ Smart Tax-Saving Tips ═══════════ */
function dismissTipEl(btn){ dismissTip(btn.getAttribute('data-id')); }
function dismissTip(id){
  const d = yd();
  if(!d.dismissedTips) d.dismissedTips=[];
  if(!d.dismissedTips.includes(id)) d.dismissedTips.push(id);
  save(); render();
}

function tipsCard(){
  const yr = S.year;
  const tx = calcTax(yr);
  const d = yd();
  const dismissed = d.dismissedTips || [];
  const tips = [];
  const hasIncome = tx.myProfit !== 0 || entriesFor(yr,null,'income').length>0;
  if(!hasIncome) return '';

  // TIP 1: Home working allowance
  if(!dismissed.includes('home_working')){
    const hasHome = entriesFor(yr,null,'expense').some(e=>e.cat==='home');
    const hasSole = S.businesses.some(b=>b.structure==='sole');
    if(!hasHome && hasSole){
      tips.push({id:'home_working', icon:'🏠', t:t('tip.home_t'), b:t('tip.home_b'),
        action:'<button class="btn soft" style="margin-top:8px" data-tm-click="openEntry(\'expense\')">'+'+ '+t('tip.addNow')+'</button>'});
    }
  }

  // TIP 2: Phone not claimed
  if(!dismissed.includes('phone_claim')){
    const hasPhone = entriesFor(yr,null,'expense').some(e=>e.cat==='phone');
    const hasSole = S.businesses.some(b=>b.structure==='sole');
    if(!hasPhone && hasSole){
      tips.push({id:'phone_claim', icon:'📱', t:t('tip.phone_t'), b:t('tip.phone_b'),
        action:'<button class="btn soft" style="margin-top:8px" data-tm-click="openEntry(\'expense\')">'+'+ '+t('tip.addNow')+'</button>'});
    }
  }

  // TIP 3: Class 2 voluntary
  if(!dismissed.includes('c2_voluntary') && !tx.class2TreatedPaid && tx.myProfit>0){
    const annual=tx.cfg.c2Weekly*52;
    tips.push({id:'c2_voluntary', icon:'🏦', t:t('tip.c2_t'), b:'Your profit is below the '+fmt0(tx.cfg.c2SmallProfits)+' Class 2 threshold. Voluntary Class 2 is '+fmt(tx.cfg.c2Weekly)+' a week (about '+fmt0(annual)+' a year) and may protect your National Insurance record. Check eligibility with HMRC.', action:''});
  }

  // TIP 4: POA warning (first time over £1k)
  if(!dismissed.includes('poa_warning') && tx.poaRequired && tx.poaPaid===0){
    tips.push({id:'poa_warning', icon:'⚠️', t:t('tip.poa_t'), b:t('tip.poa_b',{x:fmt(tx.poaEach)}), action:''});
  }

  // TIP 5: Mileage not checked
  if(!dismissed.includes('mileage_check')){
    const hasVehicle = entriesFor(yr,null,'expense').some(e=>e.cat==='vehicle'||e.cat==='travel');
    const hasSole = S.businesses.some(b=>b.structure==='sole');
    if(hasVehicle && hasSole && !(d.mileage>0)){
      tips.push({id:'mileage_check', icon:'🚗', t:t('tip.mileage_t'), b:t('tip.mileage_b'), action:''});
    }
  }

  // TIP 6: Missing receipt photos (Plus or Pro)
  if(!dismissed.includes('receipt_missing') && hasFeature('receiptPhoto')){
    const noReceipt = entriesFor(yr,null,'expense').filter(e=>!e.receiptUrl);
    if(noReceipt.length>=3){
      const n = noReceipt.length;
      const suf = n===1?t('tip.entry'):t('tip.entries');
      tips.push({id:'receipt_missing', icon:'📸', t:t('tip.receipt_t'), b:t('tip.receipt_b',{n,e:' '+suf}), action:''});
    }
  }

  if(!tips.length) return '';

  return '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
    +'<div style="font-size:18px">💡</div><div class="t">'+t('tip.title')+featBadge('aiTips')+'</div>'
    +'<span class="tagchip blue" style="margin-inline-start:auto">'+tips.length+'</span></div>'
    +tips.map(tip=>'<div style="background:var(--amber-soft);border-radius:14px;padding:13px 14px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:flex-start;gap:10px">'
      +'<div style="font-size:18px;flex-shrink:0">'+tip.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:14px;font-weight:800;color:var(--ink);margin-bottom:3px">'+tip.t+'</div>'
      +'<div style="font-size:13px;color:var(--ink);line-height:1.5">'+tip.b+'</div>'
      +(tip.action||'')+'</div>'
      +'<button data-id="'+tip.id+'" data-tm-click="dismissTipEl(this)" style="background:none;border:0;color:var(--muted);font-size:13px;cursor:pointer;flex-shrink:0;padding:0 2px">✕</button>'
      +'</div></div>'
    ).join('')
    +'</div>';
}

/* ═══════════ SA103 / SA104 Form Reference ═══════════ */
const CAT_TO_BOX = TaxMateCore.SA103S_EXPENSE_BOXES;

function saBoxRow(box, desc, val, isTick, isExp){
  // HMRC SA: 整數英鎊 — 收入向下取整，開支向上取整
  function saRound(n){ return isExp ? Math.ceil(Math.abs(n)) : Math.floor(Math.abs(n)); }
  const rounded = typeof val==='number' ? (val<0?-1:1)*saRound(val) : val;
  const dispNum = typeof rounded==='number'
    ? (rounded<0?'−':'')+'£'+Math.abs(rounded).toLocaleString('en-GB')
    : String(rounded);
  const disp = isTick ? (val?'✓ Tick this box':'Leave unticked') : dispNum;
  const copyVal = isTick ? '' : (typeof rounded==='number' ? String(Math.abs(rounded)) : String(rounded));
  const copyBtn = !isTick && copyVal
    ? '<button data-v="'+copyVal+'" data-tm-click="saCopy(this)" style="background:var(--brand-soft);color:var(--brand-deep);border:0;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">'+t('sa.copy')+'</button>'
    : '';
  return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">'
    +'<div style="width:38px;flex-shrink:0;font-size:11px;font-weight:800;color:var(--muted);background:var(--bg);border-radius:6px;padding:3px 5px;text-align:center">'+t('sa.box')+' '+box+'</div>'
    +'<div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--ink)">'+desc+'</div></div>'
    +'<div style="font-size:13px;font-weight:800;white-space:nowrap;color:'+(isTick?(val?'var(--brand-deep)':'var(--muted)'):'var(--ink)')+'">'+disp+'</div>'
    +copyBtn+'</div>';
}

function saCopy(btn){
  const val=btn.getAttribute('data-v')||'';
  navigator.clipboard && navigator.clipboard.writeText(val).then(()=>{
    const orig = btn.textContent;
    btn.textContent = t('sa.copied');
    btn.style.background = 'var(--brand-soft)';
    setTimeout(()=>{ btn.textContent=orig; },1500);
  }).catch(()=>{});
}

function bizFiguresRaw(b,yr){
  const inc = entriesFor(yr,b.id,'income').reduce((s,e)=>s+Math.max(0,e.amount),0);
  const exp = entriesFor(yr,b.id,'expense').reduce((s,e)=>s+Math.max(0,effExact(e)),0);
  return {income:inc, expenses:exp, profit:inc-exp};
}

function sa103Card(){
  const yr = S.year;
  const mapping=TaxMateCore.mappingFor('SA103S',yr);
  const tx = calcTax(yr);
  const soleBiz = S.businesses.filter(b=>b.structure==='sole');
  if(!soleBiz.length) return '';
  if(!mapping.supported) return '<div class="card"><div class="t">📋 '+t('sa.103')+'</div><div class="notice amber" style="margin-top:10px">'+t('sa.future')+'</div></div>';
  const boxes=mapping.boxes;

  let html = '<div class="card"><div class="t" style="margin-bottom:4px">📋 '+t('sa.103')+'</div>'
    +'<div class="s" style="margin-bottom:12px">'+t('sa.sub')+'</div>'
    +'<div class="s" style="margin-bottom:10px;color:var(--amber)">⚠ HMRC requires whole pounds only — income rounded down, expenses rounded up.</div>';

  soleBiz.forEach(b=>{
    const fig = bizFiguresRaw(b,yr);
    const profit = tx.taUsed ? Math.max(0, fig.income - 1000) : fig.profit;
    const isLoss = profit < 0;

    if(soleBiz.length>1) html += '<div style="font-size:13px;font-weight:800;color:var(--brand-deep);padding:8px 0 4px">'+esc(b.name)+'</div>';

    html += saBoxRow(boxes.turnover, 'Turnover — total income', fig.income);
    if(!tx.taUsed){
      html += saBoxRow(boxes.totalAllowableExpenses, 'Total allowable expenses', fig.expenses, false, true);
    }
    html += saBoxRow(boxes.netProfit, 'Net profit', isLoss ? 0 : profit);
    if(isLoss) html += saBoxRow(boxes.netLoss, 'Net loss', Math.abs(profit));
    if(tx.taUsed) html += saBoxRow(boxes.tradingIncomeAllowance, 'Trading income allowance', Math.min(1000,fig.income));
    html += saBoxRow(boxes.taxableBusinessProfit, 'Taxable business profit', Math.max(0,profit));

    if(!tx.taUsed && fig.expenses>0){
      html += '<div style="font-size:12px;font-weight:800;color:var(--muted);padding:10px 0 4px;text-transform:uppercase;letter-spacing:.5px">'+t('sa.expBreakdown')+'</div>';
      const boxGroups = {};
      [11,12,13,14,15,16,17,18,19].forEach(n=>{ boxGroups[n]=0; });
      const boxDesc = {11:'Cost of goods / stock',12:'Car, van and travel',13:'Employee costs',14:'Premises, insurance and utilities',15:'Repairs',16:'Professional fees',17:'Interest and finance',18:'Phone, office and admin',19:'Other expenses'};
      entriesFor(yr,b.id,'expense').forEach(e=>{
        const box = CAT_TO_BOX[e.cat]||35;
        boxGroups[box] = (boxGroups[box]||0) + Math.max(0,effExact(e));
      });
      Object.entries(boxGroups).forEach(([n,v])=>{ if(v>0) html+=saBoxRow(n, boxDesc[n], v, false, true); });
    }

    if(tx.taUsed) html += '<div class="notice green" style="margin-top:8px;font-size:13px">'+t('sa.taNote')+'</div>';
    if(isLoss) html += '<div class="notice amber" style="margin-top:8px;font-size:13px">'+t('sa.lossNote')+'</div>';
  });

  html += '<div style="margin-top:12px"><a href="https://www.gov.uk/log-in-file-self-assessment-tax-return" target="_blank" style="font-size:13px;color:var(--blue);font-weight:700">↗ '+t('sa.govLink')+'</a></div>';
  html += '</div>';
  return html;
}

function sa104Card(){
  const yr = S.year;
  const mapping=TaxMateCore.mappingFor('SA104S',yr);
  const partBiz = S.businesses.filter(b=>b.structure==='partnership');
  if(!partBiz.length) return '';
  if(!hasFeature('sa104'))return '<div class="card"><div class="t" style="margin-bottom:6px">📋 '+t('sa.104')+featBadge('sa104')+'</div><div class="s" style="margin-bottom:12px">'+t('sa.partNote')+'</div><button class="btn ink" data-tm-click="lockGuard(\'sa104\')">'+t('lock.upgrade')+' 🔒</button></div>';
  if(!mapping.supported) return '<div class="card"><div class="t">📋 '+t('sa.104')+'</div><div class="notice amber" style="margin-top:10px">'+t('sa.future')+'</div></div>';
  const boxes=mapping.boxes;

  let html = '<div class="card"><div class="t" style="margin-bottom:4px">📋 '+t('sa.104')+'</div>'
    +'<div class="s" style="margin-bottom:12px">'+t('sa.partNote')+'</div>';

  partBiz.forEach(b=>{
    const fig = bizFiguresRaw(b,yr);
    const myShare = fig.profit * (b.share||50)/100;
    const isLoss = myShare < 0;

    html += '<div style="font-size:13px;font-weight:800;color:var(--blue);padding:8px 0 4px">'+esc(b.name)+' ('+t('tag.your',{n:b.share||50})+')</div>';
    html += saBoxRow(boxes.description, 'Description of partnership business', b.name);
    html += saBoxRow(boxes.statementProfitOrLoss, 'Your share from Partnership Statement box 11 (profit) or 12 (loss) — confirm against the Statement', myShare);
    html += saBoxRow(boxes.adjustedProfit, 'Adjusted partnership profit estimate', isLoss?0:myShare);
    if(isLoss) html += saBoxRow(boxes.adjustedLoss, 'Adjusted partnership loss estimate', Math.abs(myShare));
    html += saBoxRow(boxes.totalTaxableProfit, 'Total taxable partnership profit estimate', isLoss?0:myShare);
  });

  html += '<div style="margin-top:12px"><a href="https://www.gov.uk/log-in-file-self-assessment-tax-return" target="_blank" style="font-size:13px;color:var(--blue);font-weight:700">↗ '+t('sa.govLink')+'</a></div>';
  html += '</div>';
  return html;
}

/* ═══════════ Quarterly + MTD + Calendar + Deadline Banner ═══════════ */

// UK tax quarters
const QUARTERS = [
  {id:'Q1', from:[3,6],  to:[6,5]},  // Apr 6 – Jul 5
  {id:'Q2', from:[6,6],  to:[9,5]},  // Jul 6 – Oct 5
  {id:'Q3', from:[9,6],  to:[0,5]},  // Oct 6 – Jan 5 (month 0 = Jan next year)
  {id:'Q4', from:[0,6],  to:[3,5]},  // Jan 6 – Apr 5
];
function quarterRange(qIdx, yr){
  const y = parseInt(yr.slice(0,4));
  const q = QUARTERS[qIdx];
  const fromY = q.from[0]<3 ? y+1 : y;
  const toY   = q.to[0]<3   ? y+1 : y;
  const pad = n => String(n).padStart(2,'0');
  return {
    from: fromY+'-'+pad(q.from[0]+1)+'-'+pad(q.from[1]),
    to:   toY  +'-'+pad(q.to[0]+1)  +'-'+pad(q.to[1]),
    label: t('qt.'+q.id.toLowerCase()),
    id: q.id
  };
}
function currentQuarterIdx(yr){
  const today = new Date().toISOString().slice(0,10);
  for(let i=0;i<4;i++){
    const r = quarterRange(i,yr);
    if(today>=r.from && today<=r.to) return i;
  }
  return -1;
}

function quarterlyCard(){
  if(!hasFeature('mtdReady'))return '<div class="card"><div class="t" style="margin-bottom:6px">📊 '+t('qt.title')+featBadge('mtdReady')+'</div><div class="s" style="margin-bottom:12px">'+t('feat.mtdReady')+'</div><button class="btn ink" data-tm-click="lockGuard(\'mtdReady\')">'+t('lock.upgrade')+' 🔒</button></div>';
  const yr = S.year;
  const curQ = currentQuarterIdx(yr);
  const rows = [0,1,2,3].map(i=>{
    const r = quarterRange(i,yr);
    const entries = S.entries.filter(e=>e.date>=r.from && e.date<=r.to);
    const inc = entries.filter(e=>e.kind==='income').reduce((s,e)=>s+Math.max(0,e.amount),0);
    const exp = entries.filter(e=>e.kind==='expense').reduce((s,e)=>s+Math.max(0,effExact(e)),0);
    const profit = inc-exp;
    const isCur = i===curQ;
    return '<div style="padding:11px 0;border-bottom:1px solid var(--line)'+(i===3?';border-bottom:none':'')+'">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      +'<span style="font-size:13px;font-weight:800;color:'+(isCur?'var(--brand-deep)':'var(--muted)')+'">'+r.label
      +(isCur?' <span class="tagchip green" style="font-size:10px">'+t('qt.current')+'</span>':'')+'</span>'
      +'<span style="font-size:13px;font-weight:800;color:'+(profit>=0?'var(--brand-deep)':'var(--coral)')+'" class="num">'+fmt(profit)+'</span></div>'
      +(inc>0||exp>0
        ? '<div style="display:flex;gap:12px">'
          +'<span style="font-size:12px;color:var(--muted)">'+t('qt.income')+' <b class="num" style="color:var(--ink)">'+fmt(inc)+'</b></span>'
          +'<span style="font-size:12px;color:var(--muted)">'+t('qt.expenses')+' <b class="num" style="color:var(--ink)">'+fmt(exp)+'</b></span></div>'
        : '<div style="font-size:12px;color:var(--muted)">'+t('qt.noData')+'</div>')
      +'</div>';
  }).join('');
  return '<div class="card"><div class="t" style="margin-bottom:2px">📊 '+t('qt.title')+'</div>'
    +'<div class="s" style="margin-bottom:10px">'+yr+'</div>'+rows+'</div>';
}

function mtdCard(){
  const yr = S.year;
  const turnover=S.businesses.filter(b=>b.structure!=='partnership').reduce((sum,b)=>sum+bizFiguresRaw(b,yr).income,0);
  const d=S.yearData[yr]||{};
  const result=TaxMateCore.assessMtdEligibility({assessmentTaxYear:yr,selfEmploymentTurnover:turnover,grossPropertyIncome:d.grossPropertyIncome,propertyIncomeComplete:d.propertyIncomeComplete});
  let msg='', col='var(--muted)', bg='var(--bg)';
  if(!result.supported) msg=t('mtd.unsupported');
  else if(result.required){ msg=t('mtd.required',{x:fmt0(result.qualifyingIncome),d:new Date(result.startDate+'T12:00:00').toLocaleDateString(locale(),{month:'long',year:'numeric'})}); col='var(--coral)'; bg='var(--coral-soft)'; }
  else msg=t('mtd.notRequired',{x:fmt0(result.qualifyingIncome),y:fmt0(result.threshold)});
  if(result.incompleteWarning) msg+=' '+t('mtd.incomplete');
  return '<div class="card"><div class="t" style="margin-bottom:6px">🏛 '+t('mtd.title')+'</div>'
    +'<div style="background:'+bg+';border-radius:12px;padding:12px 14px;margin-bottom:8px">'
    +'<div style="font-size:13px;font-weight:700;color:'+col+'">'+msg+'</div></div>'
    +'<div class="s">'+t('mtd.what')+' <button class="link" data-tm-click="openAdj()">Review income used</button></div></div>';
}

// Deadline banner (shown on Home + Tax pages if within 7 days)
// ── Entitlement and renewal reminder banner ────────────────
function entitlementBanner(){
  const notice=TaxMateEntitlement.notification(ENTITLEMENT.snapshot,Date.now());if(!notice)return'';
  const seenKey='taxmateuk_notice_'+notice.id;try{if(localStorage.getItem(seenKey))return'';localStorage.setItem(seenKey,'1');}catch(e){}
  const action=notice.cta==='Manage subscription'?'openBillingPortal()':'lockSeeplans()';
  return `<div class="notice amber" style="margin-bottom:14px">${notice.message} <button class="link" data-tm-click="${action}">${notice.cta}</button></div>`;
}

function deadlineBanner(){
  const today = new Date();
  const yr = S.year;
  const y = parseInt(yr.slice(0,4))+1; // filing year = tax year end +1
  const deadlines = [
    {date: new Date(y,0,31), keyToday:'nb.today_jan', key:'nb.jan'},
    {date: new Date(y,6,31), keyToday:'nb.today_jul', key:'nb.jul'},
  ];
  for(const d of deadlines){
    const diff = Math.round((d.date-today)/(1000*60*60*24));
    if(diff<0 || diff>7) continue;
    if(diff===0) return '<div class="notice" style="background:#FDEDEE;color:var(--coral);font-weight:700;margin-bottom:14px">⏰ '+t(d.keyToday)+'</div>';
    const s = diff===1?t('nb.day'):t('nb.days');
    return '<div class="notice amber" style="margin-bottom:14px;font-weight:700">⏰ '+t(d.key,{n:diff,s:''})+'</div>';
  }
  return '';
}

// .ics calendar export
function exportCalendar(){
  const yr = S.year;
  const y = parseInt(yr.slice(0,4))+1;
  const tx = calcTax(yr);
  const NL = '\r\n';
  function icsDate(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dy=String(d.getDate()).padStart(2,'0'); return ''+y+m+dy; }
  const alarm = desc => ['BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY','DESCRIPTION:'+desc+' in 7 days','END:VALARM'].join(NL);
  const event = (uid,date,summary,desc) => {
    const d = new Date(date); const d2 = new Date(d); d2.setDate(d2.getDate()+1);
    return ['BEGIN:VEVENT','UID:'+uid+'-taxmate@uk','DTSTART;VALUE=DATE:'+icsDate(d),'DTEND;VALUE=DATE:'+icsDate(d2),'SUMMARY:'+summary,'DESCRIPTION:'+desc,alarm(summary),'END:VEVENT'].join(NL);
  }
  const events = [
    event('jan-'+yr, new Date(y,0,31), 'Self Assessment deadline '+yr,
      'File return + pay balancing payment. TaxMate estimate: '+fmt(tx.balancing)),
    tx.poaRequired ? event('jul-'+yr, new Date(y,6,31), 'Payment on account due '+yr,
      '2nd payment on account. TaxMate estimate: '+fmt(tx.poaEach)) : null,
    event('yearend-'+yr, new Date(parseInt(yr.slice(0,4))+1,3,5), 'Tax year end '+yr,
      'UK tax year ends. Complete your records for '+yr+'.'),
  ].filter(Boolean);
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TaxMate UK//EN','CALSCALE:GREGORIAN'].concat(events).concat(['END:VCALENDAR']);
  const ics = lines.join(NL);
  const blob = new Blob([ics],{type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'taxmate-'+yr+'.ics';
  a.click(); URL.revokeObjectURL(a.href); toast(t('toast.calAdded'));
}

function mileageCard(){
  const yr = S.year;
  const mi = calcMileage(yr);
  const hasSole = S.businesses.some(b=>b.structure==='sole');
  if(!hasSole) return '';
  const mileageInput='<div class="fg" style="margin-bottom:12px">'
    +'<label style="font-size:13px;font-weight:700;display:block;margin-bottom:6px">'+t('mi.miles')+'</label>'
    +'<input type="number" inputmode="numeric" min="0" value="'+(mi.miles||'')+'" placeholder="0"'
    +' style="width:100%;font-size:20px;font-weight:800;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px"'
    +' data-tm-input="setMileage(this.value,false)" data-tm-blur="setMileage(this.value,true)">'
    +'<div class="s" style="margin-top:5px">'+t('mi.rate')+'</div></div>';
  if(!hasFeature('mileageCompare'))return '<div class="card">'
    +'<div class="t" style="margin-bottom:10px">🚗 '+t('feat.mileageBasic')+'</div>'
    +mileageInput+'</div>';
  const diff = fmt(mi.diff);
  let advice='', badge='', badgeCol='var(--muted)', nc='';
  if(mi.better==='mileage'){
    advice=t('mi.adviceMile',{x:diff}); badge=t('mi.bestMile'); badgeCol='var(--brand-deep)'; nc='green';
  } else if(mi.better==='actual'){
    advice=t('mi.adviceActual',{x:diff}); badge=t('mi.bestActual'); badgeCol='var(--blue)'; nc='amber';
  } else {
    advice=t('mi.adviceEqual'); badge=t('mi.equal'); nc='green';
  }
  const rows = mi.miles>0
    ? '<div class="frow"><span class="fl">'+t('mi.milesClaim')+'</span><span class="fv num pos">'+fmt(mi.milesClaim)+'</span></div>'
      +'<div class="frow"><span class="fl">'+t('mi.actual')+'</span><span class="fv num">'+fmt(mi.vehicleExp)+'</span></div>'
      +'<div class="frow total"><span class="fl">'+t('mi.diff')+'</span><span class="fv num" style="color:'+badgeCol+'">'+diff+'</span></div>'
      +'<div class="notice '+nc+'" style="margin-top:10px;font-size:13px">'+advice+'</div>'
    : '<div class="s" style="color:var(--muted)">'+(mi.vehicleExp>0?t('mi.enterMiles'):t('mi.noVehicle'))+'</div>';
  return '<div class="card">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    +'<div class="t">🚗 '+t('mi.title')+featBadge('mileageCompare')+'</div>'
    +'<span class="tagchip" style="background:var(--blue-soft);color:'+badgeCol+';font-size:11px">'+badge+'</span></div>'
    +'<div class="s" style="margin-bottom:12px">'+t('mi.sub')+'</div>'
    +mileageInput
    +rows
    +'<div class="s" style="margin-top:10px">'+t('mi.carsOnly')+'</div></div>';
}

function setMileage(v,rerender){
  const n = Math.max(0,parseInt(v)||0);
  yd().mileage=n; save(); if(rerender) render();
}

/* ═══════════ Receipt Pack ═══════════ */
async function exportReceiptPack(){
  if(typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined'){
    showNotice(t('rp.title'),'Reports are still loading. Please try again in a moment.'); return;
  }
  const yr = S.year;
  const items = S.entries
    .filter(e=>e.receiptUrl && inYear(e.date, yr))
    .sort((a,b)=>a.date.localeCompare(b.date));
  if(!items.length){ showNotice(t('rp.title'),t('rp.none')); return; }

  toast(t('rp.building'));
  const { jsPDF } = window.jspdf || jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const W=210, H=297, M=14;
  const GREEN=[10,169,104], INK=[22,32,43], MUTED=[107,118,134], LINE=[236,239,243];

  // Load an image URL → {dataURL, w, h} via canvas (handles CORS + format)
  function loadImgData(url){
    return new Promise((resolve)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=>{
        try{
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
          ctx.drawImage(img, 0, 0);
          resolve({ dataURL: c.toDataURL('image/jpeg', 0.85), w:c.width, h:c.height });
        }catch(err){ resolve(null); }
      };
      img.onerror = ()=>resolve(null);
      img.src = url;
    });
  }
  function money(n){ return 'GBP '+Math.abs(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function catLabelAscii(id){
    // Use the user's own name if custom; otherwise the English built-in label
    const c = catById(id);
    if(c && c.custom) return c.name;
    const rn = (S.catRenames||{})[id];
    return rn || (I18N.en['cat.'+id] || id);
  }

  for(let i=0;i<items.length;i++){
    const e = items[i];
    if(i>0) doc.addPage();
    // Header band — English only (jsPDF core fonts can't render CJK/Arabic)
    doc.setFillColor(...GREEN); doc.rect(0,0,W,4,'F');
    doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(15);
    doc.text('Receipt Pack', M, 18);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text('Receipt '+(i+1)+' of '+items.length, W-M, 18, {align:'right'});

    const b = bizById(e.bizId);
    const dd = new Date(e.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    let y=28;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W-M*2, 26, 2, 2, 'S');
    doc.setFontSize(10); doc.setTextColor(...INK); doc.setFont('helvetica','bold');
    doc.text(pdfSafe(catLabelAscii(e.cat)), M+5, y+8);
    doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED); doc.setFontSize(9);
    doc.text(dd + (b?'  -  '+pdfSafe(b.name):''), M+5, y+15);
    doc.setFont('helvetica','bold'); doc.setTextColor(...INK); doc.setFontSize(12);
    doc.text(money(e.amount), W-M-5, y+11, {align:'right'});
    if(e.desc){ doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED); doc.setFontSize(8.5); doc.text(pdfSafe(String(e.desc).slice(0,60)), M+5, y+22); }

    const im = await loadImgData(e.receiptUrl);
    if(im && im.dataURL){
      const availW = W-M*2, availH = H-(y+26+8)-M;
      const ratio = Math.min(availW/im.w, availH/im.h);
      const dw=im.w*ratio, dh=im.h*ratio;
      const dx=(W-dw)/2, dyy=(y+26+8);
      try{ doc.addImage(im.dataURL, 'JPEG', dx, dyy, dw, dh); }catch(err){}
    } else {
      doc.setFont('helvetica','italic'); doc.setTextColor(...MUTED); doc.setFontSize(9);
      doc.text('(Receipt image could not be loaded)', W/2, 80, {align:'center'});
    }
  }
  doc.save('TaxMate-ReceiptPack-'+yr+'.pdf');
}

/* ═══════════ PDF Report Engine ═══════════ */
function generatePDF(){
  if(typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined'){
    showNotice(t('pdf.download'),'Reports are still loading. Please try again in a moment.'); return;
  }
  const { jsPDF } = window.jspdf || jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const yr = S.year;
  const tx = calcTax(yr);
  const cfg = tx.cfg;
  const W = 210, M = 14, CW = W - M*2;

  // ── colour palette ──
  const GREEN  = [10, 169, 104];
  const INK    = [22,  32,  43];
  const MUTED  = [107,118,134];
  const LINE   = [236,239,243];
  const WHITE  = [255,255,255];
  const AMBER  = [252,243,223];
  const AMBERT = [107, 80, 20];

  function pdfFmt(n){ return (n<0?'-':'')+'£'+Math.abs(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function setFont(size, weight, colour){
    doc.setFontSize(size);
    doc.setFont('helvetica', weight==='bold'?'bold':'normal');
    doc.setTextColor(...(colour||INK));
  }
  function hline(y, colour){ doc.setDrawColor(...(colour||LINE)); doc.setLineWidth(.3); doc.line(M,y,W-M,y); }
  function fillRect(x,y,w,h,colour){ doc.setFillColor(...colour); doc.rect(x,y,w,h,'F'); }

  let y = 0;

  // ══ COVER PAGE ══
  const user = cloudUser();
  const userName = user ? pdfSafe(user.displayName || user.email || '') : '';
  const bizNames = pdfSafe(S.businesses.map(b=>b.name).join(', '));
  const periodFrom = '6 Apr ' + yr.slice(0,4);
  const periodTo   = '5 Apr ' + yr.slice(5,7).replace(/^0/,'20');

  // full green background
  fillRect(0, 0, W, 297, [10,140,90]);
  // white card area
  fillRect(M, 60, CW, 140, WHITE);

  // logo text
  setFont(26,'bold',WHITE); doc.text('TaxMate', M+8, 46);
  setFont(12,'normal',[200,240,220]); doc.text('UK', M+72, 46);

  // card content
  setFont(9,'normal',[107,118,134]); doc.text(tEN('pdf.title').toUpperCase(), M+10, 78);
  setFont(20,'bold',INK); doc.text(yr, M+10, 92);
  if(userName){ setFont(11,'normal',INK); doc.text(userName, M+10, 104); }
  setFont(10,'normal',MUTED); doc.text(bizNames, M+10, userName?114:104);
  setFont(9,'normal',MUTED);
  doc.text(periodFrom + '  –  ' + periodTo, M+10, userName?126:116);
  doc.text(tEN('pdf.generated') + ': ' + new Date().toLocaleDateString(locale()), M+10, userName?134:124);

  // disclaimer at bottom of cover
  setFont(7,'normal',[200,240,220]);
  doc.text(tEN('pdf.disclaimer'), M+8, 268, {maxWidth:CW-16});

  // new page for content
  doc.addPage();
  y = 14;

  // ── HEADER BAND (content pages) ──
  fillRect(0, 0, W, 18, GREEN);
  setFont(9,'bold',WHITE); doc.text('TaxMate UK  ·  '+yr, M, 12);
  setFont(8,'normal',[200,240,220]);
  doc.text(bizNames, W-M, 12, {align:'right'});
  y = 26;



  // ── SUMMARY CARDS (2×2 grid) ──
  const cards = [
    {label:tEN('pdf.income'),  val:pdfFmt(tx.soleIncome),             bg:[230,247,240], fg:GREEN},
    {label:tEN('pdf.expenses'),val:pdfFmt(tx.soleExpenses),           bg:[253,237,238], fg:[200,50,55]},
    {label:tEN('pdf.profit'),  val:pdfFmt(tx.myProfit),               bg:[234,241,254], fg:[30,90,200]},
    {label:tEN('pdf.estTax'),  val:pdfFmt(Math.max(tx.liability,0)),  bg:AMBER,         fg:AMBERT},
  ];
  const cw = (CW-4)/2, ch = 16;
  cards.forEach((c,i)=>{
    const cx = M + (i%2)*(cw+4), cy = y + Math.floor(i/2)*(ch+3);
    fillRect(cx, cy, cw, ch, c.bg);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
    doc.text(c.label, cx+4, cy+5);
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...c.fg);
    doc.text(c.val, cx+4, cy+12);
  });
  y += 2*ch + 3*3 + 8;
  hline(y, LINE); y += 8;

  // ── INCOME TABLE ──
  const incEntries = entriesFor(yr, null, 'income').sort((a,b)=>a.date.localeCompare(b.date));
  setFont(11, 'bold', INK); doc.text(tEN('pdf.incomeDetail'), M, y); y += 5;
  if(incEntries.length){
    doc.autoTable({
      startY: y,
      margin:{left:M, right:M},
      headStyles:{fillColor:GREEN, textColor:WHITE, fontSize:8, fontStyle:'bold'},
      bodyStyles:{fontSize:8, textColor:INK},
      alternateRowStyles:{fillColor:[248,250,252]},
      columnStyles:{3:{halign:'right'}},
      head:[[tEN('pdf.date'), tEN('pdf.category'), tEN('pdf.description'), tEN('pdf.amount')]],
      body: incEntries.map(e=>[
        e.date,
        pdfSafe(catName(e.cat)),
        pdfSafe(e.desc||'-'),
        pdfFmt(e.amount)
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    setFont(8,'normal',MUTED); doc.text(tEN('pdf.noEntries'), M, y); y += 8;
  }

  // ── EXPENSE TABLE ──
  const expEntries = entriesFor(yr, null, 'expense').sort((a,b)=>a.date.localeCompare(b.date));
  if(y > 240){ doc.addPage(); y = 14; }
  setFont(11,'bold',INK); doc.text(tEN('pdf.expenseDetail'), M, y); y += 5;
  if(expEntries.length){
    doc.autoTable({
      startY: y,
      margin:{left:M, right:M},
      headStyles:{fillColor:[22,32,43], textColor:WHITE, fontSize:8, fontStyle:'bold'},
      bodyStyles:{fontSize:8, textColor:INK},
      alternateRowStyles:{fillColor:[248,250,252]},
      columnStyles:{3:{halign:'right'},4:{halign:'center'},5:{halign:'right'}},
      head:[[tEN('pdf.date'), tEN('pdf.category'), tEN('pdf.description'), tEN('pdf.amount'), tEN('pdf.bizPct'), tEN('pdf.claimable')]],
      body: expEntries.map(e=>[
        e.date,
        pdfSafe(catName(e.cat)),
        pdfSafe(e.desc||'-'),
        pdfFmt(e.amount),
        (e.pct==null?100:e.pct)+'%',
        pdfFmt(effExact(e))
      ]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    setFont(8,'normal',MUTED); doc.text(tEN('pdf.noEntries'), M, y); y += 8;
  }

  // ── TAX CALCULATION ──
  if(y > 220){ doc.addPage(); y = 14; }
  setFont(11,'bold',INK); doc.text(tEN('pdf.taxCalc'), M, y); y += 5;
  const taxRows = [
    [tEN('pdf.income'),   pdfFmt(tx.soleIncome)],
    [tEN('pdf.expenses'), '-'+pdfFmt(tx.soleExpenses).replace('-','')],
    [tEN('pdf.profit'),   pdfFmt(tx.myProfit)],
    [tEN('pdf.pa'),       '-'+pdfFmt(tx.pa).replace('-','')],
    [tEN('pdf.taxable'),  pdfFmt(tx.taxable)],
    [tEN('pdf.incomeTax'),pdfFmt(tx.incomeTax)],
    [tEN('pdf.class4'),   pdfFmt(tx.class4)],
    [tEN('pdf.total'),    pdfFmt(tx.liability)],
  ];
  doc.autoTable({
    startY: y,
    margin:{left:M, right:M},
    headStyles:{fillColor:[22,32,43], textColor:WHITE, fontSize:8, fontStyle:'bold'},
    bodyStyles:{fontSize:8, textColor:INK},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:{1:{halign:'right', fontStyle:'bold'}},
    head:[[tEN('pdf.taxCalc'), yr]],
    body: taxRows,
    didParseCell(data){
      if(data.row.index===taxRows.length-1 && data.section==='body'){
        data.cell.styles.fillColor = [230,247,240];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [6,122,75];
      }
    }
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── FOOTER DISCLAIMER ──
  if(y > 270){ doc.addPage(); y = 14; }
  hline(y, LINE); y += 5;
  setFont(7,'normal',MUTED);
  doc.text(tEN('pdf.disclaimer'), M, y, {maxWidth:CW});

  // ── SAVE ──
  const fname = 'taxmate-'+yr+'-'+new Date().toISOString().slice(0,10)+'.pdf';
  doc.save(fname);
}

/* ═══════════ Receipt photo engine ═══════════ */
function storageBucket(){
  try{ return fbConfigured() && FB.ready ? firebase.storage() : null; }catch(e){ return null; }
}
function receiptPath(entryId){ return `receipts/${firebase.auth().currentUser.uid}/${entryId}.jpg`; }

/* UI-09: presentation-only device check. Decides whether the receipt UI leads with
   camera capture or with a file upload. Touch/coarse-pointer devices get the camera
   first; pointer devices get the file picker. No upload, storage or sync behaviour
   depends on this — both paths call the same onReceiptFile()/onBatchReceiptFile(). */
function canCaptureWithCamera(){
  try{
    if(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) return true;
    return navigator.maxTouchPoints > 0;
  }catch(e){ return false; }
}
async function onReceiptFile(ev){
  const file = ev.target.files[0]; if(!file) return;
  ev.target.value='';
  if(!hasFeature('receiptPhoto')){ lockGuard('receiptPhoto'); return; }
  const selectedBusiness=bizById(document.getElementById('en-biz').value||(S.businesses[0]&&S.businesses[0].id));
  if(selectedBusiness&&selectedBusiness.syncCode&&!hasFeature('partnerSync')){showNotice(t('sy.title'),t('sy.readOnly'));return;}
  const st = document.getElementById('en-receipt-status');
  const saveBtn = document.getElementById('en-save');
  st.textContent = '⏳ ' + t('rc.uploading');
  st.style.color = 'var(--coral)';
  st.style.fontWeight = '700';
  EN.uploading = true;
  // 上載期間禁用 Save 掣，避免收據未上完就儲存
  if(saveBtn){ saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.textContent = '⏳ ' + t('rc.uploading'); }
  try{
    // 壓縮到 ~200KB
    const compressed = await compressImage(file, 1200, 0.82);
    const db = await ensureFB(); if(!db){ st.textContent = t('rc.uploadErr'); return; }
    const u = await ensureAuth(); if(!u){ st.textContent = t('rc.signinNeeded')||t('rc.uploadErr'); return; }
    // 等 auth token 真正 ready（匿名登入後 token 可能要一刻先 propagate）
    try{ await u.getIdToken(); }catch(_){}
    const entId = EN.id || uid();
    if(!EN.id) EN.id = entId;
    const path = `receipts/${u.uid}/${entId}.jpg`;
    const stor = firebase.storage();
    const ref = stor.ref(path);
    await ref.put(compressed, {contentType:'image/jpeg'});
    const url = await ref.getDownloadURL();
    EN.receiptUrl = url;
    EN.receiptPath = path;
    st.textContent = '';
    paintEntry();
  }catch(e){ console.warn(e); st.textContent=t('rc.uploadErr'); }
  finally{
    EN.uploading = false;
    if(saveBtn){ saveBtn.disabled = false; saveBtn.style.opacity = ''; saveBtn.textContent = t('c.save'); }
    // 如果用戶喺上載期間撳過 Save，上載完自動幫佢儲存
    if(EN._pendingSave){ EN._pendingSave = false; saveEntry(); }
  }
}

function compressImage(file, maxW, quality){
  return new Promise((res,rej)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW/Math.max(img.width,img.height));
      const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
      const c = document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      c.toBlob(b=>b?res(b):rej(new Error('compress fail')),'image/jpeg',quality);
    };
    img.onerror = rej;
    img.src = url;
  });
}

async function deleteReceiptFromStorage(path){
  if(!path || !FB.ready) return;
  try{ await firebase.storage().ref(path).delete(); }catch(e){}
}

// deleteEntry: 連相片一齊刪
const _origDeleteEntry = deleteEntry;
deleteEntry = function(){
  confirmAction(t('d.entryT'), t('d.entryM'), ()=>{
    const e = S.entries.find(x=>x.id===EN.id);
    S.entries = S.entries.filter(x=>x.id!==EN.id);
    if(e){ const tomb=TaxMateSync.tombstone(e,DEVICE_ID,Date.now()); S.tombstones.push(tomb); pushEntryRemote(tomb); if(e.receiptPath) deleteReceiptFromStorage(e.receiptPath); }
    save(); closeSheet('entry'); render(); toast(t('toast.deleted'));
  });
};

// Lightbox
let LB = {url:'', path:''};
function openLightbox(url, path){
  LB = {url, path};
  let lb = document.getElementById('taxmate-lightbox');
  if(!lb){
    lb = document.createElement('div');
    lb.id = 'taxmate-lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `<img id="lb-img" src=""><div class="lightbox-bar">
      <button data-tm-click="closeLightbox()">✕ Close</button>
      <button class="danger" data-tm-click="confirmDeleteReceipt()">${'🗑 '+t('rc.delete')}</button>
    </div>`;
    lb.addEventListener('click',e=>{ if(e.target===lb) closeLightbox(); });
    document.body.appendChild(lb);
  }
  document.getElementById('lb-img').src = url;
  lb.style.display = 'flex';
}
function closeLightbox(){ const lb=document.getElementById('taxmate-lightbox'); if(lb) lb.style.display='none'; }
function confirmDeleteReceipt(){
  closeLightbox();
  confirmAction(t('rc.deleteConfirm'), '', async()=>{
    if(LB.path) await deleteReceiptFromStorage(LB.path);
    // 更新 entry
    const e = S.entries.find(x=>x.receiptPath===LB.path||x.receiptUrl===LB.url);
    if(e){e.receiptUrl=null;e.receiptPath=null;Object.assign(e,TaxMateSync.touch(e,DEVICE_ID,Date.now()));pushEntryRemote(e);}
    if(EN.receiptPath===LB.path){ EN.receiptUrl=null; EN.receiptPath=null; paintEntry(); }
    save(); render();
  });
}

/* ═══════════ Back button handling ═══════════ */
function anySheetOpen(){
  return Array.from(document.querySelectorAll('.sb')).some(o=>o.classList.contains('open'));
}
function closeAllSheets(){
  document.querySelectorAll('.sb.open').forEach(o=>o.classList.remove('open'));
  document.body.classList.remove('sheet-open');
  setTimeout(maybeOpenPendingPwaSuggestion,0);
}
function setupBackButton(){
  // Seed two states: one base + one buffer the back button consumes first.
  history.pushState({tm:'base'}, '');
  history.pushState({tm:'buffer'}, '');
  window.addEventListener('popstate', (e)=>{
    // A sheet is open → check for dirty data before closing
    if(anySheetOpen()){
      // 對比快照：開 sheet 時 vs 而家，有任何欄位變咗就當 dirty
      const openSheetEl = document.querySelector('.sb.open .sheet');
      let hasDirty = false;
      if(openSheetEl && openSheetEl.dataset.snap !== undefined){
        hasDirty = sheetSnapshot(openSheetEl) !== openSheetEl.dataset.snap;
      }
      if(hasDirty){
        // Re-push so we stay in app, then show confirm
        history.pushState({tm:'buffer'}, '');
        confirmAction(
          t('c.discardConfirm')||'Discard changes?',
          t('c.discardConfirmM')||'Your unsaved changes will be lost.',
          ()=>{ closeAllSheets(); history.pushState({tm:'buffer'}, ''); }
        );
        return;
      }
      closeAllSheets();
      history.pushState({tm:'buffer'}, '');
      return;
    }
    // Not on Home → navigate Home, keep user in app
    if(S.tab !== 'home'){
      S.tab = 'home'; save(); render(); window.scrollTo(0,0);
      history.pushState({tm:'buffer'}, '');
      return;
    }
    // On Home, nothing open → let this back press fall through (exit/leave).
  });
}

/* ═══════════════════════════════════════════════════════════
   ONBOARDING — catch-up flow (writes into real S on finish)
   ═══════════════════════════════════════════════════════════ */
const OB_MONTHS_FULL = {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'};
const OB_MON_SHORT = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};
const OB_MILEAGE_RATE = (TAXCFG['2026-27'] && TAXCFG['2026-27'].mileageRate1) || 0.55;
function obTaxYear(){
  // the tax year of the latest month being entered (falls back to current)
  const ms = obActiveMonths();
  if(ms && ms.length){ const last=ms[ms.length-1]; return dateToTaxYear(last.year+'-'+String(last.m).padStart(2,'0')+'-15'); }
  return currentTaxYear();
}
function obMileageRate(){ const c=cfgFor(obTaxYear()); return (c&&c.mileageRate1)||OB_MILEAGE_RATE; }
// suggestion chips for expense categories (id maps to built-in CATS where possible)
const OB_SUGGEST = [
  {id:'vehicle',label:'Vehicle',e:'⛽'},{id:'travel',label:'Parking/Travel',e:'🅿️'},
  {id:'phone',label:'Phone',e:'📱'},{id:'home',label:'Home office',e:'🏠'},
  {id:'equip',label:'Equipment',e:'🧰'},{id:'stock',label:'Stock',e:'📦'},
  {id:'insure',label:'Insurance',e:'🛡️'},{id:'fees',label:'Fees',e:'💼'},
  {id:'market',label:'Advertising',e:'📣'},{id:'repair',label:'Repairs',e:'🔧'}
];

let OB = null; // active onboarding state

function obStartMonthList(){
  // months from the start of the CURRENT UK tax year up to this month
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth()+1; // 1-12
  // tax year start = 6 April of (this year if we're past April, else last year)
  const tyStartYear = (mo>=4) ? y : y-1;
  const list=[]; // each: {m: 1-12, year, label}
  let cy=tyStartYear, cm=4;
  while(true){
    list.push({m:cm, year:cy});
    if(cy===now.getFullYear() && cm===mo) break;
    cm++; if(cm>12){cm=1;cy++;}
    if(list.length>13) break; // safety
  }
  return list;
}

function obDefaultState(loggedIn){
  return {
    screen:'login', loggedIn:!!loggedIn,
    bizName:'', structure:'sole', share:50, partnerCode:'',
    cats:[],                 // (no longer chosen in onboarding; kept for compat)
    monthsAll: obStartMonthList(),
    startIdx:0,
    cursor:0,
    data:{}
  };
}
function obKey(mObj){ return mObj.year+'-'+mObj.m; }
function obMonthData(mObj){
  const k=obKey(mObj);
  if(!OB.data[k]) OB.data[k]={inRows:[{d:'',v:'',day:''}],inGrouped:false,inGroups:[],outGroups:[],milesOpen:false,miles:'',addCat:{in:false,out:false},newCat:{in:'',out:''},newCatE:{in:'',out:''},emojiPickerOpen:{in:false,out:false}};
  if(!OB.data[k].emojiPickerOpen) OB.data[k].emojiPickerOpen={in:false,out:false};
  if(!OB.data[k].newCatE) OB.data[k].newCatE={in:'',out:''};
  return OB.data[k];
}
function obActiveMonths(){ return OB.monthsAll.slice(OB.startIdx); }
function obMonthTotal(mObj,kind){
  const d=obMonthData(mObj);
  if(kind==='in'){
    if(d.inGrouped) return d.inGroups.reduce((s,g)=>s+g.rows.reduce((t,r)=>t+(parseFloat(r.v)||0),0),0);
    return d.inRows.reduce((t,r)=>t+(parseFloat(r.v)||0),0);
  }
  return d.outGroups.reduce((s,g)=>s+g.rows.reduce((t,r)=>t+(parseFloat(r.v)||0),0),0);
}
function obGrand(kind){ return obActiveMonths().reduce((s,m)=>s+obMonthTotal(m,kind),0); }
function obGrandMiles(){ return obActiveMonths().reduce((s,m)=>s+(parseFloat(obMonthData(m).miles)||0),0); }

// ---- entry points ----
function obEnsureRoot(){
  return TaxMateOnboardingRoot.ensure(document);
}
function startOnboarding(){
  OB = obDefaultState(false);
  TaxMateOnboardingRoot.open(document);
  obRender();
}
function obClose(){
  TaxMateOnboardingRoot.close(document);
  OB=null;
}
function obRender(){
  const fns={login:obScrLogin,entry:obScrEntry,biz:obScrBiz,pickbiz:obScrPickBiz,start:obScrStart,month:obScrMonth,done:obScrDone};
  const r=obEnsureRoot();
  // 同一頁重繪（加分類／加行／改日期）保住捲動位置；轉頁或轉月先跳返頂
  const view = OB.screen + (OB.screen==='month' ? ':'+OB.cursor : '');
  const keep = (OB._lastView===view) ? r.scrollTop : 0;
  r.innerHTML = fns[OB.screen]();
  OB._lastView = view;
  r.scrollTop = keep;
}
function obGo(s){ TaxMateOnboardingRoot.progress(OB,s,obRender); }
function obProgress(pct,label,back){
  return `<div class="ob-progtop"><div class="ob-wrap">
    <div class="ob-prow">${back?`<button class="ob-back" data-tm-click="${back}">‹</button>`:''}<div class="ob-plabel">${label}</div></div>
    <div class="ob-ptrack"><div class="ob-pfill" style="width:${pct}%"></div></div>
  </div></div>`;
}
// wrap scrollable body + sticky-in-flow footer for the flex app-shell layout
function obShell(progHTML, bodyHTML, footHTML){
  return progHTML
    + `<div class="ob-scroll"><div class="ob-wrap ob-step">${bodyHTML}</div></div>`
    + (footHTML ? `<div class="ob-foot"><div class="ob-wrap">${footHTML}</div></div>` : '');
}

/* LOGIN */
function obScrLogin(){
  return `<div class="ob-scroll"><div class="ob-wrap ob-step" style="padding-top:52px">
    <div class="ob-logo"><div class="lo-mark">£</div><div class="lo-name">Tax<span>Mate</span></div></div>
    <h1>${t('ob.h1')}</h1>
    <p class="ob-lede">${t('ob.lede')}</p>
    <button class="ob-tile solid" data-tm-click="obSignIn()"><span><span class="ob-tt">${t('ob.signIn')}</span><span class="ob-ts">${t('ob.signInS')}</span></span></button>
    <button class="ob-tile" data-tm-click="obNoLogin()"><span><span class="ob-tt">${t('ob.noAcc')}</span><span class="ob-ts">${t('ob.noAccS')}</span></span></button>
    <div style="margin-top:18px;font-size:13px;color:var(--muted,#8a9);text-align:center;line-height:1.5;opacity:.85">${t('ob.codeLogin')}</div>
    <div class="ob-langfoot"><button class="ob-langlink" data-tm-click="obToggleLang()">${LANG_NAMES[S.settings.lang]} ›</button></div>
  </div></div>${obLangSheet()}`;
}
function obLangSheet(){
  if(!OB._langOpen) return '';
  return `<div class="ob-sheet-back" data-tm-click="obToggleLang()"></div>
    <div class="ob-sheet" role="dialog">
      <div class="ob-sheet-grip"></div>
      <div class="ob-sheet-title">${t('ob.chooseLang')}</div>
      ${Object.keys(LANG_NAMES).map(l=>`<button class="ob-sheet-row ${S.settings.lang===l?'on':''}" data-tm-click="obSetLang('${l}')"><span>${LANG_NAMES[l]}</span>${S.settings.lang===l?'<span class="ob-sheet-tick">✓</span>':''}</button>`).join('')}
    </div>`;
}
function obToggleLang(){ OB._langOpen=!OB._langOpen; obRender(); }
async function obSignIn(){
  // Keep onboarding pending until cloud account detection has finished. A successful Google
  // popup alone does not mean this is a new user.
  OB && (OB._signingInFlow = true);
  if(typeof signIn==='function' && fbConfigured()){
    try{
      await signIn('google');
      const u = (typeof cloudUser==='function') ? cloudUser() : null;
      const result=u?await startUserSync(u):{state:'failed',existingCloudAccount:false};
      if(result.existingCloudAccount){applyHydratedAccountResult(result);return;}
      if(!OB)return;
      if(result.state!=='converged'){OB._signingInFlow=false;OB.loggedIn=false;renderSyncStatus();return;}
      OB.loggedIn=true;
    }catch(e){ if(OB){OB._signingInFlow=false;OB.loggedIn=false;}return; }
  } else {
    if(OB) OB.loggedIn = true;
  }
  if(OB){ OB._signingInFlow = false; obGo('entry'); }
}
function obNoLogin(){ OB.loggedIn=false; obGo('entry'); }

/* ENTRY */
function obScrEntry(){
  return `<div class="ob-scroll"><div class="ob-wrap ob-step" style="padding-top:52px">
    <h1>${t('ob.howStart')}</h1>
    <button class="ob-tile" data-tm-click="obGo('biz')"><span><span class="ob-tt">${t('ob.together')}</span><span class="ob-ts">${t('ob.togetherS')}</span></span></button>
    <button class="ob-tile" data-tm-click="obExplore()"><span><span class="ob-tt">${t('ob.dash')}</span><span class="ob-ts">${t('ob.dashS')}</span></span></button>
    <div style="margin-top:14px;font-size:13px;color:var(--muted,#8a9);text-align:center;line-height:1.5;opacity:.85">${t('ob.codeEntry')}</div>
  </div></div>`;
}
function obExplore(){
  // mark onboarding as skipped (explore), close, land on app welcome/home
  try{ localStorage.setItem('tmOnboardDone','explore'); }catch(e){}
  obClose();
  render();
}

/* STEP 1 — business name + structure (structure/share% shown to everyone; sync is separate) */
function obScrBiz(){
  const isSole = (OB.structure||'sole')==='sole';
  const share = OB.share || 50;
  // 結構 + 佔幾多% —— 開放畀所有人（影響報幾多稅），唔再淨係登入先出
  const structureCard = `
    <div class="ob-card">
      <label>${t('ob.run')}</label>
      <div class="ob-seg">
        <button class="${isSole?'on':''}" data-tm-click="obSetStruct('sole')">${t('b.justMe')}</button>
        <button class="${!isSole?'on':''}" data-tm-click="obSetStruct('partnership')">${t('ob.partner')}</button>
      </div>
    </div>
    ${!isSole ? `
    <div class="ob-card">
      <label>${t('ob.shareLabel')}</label>
      <div class="ob-sharewrap">
        <input type="number" id="ob-share" inputmode="numeric" min="1" max="100" value="${share}" data-tm-input="obSetShare(this.value)">
        <span class="ob-sharepct">%</span>
      </div>
      <p class="ob-hint" style="margin-top:8px">${t('ob.shareHint')}</p>
    </div>
    <div class="ob-card flat" style="margin-top:4px">
      <div class="ob-seclabel"><span class="ob-dot in"></span> ${t('ob.syncTitle')}<sup class="ob-probadge">Pro</sup></div>
      <p class="ob-hint" style="margin:0">${t('ob.syncPro')}</p>
    </div>` : ''}`;
  return obShell(
    obProgress(25,t('ob.step1'),"obGo('entry')"),
    `<h1>${t('ob.whatDo')}</h1>
    <p class="ob-lede">${t('ob.bizLede')}</p>
    <div class="ob-card">
      <label>${t('ob.bizName')}</label>
      <input type="text" id="ob-bizname" placeholder="${t('ob.bizPh')}" value="${esc(OB.bizName)}" data-tm-input="OB.bizName=this.value;document.getElementById('ob-s1next').disabled=!this.value.trim()">
      <div class="ob-hint">${t('ob.bizEg')}</div>
    </div>
    ${structureCard}`,
    `<button class="ob-btn" id="ob-s1next" ${OB.bizName.trim()?'':'disabled'} data-tm-click="obGo('start')">${t('ob.continue')}</button>`
  );
}
function obSetStruct(s){ OB.structure=s; if(s==='sole') OB.partnerCode=''; obRender(); }
function obSetShare(v){ let n=parseInt(v,10); if(isNaN(n)) n=50; n=Math.max(1,Math.min(100,n)); OB.share=n; }

/* STEP 2 — start month */
/* CATCH-UP: pick which business to add past months to (only shown when >1 business) */
function obScrPickBiz(){
  const tiles = S.businesses.map(b=>{
    const col = bizColor(b);
    const letter = esc((b.name||'?').trim().charAt(0).toUpperCase());
    const sub = b.structure==='partnership' ? t('ob.partTag',{s:(b.share||50)}) : t('ob.soleTag');
    return `<button class="ob-tile" data-tm-click="obPickCatchupBiz('${b.id}')">
      <span class="ob-emoji" style="width:34px;height:34px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0">${letter}</span>
      <span><span class="ob-tt">${esc(b.name)}</span><span class="ob-ts">${sub}</span></span>
    </button>`;
  }).join('');
  return obShell(
    obProgress(10,t('ob.catchBiz'),'obClose()'),
    `<h1>${t('ob.whichBiz')}</h1>
    <p class="ob-lede">${t('ob.pickLede')}</p>
    ${tiles}`
  );
}
function obPickCatchupBiz(id){ OB._catchupBizId = id; obGo('start'); }
function obScrStart(){
  const opts = OB.monthsAll.map((mo,i)=>
    `<button class="ob-tile" data-tm-click="obPickStart(${i})">
      <span class="ob-emoji">📅</span><span><span class="ob-tt">${obMonFull(mo.m)} ${mo.year}</span><span class="ob-ts">${t('ob.addFrom',{m:obMonFull(mo.m)})}</span></span>
    </button>`).join('');
  const label = OB._catchup ? t('ob.catchMonth') : t('ob.step2');
  const back  = OB._catchup ? (S.businesses.length>1 ? "obGo('pickbiz')" : 'obClose()') : "obGo('biz')";
  return obShell(
    obProgress(OB._catchup?10:40, label, back),
    `<h1>${t('ob.whereStart')}</h1>
    <p class="ob-lede">${t('ob.startLede')}</p>
    ${opts}
    <p class="ob-hint ob-center ob-mt8">${t('ob.taxYearNote')}</p>`
  );
}
function obPickStart(i){ OB.startIdx=i; OB.cursor=0; obGo('month'); }

/* day picker */
function obDayPicker(mObj,val,setExpr){
  const sh=obMonShort(mObj.m);
  // UK tax year runs 6 Apr → 5 Apr. Constrain the day list so no out-of-year date can be picked.
  const ty = dateToTaxYear(mObj.year+'-'+String(mObj.m).padStart(2,'0')+'-15');
  const startY = parseInt(ty.slice(0,4));
  let lo=1, hi=new Date(mObj.year, mObj.m, 0).getDate();
  if(mObj.m===4 && mObj.year===startY) lo=6;        // first month of the tax year: 6th onward
  if(mObj.m===4 && mObj.year===startY+1) hi=5;      // final month of the tax year: up to 5th
  let opts=`<option value="" ${val===''?'selected':''}>${t('f.tbc2')}</option>`;
  for(let d=lo;d<=hi;d++) opts+=`<option value="${d}" ${String(val)===String(d)?'selected':''}>${d} ${sh}</option>`;
  const label = val==='' ? t('f.date') : `${val} ${sh}`;
  return `<span class="ob-daywrap"><span class="ob-daylabel ${val===''?'empty':''}">${label}</span><select class="ob-daysel" data-tm-change="${setExpr}">${opts}</select></span>`;
}

/* STEP 3 — per month */
function obScrMonth(){
  const months=obActiveMonths(), total=months.length, idx=OB.cursor, mObj=months[idx], m=mObj.m;
  const d=obMonthData(mObj);
  const pct=40+Math.round((idx/total)*50);
  const isLast=idx===total-1;
  const full=obMonFull(m);

  // a single editable row: [Date] [Details] [£] [×]
  const rowHTML = (kind,gi,ri,r,setExpr,delExpr,ph) => `
    <div class="ob-frow"><div class="ob-fline">
      ${obDayPicker(mObj, r.day, setExpr('day'))}
      <input type="text" class="ob-fdesc" placeholder="${ph||t('ob.details')}" value="${esc(r.d||'')}" data-tm-input="${setExpr('d')}">
      <div class="ob-famt"><span class="ob-cur">£</span><input type="number" inputmode="decimal" placeholder="0.00" value="${r.v}" data-tm-input="${setExpr('v')}"></div>
      <button class="ob-del" data-tm-click="${delExpr}">×</button>
    </div></div>`;

  // category-folder block (used by expenses always, and income when grouped)
  const folderHTML = (kind,g,gi) => {
    const sum = g.rows.reduce((s,r)=>s+(parseFloat(r.v)||0),0);
    const rows = g.rows.map((r,ri)=>rowHTML(kind,gi,ri,r,
      (f)=>`obSetRow('${kind}',${gi},${ri},'${f}',this.value)`,
      `obDelRow('${kind}',${gi},${ri})`)).join('');
    return `<div class="ob-folder">
      <div class="ob-fhead" data-tm-click="obToggleGroup('${kind}',${gi})">
        <span class="ob-fcaret">${g.open?'▼':'▶'}</span>
        <span class="ob-fname">${esc(g.e||'📁')} ${esc(g.name)}</span>
        <span class="ob-fsum">£${sum.toFixed(2)}</span>
        <button class="ob-fdel" data-tm-click="event.stopPropagation();obDelGroup('${kind}',${gi})">🗑️</button>
      </div>
      ${g.open?`<div class="ob-fbody">${rows}<button class="ob-additem" data-tm-click="obAddRow('${kind}',${gi})">＋ ${t('ob.addAnother')}</button></div>`:''}
    </div>`;
  };

  // chips of categories already used in other months — one tap re-adds the folder here
  OB._prevCats = {in:obPrevCats('in'), out:obPrevCats('out')};
  const prevCatChips = (kind) => {
    const l = OB._prevCats[kind];
    if(!l.length) return '';
    return `<div class="ob-prevcats"><span class="ob-pclab">${t('ob.addAgain')}</span>${l.map((c,i)=>
      `<button class="ob-pchip" data-tm-click="obAddPrevCat('${kind}',${i})">${c.e?esc(c.e)+' ':''}${esc(c.name)}</button>`).join('')}</div>`;
  };

  // tap-to-pick emoji grid — reuses the existing CAT_EMOJIS list (already curated, never actually rendered anywhere until now)
  const emojiGridHTML = (kind) => (d.emojiPickerOpen&&d.emojiPickerOpen[kind])
    ? `<div class="ob-emojigrid" id="ob-emojigrid-${kind}">
         ${CAT_EMOJIS.map(e=>`<button type="button" class="ob-egbtn" data-tm-click="obPickCatEmoji('${kind}','${e}')">${e}</button>`).join('')}
         <button type="button" class="ob-egclose" data-tm-click="obCloseEmojiPicker('${kind}')">${t('ob.close')}</button>
       </div>` : '';

  // inline "add category" input (no popup)
  const addCatHTML = (kind) => d.addCat[kind]
    ? `<div class="ob-newcat">
         <input type="text" id="ob-newcat-e-${kind}" class="ob-ncemoji" aria-label="Icon" placeholder="📁" value="${esc((d.newCatE&&d.newCatE[kind])||'')}" data-tm-input="obTypeNewCatEmoji('${kind}',this)" data-tm-focus="obOpenEmojiPicker('${kind}')">
         <input type="text" id="ob-newcat-${kind}" class="ob-fdesc" placeholder="${kind==='in'?t('ob.catInPh'):t('ob.catOutPh')}" value="${esc(d.newCat[kind]||'')}" data-tm-input="obTypeNewCat('${kind}',this.value)" data-tm-keydown="if(event.key==='Enter')obConfirmAddCat('${kind}')">
         <button class="ob-ncok" data-tm-click="obConfirmAddCat('${kind}')">✓</button>
         <button class="ob-nccancel" data-tm-click="obCancelAddCat('${kind}')">×</button>
       </div>
       ${emojiGridHTML(kind)}`
    : prevCatChips(kind) + `<button class="ob-addcat" data-tm-click="obStartAddCat('${kind}')">＋ ${t('ob.addCat')}</button>`;

  // MONEY IN
  let inHTML;
  if(d.inGrouped){
    inHTML = d.inGroups.map((g,gi)=>folderHTML('in',g,gi)).join('') + addCatHTML('in');
  } else {
    const simple = d.inRows.map((r,ri)=>rowHTML('in',0,ri,r,
      (f)=>`obSetSimpleRow(${ri},'${f}',this.value)`,
      `obDelSimpleRow(${ri})`,t('ob.from'))).join('');
    inHTML = `<div class="ob-fbody open">${simple}<button class="ob-additem" data-tm-click="obAddSimpleRow()">＋ ${t('ob.addAnother')}</button></div>
      <button class="ob-groupbtn" data-tm-click="obGroupIncome()">⊕ ${t('ob.split')}</button>${prevCatChips('in')}`;
  }
  // MONEY OUT (always categories)
  const outHTML = d.outGroups.map((g,gi)=>folderHTML('out',g,gi)).join('')
    + (d.outGroups.length?'':`<p class="ob-hint" style="margin:2px 0 10px">${t('ob.pickIcon')}</p>`)
    + addCatHTML('out');

  const renderIn = () => inHTML;
  const renderOut = () => outHTML;

  return obShell(
    obProgress(pct,t('ob.step3',{a:idx+1,b:total}), idx===0?"obGo('start')":'obPrevMonth()'),
    `<div class="ob-mhead"><div class="ob-mname">${full} ${mObj.year}</div><div class="ob-mtag">${esc(OB.bizName||t('ob.yourWork'))}</div></div>
    <div class="ob-card"><div class="ob-seclabel"><span class="ob-dot in"></span> ${t('home.in')}</div>${renderIn()}</div>
    <div class="ob-card"><div class="ob-seclabel"><span class="ob-dot out"></span> ${t('home.out')}</div>${renderOut()}</div>
    <div class="ob-card flat">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:14px;font-weight:700;color:var(--muted)">${t('ob.drive')}</span>
        ${d.milesOpen?'':`<button class="ob-btn soft sm" data-tm-click="obOpenMiles()">${t('ob.addMiles')}</button>`}
      </div>
      ${d.milesOpen?`<label style="margin-top:12px">${t('ob.milesIn',{m:full})}</label><input type="number" inputmode="numeric" placeholder="${t('ob.milesPh')}" value="${d.miles}" data-tm-input="obMiles(this.value)"><div class="ob-hint">${t('ob.mileHintA',{p:Math.round(OB_MILEAGE_RATE*100)})}${d.miles?t('ob.mileHintB',{x:(parseFloat(d.miles)*OB_MILEAGE_RATE).toFixed(2)}):''}${t('ob.mileHintC')}</div><div class="ob-mt8"><button class="ob-link muted" data-tm-click="obCloseMiles()">${t('ob.noDrive')}</button></div>`:''}
    </div>
    <div class="ob-totalpill"><span class="ob-tpl">${t('ob.soFar',{m:full})}</span><span class="ob-tpv">£${(obMonthTotal(mObj,'in')-obMonthTotal(mObj,'out')).toFixed(2)}</span></div>`,
    `<button class="ob-btn" data-tm-click="obNextMonth()">${isLast?t('ob.finishBtn'):t('ob.nextMonth')}</button>`
  );
}
function obCurMonth(){ return obActiveMonths()[OB.cursor]; }
function obGroups(kind){ const d=obMonthData(obCurMonth()); return kind==='in'?d.inGroups:d.outGroups; }
/* simple (ungrouped) income rows */
function obAddSimpleRow(){ const d=obMonthData(obCurMonth()); d.inRows.push({d:'',v:'',day:''}); obRender(); }
function obDelSimpleRow(ri){ const d=obMonthData(obCurMonth()); d.inRows.splice(ri,1); if(!d.inRows.length) d.inRows.push({d:'',v:'',day:''}); obRender(); }
function obSetSimpleRow(ri,field,val){ const d=obMonthData(obCurMonth()); if(!d.inRows[ri])return; d.inRows[ri][field]=val; if(field==='day') obRender(); else obRefreshPill(); }
/* switch income into category mode — immediately show the name input (no auto folder) */
function obGroupIncome(){
  const d=obMonthData(obCurMonth());
  d.inGrouped=true;
  d.addCat.in=true; d.newCat.in='';
  obRender();
  setTimeout(()=>{const el=document.getElementById('ob-newcat-in'); if(el)el.focus();},30);
}
/* categories used in OTHER months but not this one — offered as one-tap chips */
function obPrevCats(kind){
  const cur=obMonthData(obCurMonth());
  const curKey=obKey(obCurMonth());
  const curNames=new Set((kind==='in'?cur.inGroups:cur.outGroups).map(g=>g.name.toLowerCase()));
  const out=[], seen=new Set();
  Object.keys(OB.data).forEach(k=>{
    if(k===curKey) return;
    const d=OB.data[k]; if(!d) return;
    ((kind==='in'?d.inGroups:d.outGroups)||[]).forEach(g=>{
      const key=(g.name||'').toLowerCase();
      if(key && !curNames.has(key) && !seen.has(key)){ seen.add(key); out.push({name:g.name, e:g.e||''}); }
    });
  });
  return out;
}
function obAddPrevCat(kind,i){
  const c = OB._prevCats && OB._prevCats[kind] && OB._prevCats[kind][i];
  if(!c) return;
  const d=obMonthData(obCurMonth());
  if(kind==='in') d.inGrouped=true;
  obGroups(kind).push({id:'g_'+uid(), name:c.name, e:c.e||'', open:true, rows:[{d:'',v:'',day:''}]});
  obRender();
}
/* inline "Add category" — reveals a text input in the page (no popup) */
function obStartAddCat(kind){ const d=obMonthData(obCurMonth()); d.addCat[kind]=true; d.newCat[kind]=''; d.newCatE[kind]=''; obRender(); setTimeout(()=>{const el=document.getElementById('ob-newcat-'+kind); if(el)el.focus();},30); }
function obCancelAddCat(kind){
  const d=obMonthData(obCurMonth());
  d.addCat[kind]=false; d.newCat[kind]=''; d.newCatE[kind]='';
  if(kind==='in' && !d.inGroups.length) d.inGrouped=false; // nothing added → back to simple rows
  obRender();
}
function obTypeNewCat(kind,val){ const d=obMonthData(obCurMonth()); d.newCat[kind]=val; }
// 判斷係咪真係一個 emoji(唔係普通字母/數字)。用 Extended_Pictographic 唔用 \p{Emoji} ——
// \p{Emoji} 因為歷史原因連 0-9、#、* 都算(keycap sequence 嘅底),\p{Extended_Pictographic} 先啱用嚟分真假 emoji
function isEmojiIcon(s){
  if(!s) return false;
  try{ return /\p{Extended_Pictographic}/u.test(s); }
  catch(e){ return true; } // 舊瀏覽器唔支援就寬鬆處理,唔好因為呢個擋晒所有人
}
/* tap the icon box → open a grid of ready-made emoji, so people don't have to hunt through their own keyboard */
function obOpenEmojiPicker(kind){
  const d=obMonthData(obCurMonth());
  if(!d.emojiPickerOpen) d.emojiPickerOpen={in:false,out:false};
  if(d.emojiPickerOpen[kind]) return; // already open — re-rendering again would just steal focus for nothing
  d.emojiPickerOpen[kind]=true;
  obRender();
  setTimeout(()=>{const el=document.getElementById('ob-newcat-e-'+kind); if(el) el.focus();},30);
}
function obCloseEmojiPicker(kind){
  const d=obMonthData(obCurMonth());
  if(d.emojiPickerOpen) d.emojiPickerOpen[kind]=false;
  obRender();
}
function obPickCatEmoji(kind,e){
  const d=obMonthData(obCurMonth());
  d.newCatE[kind]=e;
  if(d.emojiPickerOpen) d.emojiPickerOpen[kind]=false;
  obRender();
  setTimeout(()=>{const el=document.getElementById('ob-newcat-'+kind); if(el) el.focus();},30); // hop straight to the name field next
}
/* icon box keeps exactly ONE emoji — picking a new one replaces the old; 打錯(例如字母)一律唔接受 */
function obTypeNewCatEmoji(kind,el){
  const d=obMonthData(obCurMonth());
  const g=lastGrapheme(el.value);
  if(g && !isEmojiIcon(g)){
    // 唔係真 emoji ——唔接受,個格彈返去上一個有效值,閃一閃紅框提示打錯咗
    el.value=(d.newCatE&&d.newCatE[kind])||'';
    el.classList.add('err');
    setTimeout(()=>el.classList.remove('err'),300);
    return;
  }
  d.newCatE[kind]=g;
  el.value=g;
  el.classList.remove('err');
  // 用戶自己用鍵盤打咗個有效 emoji ——個 grid 都可以收埋喇,直接郁 DOM 唔使成頁 obRender(),唔會累事甩焦點
  if(g && d.emojiPickerOpen && d.emojiPickerOpen[kind]){
    d.emojiPickerOpen[kind]=false;
    const grid=document.getElementById('ob-emojigrid-'+kind); if(grid) grid.remove();
  }
}
function obConfirmAddCat(kind){
  const d=obMonthData(obCurMonth());
  const name=(d.newCat[kind]||'').trim();
  if(!name){ obCancelAddCat(kind); return; }
  let emoji=(d.newCatE&&d.newCatE[kind])||'';
  if(!emoji || !isEmojiIcon(emoji)) emoji='📁'; // icon optional — default to folder
  if(kind==='in') d.inGrouped=true;
  obGroups(kind).push({id:'g_'+uid(), name:name.slice(0,28), e:emoji, open:true, rows:[{d:'',v:'',day:''}]});
  d.addCat[kind]=false; d.newCat[kind]=''; if(d.newCatE)d.newCatE[kind]='';
  obRender();
}
function obDelGroup(kind,gi){
  const d=obMonthData(obCurMonth());
  obGroups(kind).splice(gi,1);
  if(kind==='in' && !d.inGroups.length){ d.inGrouped=false; } // back to simple rows
  obRender();
}
function obToggleGroup(kind,gi){ const g=obGroups(kind)[gi]; if(g){ g.open=!g.open; obRender(); } }
function obAddRow(kind,gi){ const g=obGroups(kind)[gi]; if(g){ g.rows.push({d:'',v:'',day:''}); obRender(); } }
function obDelRow(kind,gi,ri){ const g=obGroups(kind)[gi]; if(g){ g.rows.splice(ri,1); if(!g.rows.length) g.rows.push({d:'',v:'',day:''}); obRender(); } }
function obSetRow(kind,gi,ri,field,val){
  const g=obGroups(kind)[gi]; if(!g||!g.rows[ri]) return;
  g.rows[ri][field]=val;
  if(field==='day') obRender(); else obRefreshPill();
}
function obMiles(v){ obMonthData(obCurMonth()).miles=v; }
function obOpenMiles(){ obMonthData(obCurMonth()).milesOpen=true; obRender(); }
function obCloseMiles(){ const d=obMonthData(obCurMonth()); d.milesOpen=false; d.miles=''; obRender(); }
function obRefreshPill(){ const mObj=obCurMonth(); const p=document.querySelector('#ob-root .ob-tpv'); if(p) p.textContent='£'+(obMonthTotal(mObj,'in')-obMonthTotal(mObj,'out')).toFixed(2); }
function obPrevMonth(){ if(OB.cursor>0){OB.cursor--;obRender();} else obGo('start'); }
function obNextMonth(){ const total=obActiveMonths().length; if(OB.cursor<total-1){OB.cursor++;obRender();} else obGo('done'); }

/* count items needing later review */
function obCountReview(){
  let n=0;
  obActiveMonths().forEach(mObj=>{
    const d=obMonthData(mObj);
    const inRows = d.inGrouped ? d.inGroups.flatMap(g=>g.rows) : d.inRows;
    const outRows = d.outGroups.flatMap(g=>g.rows);
    [...inRows,...outRows].forEach(r=>{ if((parseFloat(r.v)||0)>0 && r.day==='') n++; });
  });
  return n;
}

/* DONE */
function obScrDone(){
  const _cfg=cfgFor(obTaxYear());
  const inc=obGrand('in'), exp=obGrand('out'), miles=obGrandMiles(), mileDed=miles*obMileageRate();
  const profit=inc-exp-mileDed;
  const est=estimateIncomeAndNIC(profit, _cfg);
  const months=obActiveMonths();
  const first=months[0], last=months[months.length-1];
  const rev=obCountReview();
  const revLine = rev>0
    ? `<p class="ob-lede ob-center" style="margin-top:4px">${t('ob.revLine',{n:rev})}</p>`
    : `<p class="ob-lede ob-center" style="margin-top:4px">${t('ob.cleanLine')}</p>`;
  return obShell(
    obProgress(100,t('ob.allCaught'),''),
    `<div class="ob-confetti">🎉</div>
    <div class="ob-donehero"><div class="ob-dl">${t('ob.estLabel')}</div><div class="ob-big">£${Math.max(0,est).toFixed(0)}</div><div style="font-size:13px;opacity:.9">${t('ob.basedOn',{n:months.length})}</div></div>
    <div class="ob-card">
      <div class="ob-srow"><span class="ob-sl">${t('ob.monthsAdded')}</span><span class="ob-sv">${obMonShort(first.m)} – ${obMonShort(last.m)} ${last.year}</span></div>
      <div class="ob-srow"><span class="ob-sl">${t('ob.totIn')}</span><span class="ob-sv" style="color:var(--brand-deep)">£${inc.toFixed(2)}</span></div>
      <div class="ob-srow"><span class="ob-sl">${t('ob.totOut')}</span><span class="ob-sv" style="color:var(--coral)">−£${exp.toFixed(2)}</span></div>
      ${miles?`<div class="ob-srow"><span class="ob-sl">${t('ob.mileRow',{n:miles})}</span><span class="ob-sv" style="color:var(--coral)">−£${mileDed.toFixed(2)}</span></div>`:''}
      <div class="ob-srow"><span class="ob-sl">${t('ob.profitFar')}</span><span class="ob-sv">£${profit.toFixed(2)}</span></div>
      ${OB.partnerCode?`<div class="ob-srow"><span class="ob-sl">${t('ob.partnerSync')}</span><span class="ob-sv" style="color:var(--brand-deep)">${esc(OB.partnerCode)}</span></div>`:''}
    </div>
    ${revLine}`,
    `<button class="ob-btn" data-tm-click="obFinish()">${t('ob.goDash')}</button>
    <p class="ob-hint ob-center ob-mt8">${t('ob.estWarn')}</p>`
  );
}

/* ═══ COMMIT to real S ═══ */
function obFinish(){
  // Catch-up 模式（現有用戶補月份）：唔好開新 business，掛落用戶揀咗嗰個現有 business。
  const catchup = !!(OB && OB._catchup) && S.businesses.length>0;
  const existingBiz = catchup ? (bizById(OB._catchupBizId) || S.businesses[0]) : null;
  const newId = existingBiz ? existingBiz.id : uid();
  const pad = n => String(n).padStart(2,'0');
  // 1) create business only in the genuine first-run flow
  if(!existingBiz){
    const isPart = OB.structure==='partnership';
    const shareVal = isPart ? Math.max(1,Math.min(100, OB.share||50)) : 100;
    const newBiz = TaxMateSync.touch({id:newId,name:(OB.bizName||'My work').trim(),structure:isPart?'partnership':'sole',share:shareVal,recordType:'business'},DEVICE_ID,Date.now());
    if(isPart && OB.partnerCode && OB.loggedIn) newBiz.syncCode = OB.partnerCode;
    S.businesses.push(newBiz);
    OB._newBiz = newBiz; // 記低畀後面 sync 用
  }
  // 2) seed category containers (income uses 'sales'; expense categories come from the user's folders)
  if(!S.customCats[newId]) S.customCats[newId]={income:[],expense:[]};
  if(!S.activeCats[newId]) S.activeCats[newId]={income:['sales'],expense:[]};

  // 3) write all month entries
  const mkDate=(mObj,day)=>{ const dd=day?Math.min(parseInt(day),28):1; return mObj.year+'-'+pad(mObj.m)+'-'+pad(dd); };
  const needsRev=[]; // ids needing later review
  let yearsTouched=new Set();
  const CAT_COLOURS=['#E5484D','#F47738','#3478F6','#9B59B6','#0AA968','#6B7686','#85994B','#0D8C86','#1F4E9C','#B47D12'];
  const expCatByName={}; // group name -> category id (so same-named folders across months share one category)
  const ensureExpCat=(rawName,emoji)=>{
    const safe=(rawName==null?'':String(rawName)).trim() || 'Other';
    const key=safe.toLowerCase();
    if(expCatByName[key]){
      // already created from an earlier month — backfill its emoji if that month had none
      if(emoji){ const cc=S.customCats[newId].expense.find(c=>c.id===expCatByName[key]); if(cc && (!cc.e||cc.e==='📁')) cc.e=emoji; }
      return expCatByName[key];
    }
    const cid='c_'+uid();
    const idx=Object.keys(expCatByName).length;
    S.customCats[newId].expense.push({id:cid,name:safe.slice(0,28),e:emoji||'📁',dot:CAT_COLOURS[idx%CAT_COLOURS.length],custom:true,bizId:newId});
    if(!S.activeCats[newId].expense.includes(cid)) S.activeCats[newId].expense.push(cid);
    expCatByName[key]=cid;
    return cid;
  };
  obActiveMonths().forEach(mObj=>{
    const d=obMonthData(mObj);
    // income — simple ungrouped rows (no category) OR grouped by income type
    const pushIncome=(it,groupName)=>{ const v=parseFloat(it.v)||0; if(v>0){
      const rev=it.day==='';
      const desc=[(groupName||'').trim(),(it.d||'').trim()].filter(Boolean).join(' · ');
      const r={id:uid(),bizId:newId,kind:'income',date:mkDate(mObj,it.day),dateTBC:rev,amount:Math.round(v*100)/100,cat:'sales',pct:null,folderId:null,receiptUrl:null,receiptPath:null,desc,_review:rev};
      S.entries.push(r); if(rev)needsRev.push(r.id); yearsTouched.add(dateToTaxYear(r.date));
    } };
    if(d.inGrouped){ d.inGroups.forEach(g=>g.rows.forEach(it=>pushIncome(it,g.name))); }
    else { d.inRows.forEach(it=>pushIncome(it,'')); }
    // expense — each group name becomes a category
    d.outGroups.forEach(g=>{
      const cid=ensureExpCat(g.name, g.e||'');
      g.rows.forEach(it=>{ const v=parseFloat(it.v)||0; if(v>0){
        const rev=it.day==='';
        const r={id:uid(),bizId:newId,kind:'expense',date:mkDate(mObj,it.day),dateTBC:rev,amount:Math.round(v*100)/100,cat:cid,pct:100,folderId:null,receiptUrl:null,receiptPath:null,desc:(it.d||'').trim(),_review:rev};
        S.entries.push(r); if(rev)needsRev.push(r.id); yearsTouched.add(dateToTaxYear(r.date));
      } });
    });
    // mileage → store on the tax year's yearData
    const mi=parseFloat(d.miles)||0;
    if(mi>0){ const ty=dateToTaxYear(mObj.year+'-'+pad(mObj.m)+'-15'); if(!S.yearData[ty])S.yearData[ty]={poaPaid:0,priorAdj:0,taMode:'auto',mileage:0,dismissedTips:[]}; S.yearData[ty].mileage=(S.yearData[ty].mileage||0)+mi; yearsTouched.add(ty); }
  });

  // 4) set current year to the most recent touched (so dashboard shows data)
  if(yearsTouched.size){ const arr=[...yearsTouched].sort(); S.year=arr[arr.length-1]; }
  // 5) store review list for the dashboard reminder
  S.obReview = needsRev;
  try{ localStorage.setItem('tmOnboardDone','1'); }catch(e){}
  save();

  // 6) push to cloud if signed in
  if((OB.loggedIn||cloudUser()) && typeof scheduleCloudPush==='function'){ try{ scheduleCloudPush(); }catch(e){} }
  // 7) if a NEW partnership with a code was just created, start syncing
  const nb = OB._newBiz;
  if(nb&&nb.syncCode&&typeof subscribeSync==='function'){
    try{S.entries.filter(e=>e.bizId===newId).forEach(pushEntryRemote);pushBizRemote(nb);subscribeSync(nb.syncCode,newId).catch(e=>console.warn('onboarding partnership sync failed',e));}catch(e){console.warn('onboarding partnership sync queued',e);}
  }

  const wasCatchup = catchup;
  obClose();
  S.tab='home'; render(); window.scrollTo(0,0);
  if(typeof toast==='function') toast(wasCatchup ? 'Months added ✓' : 'All caught up — welcome to TaxMate!');
  schedulePwaInstallSuggestion(!wasCatchup);
}

/* ═══════════ boot ═══════════ */
applyCachedRates();
applyTheme();
render();
if(window.TaxMateLtdProductionAdapter)TaxMateLtdProductionAdapter.initialise().then(()=>render()).catch(error=>console.error('Ltd runtime initialisation failed',error));
setupBackButton();
// First run: no businesses and never onboarded → launch catch-up flow
// ⚠️ 已登入（或正在還原登入）嘅用戶係「返嚟嘅用戶」，資料喺雲端，唔可以即刻彈新手流程，
//    否則雲端 sync 未完會嚇親人。交俾 startUserSync 完成後先判斷。
(function(){
  let done=null; try{ done=localStorage.getItem('tmOnboardDone'); }catch(e){}
  const signedInOrRestoring = (fbConfigured() && (function(){
    try{ const au=firebase.auth(); return !!(au.currentUser && !au.currentUser.isAnonymous); }catch(e){ return false; }
  })()) || (fbConfigured() && localStorage.getItem('tmWasSignedIn')==='1');
  if(!S.businesses.length && !done && !signedInOrRestoring){ startOnboarding(); }
})();
if(fbConfigured()){
  ensureFB().then(db=>{if(db){loadCloudRates();scheduleOutboxFlush(0,'app-open');}});
}
// Partnership subscriptions start inside startUserSync only after the persisted non-anonymous
// account has been restored. Starting them here could create an anonymous auth race on boot.

// ── PWA install prompt capture ──
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredInstall = e;
  if(typeof render==='function' && (S.tab==='home'||S.tab==='more')) render();
});
window.addEventListener('appinstalled', ()=>{
  markPwaInstalled();
});
window.addEventListener('online',()=>{renderSyncStatus();scheduleOutboxFlush(0,'online');});
window.addEventListener('offline',renderSyncStatus);
window.addEventListener('storage',event=>{if(event.key===SYNC_OUTBOX_KEY){SYNC_OUTBOX=loadSyncOutbox();renderSyncStatus();scheduleOutboxFlush(0,'other-tab');}});
window.addEventListener('pageshow',()=>scheduleOutboxFlush(0,'pageshow'));
window.addEventListener('focus',()=>scheduleOutboxFlush(0,'focus'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleOutboxFlush(0,'foreground');});
async function doInstall(){
  trackEvent('pwa_install_clicked');
  if(isIOS()){
    const proactive=document.getElementById('sb-pwainstall');
    if(proactive&&proactive.classList.contains('open'))closeSheet('pwainstall');
    openSheet('iosinstall');
    return;
  }
  if(deferredInstall && !installing){
    installing = true;
    const dp = deferredInstall;
    deferredInstall = null;            // consume immediately so it can't fire twice
    try{
      await dp.prompt();
      const choice=await dp.userChoice;
      if(choice&&choice.outcome==='accepted')markPwaInstalled();
      else dismissInstallPromotion();
    }catch(_){
      render();
    }finally{
      installing = false;
    }
  } else {
    // No native prompt available → guide user to Chrome menu (avoids the
    // shortcut-style "Add to Home screen" double-popup some devices show)
    openSheet('andinstall');
  }
}

// ── Disable pinch-zoom (iOS Safari ignores user-scalable=no) ──
document.addEventListener('keydown',e=>{
  const dialog=document.querySelector('.sb.open'); if(!dialog)return;
  if(e.key==='Escape'){const id=dialog.id.replace('sb-','');closeSheet(id);return;}
  if(e.key==='Tab'){const f=Array.from(dialog.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(x=>x.offsetParent!==null);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
document.addEventListener('gesturechange', e=>e.preventDefault());
document.addEventListener('touchmove', e=>{ if(e.touches.length>1) e.preventDefault(); }, {passive:false});
// Block double-tap zoom (only when the two taps are at nearly the same spot,
// so genuine quick taps on different buttons still work)
let lastTap=0, lastX=0, lastY=0;
document.addEventListener('touchend', e=>{
  if(e.changedTouches.length!==1) return;
  const t=e.changedTouches[0], now=Date.now();
  const near = Math.abs(t.clientX-lastX)<30 && Math.abs(t.clientY-lastY)<30;
  if(now-lastTap<=300 && near){ e.preventDefault(); }
  lastTap=now; lastX=t.clientX; lastY=t.clientY;
}, {passive:false});

// ── PWA: register service worker for offline + add-to-home ──
if('serviceWorker' in navigator){
  const registerTaxMateServiceWorker=()=>navigator.serviceWorker.register('sw.js').catch(err=>console.warn('SW reg failed', err));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',registerTaxMateServiceWorker,{once:true});
  else registerTaxMateServiceWorker();
}

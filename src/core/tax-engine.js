(function attachTaxEngine(root, factory) {
  const rulesApi = typeof module === 'object' && module.exports ? require('./tax-rules') : root.TaxMateCore;
  const api = factory(rulesApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMateCore = Object.assign(root.TaxMateCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function taxEngineFactory(rulesApi) {
  function nonNegative(value) { return Math.max(0, Number(value) || 0); }

  function calculateIncomeTaxAndNic(profit, ruleset) {
    const rules = ruleset || rulesApi.getTaxRuleset('2026-27');
    const validation = rulesApi.validateTaxRuleset(rules);
    if (!validation.valid) throw new Error(`Invalid tax ruleset: ${validation.errors.join('; ')}`);
    const myProfit = Number(profit) || 0;
    const profitForNic = nonNegative(myProfit);
    let personalAllowance = rules.incomeTax.personalAllowance;
    if (myProfit > rules.incomeTax.personalAllowanceTaperFrom) {
      personalAllowance = Math.max(0, personalAllowance - Math.floor((myProfit - rules.incomeTax.personalAllowanceTaperFrom) / 2));
    }
    const taxable = Math.max(0, myProfit - personalAllowance);
    const higherLimit = Math.max(rules.incomeTax.basicBand, rules.incomeTax.additionalRateFrom - personalAllowance);
    const basicAmount = Math.min(taxable, rules.incomeTax.basicBand);
    const higherAmount = Math.min(Math.max(taxable - rules.incomeTax.basicBand, 0), higherLimit - rules.incomeTax.basicBand);
    const additionalAmount = Math.max(taxable - higherLimit, 0);
    const incomeTax = basicAmount * rules.incomeTax.basicRate +
      higherAmount * rules.incomeTax.higherRate +
      additionalAmount * rules.incomeTax.additionalRate;
    const class4 = Math.min(
      Math.max(profitForNic - rules.class4.lowerProfitsLimit, 0),
      rules.class4.upperProfitsLimit - rules.class4.lowerProfitsLimit
    ) * rules.class4.mainRate + Math.max(profitForNic - rules.class4.upperProfitsLimit, 0) * rules.class4.upperRate;
    return {
      myProfit,
      personalAllowance,
      taxable,
      basicAmount,
      higherAmount,
      additionalAmount,
      incomeTax,
      class4,
      class2TreatedPaid: profitForNic >= rules.class2.smallProfitsThreshold,
      class2Voluntary: Math.round(rules.class2.voluntaryWeeklyRate * 52 * 100) / 100,
      liability: incomeTax + class4
    };
  }

  function calculatePaymentsOnAccount(liability, collectedOutsideSaPercent, ruleset) {
    const rules = ruleset || rulesApi.getTaxRuleset('2026-27');
    const amount = nonNegative(liability);
    const outside = Math.min(100, nonNegative(collectedOutsideSaPercent));
    const belowThreshold = amount < rules.paymentsOnAccount.minimumLiability;
    const outsideExemption = outside > rules.paymentsOnAccount.collectedOutsideSaExemptionPercent;
    const required = !belowThreshold && !outsideExemption;
    return {
      required,
      each: required ? amount / 2 : 0,
      reason: belowThreshold ? 'below-threshold' : outsideExemption ? 'more-than-80-percent-outside-sa' : 'required',
      collectedOutsideSaPercent: outside
    };
  }

  function calculateMileage(miles, ruleset) {
    const rules = ruleset || rulesApi.getTaxRuleset('2026-27');
    const distance = nonNegative(miles);
    const amount = Math.min(distance, rules.mileage.firstBandMiles) * rules.mileage.firstBandRate +
      Math.max(distance - rules.mileage.firstBandMiles, 0) * rules.mileage.additionalRate;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function chooseTradingAllowance(turnover, expenses, ruleset) {
    const rules = ruleset || rulesApi.getTaxRuleset('2026-27');
    const income = nonNegative(turnover);
    const costs = nonNegative(expenses);
    const actualProfit = income - costs;
    const allowanceProfit = Math.max(0, income - Math.min(rules.tradingAllowance.amount, income));
    return {
      available: income > 0,
      actualProfit,
      allowanceProfit,
      allowanceBetter: income > 0 && allowanceProfit < actualProfit
    };
  }

  function calculateTaxEstimate(input) {
    const rules = input.ruleset || rulesApi.getTaxRuleset(input.taxYear);
    const tax = calculateIncomeTaxAndNic(input.profit, rules);
    const poa = calculatePaymentsOnAccount(tax.liability, input.collectedOutsideSaPercent, rules);
    const priorAdjustment = Number(input.priorAdjustment) || 0;
    const paymentsAlreadyMade = nonNegative(input.paymentsAlreadyMade);
    const balancing = tax.liability + priorAdjustment - paymentsAlreadyMade;
    return Object.assign({}, tax, {
      paymentsOnAccount: poa,
      priorAdjustment,
      paymentsAlreadyMade,
      balancing,
      januaryTotal: balancing + poa.each
    });
  }

  return { calculateIncomeTaxAndNic, calculatePaymentsOnAccount, calculateMileage, chooseTradingAllowance, calculateTaxEstimate };
});

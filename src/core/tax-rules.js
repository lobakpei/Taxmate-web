(function attachTaxRules(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMateCore = Object.assign(root.TaxMateCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function taxRulesFactory() {
  const VERIFIED_AT = '2026-08-17';
  const SOURCES = Object.freeze({
    incomeTax: Object.freeze({
      id: 'GOVUK-INCOME-TAX-RATES-2026',
      title: 'Income Tax rates and allowances for current and previous tax years',
      url: 'https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past',
      authority: 'HM Revenue & Customs'
    }),
    nationalInsurance: Object.freeze({
      id: 'GOVUK-NIC-RATES-2026',
      title: 'Rates and allowances: National Insurance contributions',
      url: 'https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions',
      authority: 'HM Revenue & Customs'
    }),
    mileage: Object.freeze({
      id: 'GOVUK-SIMPLIFIED-VEHICLE-EXPENSES-2026',
      title: "Simplified expenses if you're self-employed: Vehicles",
      url: 'https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles',
      authority: 'HM Revenue & Customs'
    }),
    paymentsOnAccount: Object.freeze({
      id: 'GOVUK-PAYMENTS-ON-ACCOUNT',
      title: 'Understand your Self Assessment tax bill: Payments on account',
      url: 'https://www.gov.uk/understand-self-assessment-bill/payments-on-account',
      authority: 'HM Revenue & Customs'
    })
  });

  function ruleset(taxYear, effectiveFrom, values) {
    return Object.freeze({
      schemaVersion: 1,
      rulesetVersion: `${taxYear}.${VERIFIED_AT}.1`,
      taxYear,
      jurisdiction: 'EWNI',
      effectiveFrom,
      verifiedAt: VERIFIED_AT,
      officialSources: Object.freeze(Object.values(SOURCES)),
      incomeTax: Object.freeze({
        personalAllowance: 12570,
        personalAllowanceTaperFrom: 100000,
        basicBand: 37700,
        additionalRateFrom: 125140,
        basicRate: 0.20,
        higherRate: 0.40,
        additionalRate: 0.45
      }),
      class4: Object.freeze({ lowerProfitsLimit: 12570, upperProfitsLimit: 50270, mainRate: 0.06, upperRate: 0.02 }),
      class2: Object.freeze({ smallProfitsThreshold: values.class2Threshold, voluntaryWeeklyRate: values.class2Weekly }),
      tradingAllowance: Object.freeze({ amount: 1000 }),
      mileage: Object.freeze({ firstBandMiles: 10000, firstBandRate: values.mileageFirst, additionalRate: 0.25 }),
      paymentsOnAccount: Object.freeze({ minimumLiability: 1000, collectedOutsideSaExemptionPercent: 80 }),
      filing: Object.freeze({ deadline: values.filingDeadline })
    });
  }

  const TAX_RULESETS = Object.freeze({
    '2024-25': ruleset('2024-25', '2024-04-06', { class2Threshold: 6725, class2Weekly: 3.45, mileageFirst: 0.45, filingDeadline: '31 Jan 2026' }),
    '2025-26': ruleset('2025-26', '2025-04-06', { class2Threshold: 6845, class2Weekly: 3.50, mileageFirst: 0.45, filingDeadline: '31 Jan 2027' }),
    '2026-27': ruleset('2026-27', '2026-04-06', { class2Threshold: 7105, class2Weekly: 3.65, mileageFirst: 0.55, filingDeadline: '31 Jan 2028' })
  });

  const TOP_LEVEL_KEYS = Object.freeze([
    'schemaVersion', 'rulesetVersion', 'taxYear', 'jurisdiction', 'effectiveFrom', 'verifiedAt',
    'officialSources', 'incomeTax', 'class4', 'class2', 'tradingAllowance', 'mileage',
    'paymentsOnAccount', 'filing'
  ]);

  function isIsoDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
  function finiteInRange(value, min, max) { return Number.isFinite(value) && value >= min && value <= max; }
  function exactKeys(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actual = Object.keys(value).sort();
    return actual.length === keys.length && keys.slice().sort().every((key, index) => key === actual[index]);
  }

  function validateTaxRuleset(value) {
    const errors = [];
    if (!exactKeys(value, TOP_LEVEL_KEYS)) errors.push('unknown or missing top-level fields');
    if (value?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!/^\d{4}-\d{2}\.\d{4}-\d{2}-\d{2}\.\d+$/.test(value?.rulesetVersion || '')) errors.push('rulesetVersion is invalid');
    if (!/^\d{4}-\d{2}$/.test(value?.taxYear || '')) errors.push('taxYear is invalid');
    if (value?.jurisdiction !== 'EWNI') errors.push('jurisdiction must be EWNI');
    if (!isIsoDate(value?.effectiveFrom || '') || !isIsoDate(value?.verifiedAt || '')) errors.push('effective/verified dates are invalid');
    if (!Array.isArray(value?.officialSources) || value.officialSources.length < 3 || value.officialSources.some(source =>
      !source || typeof source.id !== 'string' || !/^https:\/\/www\.gov\.uk\//.test(source.url || '')
    )) errors.push('officialSources must contain GOV.UK metadata');
    const it = value?.incomeTax || {};
    if (!finiteInRange(it.personalAllowance, 0, 100000) || !finiteInRange(it.personalAllowanceTaperFrom, 0, 1000000) ||
        !finiteInRange(it.basicBand, 0, 1000000) || !finiteInRange(it.additionalRateFrom, 0, 1000000) ||
        !finiteInRange(it.basicRate, 0, 1) || !finiteInRange(it.higherRate, 0, 1) || !finiteInRange(it.additionalRate, 0, 1)) {
      errors.push('incomeTax contains invalid numeric values');
    }
    const c4 = value?.class4 || {};
    if (!finiteInRange(c4.lowerProfitsLimit, 0, 1000000) || !finiteInRange(c4.upperProfitsLimit, c4.lowerProfitsLimit || 0, 1000000) ||
        !finiteInRange(c4.mainRate, 0, 1) || !finiteInRange(c4.upperRate, 0, 1)) errors.push('class4 contains invalid numeric values');
    const c2 = value?.class2 || {};
    if (!finiteInRange(c2.smallProfitsThreshold, 0, 1000000) || !finiteInRange(c2.voluntaryWeeklyRate, 0, 100)) errors.push('class2 contains invalid numeric values');
    const mileage = value?.mileage || {};
    if (!Number.isInteger(mileage.firstBandMiles) || !finiteInRange(mileage.firstBandRate, 0, 10) || !finiteInRange(mileage.additionalRate, 0, 10)) errors.push('mileage contains invalid values');
    const poa = value?.paymentsOnAccount || {};
    if (!finiteInRange(poa.minimumLiability, 0, 1000000) || !finiteInRange(poa.collectedOutsideSaExemptionPercent, 0, 100)) errors.push('paymentsOnAccount contains invalid values');
    return { valid: errors.length === 0, errors };
  }

  function getTaxRuleset(taxYear) {
    const value = TAX_RULESETS[taxYear];
    if (!value) throw new Error(`Unsupported tax year: ${taxYear}`);
    return value;
  }

  function toLegacyTaxConfig(value) {
    const result = validateTaxRuleset(value);
    if (!result.valid) throw new Error(`Invalid tax ruleset: ${result.errors.join('; ')}`);
    return {
      pa: value.incomeTax.personalAllowance,
      paTaperFrom: value.incomeTax.personalAllowanceTaperFrom,
      basicBand: value.incomeTax.basicBand,
      addlFrom: value.incomeTax.additionalRateFrom,
      basic: value.incomeTax.basicRate,
      higher: value.incomeTax.higherRate,
      addl: value.incomeTax.additionalRate,
      c4Low: value.class4.lowerProfitsLimit,
      c4High: value.class4.upperProfitsLimit,
      c4Main: value.class4.mainRate,
      c4Upper: value.class4.upperRate,
      c2SmallProfits: value.class2.smallProfitsThreshold,
      c2Weekly: value.class2.voluntaryWeeklyRate,
      tradingAllowance: value.tradingAllowance.amount,
      poaThreshold: value.paymentsOnAccount.minimumLiability,
      poaOutsidePercent: value.paymentsOnAccount.collectedOutsideSaExemptionPercent,
      mileageRate1: value.mileage.firstBandRate,
      mileageRate2: value.mileage.additionalRate,
      fileDeadline: value.filing.deadline,
      rulesetVersion: value.rulesetVersion
    };
  }

  function buildLegacyTaxConfig() {
    return Object.fromEntries(Object.entries(TAX_RULESETS).map(([year, value]) => [year, toLegacyTaxConfig(value)]));
  }

  return { VERIFIED_AT, TAX_SOURCES: SOURCES, TAX_RULESETS, validateTaxRuleset, getTaxRuleset, toLegacyTaxConfig, buildLegacyTaxConfig };
});

(function attachMtd(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMateCore = Object.assign(root.TaxMateCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function mtdFactory() {
  const MTD_SOURCE = Object.freeze({
    id: 'GOVUK-MTD-QUALIFYING-INCOME-2026',
    title: 'Find out if and when you need to use Making Tax Digital for Income Tax',
    url: 'https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax',
    authority: 'HM Revenue & Customs',
    verifiedAt: '2026-08-17'
  });
  const MTD_PERIOD_SOURCE = Object.freeze({
    id: 'GOVUK-MTD-QUARTERLY-UPDATES-2026',
    title: 'Use Making Tax Digital for Income Tax: Send quarterly updates',
    url: 'https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates',
    authority: 'HM Revenue & Customs',
    verifiedAt: '2026-08-17'
  });
  const MTD_THRESHOLDS = Object.freeze({
    '2024-25': Object.freeze({ threshold: 50000, startDate: '2026-04-06' }),
    '2025-26': Object.freeze({ threshold: 30000, startDate: '2027-04-06' }),
    '2026-27': Object.freeze({ threshold: 20000, startDate: '2028-04-06' })
  });

  function assessMtdEligibility(input) {
    const assessmentTaxYear = input.assessmentTaxYear;
    const rule = MTD_THRESHOLDS[assessmentTaxYear];
    if (!rule) return { supported: false, assessmentTaxYear, reason: 'assessment-year-not-supported' };
    const selfEmploymentTurnover = Math.max(0, Number(input.selfEmploymentTurnover) || 0);
    const grossPropertyIncome = Math.max(0, Number(input.grossPropertyIncome) || 0);
    const qualifyingIncome = selfEmploymentTurnover + grossPropertyIncome;
    return {
      supported: true,
      assessmentTaxYear,
      threshold: rule.threshold,
      startDate: rule.startDate,
      selfEmploymentTurnover,
      grossPropertyIncome,
      qualifyingIncome,
      required: qualifyingIncome > rule.threshold,
      propertyIncomeComplete: input.propertyIncomeComplete === true,
      incompleteWarning: input.propertyIncomeComplete !== true
    };
  }

  function standardCumulativePeriods(taxYear) {
    const startYear = Number(String(taxYear).slice(0, 4));
    if (!Number.isInteger(startYear)) throw new Error('Invalid tax year');
    return [
      { id: 'Q1', from: `${startYear}-04-06`, to: `${startYear}-07-05`, deadline: `${startYear}-08-07` },
      { id: 'Q2', from: `${startYear}-04-06`, to: `${startYear}-10-05`, deadline: `${startYear}-11-07` },
      { id: 'Q3', from: `${startYear}-04-06`, to: `${startYear + 1}-01-05`, deadline: `${startYear + 1}-02-07` },
      { id: 'Q4', from: `${startYear}-04-06`, to: `${startYear + 1}-04-05`, deadline: `${startYear + 1}-05-07` }
    ];
  }

  return { MTD_SOURCE, MTD_PERIOD_SOURCE, MTD_THRESHOLDS, assessMtdEligibility, standardCumulativePeriods };
});

(function attachFormMappings(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TaxMateCore = Object.assign(root.TaxMateCore || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function formMappingsFactory() {
  const FORM_SOURCES = Object.freeze({
    SA103S_2025_26: Object.freeze({
      form: 'SA103S', taxYear: '2025-26', version: 'SA103S 2026 HMRC 12/25', verifiedAt: '2026-08-17',
      url: 'https://assets.publishing.service.gov.uk/media/69c12ae013101e9908704a53/SA103S-2026.pdf',
      notesUrl: 'https://assets.publishing.service.gov.uk/media/69ce15395cf899414a0bc69f/SA103S_Notes_2026.pdf'
    }),
    SA104S_2025_26: Object.freeze({
      form: 'SA104S', taxYear: '2025-26', version: 'SA104S 2026 HMRC 12/25', verifiedAt: '2026-08-17',
      url: 'https://assets.publishing.service.gov.uk/media/69c4e2c4471d520038d0f651/SA104S_2026.pdf',
      notesUrl: 'https://assets.publishing.service.gov.uk/media/69c4e36f4a06660f0854421b/SA104S_Notes_2026.pdf'
    })
  });

  const SA103S_EXPENSE_BOXES = Object.freeze({
    stock: 11,
    vehicle: 12,
    travel: 12,
    wages: 13,
    home: 14,
    insure: 14,
    repair: 15,
    fees: 16,
    finance: 17,
    phone: 18,
    office: 18,
    market: 19,
    equip: 19,
    other: 19
  });

  const SA103S_BOXES = Object.freeze({
    turnover: 9,
    otherBusinessIncome: 10,
    tradingIncomeAllowance: '10.1',
    totalAllowableExpenses: 20,
    netProfit: 21,
    netLoss: 22,
    taxableBusinessProfit: 28,
    totalTaxableProfit: 31,
    taxLoss: 32,
    voluntaryClass2: 36,
    class4Exempt: 37,
    cisDeductions: 38
  });

  const SA104S_BOXES = Object.freeze({
    partnershipReference: 1,
    description: 2,
    statementProfitOrLoss: 8,
    adjustedProfit: 16,
    broughtForwardLoss: 17,
    taxableProfitAfterLosses: 18,
    otherBusinessIncome: 19,
    totalTaxableProfit: 20,
    adjustedLoss: 21,
    carriedForwardLoss: 24,
    voluntaryClass2: 25,
    class4Exempt: 26,
    class4Adjustment: 27,
    untaxedInterest: 28,
    cisDeductions: 30,
    otherTaxDeducted: 31
  });

  function mappingFor(form, taxYear) {
    if (taxYear !== '2025-26') return { supported: false, form, taxYear, reason: 'official-form-not-published' };
    if (form === 'SA103S') return { supported: true, source: FORM_SOURCES.SA103S_2025_26, boxes: SA103S_BOXES, expenseBoxes: SA103S_EXPENSE_BOXES };
    if (form === 'SA104S') return { supported: true, source: FORM_SOURCES.SA104S_2025_26, boxes: SA104S_BOXES };
    return { supported: false, form, taxYear, reason: 'unknown-form' };
  }

  function roundSaAmount(value, kind) {
    const number = Math.abs(Number(value) || 0);
    return kind === 'expense' ? Math.ceil(number) : Math.floor(number);
  }

  return { FORM_SOURCES, SA103S_BOXES, SA103S_EXPENSE_BOXES, SA104S_BOXES, mappingFor, roundSaAmount };
});

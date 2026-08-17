const test = require('node:test');
const assert = require('node:assert/strict');
const { assessMtdEligibility, standardCumulativePeriods } = require('../../src/core/mtd');

test('MTD assessment uses gross self-employment turnover rather than profit', () => {
  const result = assessMtdEligibility({
    assessmentTaxYear: '2024-25',
    selfEmploymentTurnover: 50000.01,
    grossPropertyIncome: 0,
    propertyIncomeComplete: true,
    profit: 100
  });
  assert.equal(result.qualifyingIncome, 50000.01);
  assert.equal(result.required, true);
  assert.equal(result.startDate, '2026-04-06');
});
test('MTD threshold semantics are strictly more than the threshold', () => {
  assert.equal(assessMtdEligibility({ assessmentTaxYear: '2024-25', selfEmploymentTurnover: 50000, propertyIncomeComplete: true }).required, false);
  assert.equal(assessMtdEligibility({ assessmentTaxYear: '2024-25', selfEmploymentTurnover: 50000.01, propertyIncomeComplete: true }).required, true);
  assert.equal(assessMtdEligibility({ assessmentTaxYear: '2025-26', selfEmploymentTurnover: 30000.01, propertyIncomeComplete: true }).startDate, '2027-04-06');
  assert.equal(assessMtdEligibility({ assessmentTaxYear: '2026-27', selfEmploymentTurnover: 20000.01, propertyIncomeComplete: true }).startDate, '2028-04-06');
});

test('gross property income is included and incompleteness is disclosed', () => {
  const result = assessMtdEligibility({ assessmentTaxYear: '2025-26', selfEmploymentTurnover: 25000, grossPropertyIncome: 6000 });
  assert.equal(result.qualifyingIncome, 31000);
  assert.equal(result.required, true);
  assert.equal(result.incompleteWarning, true);
});

test('official standard MTD periods are cumulative from the tax-year start', () => {
  assert.deepEqual(standardCumulativePeriods('2026-27'), [
    { id: 'Q1', from: '2026-04-06', to: '2026-07-05', deadline: '2026-08-07' },
    { id: 'Q2', from: '2026-04-06', to: '2026-10-05', deadline: '2026-11-07' },
    { id: 'Q3', from: '2026-04-06', to: '2027-01-05', deadline: '2027-02-07' },
    { id: 'Q4', from: '2026-04-06', to: '2027-04-05', deadline: '2027-05-07' }
  ]);
});

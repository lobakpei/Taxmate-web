const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FORM_SOURCES,
  SA103S_BOXES,
  SA103S_EXPENSE_BOXES,
  SA104S_BOXES,
  mappingFor,
  roundSaAmount
} = require('../../src/core/form-mappings');

test('SA103S 2025-26 mapping snapshots the official current form', () => {
  assert.equal(FORM_SOURCES.SA103S_2025_26.version, 'SA103S 2026 HMRC 12/25');
  assert.deepEqual(SA103S_BOXES, {
    turnover: 9, otherBusinessIncome: 10, tradingIncomeAllowance: '10.1', totalAllowableExpenses: 20,
    netProfit: 21, netLoss: 22, taxableBusinessProfit: 28, totalTaxableProfit: 31,
    taxLoss: 32, voluntaryClass2: 36, class4Exempt: 37, cisDeductions: 38
  });
  assert.equal(SA103S_EXPENSE_BOXES.stock, 11);
  assert.equal(SA103S_EXPENSE_BOXES.vehicle, 12);
  assert.equal(SA103S_EXPENSE_BOXES.home, 14);
  assert.equal(SA103S_EXPENSE_BOXES.phone, 18);
});
test('SA104S maps partner Statement concepts rather than partnership accounts', () => {
  assert.equal(FORM_SOURCES.SA104S_2025_26.version, 'SA104S 2026 HMRC 12/25');
  assert.equal(SA104S_BOXES.statementProfitOrLoss, 8);
  assert.equal(SA104S_BOXES.totalTaxableProfit, 20);
  assert.equal(SA104S_BOXES.adjustedLoss, 21);
  assert.equal(SA104S_BOXES.cisDeductions, 30);
});

test('future unpublished form maps are never guessed', () => {
  assert.equal(mappingFor('SA103S', '2025-26').supported, true);
  assert.deepEqual(mappingFor('SA103S', '2026-27'), {
    supported: false, form: 'SA103S', taxYear: '2026-27', reason: 'official-form-not-published'
  });
  assert.equal(mappingFor('SA104S', '2027-28').supported, false);
});

test('Self Assessment rounding is explicit', () => {
  assert.equal(roundSaAmount(123.99, 'income'), 123);
  assert.equal(roundSaAmount(123.01, 'expense'), 124);
});

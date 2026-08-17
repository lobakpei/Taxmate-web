const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TAX_RULESETS,
  getTaxRuleset,
  validateTaxRuleset
} = require('../../src/core/tax-rules');
const {
  calculateIncomeTaxAndNic,
  calculatePaymentsOnAccount,
  calculateMileage,
  chooseTradingAllowance
} = require('../../src/core/tax-engine');

test('all bundled EWNI annual rulesets pass the strict validator', () => {
  for (const ruleset of Object.values(TAX_RULESETS)) assert.deepEqual(validateTaxRuleset(ruleset), { valid: true, errors: [] });
});
test('unknown and malformed remote tax rules are rejected', () => {
  const malformed = JSON.parse(JSON.stringify(getTaxRuleset('2026-27')));
  malformed.class2.smallProfitsThreshold = '7105';
  malformed.injected = true;
  const result = validateTaxRuleset(malformed);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /unknown|class2/);
});

test('2026-27 Class 2 official threshold and voluntary rate are fixed', () => {
  const rules = getTaxRuleset('2026-27');
  assert.equal(rules.class2.smallProfitsThreshold, 7105);
  assert.equal(rules.class2.voluntaryWeeklyRate, 3.65);
  assert.equal(calculateIncomeTaxAndNic(7104.99, rules).class2TreatedPaid, false);
  assert.equal(calculateIncomeTaxAndNic(7105, rules).class2TreatedPaid, true);
  assert.equal(calculateIncomeTaxAndNic(7105.01, rules).class2TreatedPaid, true);
  assert.equal(calculateIncomeTaxAndNic(0, rules).class2Voluntary, 189.80);
});

test('income tax and personal allowance boundaries are deterministic', () => {
  const rules = getTaxRuleset('2026-27');
  assert.equal(calculateIncomeTaxAndNic(0, rules).incomeTax, 0);
  assert.equal(calculateIncomeTaxAndNic(12569.99, rules).incomeTax, 0);
  assert.equal(calculateIncomeTaxAndNic(12570, rules).incomeTax, 0);
  assert.ok(calculateIncomeTaxAndNic(12570.01, rules).incomeTax > 0);
  assert.equal(calculateIncomeTaxAndNic(50270, rules).basicAmount, 37700);
  assert.ok(calculateIncomeTaxAndNic(50270.01, rules).higherAmount > 0);
  assert.equal(calculateIncomeTaxAndNic(100000, rules).personalAllowance, 12570);
  assert.equal(calculateIncomeTaxAndNic(110000, rules).personalAllowance, 7570);
  assert.equal(calculateIncomeTaxAndNic(125140, rules).personalAllowance, 0);
  assert.equal(calculateIncomeTaxAndNic(125141, rules).personalAllowance, 0);
  assert.ok(calculateIncomeTaxAndNic(125141, rules).additionalAmount > 0);
});

test('Class 4 lower and upper profit boundaries are covered', () => {
  const rules = getTaxRuleset('2026-27');
  assert.equal(calculateIncomeTaxAndNic(12570, rules).class4, 0);
  assert.ok(calculateIncomeTaxAndNic(12570.01, rules).class4 > 0);
  assert.equal(calculateIncomeTaxAndNic(50270, rules).class4, 2262);
  assert.ok(calculateIncomeTaxAndNic(50270.01, rules).class4 > 2262);
});

test('mileage boundaries and tax-year transition use verified rates', () => {
  const oldRules = getTaxRuleset('2025-26');
  const currentRules = getTaxRuleset('2026-27');
  assert.equal(calculateMileage(0, currentRules), 0);
  assert.equal(calculateMileage(9999, currentRules), 5499.45);
  assert.equal(calculateMileage(10000, currentRules), 5500);
  assert.equal(calculateMileage(10001, currentRules), 5500.25);
  assert.equal(calculateMileage(10000, oldRules), 4500);
});

test('trading allowance compares combined sole-trade turnover to actual expenses', () => {
  const rules = getTaxRuleset('2026-27');
  assert.deepEqual(chooseTradingAllowance(900, 50, rules), {
    available: true, actualProfit: 850, allowanceProfit: 0, allowanceBetter: true
  });
  assert.equal(chooseTradingAllowance(5000, 1500, rules).allowanceBetter, false);
  assert.equal(chooseTradingAllowance(5000, 200, rules).allowanceBetter, true);
  const multipleSoleTrades = chooseTradingAllowance(600 + 700, 100 + 100, rules);
  assert.equal(multipleSoleTrades.allowanceProfit, 300);
  const partnershipShareExcluded = chooseTradingAllowance(1300, 200, rules);
  assert.equal(partnershipShareExcluded.actualProfit, 1100);
});

test('payments on account apply at exactly £1,000 and honour only more than 80% outside SA', () => {
  const rules = getTaxRuleset('2026-27');
  assert.equal(calculatePaymentsOnAccount(999.99, 0, rules).required, false);
  assert.equal(calculatePaymentsOnAccount(1000, 0, rules).required, true);
  assert.equal(calculatePaymentsOnAccount(1000.01, 0, rules).required, true);
  assert.equal(calculatePaymentsOnAccount(5000, 80, rules).required, true);
  assert.equal(calculatePaymentsOnAccount(5000, 80.01, rules).required, false);
  assert.equal(calculatePaymentsOnAccount(5000, 81, rules).reason, 'more-than-80-percent-outside-sa');
});

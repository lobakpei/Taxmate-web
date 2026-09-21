'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Legal = require('../../src/core/product-content');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('FAQ is a searchable self-service experience before support', () => {
  const html = Legal.helpHtml;
  assert.match(html, /data-faq-root/);
  assert.match(html, /data-faq-search/);
  assert.equal((html.match(/data-faq-open=/g) || []).length, 6);
  assert.equal((html.match(/data-faq-filter=/g) || []).length, Legal.HELP_GROUPS.length + 1);
  assert.match(html, /data-faq-empty/);
  assert.ok(html.indexOf('data-faq-groups') < html.indexOf('Still need help?'));
  assert.match(html, /How do I create a TaxMate account\?/);
  assert.match(html, /I can't sign in/);
  assert.match(html, /Does TaxMate charge an account or verification fee\?/);
});

test('FAQ covers the whole customer journey rather than selected features', () => {
  const expectedGroups = [
    'Account, sign-in & first steps',
    'Businesses & catch-up setup',
    'Income, expenses & organising records',
    'Tax estimates, HMRC & deadlines',
    'Receipts, reports & exports',
    'Plans, checkout & billing',
    'Cloud sync, backup & devices',
    'Partnerships & Partner Sync',
    'Limited companies & Companies House',
    'Install, language & appearance',
    'Privacy, security & deleting data',
    'Troubleshooting'
  ];
  const requiredQuestions = [
    'How do I create a TaxMate account?',
    "I can't sign in",
    'Do I need a TaxMate verification code?',
    'Does TaxMate charge an account or verification fee?',
    'How do I add my first business?',
    'How do I add income?',
    'How do I add an expense?',
    'How is my tax estimate calculated?',
    'Does TaxMate submit my tax return?',
    'How do I add a receipt photo?',
    'What is included in Free?',
    'How do I request a refund?',
    'I changed phone — how do I get my data?',
    'What is a Partner Sync code?',
    'Does the Companies House check cost a verification fee?',
    'Does TaxMate file CT600 or company accounts?',
    'How do I install TaxMate on iPhone?',
    'What happens when I delete my account?',
    'I paid but my plan did not update',
    'When should I contact HMRC or an accountant instead of TaxMate support?'
  ];
  const titles = Legal.HELP_GROUPS.flatMap(([, items]) => items.map(([title]) => title));

  assert.deepEqual(Legal.HELP_GROUPS.map(([group]) => group), expectedGroups);
  assert.ok(titles.length >= 150);
  requiredQuestions.forEach(question => assert.ok(titles.includes(question), `missing journey question: ${question}`));
});

test('FAQ explains the refund path separately from cancellation', () => {
  const html = Legal.helpHtml;
  assert.match(html, /Manage subscription → Request a refund/);
  assert.match(html, /refund request is separate from cancelling renewal/i);
  assert.match(html, /How do I cancel\?/);
});

test('in-app, public and offline shells all include the FAQ behaviour', () => {
  const index = read('index.html');
  const app = read('src/app/app.js');
  const publicHelp = Legal.publicPage('help');
  const serviceWorker = read('sw.js');
  const behaviour = read('src/app/help.js');

  assert.match(index, /<script src="src\/app\/help\.js"><\/script>/);
  assert.match(app, /TaxMateFAQ\.reset\(el\)/);
  assert.match(publicHelp, /<script defer src="\/src\/app\/help\.js"><\/script>/);
  assert.match(serviceWorker, /'\/src\/app\/help\.js'/);
  assert.match(behaviour, /normalise\(item\.textContent\)/);
  assert.doesNotMatch(behaviour, /innerHTML/);
});

test('public FAQ uses the approved Direction A shell and real brand logo', () => {
  const publicHelp = Legal.publicPage('help');
  assert.match(publicHelp, /<html lang="en-GB" data-direction-a="true">/);
  assert.match(publicHelp, /src="\/assets\/brand\/derived\/taxmate-brand-logo-dark\.svg" alt="TaxMate"/);
  assert.match(publicHelp, /href="\/src\/ui\/direction-a\.css\?v=20260919-2"/);
  assert.doesNotMatch(publicHelp, /<a class="brand"[^>]*>TaxMate<\/a>/);
});

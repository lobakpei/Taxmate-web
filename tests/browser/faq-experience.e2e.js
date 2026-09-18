'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const {createFounderPreviewBackup} = require('../../ui-preview-harness/sanitised-backup-fixture');

const root = path.resolve(__dirname, '../..');
const evidence = path.resolve(process.env.TAXMATE_FAQ_EVIDENCE || path.join(root, 'evidence', 'faq-founder-review'));
const port = Number(process.env.TAXMATE_FAQ_PORT || 41758);
const origin = `http://127.0.0.1:${port}`;
const chromeCandidates = [process.env.TAXMATE_CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'];
const chromePath = () => chromeCandidates.find(candidate => candidate && fs.existsSync(candidate));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

let server;
let browser;

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      if ((await fetch(`${origin}/help.html`)).ok) return;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('FAQ preview server did not start');
}

async function main() {
  fs.mkdirSync(evidence, {recursive: true});
  server = spawn(process.execPath, ['scripts/preview-server.js'], {
    cwd: root,
    env: {...process.env, TAXMATE_PREVIEW_PORT: String(port)},
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let serverError = '';
  server.stderr.on('data', chunk => { serverError += String(chunk); });
  await waitForServer();

  const executablePath = chromePath();
  browser = await chromium.launch(executablePath ? {headless: true, executablePath} : {headless: true});

  const publicContext = await browser.newContext({viewport: {width: 390, height: 844}, colorScheme: 'light'});
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${origin}/help.html`, {waitUntil: 'networkidle'});
  await publicPage.locator('[data-faq-root]').waitFor();
  const publicLogo = publicPage.locator('.public-brand-lockup img');
  await publicLogo.waitFor();
  assert.match(await publicLogo.getAttribute('src'), /taxmate-brand-logo-dark\.svg$/);
  assert.ok(await publicLogo.evaluate(image => image.complete && image.naturalWidth > 0));
  assert.match(await publicPage.evaluate(() => getComputedStyle(document.body).fontFamily), /Plus Jakarta Sans/i);
  assert.equal(await publicPage.locator('.public-topbar').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(15, 22, 32)');
  assert.equal(await publicPage.locator('[data-faq-open]').count(), 6);
  const topicFilters = await publicPage.locator('[data-faq-filter]').count();
  const topicGroups = await publicPage.locator('[data-faq-group]').count();
  const totalQuestions = await publicPage.locator('[data-faq-item]').count();
  assert.equal(topicFilters, topicGroups + 1);
  assert.ok(topicGroups >= 12);
  assert.ok(totalQuestions >= 150);
  assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await publicPage.screenshot({path: path.join(evidence, 'faq-public-mobile-top.png'), fullPage: false});

  const publicSearch = publicPage.locator('[data-faq-search]');
  await publicSearch.fill('refund');
  assert.ok(await publicPage.locator('[data-faq-item]:visible').count() >= 1);
  assert.equal(await publicPage.locator('[data-faq-item]:visible').filter({hasText: 'How do I request a refund?'}).count(), 1);
  await publicPage.screenshot({path: path.join(evidence, 'faq-public-mobile-search-refund.png'), fullPage: false});
  await publicPage.goto(`${origin}/help.html?theme=dark`, {waitUntil: 'networkidle'});
  assert.equal(await publicPage.evaluate(() => document.documentElement.dataset.theme), 'dark');
  assert.ok(await publicPage.locator('.public-brand-lockup img').evaluate(image => image.complete && image.naturalWidth > 0));
  await publicPage.screenshot({path: path.join(evidence, 'faq-public-mobile-dark.png'), fullPage: false});
  await publicContext.close();

  const state = createFounderPreviewBackup().data;
  state.settings = {...state.settings, lang: 'en', theme: 'light'};
  state.tab = 'home';
  const appContext = await browser.newContext({viewport: {width: 390, height: 844}, colorScheme: 'light'});
  await appContext.addInitScript(json => {
    localStorage.setItem('taxmateuk_account_v1:local:onboarding-done', '1');
    localStorage.setItem('taxmateuk_analytics_consent', 'denied');
    localStorage.setItem('taxmateuk_account_v1:local:canonical', json);
    sessionStorage.setItem('tmCarouselDismissed', '["pwa"]');
  }, JSON.stringify(state));
  const appPage = await appContext.newPage();
  await appPage.goto(`${origin}/index.html`, {waitUntil: 'networkidle'});
  await appPage.locator('#nav button').first().waitFor();
  await appPage.evaluate(() => go('settings'));
  const helpSection = appPage.locator('[data-settings-section="help"]');
  await helpSection.scrollIntoViewIfNeeded();
  if (!(await helpSection.getAttribute('open'))) await helpSection.locator('summary').click();
  assert.equal(await helpSection.locator('a[href^="mailto:"]').count(), 0);
  await helpSection.getByRole('button', {name: 'Browse FAQs'}).click();
  await appPage.locator('#sb-legal.open [data-faq-root]').waitFor();
  assert.equal(await appPage.locator('#sb-legal [data-faq-open]').count(), 6);
  assert.equal(await appPage.locator('#sb-legal .sheet').evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  await appPage.screenshot({path: path.join(evidence, 'faq-in-app-mobile-top.png'), fullPage: false});

  const inAppSearch = appPage.locator('#sb-legal [data-faq-search]');
  await inAppSearch.fill('verification fee');
  assert.ok(await appPage.locator('#sb-legal [data-faq-item]:visible').count() >= 2);
  const verificationAnswer = appPage.locator('#sb-legal [data-faq-item]:visible').filter({hasText: 'Does TaxMate charge an account or verification fee?'});
  await verificationAnswer.locator('summary').click();
  assert.match(await verificationAnswer.innerText(), /does not charge a separate/i);
  await appPage.screenshot({path: path.join(evidence, 'faq-in-app-mobile-search-verification-fee.png'), fullPage: false});

  await inAppSearch.fill('receipt');
  assert.ok(await appPage.locator('#sb-legal [data-faq-item]:visible').count() >= 1);
  await appPage.screenshot({path: path.join(evidence, 'faq-in-app-mobile-search-receipt.png'), fullPage: false});
  await appContext.close();

  fs.writeFileSync(path.join(evidence, 'qa.json'), `${JSON.stringify({
    status: 'PASS',
    viewport: {width: 390, height: 844},
    popularQuestions: 6,
    topicFilters,
    topicGroups,
    totalQuestions,
    checks: [
      'public FAQ renders',
      'public FAQ uses the Direction A shell and official SVG logo in light and dark mode',
      'in-app FAQ opens from Settings',
      'search filters answers',
      'account and verification-fee answers are discoverable',
      'all journey topic groups are present',
      'direct support is removed from the Settings card',
      'FAQ is available before support contact'
    ]
  }, null, 2)}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
});

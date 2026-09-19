'use strict';

// Objective light/dark acceptance for the real TaxMate shell and public pages.
// It catches inverted text, low text/background contrast and horizontal overflow,
// and writes both screenshots and a machine-readable receipt.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const {createFounderPreviewBackup} = require('../../ui-preview-harness/sanitised-backup-fixture');
const {buildPreviewDataset} = require('../../ui-preview-harness/founder-preview-dataset');

const root = path.resolve(__dirname, '../..');
const evidence = path.resolve(process.env.TAXMATE_FULL_UI_EVIDENCE || path.join(root, 'evidence', 'full-ui-acceptance', 'theme-contrast'));
const port = Number(process.env.TAXMATE_FULL_UI_PORT || 41759);
const origin = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let server;
let browser;

function chromePath() {
  return [process.env.TAXMATE_CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe']
    .find(candidate => candidate && fs.existsSync(candidate));
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try { if ((await fetch(`${origin}/index.html`)).ok) return; } catch (_) {}
    await sleep(100);
  }
  throw new Error('preview server did not start');
}

async function auditVisibleText(page, scope = 'body') {
  return page.locator(scope).evaluate(rootNode => {
    const parse = value => {
      const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return {r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1};
    };
    const blend = (front, back) => ({
      r: front.r * front.a + back.r * (1 - front.a),
      g: front.g * front.a + back.g * (1 - front.a),
      b: front.b * front.a + back.b * (1 - front.a),
      a: 1
    });
    const channel = value => {
      const normalized = value / 255;
      return normalized <= .03928 ? normalized / 12.92 : Math.pow((normalized + .055) / 1.055, 2.4);
    };
    const luminance = color => .2126 * channel(color.r) + .7152 * channel(color.g) + .0722 * channel(color.b);
    const ratio = (a, b) => {
      const first = luminance(a), second = luminance(b);
      return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    };
    const visible = node => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05 && box.width > 1 && box.height > 1;
    };
    const ownText = node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()) ||
      (node.matches('input,textarea') && (node.value || node.placeholder));
    const background = node => {
      let current = node;
      let result = {r: 255, g: 255, b: 255, a: 1};
      const layers = [];
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const style = getComputedStyle(current);
        if (style.backgroundImage && style.backgroundImage !== 'none') return {gradient: true};
        const colour = parse(style.backgroundColor);
        if (colour && colour.a > 0) layers.push(colour);
        current = current.parentElement;
      }
      for (let index = layers.length - 1; index >= 0; index--) result = blend(layers[index], result);
      return result;
    };
    const failures = [];
    for (const node of rootNode.querySelectorAll('*')) {
      if (!visible(node) || !ownText(node) || node.matches('script,style,option,input[type="checkbox"],input[type="radio"],input[type="range"]')) continue;
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') continue;
      const foreground = parse(style.color), bg = background(node);
      if (!foreground || !bg || bg.gradient) continue;
      const effectiveForeground = blend(foreground, bg);
      const contrast = ratio(effectiveForeground, bg);
      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = Number(style.fontWeight) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const threshold = large ? 3 : 4.5;
      if (contrast + .03 < threshold) {
        failures.push({
          text: (node.value || node.placeholder || node.textContent).trim().replace(/\s+/g, ' ').slice(0, 120),
          tag: node.tagName.toLowerCase(),
          id: node.id || '',
          className: String(node.className || '').slice(0, 140),
          color: style.color,
          background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          contrast: Number(contrast.toFixed(2)),
          required: threshold
        });
      }
    }
    return {
      failures,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
    };
  });
}

async function main() {
  fs.mkdirSync(evidence, {recursive: true});
  server = spawn(process.execPath, ['scripts/preview-server.js'], {
    cwd: root,
    env: {...process.env, TAXMATE_PREVIEW_PORT: String(port)},
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  await waitForServer();
  const executablePath = chromePath();
  browser = await chromium.launch(executablePath ? {headless: true, executablePath} : {headless: true});

  const results = [];
  const consoleErrors = [];
  const fixtureBytes = Buffer.from(`${JSON.stringify(createFounderPreviewBackup(), null, 2)}\n`);
  const fixturePath = path.join(evidence, 'sanitised-ui-fixture.json');
  fs.writeFileSync(fixturePath, fixtureBytes);
  const stateBase = buildPreviewDataset({
    mode: 'existing',
    backupPath: fixturePath,
    expectedSha256: crypto.createHash('sha256').update(fixtureBytes).digest('hex')
  }).state;
  const viewports = [{name: 'mobile', width: 390, height: 844}, {name: 'desktop', width: 1440, height: 1000}];
  for (const viewport of viewports) for (const theme of ['light', 'dark']) {
    const state = structuredClone(stateBase);
    state.settings = {...state.settings, lang: 'en', theme};
    state.tab = 'home';
    const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, colorScheme: theme});
    await context.addInitScript(json => {
      localStorage.setItem('taxmateuk_account_v1:local:onboarding-done', '1');
      localStorage.setItem('taxmateuk_analytics_consent', 'denied');
      localStorage.setItem('taxmateuk_account_v1:local:canonical', json);
      sessionStorage.setItem('tmCarouselDismissed', '["pwa"]');
    }, JSON.stringify(state));
    const page = await context.newPage();
    page.on('pageerror', error => consoleErrors.push(`${viewport.name}/${theme}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error' && !/favicon|ERR_BLOCKED_BY_CLIENT|ERR_NETWORK_ACCESS_DENIED/.test(message.text())) consoleErrors.push(`${viewport.name}/${theme}: ${message.text()}`); });
    await page.goto(`${origin}/index.html`, {waitUntil: 'networkidle'});
    await page.locator('#nav button').first().waitFor();
    const responsiveShell = await page.evaluate(() => {
      const nav = document.querySelector('#nav');
      const main = document.querySelector('body > main');
      const navStyle = getComputedStyle(nav);
      const navBox = nav.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      return {navDisplay: navStyle.display, navDirection: navStyle.flexDirection, navWidth: navBox.width, mainWidth: mainBox.width};
    });
    if (viewport.name === 'desktop') {
      assert.equal(responsiveShell.navDisplay, 'flex', 'desktop app uses the desktop navigation rail');
      assert.equal(responsiveShell.navDirection, 'column', 'desktop app navigation is vertical');
      assert.ok(responsiveShell.navWidth >= 170 && responsiveShell.navWidth <= 180, `desktop navigation rail width is correct: ${responsiveShell.navWidth}`);
      assert.ok(responsiveShell.mainWidth <= 640.5, `desktop content column stays readable: ${responsiveShell.mainWidth}`);
    } else {
      assert.equal(responsiveShell.navDisplay, 'grid', 'mobile app uses the bottom navigation grid');
      assert.ok(responsiveShell.navWidth >= 389 && responsiveShell.navWidth <= 391, `mobile navigation spans the viewport: ${responsiveShell.navWidth}`);
      assert.ok(responsiveShell.mainWidth <= 390.5, `mobile content fits the viewport: ${responsiveShell.mainWidth}`);
    }

    for (const tab of ['home', 'income', 'expenses', 'tax', 'more']) {
      await page.evaluate(name => go(name), tab);
      await sleep(350);
      if (tab === 'more') {
        const selectedCadence = await page.locator('[data-billing-cadence].on').first().evaluate(node => getComputedStyle(node).backgroundColor);
        assert.equal(selectedCadence, 'rgb(255, 190, 10)', `Settings ${viewport.name}/${theme} selected cadence uses TaxMate yellow`);
      }
      const audit = await auditVisibleText(page, '#page');
      await page.screenshot({path: path.join(evidence, `app-${tab}-${viewport.name}-${theme}.png`), fullPage: true});
      results.push({surface: `app-${tab}`, viewport: viewport.name, theme, ...audit});
    }

    // This workflow is deliberately separate from top-level navigation. A
    // paid user reaches it only from the Assistant's missing-receipt task.
    await page.evaluate(() => {
      ENTITLEMENT.snapshot = {paidTier: 'pro', subscriptionStatus: 'active', currentPeriodEnd: Date.now() + 86400000, serverVerifiedAt: Date.now()};
      render();
      assistantOpen();
    });
    const receiptTask = page.locator('#assistant-task-list [data-reason="receipt_photos_missing"]').first();
    await receiptTask.waitFor();
    await receiptTask.locator('.assistant-task-row').click();
    await page.waitForFunction(() => S.tab === 'receipts');
    assert.equal(await page.locator('#nav button.on').getAttribute('data-tm-click'), "go('expenses')", 'Add receipts is shown as an Expenses child route');
    const receiptAudit = await auditVisibleText(page, '#page');
    await page.screenshot({path: path.join(evidence, `app-add-receipts-${viewport.name}-${theme}.png`), fullPage: true});
    results.push({surface: 'app-add-receipts', viewport: viewport.name, theme, route: ['Home', 'TaxMate Assistant', 'Missing receipt task', 'Add receipts'], ...receiptAudit});

    await page.evaluate(() => go('settings'));
    const help = page.locator('[data-settings-section="help"]');
    await help.scrollIntoViewIfNeeded();
    if (!(await help.getAttribute('open'))) await help.locator('summary').click();
    await help.getByRole('button', {name: 'Browse FAQs'}).click();
    await page.locator('#sb-legal.open [data-faq-root]').waitFor();
    await page.locator('#sb-legal .faq-contact').scrollIntoViewIfNeeded();
    const faqAudit = await auditVisibleText(page, '#sb-legal');
    const inAppFilters = await page.locator('#sb-legal .faq-filter-row').evaluate(node => ({overflowX: getComputedStyle(node).overflowX, flexWrap: getComputedStyle(node).flexWrap, scrollbarWidth: getComputedStyle(node).scrollbarWidth, fits: node.scrollWidth <= node.clientWidth + 1}));
    if (viewport.name === 'desktop') assert.deepEqual(inAppFilters, {overflowX: 'visible', flexWrap: 'wrap', scrollbarWidth: 'none', fits: true}, 'desktop in-app FAQ topics wrap without a scrollbar');
    else assert.equal(inAppFilters.scrollbarWidth, 'none', 'mobile in-app FAQ hides the visual scrollbar while retaining swipe');
    await page.locator('#sb-legal .sheet').evaluate(node => { node.scrollTop = 0; });
    await page.locator('#sb-legal [data-faq-root]').evaluate(node => { node.scrollTop = 0; });
    await page.screenshot({path: path.join(evidence, `app-faq-${viewport.name}-${theme}.png`), fullPage: false});
    results.push({surface: 'app-faq', viewport: viewport.name, theme, ...faqAudit});

    await page.evaluate(() => {
      closeSheet('legal');
      ENTITLEMENT.snapshot = {
        paidTier: 'pro',
        subscriptionStatus: 'active',
        currentPeriodEnd: Date.now() + 86400000,
        serverVerifiedAt: Date.now()
      };
      return openLtdCompany();
    });
    await page.waitForFunction(() => document.body.classList.contains('ltd-active') && !document.getElementById('taxmate-ltd-ui-root').hidden, null, {timeout: 15000});
    await page.locator('#taxmate-ltd-ui-root .tm-summary-sheet').waitFor({timeout: 15000});
    const ltdLogo = page.locator('#taxmate-ltd-ui-root .tm-logo img:visible').first();
    await ltdLogo.waitFor();
    const ltdLogoMetrics = await ltdLogo.evaluate(image => { const box=image.getBoundingClientRect(); return {complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,width:box.width,height:box.height,src:image.getAttribute('src')}; });
    const naturalRatio = ltdLogoMetrics.naturalWidth / ltdLogoMetrics.naturalHeight;
    const renderedRatio = ltdLogoMetrics.width / ltdLogoMetrics.height;
    assert.ok(ltdLogoMetrics.complete && ltdLogoMetrics.naturalWidth > 0 && ltdLogoMetrics.width >= 60 && Math.abs(naturalRatio-renderedRatio) < .05 && /taxmate-brand-logo-dark\.svg$/.test(ltdLogoMetrics.src || ''), `Limited Company ${viewport.name}/${theme} official logo is loaded, visible and not distorted: ${JSON.stringify(ltdLogoMetrics)}`);
    const ltdAudit = await auditVisibleText(page, '#taxmate-ltd-ui-root');
    await page.screenshot({path: path.join(evidence, `app-limited-company-${viewport.name}-${theme}.png`), fullPage: true});
    results.push({surface: 'app-limited-company', viewport: viewport.name, theme, ...ltdAudit});
    await context.close();
  }

  for (const viewport of viewports) for (const theme of ['light', 'dark']) {
    for (const file of ['help.html', 'privacy.html', 'terms.html', '404.html']) {
      const context = await browser.newContext({viewport: {width: viewport.width, height: viewport.height}, colorScheme: theme});
      const page = await context.newPage();
      await page.goto(`${origin}/${file}?theme=${theme}`, {waitUntil: 'networkidle'});
      const audit = await auditVisibleText(page);
      const surface = `public-${file.replace('.html', '')}`;
      const publicLayout = await page.evaluate(() => {
        const shell = document.querySelector('.public-shell').getBoundingClientRect();
        const brand = document.querySelector('.public-brand-lockup img');
        const heading = document.querySelector('.public-page-heading').getBoundingClientRect();
        const brandBox = brand.getBoundingClientRect();
        return {shellWidth: shell.width, headingX: heading.x, brandX: brandBox.x, brandComplete: brand.complete, brandNaturalWidth: brand.naturalWidth, brandSrc: brand.getAttribute('src')};
      });
      assert.ok(publicLayout.shellWidth <= 920.5, `${surface} keeps the approved content width`);
      assert.ok(Math.abs(publicLayout.headingX - publicLayout.brandX) < 1, `${surface} aligns the visible brand logo with the page heading: ${JSON.stringify(publicLayout)}`);
      assert.ok(publicLayout.brandComplete && publicLayout.brandNaturalWidth > 0 && /taxmate-brand-logo-dark\.svg$/.test(publicLayout.brandSrc || ''), `${surface} uses the official TaxMate logo`);
      if (file === 'help.html') {
        const filters = await page.locator('.faq-filter-row').evaluate(node => ({overflowX: getComputedStyle(node).overflowX, flexWrap: getComputedStyle(node).flexWrap, scrollbarWidth: getComputedStyle(node).scrollbarWidth, fits: node.scrollWidth <= node.clientWidth + 1}));
        if (viewport.name === 'desktop') assert.deepEqual(filters, {overflowX: 'visible', flexWrap: 'wrap', scrollbarWidth: 'none', fits: true}, 'desktop public FAQ topics wrap without a scrollbar');
        else assert.equal(filters.scrollbarWidth, 'none', 'mobile public FAQ hides the visual scrollbar while retaining swipe');
      }
      await page.screenshot({path: path.join(evidence, `${surface}-${viewport.name}-${theme}.png`), fullPage: true});
      results.push({surface, viewport: viewport.name, theme, ...audit});
      await context.close();
    }
  }

  const failures = results.flatMap(result => result.failures.map(failure => ({surface: result.surface, viewport: result.viewport, theme: result.theme, ...failure})));
  const overflows = results.filter(result => result.horizontalOverflow > 1).map(result => ({surface: result.surface, viewport: result.viewport, theme: result.theme, pixels: result.horizontalOverflow}));
  const receipt = {
    status: failures.length || overflows.length || consoleErrors.length ? 'FAIL' : 'PASS',
    generatedAt: new Date().toISOString(),
    viewports,
    surfaces: results.length,
    themes: ['light', 'dark'],
    failures,
    overflows,
    consoleErrors,
    screenshots: results.map(result => `${result.surface}-${result.viewport}-${result.theme}.png`)
  };
  fs.writeFileSync(path.join(evidence, 'acceptance.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.deepEqual(consoleErrors, [], 'no browser errors');
  assert.deepEqual(overflows, [], 'no horizontal overflow');
  assert.deepEqual(failures, [], 'all visible text meets WCAG AA contrast against its effective solid background');
  console.log(`FULL_UI_THEME_ACCEPTANCE PASS surfaces=${results.length} screenshots=${results.length}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
});

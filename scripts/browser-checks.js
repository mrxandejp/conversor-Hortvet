// Playwright CLI: run-code --filename scripts/browser-checks.js
// Run against a fresh session on the local site or the published URL.
async (page) => {
  const check = (condition, label) => { if (!condition) throw new Error(label); };
  const report = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const browser = page.context().browser().browserType().name();
  const originalViewport = page.viewportSize();
  const base = page.url().split('#')[0].split('?')[0];
  const input = page.getByRole('textbox', { name: 'Ponto de congelamento em °C' });
  const submit = page.getByRole('button', { name: 'Converter', exact: true });

  await page.waitForFunction(() => document.querySelector('#offline-status').dataset.ready === 'true');
  check(await page.locator('#update-notice').isHidden(), 'First installation must not advertise an update');
  report.push('Offline readiness and initial installation state');

  for (const [value, output, state, boundary] of [
    ['-0,512', '−0,530', 'within', 'No limite superior'],
    ['-0,524', '−0,543', 'within', ''],
    ['-0,536', '−0,555', 'within', 'No limite inferior'],
    ['-0,483', '−0,500', 'above', ''],
    ['-0,540', '−0,559', 'below', ''],
    ['-0,5119', '−0,530', 'above', ''],
    ['-0,5361', '−0,555', 'below', ''],
  ]) {
    await input.fill(value);
    await submit.click();
    check(await page.locator('#hortvet-value').textContent() === output, `Conversion ${value}`);
    check(await page.locator('#result-panel').getAttribute('data-state') === state, `Classification ${value}`);
    check(await page.locator('#boundary-label').textContent() === boundary, `Boundary ${value}`);
  }
  report.push('Seven conversion and classification examples, including rounded boundary traps');

  for (const value of ['', '0', '-0', '0,524', 'abc', '-0,5.24', '-0,524 °C']) {
    await input.fill(value);
    await submit.click();
    check(await input.getAttribute('aria-invalid') === 'true', `Validation ${value}`);
    check(await page.locator('#completed-result').isHidden(), 'Invalid input must hide prior result');
  }
  report.push('Invalid inputs and removal of stale results');

  await input.fill('0.524');
  await page.getByRole('button', { name: 'Inserir sinal negativo' }).click();
  check(await input.inputValue() === '-0.524', 'Negative sign control');
  await page.getByRole('button', { name: 'Inserir sinal negativo' }).click();
  check(await input.inputValue() === '-0.524', 'Negative sign control is idempotent');
  await input.press('Enter');
  check(await page.locator('#hortvet-value').textContent() === '−0,543', 'Period decimal + Enter');
  await page.getByText('Ver cálculo', { exact: true }).click();
  check((await page.locator('#exact-calculation').textContent()).includes('−0,54266488'), 'Exact calculation');
  await page.waitForFunction(() => document.querySelector('#result-announcement').textContent.includes('−0,543'));
  report.push('Negative sign, decimal point, keyboard submit, exact calculation and live announcement');

  if (browser === 'chromium') {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copiar resultado' }).click();
    await page.waitForFunction(() => document.querySelector('#copy-feedback').textContent === 'Resultado copiado.');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    check(copied.includes('−0,54266488') && copied.includes('IN 76/2018'), 'Clipboard must include precision and reference');
    report.push('Actual clipboard write/read in Chromium');
  }

  await page.evaluate(() => { window.originalClipboard = navigator.clipboard; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } }); });
  await page.getByRole('button', { name: 'Copiar resultado' }).click();
  await page.locator('#copy-fallback').waitFor({ state: 'visible' });
  check((await page.locator('#copy-text').inputValue()).includes('−0,54266488'), 'Manual copy fallback');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.originalClipboard }); delete window.originalClipboard; });
  await input.fill('-0,483');
  check(await page.locator('#completed-result').isHidden(), 'Editing must invalidate result');
  check(await page.locator('#copy-text').inputValue() === '', 'Editing must clear copied sample fallback');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  check(await input.inputValue() === '' && await page.locator('#completed-result').isHidden(), 'Clear form');
  report.push('Denied clipboard fallback, editing and clear');

  await input.fill('-0,524');
  await submit.click();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    check(dimensions.content <= dimensions.viewport, `No horizontal overflow at ${width}px`);
  }
  await page.setViewportSize(originalViewport);
  report.push('No horizontal overflow at 320, 390, 768 and 1280 CSS pixels');

  await page.getByRole('link', { name: 'Como instalar' }).click();
  await page.waitForFunction(() => document.querySelector('#install').open);
  await page.locator('#install summary').click();
  await page.getByRole('link', { name: 'Como instalar' }).click();
  await page.waitForFunction(() => document.querySelector('#install').open);
  await page.locator('#references summary').click();
  check(await page.locator('#references a').count() === 3, 'Three research sources');
  await page.locator('#references summary').click();
  await page.locator('#install summary').click();
  await page.evaluate(() => { history.replaceState(null, '', location.pathname); window.scrollTo(0, 0); });
  report.push('Installation guidance and research references');

  const context = page.context();
  await context.setOffline(true);
  try {
    const reopened = await context.newPage();
    await reopened.goto(base, { waitUntil: 'load' });
    await reopened.getByRole('textbox', { name: 'Ponto de congelamento em °C' }).fill('-0,483');
    await reopened.getByRole('button', { name: 'Converter', exact: true }).click();
    check(await reopened.locator('#hortvet-value').textContent() === '−0,500', 'Offline reopen conversion');
    check(await reopened.locator('#result-panel').getAttribute('data-state') === 'above', 'Offline reopen interpretation');
    check(await reopened.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0), 'No measurement storage');
    await reopened.close();
  } finally { await context.setOffline(false); }
  report.push('New tab reopened and converted offline; no reading stored');
  check(errors.length === 0, `JavaScript errors: ${errors.join('; ')}`);
  return { browser, passed: report, errors };
}

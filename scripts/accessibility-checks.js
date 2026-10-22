// Requires axe-core at output/playwright/package/axe.min.js (see VALIDATION.md).
async (page) => {
  await page.addScriptTag({ path: 'output/playwright/package/axe.min.js' });
  const viewport = page.viewportSize();
  const results = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const value of ['', '0,524', '-0,524', '-0,483', '-0,540']) {
      await page.getByRole('textbox', { name: 'Ponto de congelamento em °C' }).fill(value);
      if (value) await page.getByRole('button', { name: 'Converter', exact: true }).click();
      await page.locator('#install').evaluate(el => { el.open = true; });
      await page.locator('#references').evaluate(el => { el.open = true; });
      const result = await page.evaluate(async () => axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
      }));
      results.push({ width, input: value, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    }
  }
  await page.locator('#install').evaluate(el => { el.open = false; });
  await page.locator('#references').evaluate(el => { el.open = false; });
  await page.setViewportSize(viewport);
  await page.getByRole('textbox', { name: 'Ponto de congelamento em °C' }).fill('-0,524');
  await page.getByRole('button', { name: 'Converter', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  return results;
}

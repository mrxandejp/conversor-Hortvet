// Keep this as a bare function expression (no trailing semicolon) for run-code.
// Run in an isolated Playwright CLI browser profile, never a user's live profile.
async (page) => {
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
  };
  const passed = [];
  const errors = [];
  const context = page.context();
  const browser = context.browser().browserType().name();
  const base = page.url().split("#")[0];
  page.on("pageerror", (error) => errors.push(error.message));
  const count = async (n, target = page) =>
    target.waitForFunction(
      (n) => document.querySelectorAll("#history-body tr").length === n,
      n,
    );
  const convert = async (value, target = page) => {
    await target.locator("#celsius").fill(value);
    await target
      .getByRole("button", { name: "Converter", exact: true })
      .click();
  };
  const stored = () =>
    page.evaluate(async () => (await import("./storage.js")).listRecords());
  await page.waitForFunction(
    () => document.querySelector("#offline-status").dataset.ready === "true",
  );
  await page.evaluate(async () => {
    await (await import("./storage.js")).clearRecords();
  });
  await page.reload();
  await count(0);
  check(
    await page.locator('[data-report="pdf"]').isDisabled(),
    "Empty report actions disabled",
  );
  await page.clock.setFixedTime(new Date("2026-10-22T15:30:00Z"));
  await convert("-0.52400");
  check(
    (await stored()).length === 0,
    "Conversions are not automatically stored",
  );
  const convertedTime = await page.locator("#conversion-time").textContent();
  await page.clock.setFixedTime(new Date("2026-10-22T15:31:00Z"));
  await page.locator("#add-record").click();
  await count(1);
  await page.waitForFunction(() =>
    document.querySelector("#add-record").textContent.includes("Adicionado"),
  );
  const record = (await stored())[0];
  check(
    record.createdAt.startsWith("2026-10-22T15:30:00."),
    "Capture conversion time, not save time",
  );
  check(
    record.celsius === "−0,52400" && record.hortvet === "−0,543",
    "Input precision retained",
  );
  check(
    convertedTime.endsWith(
      await page.locator("#history-body tr td").first().textContent(),
    ),
    "Table preserves conversion time",
  );
  await page.evaluate(() => {
    document.querySelector("#add-record").click();
    document.querySelector("#add-record").click();
  });
  check(
    (await stored()).length === 1,
    "Repeat click cannot duplicate conversion",
  );
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await count(1);
  await convert("-0.52400");
  await page.locator("#add-record").click();
  await count(2);
  passed.push(
    "Manual add, committed success, duplicate prevention, equal new readings, exact input and captured timestamp; calculator clear preserves history",
  );

  await convert("-0,5119");
  await page.evaluate(() => {
    window.originalAdd = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      const req = window.originalAdd.apply(this, args);
      this.transaction.abort();
      return req;
    };
  });
  await page.locator("#add-record").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#save-feedback")
      .textContent.includes("não foi salvo"),
  );
  check(
    (await stored()).length === 2 &&
      (await page.locator("#add-record").isEnabled()),
    "Aborted write has no false success and is retryable",
  );
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = window.originalAdd;
    delete window.originalAdd;
  });
  await page.locator("#add-record").click();
  await count(3);
  await page.reload();
  await count(3);
  passed.push(
    "Aborted transaction retains result for retry; committed records survive reload",
  );

  const second = await context.newPage();
  await second.goto(base);
  await count(3, second);
  await convert("-0,512");
  await convert("-0,536", second);
  await Promise.all([
    page.locator("#add-record").click(),
    second.locator("#add-record").click(),
  ]);
  await count(5);
  await count(5, second);
  const duplicate = (await stored())[0];
  await Promise.all(
    [page, second].map((target) =>
      target.evaluate(async (record) => {
        await (await import("./storage.js")).saveRecord(record);
      }, duplicate),
    ),
  );
  check(
    (await stored()).length === 5,
    "Same record ID is idempotent across tabs",
  );
  await second.close();
  passed.push(
    "Two tabs: concurrent inserts retained, refreshed table, idempotent storage by ID",
  );

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("[data-delete-record]").first().click();
  await count(5);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-delete-record]").first().click();
  await count(4);
  await page.locator("#date-start").fill("2027-01-01");
  await count(0);
  check(
    await page.locator('[data-report="pdf"]').isDisabled(),
    "No filtered records disables export",
  );
  check(
    (await page.locator("#history-empty").textContent()).includes(
      "Nenhum registro",
    ),
    "Empty filter message",
  );
  let clearMessage = "";
  page.once("dialog", async (dialog) => {
    clearMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.locator("#clear-history").click();
  check((await stored()).length === 4, "Cancel clear preserves hidden records");
  check(
    clearMessage.includes("INCLUSIVE os ocultos"),
    "Clear explicitly includes hidden records",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#clear-history").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#history-count").textContent ===
      "0 registros exibidos de 0",
  );
  check(
    (await stored()).length === 0,
    "Clear removes records outside active filter",
  );
  passed.push(
    "Delete and clear confirmations; cancel preserves records; clear removes filtered-out rows",
  );

  await page.evaluate(async () => {
    const { convert } = await import("./conversion.js");
    const { createRecord } = await import("./records.js");
    const { saveRecord } = await import("./storage.js");
    const values = [
      "-0,512",
      "-0,524",
      "-0,536",
      "-0,483",
      "-0,540",
      "-0,5119",
      "-0,5361",
    ];
    for (let i = 0; i < values.length; i++)
      await saveRecord({
        ...createRecord(convert(values[i]), {
          id: `example-${i}`,
          now: new Date(Date.UTC(2026, 9, 20 + (i % 3), 15, 30, i)),
        }),
        localDate: `2026-10-${20 + (i % 3)}`,
        localTime: `12:30:0${i}`,
        timeZone: "America/Fortaleza",
        offsetMinutes: 180,
      });
  });
  await page.reload();
  await count(7);
  await page.locator("#date-start").fill("2026-10-21");
  await page.locator("#date-end").fill("2026-10-21");
  await count(2);
  await page.locator("#date-end").fill("2026-10-22");
  await count(4);
  await page.locator("#date-start").fill("2026-10-23");
  await count(0);
  check(
    (await page.locator("#date-start").getAttribute("aria-invalid")) === "true",
    "Inverted range invalid",
  );
  check(
    await page.locator('[data-report="docx"]').isDisabled(),
    "Inverted range disables reports",
  );
  await page.locator("#reset-filter").click();
  await count(7);
  passed.push(
    "Inclusive dates, identical start/end, empty and inverted periods, reset filter",
  );

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `No overflow ${width}`,
    );
    check(
      (await page.getByRole("table").count()) === 1,
      "Accessible table retained on mobile",
    );
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: `output/playwright/history-${browser}-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `output/playwright/history-${browser}-mobile.png`,
    fullPage: true,
  });
  passed.push(
    "Responsive table with accessible headers and readable text at 320, 390, 768 and 1280px",
  );

  const exportFile = async (format, label) => {
    const download = page.waitForEvent("download");
    await page.locator(`[data-report="${format}"]`).click();
    const file = await download;
    check(
      /^hortvet-registros-\d{4}-\d{2}-\d{2}-\d{6}\.(pdf|docx)$/.test(
        file.suggestedFilename(),
      ),
      "Filename format",
    );
    await file.saveAs(`output/reports/${browser}-${label}.${format}`);
    await page.waitForFunction(
      () => !document.querySelector('[data-report="pdf"]').disabled,
    );
  };
  // Offline export must load the vendored libraries and fonts from cache for the FIRST time.
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto(base);
  await count(7, reopened);
  await reopened.close();
  await page.reload();
  await count(7);
  await exportFile("pdf", "one-page");
  await exportFile("docx", "one-page");
  check((await stored()).length === 7, "Exports do not remove records");
  await context.setOffline(false);
  passed.push(
    "New tab and reload offline preserve history; first PDF/DOCX exports offline use local fonts/libraries",
  );

  await page.locator("#date-start").fill("2026-10-21");
  await page.locator("#date-end").fill("2026-10-21");
  await count(2);
  const tableRows = await page
    .locator("#history-body tr")
    .evaluateAll((rows) =>
      rows.map((row) =>
        [...row.cells].slice(0, 4).map((cell) => cell.textContent),
      ),
    );
  await page.evaluate(() => {
    window.originalPrint = window.print;
    window.print = () => {
      window.dispatchEvent(new Event("beforeprint"));
      window.printWasCalled = true;
    };
  });
  await page.locator('[data-report="print"]').click();
  check(
    await page.evaluate(() => window.printWasCalled),
    "Print button opens browser print",
  );
  const printRows = await page
    .locator("#print-report tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => [...row.cells].map((cell) => cell.textContent)),
    );
  check(
    JSON.stringify(tableRows) === JSON.stringify(printRows),
    "Printed rows exactly match filtered table",
  );
  await page.emulateMedia({ media: "print" });
  check(
    (await page.locator("main").isHidden()) &&
      (await page.locator("#print-report").isVisible()),
    "Print hides calculator, filters and controls",
  );
  if (browser === "chromium")
    await page.pdf({
      path: "output/reports/chromium-print-filtered.pdf",
      preferCSSPageSize: true,
      printBackground: true,
    });
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => {
    window.print = window.originalPrint;
  });
  await exportFile("pdf", "filtered");
  await exportFile("docx", "filtered");
  passed.push(
    "Filtered table and print use identical rows; dedicated print layout; filtered PDF and DOCX exports",
  );

  await page.evaluate(async () => {
    const { convert } = await import("./conversion.js");
    const { createRecord } = await import("./records.js");
    const { saveRecord } = await import("./storage.js");
    for (let i = 0; i < 70; i++)
      await saveRecord({
        ...createRecord(
          convert(
            ["-0,512", "-0,536", "-0,5119", "-0,5361", "-0,52400"][i % 5],
          ),
          { id: `multipage-${i}`, now: new Date(Date.UTC(2026, 9, 22, 16, i)) },
        ),
        localDate: "2026-10-22",
      });
  });
  await page.reload();
  await count(77);
  await exportFile("pdf", "multipage");
  await exportFile("docx", "multipage");
  if (browser === "chromium") {
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: "output/reports/chromium-print-multipage.pdf",
      preferCSSPageSize: true,
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen" });
  }
  passed.push(
    "77-row PDF/DOCX and print multipage fixtures generated for extraction and visual review",
  );

  const denied = await context.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      value: {
        open() {
          throw new DOMException("Denied", "SecurityError");
        },
      },
    });
  });
  await denied.goto(base);
  await denied.waitForFunction(() =>
    document
      .querySelector("#history-error")
      .textContent.includes("Não foi possível"),
  );
  await convert("-0,524", denied);
  check(
    (await denied.locator("#hortvet-value").textContent()) === "−0,543",
    "Calculator works when storage is unavailable",
  );
  await denied.locator("#add-record").click();
  await denied.waitForFunction(() =>
    document
      .querySelector("#save-feedback")
      .textContent.includes("não foi salvo"),
  );
  check(
    await denied.locator("#add-record").isEnabled(),
    "Unavailable storage is retryable",
  );
  await denied.close();
  passed.push(
    "Denied storage does not break calculator; actionable error and retry without false success",
  );
  check(
    errors.length === 0,
    `Unexpected JavaScript errors: ${errors.join("; ")}`,
  );
  await page.evaluate(
    (result) => {
      window.historyChecksResult = result;
    },
    { browser, passed, errors },
  );
  return { browser, passed, errors };
}

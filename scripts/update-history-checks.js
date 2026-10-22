// Isolated update server on port 4174; POST /advance changes only the SW cache version.
// Use a persistent Playwright profile to also exercise a full browser close/reopen.
async (page) => {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.waitForFunction(
    () => document.querySelectorAll("#history-body tr").length === 1,
  );
  const before = await page.evaluate(async () =>
    (await import("./storage.js")).listRecords(),
  );
  check(
    before[0].celsius === "−0,5119" && before[0].status === "above",
    "Record preserved after full browser shutdown and restart",
  );
  const second = await page.context().newPage();
  await second.goto(page.url());
  await second.waitForFunction(
    () => document.querySelectorAll("#history-body tr").length === 1,
  );
  await page.locator("#celsius").fill("-0,524");
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await page.evaluate(async () => {
    await fetch("/advance", { method: "POST" });
    await (await navigator.serviceWorker.getRegistration()).update();
  });
  await page.locator("#update-notice").waitFor({ state: "visible" });
  check(
    (await page.locator("#hortvet-value").textContent()) === "−0,543",
    "Update waits for user without clearing current calculation",
  );
  await page.locator("#update-button").click();
  for (const target of [page, second]) {
    await target.waitForFunction(
      async () =>
        (await caches.keys()).some((key) => key.endsWith(":test-1.1.1")) &&
        document.querySelector("#completed-result").hidden,
    );
    await target.waitForFunction(
      () => document.querySelectorAll("#history-body tr").length === 1,
    );
    const after = await target.evaluate(async () =>
      (await import("./storage.js")).listRecords(),
    );
    check(
      JSON.stringify(before) === JSON.stringify(after),
      "Update preserves all snapshot fields in both tabs",
    );
  }
  check(
    !(await page.evaluate(() => caches.keys())).some((key) =>
      key.endsWith(":1.1.0"),
    ),
    "Previous cache removed",
  );
  await page.context().setOffline(true);
  const reopened = await page.context().newPage();
  await reopened.goto(page.url());
  await reopened.waitForFunction(
    () => document.querySelectorAll("#history-body tr").length === 1,
  );
  const offline = await reopened.evaluate(async () =>
    (await import("./storage.js")).listRecords(),
  );
  check(
    JSON.stringify(before) === JSON.stringify(offline),
    "Updated PWA reopens offline with the unchanged history",
  );
  await reopened.close();
  await second.close();
  await page.context().setOffline(false);
  const result = {
    passed: [
      "Full Chrome shutdown/restart persistence",
      "Update waits for user",
      "Both tabs reload preserving complete snapshots",
      "Only old asset cache removed",
      "New tab reopens updated PWA offline with preserved history",
    ],
  };
  await page.evaluate((result) => {
    window.updateHistoryResult = result;
  }, result);
  return result;
};

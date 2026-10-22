import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile, access } from "node:fs/promises";

const source = await readFile(
  new URL("../docs/sw.js", import.meta.url),
  "utf8",
);
const scope = "https://example.github.io/conversor-Hortvet/";

function worker({ failInstall = false } = {}) {
  const events = {};
  const stores = new Map([
    ["another-app:v1", new Map()],
    [`hortvet:${scope}:old`, new Map()],
  ]);
  let claimed = false;
  let skipped = false;
  let network = false;
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    skipWaiting: async () => {
      skipped = true;
    },
    addEventListener: (name, callback) => {
      events[name] = callback;
    },
  };
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: async (requests) => {
          if (failInstall) throw new Error("An asset failed to download");
          for (const request of requests)
            store.set(request.url, { url: request.url, cached: true });
        },
        match: async (url) => store.get(url),
      };
    },
  };
  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Request,
    fetch: async () => {
      network = true;
      throw new Error("offline");
    },
  });
  async function lifecycle(name, extra = {}) {
    let promise;
    events[name]({
      ...extra,
      waitUntil: (value) => {
        promise = value;
      },
    });
    await promise;
  }
  async function fetchRequest(url, method = "GET") {
    let promise;
    events.fetch({
      request: new Request(url, { method }),
      respondWith: (value) => {
        promise = value;
      },
    });
    return promise;
  }
  return {
    stores,
    lifecycle,
    fetchRequest,
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
    get network() {
      return network;
    },
  };
}

test("precache includes every file required to reopen under a GitHub Pages subpath", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  const current = [...sw.stores.entries()].find(([name]) =>
    name.endsWith(":1.0.0"),
  )[1];
  for (const url of current.keys()) {
    const path = url.slice(scope.length) || "index.html";
    await access(new URL(`../docs/${path}`, import.meta.url));
  }
  for (const path of [
    "",
    "index.html",
    "conversion.js",
    "pwa.js",
    "styles.css",
    "app.js",
    "manifest.webmanifest",
  ]) {
    assert.equal((await sw.fetchRequest(scope + path)).cached, true);
  }
  assert.equal((await sw.fetchRequest(scope + "?from=home")).cached, true);
  assert.equal(sw.network, false);
});

test("update removes only old caches from this app and waits for explicit activation", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.equal(sw.skipped, false);
  await sw.lifecycle("message", { data: { type: "UNRELATED" } });
  assert.equal(sw.skipped, false);
  await sw.lifecycle("message", { data: { type: "ACTIVATE_UPDATE" } });
  assert.equal(sw.skipped, true);
  await sw.lifecycle("activate");
  assert.equal(sw.claimed, true);
  assert.equal(sw.stores.has("another-app:v1"), true);
  assert.equal(sw.stores.has(`hortvet:${scope}:old`), false);
});

test("failed precache rejects installation without deleting the previous working version", async () => {
  const sw = worker({ failInstall: true });
  await assert.rejects(sw.lifecycle("install"), /failed to download/);
  assert.equal(sw.stores.has(`hortvet:${scope}:old`), true);
  assert.equal(sw.claimed, false);
  assert.equal(sw.skipped, false);
});

test("does not intercept other apps, external references, unknown files or POST requests", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  for (const url of [
    "https://example.github.io/other/",
    "https://www.gov.br/",
    scope + "not-found",
  ]) {
    assert.equal(await sw.fetchRequest(url), undefined);
  }
  assert.equal(await sw.fetchRequest(scope, "POST"), undefined);
});

test("manifest and PNG icons are installable from a project subpath", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../docs/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(new URL(manifest.start_url, scope).href, scope);
  assert.equal(new URL(manifest.scope, scope).href, scope);
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const png = await readFile(new URL("../docs/" + icon.src, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

// Bump VERSION whenever a published asset changes; keep HTML, logic and references together.
const VERSION = "1.1.0";
const PREFIX = `hortvet:${self.registration.scope}:`;
const CACHE = `${PREFIX}${VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./conversion.js",
  "./pwa.js",
  "./records.js",
  "./storage.js",
  "./history.js",
  "./reports.js",
  "./report-assets.js",
  "./report-pdf.js",
  "./report-word.js",
  "./vendor/autotable.js",
  "./vendor/docx-LICENSE.txt",
  "./vendor/docx.js",
  "./vendor/fonts/Lato-Bold.ttf",
  "./vendor/fonts/Lato-Regular.ttf",
  "./vendor/fonts/OFL.txt",
  "./vendor/jspdf-LICENSE.txt",
  "./vendor/jspdf-autotable-LICENSE.txt",
  "./vendor/jspdf.js",
  "./vendor/versions.json",
  "./manifest.webmanifest",
  "./icons/mark.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
];
const assetUrls = new Set(
  ASSETS.map((asset) => new URL(asset, self.registration.scope).href),
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(
        [...assetUrls].map((url) => new Request(url, { cache: "reload" })),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  url.search = "";
  url.hash = "";
  if (!assetUrls.has(url.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(url.href);
      return cached || fetch(event.request);
    })(),
  );
});

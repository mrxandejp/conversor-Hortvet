// Local-only fixture: changes the service worker version without touching published files.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
let next = false;
const root = resolve("docs");
createServer(async (req, res) => {
  if (req.url === "/advance" && req.method === "POST") {
    next = true;
    res.end("ok");
    return;
  }
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (!pathname.startsWith("/conversor-Hortvet/")) {
    res.writeHead(404).end();
    return;
  }
  const path = resolve(
    root,
    pathname.slice("/conversor-Hortvet/".length) || "index.html",
  );
  if (!path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    let body = await readFile(path);
    if (path.endsWith("/sw.js") && next)
      body = Buffer.from(body.toString().replace('"1.1.0"', '"test-1.1.1"'));
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webmanifest": "application/manifest+json",
        ".ttf": "font/ttf",
      }[extname(path)] || "text/plain",
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4174, "127.0.0.1", () =>
  console.log("Update test server: http://127.0.0.1:4174/conversor-Hortvet/"),
);

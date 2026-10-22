import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const packages = [
  ["jspdf", "4.2.1", "dist/jspdf.umd.min.js", "jspdf.js", "LICENSE"],
  [
    "jspdf-autotable",
    "5.0.9",
    "dist/jspdf.plugin.autotable.min.js",
    "autotable.js",
    "LICENSE.txt",
  ],
  ["docx", "9.13.0", "dist/index.umd.cjs", "docx.js", "LICENSE"],
];
await mkdir("docs/vendor", { recursive: true });
for (const [name, version, source, target, license] of packages) {
  const manifest = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  if (manifest.version !== version)
    throw new Error(`Unexpected version of ${name}`);
  await copyFile(`node_modules/${name}/${source}`, `docs/vendor/${target}`);
  await copyFile(
    `node_modules/${name}/${license}`,
    `docs/vendor/${name}-LICENSE.txt`,
  );
}
const paths = [
  ...packages.flatMap(([name, , , target]) => [target, `${name}-LICENSE.txt`]),
  "fonts/Lato-Regular.ttf",
  "fonts/Lato-Bold.ttf",
  "fonts/OFL.txt",
];
const hashes = {};
for (const path of paths)
  hashes[path] = createHash("sha256")
    .update(await readFile(`docs/vendor/${path}`))
    .digest("hex");
await writeFile(
  "docs/vendor/versions.json",
  JSON.stringify(
    {
      libraries: Object.fromEntries(
        packages.map(([name, version]) => [name, version]),
      ),
      fonts: {
        family: "Lato",
        source: "https://github.com/google/fonts/tree/main/ofl/lato",
        license: "SIL OFL 1.1",
        note: "Static TTF snapshots included in this repository; SHA-256 pins the exact bytes.",
      },
      sha256: hashes,
    },
    null,
    2,
  ) + "\n",
);

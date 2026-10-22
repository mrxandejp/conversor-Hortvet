import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import { convert } from "../docs/conversion.js";
import {
  createRecord,
  filterRecords,
  reportModel,
  timeLabel,
  statusLabel,
  offsetLabel,
} from "../docs/records.js";

const sample = (raw, id, date) =>
  createRecord(convert(raw), { id, now: new Date(date) });
const a = sample("-0,512", "a", "2026-10-20T12:34:56-03:00");
const b = sample("-0,5119", "b", "2026-10-21T12:34:56-03:00");
const c = sample("-0,5361", "c", "2026-10-22T12:34:56-03:00");

test("record is a versioned, serializable snapshot of exact and rounded values", () => {
  const result = createRecord(convert("-0.52400"), {
    now: new Date("2026-10-22T15:30:00Z"),
  });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.ruleVersion, "in76-2018-celsius-v1");
  assert.equal(result.createdAt, "2026-10-22T15:30:00.000Z");
  assert.equal(result.celsius, "−0,52400");
  assert.equal(result.hortvet, "−0,543");
  assert.equal(result.exactHortvet, "−0,5426648800");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.ok(Object.isFrozen(result));
});

test("equal readings represent different conversions with unique IDs", () => {
  const first = createRecord(convert("-0,524"));
  const second = createRecord(convert("-0,524"));
  assert.notEqual(first.id, second.id);
  assert.equal(first.celsius, second.celsius);
});

test("filters include both endpoints and sort chronologically without mutating input", () => {
  const source = [c, a, b];
  assert.deepEqual(filterRecords(source), [a, b, c]);
  assert.deepEqual(filterRecords(source, a.localDate, b.localDate), [a, b]);
  assert.deepEqual(filterRecords(source, b.localDate, b.localDate), [b]);
  assert.deepEqual(filterRecords(source, c.localDate), [c]);
  assert.deepEqual(filterRecords(source, "", a.localDate), [a]);
  assert.deepEqual(source, [c, a, b]);
});

test("reversed and empty periods have distinct outcomes", () => {
  assert.throws(
    () => filterRecords([a], "2026-10-22", "2026-10-20"),
    /anterior/,
  );
  assert.deepEqual(filterRecords([a], "2027-01-01"), []);
});

test("saved wall-clock date and offset survive changes in the viewing time zone", () => {
  const record = {
    ...a,
    localDate: "2026-10-20",
    localTime: "23:59:59",
    offsetMinutes: -345,
    timeZone: "Asia/Kathmandu",
  };
  assert.equal(timeLabel(record), "20/10/2026 23:59:59 (UTC+05:45)");
  assert.deepEqual(filterRecords([record], "2026-10-20", "2026-10-20"), [
    record,
  ]);
  assert.equal(offsetLabel(210), "UTC−03:30");
});

test("all seven example statuses and boundaries survive report generation", () => {
  const readings = [
    "-0,512",
    "-0,524",
    "-0,536",
    "-0,483",
    "-0,540",
    "-0,5119",
    "-0,5361",
  ];
  for (const raw of readings) {
    const record = createRecord(convert(raw));
    const report = reportModel([record]);
    assert.deepEqual(report.rows[0], [
      timeLabel(record),
      record.celsius,
      record.hortvet,
      statusLabel(record),
    ]);
  }
  assert.match(statusLabel(a), /No limite superior/);
  assert.match(reportModel([b]).rows[0][3], /acima/);
  assert.match(reportModel([c]).rows[0][3], /abaixo/);
});

test("reports use historical snapshots instead of applying the current rule", () => {
  const old = {
    ...a,
    ruleVersion: "historical",
    hortvet: "−0,531",
    title: "Interpretação da regra histórica",
  };
  const report = reportModel([old]);
  assert.equal(report.rows[0][2], "−0,531");
  assert.match(report.rows[0][3], /regra histórica/);
});

test("report captures a filtered immutable dataset and metadata", () => {
  const report = reportModel(
    [c, b, a],
    b.localDate,
    c.localDate,
    new Date(2026, 9, 22, 15, 30, 0),
  );
  assert.equal(report.title, "Registros de crioscopia do leite");
  assert.equal(report.count, 2);
  assert.equal(report.period, "21/10/2026 a 22/10/2026 (inclusive)");
  assert.equal(report.filename, "hortvet-registros-2026-10-22-153000");
  assert.match(report.issued, /22\/10\/2026 15:30:00/);
  assert.ok(Object.isFrozen(report.rows[0]));
});

test("vendored library and font bytes match the pinned checksums", async () => {
  const versions = JSON.parse(
    await readFile(
      new URL("../docs/vendor/versions.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [path, expected] of Object.entries(versions.sha256)) {
    const file = await readFile(
      new URL(`../docs/vendor/${path}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(file).digest("hex"),
      expected,
      path,
    );
  }
});

test("both PDF font faces include mathematical minus, degrees and Portuguese accents", async () => {
  for (const weight of ["Regular", "Bold"]) {
    const pdf = new jsPDF();
    const data = await readFile(
      new URL(`../docs/vendor/fonts/Lato-${weight}.ttf`, import.meta.url),
    );
    pdf.addFileToVFS("font.ttf", data.toString("base64"));
    pdf.addFont("font.ttf", "test", "normal");
    pdf.setFont("test");
    const glyphs = pdf.getFont().metadata.cmap.unicode.codeMap;
    for (const character of "−°çãéíóê")
      assert.ok(glyphs[character.codePointAt(0)], `${weight}: ${character}`);
  }
});

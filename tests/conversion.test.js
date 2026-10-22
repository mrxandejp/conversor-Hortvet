import test from "node:test";
import assert from "node:assert/strict";
import {
  convert,
  parseCelsius,
  formatDecimal,
  resultText,
} from "../docs/conversion.js";

for (const [input, expected, status, boundary] of [
  ["-0,512", "−0,530", "within", "upper"],
  ["-0,524", "−0,543", "within", null],
  ["-0,536", "−0,555", "within", "lower"],
  ["-0,483", "−0,500", "above", null],
  ["-0,540", "−0,559", "below", null],
  ["-0,5119", "−0,530", "above", null],
  ["-0,5361", "−0,555", "below", null],
]) {
  test(`${input} => ${expected}, ${status}, ${boundary}`, () => {
    const result = convert(input);
    assert.equal(result.rounded, expected);
    assert.equal(result.status, status);
    assert.equal(result.boundary, boundary);
  });
}

test("preserves exact arithmetic and signed conversion", () => {
  assert.equal(convert("-0.524").exact, "−0,54266488");
  assert.equal(convert("  −0,524  ").exact, convert("-0.524").exact);
  assert.equal(convert("-00,5240").input, "−0,5240");
  assert.equal(convert("-0,5360000000000000000001").status, "below");
  assert.equal(convert("-0,5119999999999999999999").status, "above");
});

test("equivalent decimal representations share inclusive limits", () => {
  for (const input of ["-0.512000", "−00,5120", " -0,512 "])
    assert.equal(convert(input).boundary, "upper");
  for (const input of ["-0.536000", "−00,5360"])
    assert.equal(convert(input).boundary, "lower");
  assert.equal(convert("-0.5120000000000000000001").status, "within");
  assert.equal(convert("-0.5359999999999999999999").status, "within");
});

for (const input of [
  "",
  " ",
  "0",
  "-0",
  "−0,000",
  "0,524",
  "+0.524",
  "524",
  "NaN",
  "Infinity",
  "-Infinity",
  "-5e-1",
  "-0,5.24",
  "-0,524 °C",
  "abc",
  "--0.524",
  "- 0.524",
  "-0,",
  "-.524",
  "-0\n.524",
  "-0." + "1".repeat(40),
  null,
]) {
  test(`rejects invalid input ${JSON.stringify(input)}`, () =>
    assert.throws(() => parseCelsius(input)));
}

test("rounds ties away from zero and keeps decimal digits", () => {
  assert.equal(formatDecimal({ coefficient: -5425n, scale: 4 }, 3), "−0,543");
  assert.equal(formatDecimal({ coefficient: -9995n, scale: 4 }, 3), "−1,000");
  assert.equal(formatDecimal({ coefficient: -5n, scale: 1 }, 3), "−0,500");
});

test("copy includes the original value, unrounded result, scope and interpretation", () => {
  const text = resultText(convert("-0,5119"));
  assert.match(text, /−0,5119 °C/);
  assert.match(text, /−0,530133878 °H/);
  assert.match(text, /acima do limite/);
  assert.match(text, /não comprova adição de água/);
  assert.match(text, /sem arredondamento/);
  assert.match(text, /IN 76\/2018/);
  assert.match(resultText(convert("-0,536")), /no limite inferior/);
});

export const FACTOR = "1,03562";
export const REFERENCE_DATE = "22/10/2026";
export const LIMITS = Object.freeze({ lower: "-0,536", upper: "-0,512" });

// Decimal arithmetic keeps input precision and avoids binary rounding at the limits.
const power = (scale) => 10n ** BigInt(scale);

export function parseCelsius(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Digite o ponto de congelamento em Celsius.");
  }
  const normalized = raw.trim().replace(/^−/, "-");
  if (normalized.length > 40 || !/^-?\d+(?:[.,]\d+)?$/.test(normalized)) {
    throw new Error(
      "Use um número como −0,524, com vírgula ou ponto e sem a unidade.",
    );
  }
  const negative = normalized.startsWith("-");
  const [integer, fraction = ""] = normalized.replace(/^-/, "").split(/[.,]/);
  const magnitude = BigInt(integer + fraction);
  if (!negative || magnitude === 0n) {
    throw new Error(
      "Informe um valor negativo, como −0,524 °C. Confira o sinal no laudo.",
    );
  }
  return Object.freeze({ coefficient: -magnitude, scale: fraction.length });
}

export function formatDecimal(decimal, places = null) {
  const negative = decimal.coefficient < 0n;
  let magnitude = negative ? -decimal.coefficient : decimal.coefficient;
  const scale = places ?? decimal.scale;
  if (scale < decimal.scale) {
    const divisor = power(decimal.scale - scale);
    // Round half away from zero. Classification never uses this rounded value.
    magnitude = (magnitude + divisor / 2n) / divisor;
  } else {
    magnitude *= power(scale - decimal.scale);
  }
  const digits = magnitude.toString().padStart(scale + 1, "0");
  const value = scale
    ? `${digits.slice(0, -scale)},${digits.slice(-scale)}`
    : digits;
  return `${negative ? "−" : ""}${value}`;
}

function compareToMillis(decimal, millis) {
  const left = decimal.coefficient * 1000n;
  const right = BigInt(millis) * power(decimal.scale);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function convert(raw) {
  const celsius = parseCelsius(raw);
  const hortvet = Object.freeze({
    coefficient: celsius.coefficient * 103562n,
    scale: celsius.scale + 5,
  });
  const lower = compareToMillis(celsius, -536);
  const upper = compareToMillis(celsius, -512);
  const status = lower < 0 ? "below" : upper > 0 ? "above" : "within";
  const boundary = lower === 0 ? "lower" : upper === 0 ? "upper" : null;
  const messages = {
    within: {
      title: "Dentro da faixa de referência",
      description:
        "O índice crioscópico informado está na faixa da IN 76 para leite bovino cru refrigerado.",
      symbol: "✓",
    },
    above: {
      title: "Fora da faixa — acima do limite",
      description:
        "Possível diluição. Investigue o resultado com o laboratório; esta leitura isolada não comprova adição de água.",
      symbol: "↑",
    },
    below: {
      title: "Fora da faixa — abaixo do limite",
      description:
        "O ponto de congelamento está mais negativo que a referência. Investigue a alteração com o laboratório.",
      symbol: "↓",
    },
  };
  return Object.freeze({
    celsius,
    hortvet,
    status,
    boundary,
    input: formatDecimal(celsius),
    rounded: formatDecimal(hortvet, 3),
    exact: formatDecimal(hortvet),
    boundaryText:
      boundary === "lower"
        ? "No limite inferior"
        : boundary === "upper"
          ? "No limite superior"
          : "",
    ...messages[status],
  });
}

export function resultText(result) {
  return [
    "Conversor Hortvet • Leite bovino cru refrigerado",
    `Ponto de congelamento: ${result.input} °C`,
    `Conversão: ${result.rounded} °H (arredondado)`,
    `Cálculo: ${result.input} × ${FACTOR} = ${result.exact} °H`,
    result.title +
      (result.boundaryText ? ` — ${result.boundaryText.toLowerCase()}` : ""),
    result.description,
    "Classificação pelo Celsius informado, sem arredondamento. Faixa: −0,536 a −0,512 °C, inclusive.",
    "A crioscopia isolada não determina qualidade microbiológica, acidez ou segurança para consumo.",
    `Referência: IN 76/2018, art. 5º, IX. Revisão: ${REFERENCE_DATE}.`,
  ].join("\n");
}

// Snapshots retain the rule and the displayed result, even after future rule changes.
export const RECORD_VERSION = 1;
export const RULE_VERSION = "in76-2018-celsius-v1";
export const REPORT_NOTE =
  "Fórmula: °H = °C × 1,03562. Faixa adotada: −0,536 a −0,512 °C, inclusive (IN 76/2018, art. 5º, IX), para leite bovino cru refrigerado. Classificação pelo Celsius original, antes do arredondamento. Valores acima da faixa podem indicar diluição; alterações devem ser investigadas com o laboratório. A crioscopia isolada não determina qualidade microbiológica, acidez, segurança para consumo ou fraude. Os resultados registrados são preservados com a regra da data da conversão.";
const pad = (value) => String(value).padStart(2, "0");

export function localDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function offsetLabel(minutes) {
  const absolute = Math.abs(minutes);
  return `UTC${minutes <= 0 ? "+" : "−"}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

export function dateLabel(date) {
  return date.split("-").reverse().join("/");
}

export function createRecord(
  result,
  {
    now = new Date(),
    id = crypto.randomUUID(),
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  } = {},
) {
  return Object.freeze({
    schemaVersion: RECORD_VERSION,
    ruleVersion: RULE_VERSION,
    id,
    createdAt: now.toISOString(),
    localDate: localDate(now),
    localTime: localTime(now),
    timeZone,
    offsetMinutes: now.getTimezoneOffset(),
    celsius: result.input,
    hortvet: result.rounded,
    exactHortvet: result.exact,
    status: result.status,
    boundary: result.boundary,
    title: result.title,
    description: result.description,
    boundaryText: result.boundaryText,
  });
}

export function timeLabel(record) {
  return `${dateLabel(record.localDate)} ${record.localTime} (${offsetLabel(record.offsetMinutes)})`;
}

export function statusLabel(record) {
  return [record.title, record.boundaryText].filter(Boolean).join("; ");
}

export function filterRecords(records, start = "", end = "") {
  if (start && end && start > end)
    throw new Error("A data inicial deve ser anterior ou igual à data final.");
  return records
    .filter(
      (record) =>
        (!start || record.localDate >= start) &&
        (!end || record.localDate <= end),
    )
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}

export function periodLabel(start, end) {
  if (start && end)
    return `${dateLabel(start)} a ${dateLabel(end)} (inclusive)`;
  if (start) return `A partir de ${dateLabel(start)} (inclusive)`;
  if (end) return `Até ${dateLabel(end)} (inclusive)`;
  return "Todo o histórico";
}

// All renderers consume the same immutable text, without recalculating old readings.
export function reportModel(records, start = "", end = "", now = new Date()) {
  const filtered = filterRecords(records, start, end);
  const rows = filtered.map((record) =>
    Object.freeze([
      timeLabel(record),
      record.celsius,
      record.hortvet,
      statusLabel(record),
    ]),
  );
  return Object.freeze({
    title: "Registros de crioscopia do leite",
    period: periodLabel(start, end),
    issued: `${dateLabel(localDate(now))} ${localTime(now)} (${offsetLabel(now.getTimezoneOffset())})`,
    count: rows.length,
    headers: Object.freeze([
      "Data e hora",
      "Celsius (°C)",
      "Hortvet (°H)",
      "Status",
    ]),
    rows: Object.freeze(rows),
    note: REPORT_NOTE,
    clockNote:
      "Horários da conversão, pelo relógio do aparelho. Cada registro mantém seu fuso original; o filtro usa a data local registrada.",
    filename: `hortvet-registros-${localDate(now)}-${localTime(now).replaceAll(":", "")}`,
  });
}

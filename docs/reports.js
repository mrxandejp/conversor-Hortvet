import { pdfBlob } from "./report-pdf.js";
import { wordBlob } from "./report-word.js";

export function renderPrintReport(report, root) {
  root.replaceChildren();
  const text = (tag, value, parent = root) => {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
  };
  text("h1", report.title);
  text("p", `Período: ${report.period}`);
  text("p", `Emissão: ${report.issued}`);
  text("p", `Quantidade de registros: ${report.count}`);
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  report.headers.forEach((header) => {
    text("th", header, head).scope = "col";
  });
  const body = table.createTBody();
  report.rows.forEach((row) => {
    const tr = body.insertRow();
    row.forEach((value) => {
      text("td", value, tr);
    });
  });
  root.append(table);
  if (!report.count) text("p", "Nenhum registro neste período.");
  text("p", report.clockNote).className = "report-note";
  text("p", report.note).className = "report-note";
}

let downloadUrl;
export function clearDownload(link) {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = undefined;
  link.hidden = true;
  link.removeAttribute("href");
}

export async function downloadReport(report, format, link) {
  const blob = await (format === "pdf" ? pdfBlob(report) : wordBlob(report));
  clearDownload(link);
  downloadUrl = URL.createObjectURL(blob);
  link.href = downloadUrl;
  link.download = `${report.filename}.${format}`;
  link.textContent = `Abrir / baixar ${format === "pdf" ? "PDF" : "Word"} (${report.count} registros)`;
  link.hidden = false;
  // Keep a real link available for browsers that require a second user gesture.
  link.click();
}

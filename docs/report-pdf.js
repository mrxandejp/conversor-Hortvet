import { loadFonts, loadScript } from "./report-assets.js";

export async function pdfBlob(report) {
  await loadScript("./vendor/jspdf.js");
  await loadScript("./vendor/autotable.js");
  const fonts = await loadFonts();
  const pdf = new window.jspdf.jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  ["normal", "bold"].forEach((style, index) => {
    pdf.addFileToVFS(`${style}.ttf`, fonts[index]);
    pdf.addFont(`${style}.ttf`, "Lato", style);
  });
  pdf.setProperties({
    title: report.title,
    subject: report.period,
    creator: "Hortvet 1.1.0",
  });
  pdf.setFont("Lato", "bold").setFontSize(17);
  pdf.text(report.title, 15, 21);
  pdf.setFont("Lato", "normal").setFontSize(10);
  pdf.text(`Período: ${report.period}`, 15, 30);
  pdf.text(`Emissão: ${report.issued}`, 15, 36);
  pdf.text(`Quantidade de registros: ${report.count}`, 15, 42);
  pdf.autoTable({
    startY: 49,
    margin: { top: 16, bottom: 22, left: 15, right: 15 },
    head: [report.headers],
    body: report.rows.map((row) => [...row]),
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: {
      font: "Lato",
      fontStyle: "normal",
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "top",
      textColor: 25,
      lineColor: 190,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [238, 242, 239],
      textColor: 20,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 43 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 77 },
    },
  });
  pdf.setFont("Lato", "normal").setFontSize(8);
  const note = pdf.splitTextToSize(
    `${report.clockNote}\n\n${report.note}`,
    180,
  );
  let y = pdf.lastAutoTable.finalY + 8;
  if (y + note.length * 4 > 275) {
    pdf.addPage();
    y = 20;
  }
  pdf.text(note, 15, y, { lineHeightFactor: 1.4 });
  const pages = pdf.getNumberOfPages();
  for (let number = 1; number <= pages; number++) {
    pdf.setPage(number).setFont("Lato", "normal").setFontSize(8);
    pdf.text("Hortvet · Leite bovino cru refrigerado", 15, 287);
    pdf.text(`Página ${number} de ${pages}`, 195, 287, { align: "right" });
  }
  return pdf.output("blob");
}

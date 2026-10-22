import { loadScript } from "./report-assets.js";

export async function wordBlob(report) {
  await loadScript("./vendor/docx.js");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    TableLayoutType,
    BorderStyle,
    Footer,
    AlignmentType,
    PageNumber,
  } = window.docx;
  const paragraph = (text, options = {}) =>
    new Paragraph({
      keepLines: true,
      children: [new TextRun({ text, ...options })],
      spacing: { after: 100 },
    });
  const widths = [2438, 1701, 1701, 4365]; // 180 mm, matching the PDF's columns.
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BEBEBE" };
  const row = (values, header = false) =>
    new TableRow({
      tableHeader: header,
      cantSplit: true,
      children: values.map(
        (value, index) =>
          new TableCell({
            width: { size: widths[index], type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 130, right: 130 },
            ...(header ? { shading: { fill: "EEF2EF" } } : {}),
            children: [
              new Paragraph({
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({ text: value, bold: header, size: 19 }),
                ],
              }),
            ],
          }),
      ),
    });
  const document = new Document({
    title: report.title,
    creator: "Hortvet 1.1.0",
    description: report.period,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20, color: "191919" },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 850,
              bottom: 1134,
              left: 850,
              right: 850,
              footer: 425,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Hortvet · Página ", size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                  new TextRun({ text: " de ", size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: [
          paragraph(report.title, { bold: true, size: 34 }),
          paragraph(`Período: ${report.period}`),
          paragraph(`Emissão: ${report.issued}`),
          paragraph(`Quantidade de registros: ${report.count}`),
          new Table({
            width: { size: 10205, type: WidthType.DXA },
            columnWidths: widths,
            layout: TableLayoutType.FIXED,
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
              insideHorizontal: border,
              insideVertical: border,
            },
            rows: [
              row(report.headers, true),
              ...report.rows.map((values) => row(values)),
            ],
          }),
          new Paragraph({
            keepLines: true,
            keepNext: true,
            spacing: { before: 220, after: 120 },
            children: [new TextRun({ text: report.clockNote, size: 17 })],
          }),
          paragraph(report.note, { size: 17 }),
        ],
      },
    ],
  });
  return Packer.toBlob(document);
}

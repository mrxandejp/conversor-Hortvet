"""Extract downloaded fixtures: python scripts/check-reports.py (pdfplumber required)."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import pdfplumber

ROOT = Path("output/reports")
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"


def normalized(text):
    return re.sub(r"\s+", " ", text or "").strip()


def docx_rows(path):
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
    table = document.find(".//w:tbl", NS)
    rows = table.findall("w:tr", NS)
    assert rows[0].find("w:trPr/w:tblHeader", NS) is not None
    assert all(row.find("w:trPr/w:cantSplit", NS) is not None for row in rows)
    size = document.find(".//w:pgSz", NS)
    assert (size.get(W + "w"), size.get(W + "h")) == ("11906", "16838")
    return [[normalized("".join(cell.itertext())) for cell in row.findall("w:tc", NS)] for row in rows]


def pdf_rows(path):
    result = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1
            tables = page.extract_tables()
            for table in tables:
                # Chromium emits extra outer lines that can include the metadata/footer.
                table = [row for row in table if all(cell is not None for cell in row)]
                if not table:
                    continue
                header = [normalized(cell) for cell in table[0]]
                assert header == ["Data e hora", "Celsius (°C)", "Hortvet (°H)", "Status"], (path, header)
                result += [[normalized(cell) for cell in row] for row in table[1:]]
    return result


for browser in ["chromium", "webkit"]:
    for fixture, count in [("one-page", 7), ("filtered", 2), ("multipage", 77)]:
        base = ROOT / f"{browser}-{fixture}"
        docx = docx_rows(base.with_suffix(".docx"))[1:]
        pdf = pdf_rows(base.with_suffix(".pdf"))
        assert len(docx) == len(pdf) == count, (browser, fixture, len(docx), len(pdf))
        assert docx == pdf, (browser, fixture, "Different rows between PDF and DOCX")
        for row in docx:
            assert row[1].startswith("−") and row[2].startswith("−"), row
            if row[1] == "−0,5119":
                assert row[2] == "−0,530" and "acima" in row[3]
            if row[1] == "−0,5361":
                assert row[2] == "−0,555" and "abaixo" in row[3]
        if fixture == "filtered":
            assert [row[1] for row in docx] == ["−0,524", "−0,540"]
            assert all(row[0].startswith("21/10/2026") for row in docx)
        if browser == "chromium" and fixture != "one-page":
            assert docx == pdf_rows(ROOT / f"chromium-print-{fixture}.pdf"), "Print differs"
        print(f"PASS {browser}/{fixture}: {count} identical rows; A4, repeated headers, signs and statuses")

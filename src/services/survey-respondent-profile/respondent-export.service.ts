import type { RespondentProfileListFilter } from "../../repositories/survey-respondent-profile.repository";
import { surveyRespondentProfileRepository } from "../../repositories/survey-respondent-profile.repository";
import PDFDocument from "pdfkit";

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function flattenAnswers(answers: unknown): string {
  if (!answers || typeof answers !== "object") return "";
  return Object.entries(answers as Record<string, unknown>)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : String(v)}`)
    .join("; ");
}

const CSV_HEADERS = [
  "id",
  "owner_type",
  "vendor_name",
  "vendor_code",
  "survey_name",
  "survey_code",
  "allocation_code",
  "tracking_id",
  "internal_token",
  "survey_status",
  "prescreen_completed_at",
  "started_at",
  "completed_at",
  "prescreen_answers",
  "created_at"
];

function rowFromDoc(doc: Record<string, unknown>): string[] {
  const vendor =
    typeof doc.vendorId === "object" && doc.vendorId !== null
      ? (doc.vendorId as Record<string, unknown>)
      : null;
  const survey =
    typeof doc.panelSurveyId === "object" && doc.panelSurveyId !== null
      ? (doc.panelSurveyId as Record<string, unknown>)
      : null;
  const allocation =
    typeof doc.allocationId === "object" && doc.allocationId !== null
      ? (doc.allocationId as Record<string, unknown>)
      : null;

  return [
    String(doc._id),
    String(doc.respondentOwnerType ?? ""),
    vendor ? String(vendor.companyName ?? "") : "",
    vendor ? String(vendor.vendorCode ?? "") : "",
    survey ? String(survey.surveyName ?? "") : "",
    survey ? String(survey.surveyCode ?? "") : "",
    allocation ? String(allocation.allocationCode ?? "") : "",
    String(doc.vendorRespondentToid ?? ""),
    String(doc.internalSessionToken ?? ""),
    String(doc.surveyStatus ?? ""),
    doc.prescreenCompletedAt ? new Date(String(doc.prescreenCompletedAt)).toISOString() : "",
    doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : "",
    doc.completedAt ? new Date(String(doc.completedAt)).toISOString() : "",
    flattenAnswers(doc.prescreenAnswers),
    doc.createdAt ? new Date(String(doc.createdAt)).toISOString() : ""
  ];
}

/** Streams CSV in batches — avoids loading full dataset into memory */
export async function* streamRespondentCsvRows(filter: RespondentProfileListFilter) {
  yield CSV_HEADERS.map(escapeCsvCell).join(",") + "\n";

  const cursor = surveyRespondentProfileRepository.cursorForExport(filter);
  for await (const doc of cursor) {
    const cells = rowFromDoc(doc as unknown as Record<string, unknown>);
    yield cells.map(escapeCsvCell).join(",") + "\n";
  }
}

/**
 * XLSX via minimal XML spreadsheet (no heavy dependency).
 * For large exports prefer CSV; XLSX capped at 10k rows.
 */
export async function buildRespondentXlsxBuffer(
  filter: RespondentProfileListFilter,
  maxRows = 10_000
): Promise<Buffer> {
  const rows: string[][] = [CSV_HEADERS];
  const cursor = surveyRespondentProfileRepository.cursorForExport(filter);
  let count = 0;
  for await (const doc of cursor) {
    rows.push(rowFromDoc(doc as unknown as Record<string, unknown>));
    count++;
    if (count >= maxRows) break;
  }

  const sheetRows = rows
    .map(
      (r) =>
        `<row>${r.map((c) => `<c><![CDATA[${String(c).replace(/]]>/g, "]]]]><![CDATA[>")}]]></c>`).join("")}</row>`
    )
    .join("");

  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Respondents" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Table>${sheetRows}</Table>
</Worksheet>
</Workbook>`;

  return Buffer.from(xml, "utf-8");
}

function truncateCell(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** PDF table export — landscape A4, capped at 10k rows like XLSX. */
export async function buildRespondentPdfBuffer(
  filter: RespondentProfileListFilter,
  maxRows = 10_000
): Promise<Buffer> {
  const rows: string[][] = [];
  const cursor = surveyRespondentProfileRepository.cursorForExport(filter);
  for await (const doc of cursor) {
    rows.push(rowFromDoc(doc as unknown as Record<string, unknown>));
    if (rows.length >= maxRows) break;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 28,
      info: { Title: "Respondent export" }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 28;
    const top = 28;
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const bottom = pageHeight - 28;
    const colCount = CSV_HEADERS.length;
    const tableWidth = pageWidth - left * 2;
    const colWidth = tableWidth / colCount;
    const rowHeight = 14;
    const fontSize = 5.5;

    let y = top;
    doc.fontSize(12).font("Helvetica-Bold").text("Respondent export", left, y);
    y += 18;
    doc.fontSize(8).font("Helvetica").text(`Generated ${new Date().toISOString()}`, left, y);
    y += 16;
    doc.fontSize(fontSize);

    const drawHeaderRow = () => {
      doc.font("Helvetica-Bold");
      CSV_HEADERS.forEach((header, i) => {
        doc.text(truncateCell(header, 18), left + i * colWidth + 2, y, {
          width: colWidth - 4,
          lineBreak: false
        });
      });
      doc.font("Helvetica");
      y += rowHeight;
    };

    drawHeaderRow();

    for (const row of rows) {
      if (y + rowHeight > bottom) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
        y = top;
        drawHeaderRow();
      }
      row.forEach((cell, i) => {
        doc.text(truncateCell(String(cell), 28), left + i * colWidth + 2, y, {
          width: colWidth - 4,
          lineBreak: false
        });
      });
      y += rowHeight;
    }

    if (rows.length >= maxRows) {
      y += 8;
      doc.fontSize(7).fillColor("#666666").text(`Export capped at ${maxRows.toLocaleString()} rows.`, left, y);
    }

    doc.end();
  });
}

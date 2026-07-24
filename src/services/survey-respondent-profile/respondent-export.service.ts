import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import type { RespondentProfileListFilter } from "../../repositories/survey-respondent-profile.repository";
import { surveyRespondentProfileRepository } from "../../repositories/survey-respondent-profile.repository";

/** Exact export column headers — shared by CSV, Excel, and PDF. */
export const EXPORT_HEADERS = [
  "Owner Type",
  "Vendor Name",
  "Survey Name",
  "Survey Code",
  "Tracking ID",
  "Internal Token",
  "Survey Status",
  "Started At",
  "Completed At"
] as const;

export type ExportRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

export type ExportMeta = {
  surveyLabel: string;
  vendorLabel: string;
  statusLabel: string;
  exportDate: string;
};

const STATUS_LABELS: Record<string, string> = {
  complete: "Complete",
  terminate: "Terminate",
  quota_full: "Quota Full",
  quality_reject: "Security Fail",
  over_quota: "Over Quota",
  prescreen_pending: "Prescreen Pending",
  started: "Started",
  redirected: "Redirected"
};

const OWNER_LABELS: Record<string, string> = {
  internal: "Internal",
  vendor: "Vendor"
};

function cellOrDash(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const s = String(value).trim();
  return s.length ? s : "-";
}

function formatExportDate(value: unknown): string {
  if (!value) return "-";
  const d = dayjs(value as string | Date | number);
  if (!d.isValid()) return "-";
  return d.format("DD MMM YYYY, hh:mm A");
}

export function formatSurveyStatusLabel(status: unknown): string {
  const key = String(status ?? "").trim();
  if (!key) return "-";
  return STATUS_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatOwnerTypeLabel(owner: unknown): string {
  const key = String(owner ?? "").trim();
  if (!key) return "-";
  return OWNER_LABELS[key] ?? key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function rowFromDoc(doc: Record<string, unknown>): ExportRow {
  const vendor =
    typeof doc.vendorId === "object" && doc.vendorId !== null
      ? (doc.vendorId as Record<string, unknown>)
      : null;
  const survey =
    typeof doc.panelSurveyId === "object" && doc.panelSurveyId !== null
      ? (doc.panelSurveyId as Record<string, unknown>)
      : null;

  return [
    formatOwnerTypeLabel(doc.respondentOwnerType),
    cellOrDash(vendor?.companyName),
    cellOrDash(survey?.surveyName),
    cellOrDash(survey?.surveyCode),
    cellOrDash(doc.vendorRespondentToid),
    cellOrDash(doc.internalSessionToken),
    formatSurveyStatusLabel(doc.surveyStatus),
    formatExportDate(doc.createdAt),
    formatExportDate(doc.completedAt)
  ];
}

export function buildExportMeta(filter: RespondentProfileListFilter): ExportMeta {
  return {
    surveyLabel: filter.panelSurveyId?.trim() ? filter.panelSurveyId.trim() : "All surveys",
    vendorLabel: filter.vendorId?.trim() ? filter.vendorId.trim() : "All vendors",
    statusLabel: filter.surveyStatus?.trim()
      ? formatSurveyStatusLabel(filter.surveyStatus)
      : "All",
    exportDate: dayjs().format("DD MMM YYYY, hh:mm A")
  };
}

export async function resolveExportMeta(
  filter: RespondentProfileListFilter,
  labels?: { surveyName?: string; vendorName?: string }
): Promise<ExportMeta> {
  const base = buildExportMeta(filter);
  return {
    ...base,
    surveyLabel: labels?.surveyName?.trim() || base.surveyLabel,
    vendorLabel: labels?.vendorName?.trim() || base.vendorLabel
  };
}

async function collectExportRows(
  filter: RespondentProfileListFilter,
  maxRows = 10_000
): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  const cursor = await surveyRespondentProfileRepository.cursorForExport(filter);
  for await (const doc of cursor) {
    rows.push(rowFromDoc(doc as unknown as Record<string, unknown>));
    if (rows.length >= maxRows) break;
  }
  return rows;
}

/** Streams CSV in batches — UTF-8 with BOM for Excel compatibility. */
export async function* streamRespondentCsvRows(filter: RespondentProfileListFilter) {
  // UTF-8 BOM so Excel opens special characters correctly
  yield "\uFEFF";
  yield EXPORT_HEADERS.map((h) => escapeCsvCell(h)).join(",") + "\r\n";

  const cursor = await surveyRespondentProfileRepository.cursorForExport(filter);
  for await (const doc of cursor) {
    const cells = rowFromDoc(doc as unknown as Record<string, unknown>);
    yield cells.map(escapeCsvCell).join(",") + "\r\n";
  }
}

/** Proper .xlsx workbook via ExcelJS. */
export async function buildRespondentXlsxBuffer(
  filter: RespondentProfileListFilter,
  maxRows = 10_000
): Promise<Buffer> {
  const rows = await collectExportRows(filter, maxRows);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InsightMatrix CRM";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Survey Export", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  sheet.addRow([...EXPORT_HEADERS]);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };

  for (const row of rows) {
    sheet.addRow([...row]);
  }

  sheet.columns.forEach((col) => {
    let max = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = Math.min(len + 2, 48);
    });
    col.width = max;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function truncateCell(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, Math.max(0, maxLen - 1))}…`;
}

export type PdfExportOptions = {
  meta?: ExportMeta;
  maxRows?: number;
};

/** Absolute text that never auto-paginates (avoids blank trailing pages). */
function drawFixedText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: { width?: number; align?: "left" | "center" | "right" } = {}
) {
  doc.text(text, x, y, {
    width: opts.width,
    align: opts.align,
    lineBreak: false,
    continued: false
  });
}

/** Landscape PDF with filters in header, bordered table, page numbers. */
export async function buildRespondentPdfBuffer(
  filter: RespondentProfileListFilter,
  options: PdfExportOptions = {}
): Promise<Buffer> {
  const maxRows = options.maxRows ?? 10_000;
  const meta = options.meta ?? buildExportMeta(filter);
  const rows = await collectExportRows(filter, maxRows);

  return new Promise((resolve, reject) => {
    const margin = 36;
    const footerHeight = 20;
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin,
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: "Survey Export Report",
        Author: "InsightMatrix CRM"
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = margin;
    const top = margin;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    // Keep table above the footer band so page numbers never trigger auto page-breaks
    const bottom = pageHeight - margin - footerHeight;
    const tableWidth = pageWidth - margin * 2;
    const colWeights = [0.08, 0.12, 0.14, 0.1, 0.12, 0.14, 0.1, 0.1, 0.1];
    const colWidths = colWeights.map((w) => tableWidth * w);
    const rowHeight = 18;
    const fontSize = 7;

    let y = top;
    let isFirstPage = true;

    const drawFixedCell = (text: string, x: number, cellY: number, width: number) => {
      drawFixedText(doc, truncateCell(text, 36), x + 3, cellY + 5, { width: width - 6 });
    };

    const drawPageHeader = () => {
      // Compact header on continuation pages; full meta only on page 1
      if (isFirstPage) {
        doc.fillColor("#111111").font("Helvetica-Bold").fontSize(14);
        drawFixedText(doc, "InsightMatrix CRM", left, y, { width: tableWidth });
        y += 18;
        doc.fontSize(11);
        drawFixedText(doc, "Survey Export Report", left, y, { width: tableWidth });
        y += 18;
        doc.font("Helvetica").fontSize(8).fillColor("#444444");
        drawFixedText(doc, `Export Date: ${meta.exportDate}`, left, y, { width: tableWidth });
        y += 12;
        drawFixedText(doc, `Selected Survey: ${meta.surveyLabel}`, left, y, { width: tableWidth });
        y += 12;
        drawFixedText(doc, `Selected Vendor: ${meta.vendorLabel}`, left, y, { width: tableWidth });
        y += 12;
        drawFixedText(doc, `Selected Status: ${meta.statusLabel}`, left, y, { width: tableWidth });
        y += 14;
        doc.fillColor("#111111");
      } else {
        doc.fillColor("#111111").font("Helvetica-Bold").fontSize(9);
        drawFixedText(doc, "InsightMatrix CRM — Survey Export Report (continued)", left, y, {
          width: tableWidth
        });
        y += 16;
      }
    };

    const drawTableHeader = () => {
      doc.save();
      doc.rect(left, y, tableWidth, rowHeight).fill("#F3F4F6");
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#111111");
      let x = left;
      EXPORT_HEADERS.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], rowHeight).stroke("#D1D5DB");
        drawFixedCell(header, x, y, colWidths[i]);
        x += colWidths[i];
      });
      doc.font("Helvetica");
      y += rowHeight;
    };

    const startNewPage = () => {
      doc.addPage({ size: "A4", layout: "landscape", margin });
      isFirstPage = false;
      y = top;
      drawPageHeader();
      drawTableHeader();
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > bottom) {
        startNewPage();
      }
    };

    drawPageHeader();
    drawTableHeader();

    rows.forEach((row, rowIndex) => {
      ensureSpace(rowHeight);
      if (rowIndex % 2 === 1) {
        doc.save();
        doc.rect(left, y, tableWidth, rowHeight).fill("#FAFAFA");
        doc.restore();
      }
      let x = left;
      doc.fontSize(fontSize).fillColor("#111111");
      row.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], rowHeight).stroke("#E5E7EB");
        drawFixedCell(cell, x, y, colWidths[i]);
        x += colWidths[i];
      });
      y += rowHeight;
    });

    if (rows.length >= maxRows) {
      ensureSpace(16);
      doc.fontSize(7).fillColor("#666666");
      drawFixedText(
        doc,
        `Export capped at ${maxRows.toLocaleString()} rows.`,
        left,
        y + 4,
        { width: tableWidth }
      );
    }

    // Stamp page numbers inside the safe footer band (never below margin)
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footerY = doc.page.height - margin - 8;
      doc.font("Helvetica").fontSize(8).fillColor("#6B7280");
      drawFixedText(doc, `Page ${i + 1} of ${range.count}`, left, footerY, {
        width: tableWidth,
        align: "center"
      });
    }

    doc.end();
  });
}

export async function countExportRows(filter: RespondentProfileListFilter): Promise<number> {
  return surveyRespondentProfileRepository.countForExport(filter);
}

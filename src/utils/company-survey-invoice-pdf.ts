import PDFDocument from "pdfkit";

export type InvoicePdfContext = {
  invoiceNumber: string;
  issuedAt: Date;
  currency: string;
  platformName: string;
  platformAddressLines: string[];
  billToName: string;
  billToLines: string[];
  lineDescription: string;
  subtotalAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  surveyCode: string;
  surveyName: string;
  notes?: string;
};

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function buildCompanySurveyInvoicePdf(ctx: InvoicePdfContext): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${ctx.invoiceNumber}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 48;
    let y = 48;

    doc.fontSize(20).font("Helvetica-Bold").text(ctx.platformName, left, y);
    y += 28;
    doc.fontSize(9).font("Helvetica");
    for (const line of ctx.platformAddressLines) {
      if (line.trim()) {
        doc.text(line, left, y);
        y += 12;
      }
    }
    y += 16;

    doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", left, y);
    y += 22;
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice #: ${ctx.invoiceNumber}`, left, y);
    y += 14;
    doc.text(`Date: ${ctx.issuedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`, left, y);
    y += 14;
    doc.text(`Status: ${ctx.status.toUpperCase()}`, left, y);
    y += 28;

    doc.font("Helvetica-Bold").text("Bill to", left, y);
    y += 14;
    doc.font("Helvetica").text(ctx.billToName, left, y);
    y += 14;
    for (const line of ctx.billToLines) {
      if (line.trim()) {
        doc.text(line, left, y);
        y += 12;
      }
    }
    y += 20;

    doc.font("Helvetica-Bold").text("Description", left, y);
    doc.text("Amount", 420, y, { width: 120, align: "right" });
    y += 16;
    doc.moveTo(left, y).lineTo(555, y).stroke("#dddddd");
    y += 10;

    doc.font("Helvetica").fontSize(9);
    const desc = ctx.lineDescription || `Panel survey: ${ctx.surveyName} (${ctx.surveyCode})`;
    doc.text(desc, left, y, { width: 340 });
    doc.text(fmtMoney(ctx.subtotalAmount, ctx.currency), 400, y, { width: 155, align: "right" });
    y += 36;

    if (ctx.taxPercent > 0 && ctx.taxAmount > 0) {
      doc.text(`Tax (${ctx.taxPercent}%)`, left, y, { width: 340 });
      doc.text(fmtMoney(ctx.taxAmount, ctx.currency), 400, y, { width: 155, align: "right" });
      y += 22;
    }

    y += 8;
    doc.moveTo(left, y).lineTo(555, y).stroke("#333333");
    y += 12;
    doc.font("Helvetica-Bold").fontSize(11).text("Total due", left, y);
    doc.text(fmtMoney(ctx.totalAmount, ctx.currency), 400, y, { width: 155, align: "right" });
    y += 36;

    doc.font("Helvetica").fontSize(8).fillColor("#555555");
    doc.text(
      "Member incentives on this study are credited in platform points per your survey configuration. This invoice covers supplier fees only.",
      left,
      y,
      { width: 500, align: "left" }
    );
    y += 36;
    if (ctx.notes?.trim()) {
      doc.text(`Notes: ${ctx.notes.trim()}`, left, y, { width: 500 });
    }

    doc.end();
  });
}

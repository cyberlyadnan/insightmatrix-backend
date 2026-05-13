import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import { CompanySurveyPayment } from "../models/CompanySurveyPayment";
import { InvoiceCounter } from "../models/InvoiceCounter";
import { PanelSurvey } from "../models/PanelSurvey";
import { SurveyCompany } from "../models/SurveyCompany";
import { buildCompanySurveyInvoicePdf } from "../utils/company-survey-invoice-pdf";
import type { CompanyPaymentStatus } from "../constants/company-payment";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeTax(subtotal: number, taxPercent: number): { taxAmount: number; totalAmount: number } {
  const tp = Math.min(100, Math.max(0, taxPercent));
  const taxAmount = roundMoney((subtotal * tp) / 100);
  return { taxAmount, totalAmount: roundMoney(subtotal + taxAmount) };
}

async function nextInvoiceNumber(): Promise<string> {
  const year = String(new Date().getFullYear());
  const counter = await InvoiceCounter.findOneAndUpdate(
    { _id: year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  const seq = Math.max(1, Number(counter?.seq ?? 1));
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export type CompanyPaymentListFilter = {
  page?: number;
  pageSize?: number;
  surveyCompanyId?: string;
  panelSurveyId?: string;
  status?: CompanyPaymentStatus;
};

export const companySurveyPaymentService = {
  async createAutoFromPanelSurvey(survey: {
    _id: unknown;
    surveyName?: string;
    surveyCode?: string;
    providerId?: unknown;
    companyBillingAmount?: number;
    companyBillingTaxPercent?: number;
    createdBy?: unknown;
  }): Promise<void> {
    const panelSurveyId = survey._id;
    if (!panelSurveyId) return;

    const providerRef = survey.providerId;
    const companyId =
      providerRef && typeof providerRef === "object" && "_id" in providerRef
        ? (providerRef as { _id: unknown })._id
        : providerRef;
    if (!companyId) {
      logger.warn("createAutoFromPanelSurvey: missing providerId");
      return;
    }

    const subtotal = roundMoney(Math.max(0, Number(survey.companyBillingAmount ?? 0)));
    const taxPercent = Math.min(100, Math.max(0, Number(survey.companyBillingTaxPercent ?? 0)));
    const { taxAmount, totalAmount } = computeTax(subtotal, taxPercent);
    const invoiceNumber = await nextInvoiceNumber();
    const lineDescription = `Panel routing — ${survey.surveyName ?? "Survey"} (${survey.surveyCode ?? ""})`;

    await CompanySurveyPayment.create({
      invoiceNumber,
      surveyCompanyId: companyId,
      panelSurveyId,
      source: "auto_survey_create",
      currency: "USD",
      subtotalAmount: subtotal,
      taxPercent,
      taxAmount,
      totalAmount,
      lineDescription,
      status: "pending",
      createdBy: survey.createdBy ?? null
    });
  },

  async createManual(payload: {
    surveyCompanyId: string;
    panelSurveyId: string;
    subtotalAmount: number;
    taxPercent: number;
    currency?: string;
    notes?: string;
    createdBy?: unknown;
  }) {
    const company = await SurveyCompany.findById(payload.surveyCompanyId);
    if (!company) throw new ApiError(400, "Company not found");
    const survey = await PanelSurvey.findById(payload.panelSurveyId);
    if (!survey) throw new ApiError(400, "Survey not found");

    const subtotal = roundMoney(Math.max(0, Number(payload.subtotalAmount)));
    const taxPercent = Math.min(100, Math.max(0, Number(payload.taxPercent)));
    const { taxAmount, totalAmount } = computeTax(subtotal, taxPercent);
    const invoiceNumber = await nextInvoiceNumber();
    const lineDescription = `Panel routing — ${survey.surveyName} (${survey.surveyCode})`;

    return CompanySurveyPayment.create({
      invoiceNumber,
      surveyCompanyId: new Types.ObjectId(payload.surveyCompanyId),
      panelSurveyId: new Types.ObjectId(payload.panelSurveyId),
      source: "manual",
      currency: (payload.currency ?? "USD").toUpperCase().slice(0, 8),
      subtotalAmount: subtotal,
      taxPercent,
      taxAmount,
      totalAmount,
      lineDescription,
      status: "pending",
      notes: payload.notes?.trim() ?? "",
      createdBy: payload.createdBy ?? null
    });
  },

  async list(params: CompanyPaymentListFilter) {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: Record<string, unknown> = {};
    if (params.surveyCompanyId) filter.surveyCompanyId = new Types.ObjectId(params.surveyCompanyId);
    if (params.panelSurveyId) filter.panelSurveyId = new Types.ObjectId(params.panelSurveyId);
    if (params.status) filter.status = params.status;

    const [items, total] = await Promise.all([
      CompanySurveyPayment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate("surveyCompanyId", "companyName companyCode companyEmail")
        .populate("panelSurveyId", "surveyName surveyCode surveyStatus")
        .lean(),
      CompanySurveyPayment.countDocuments(filter)
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },

  async getById(id: string) {
    const doc = await CompanySurveyPayment.findById(id)
      .populate("surveyCompanyId", "companyName companyCode companyEmail companyPhone websiteUrl")
      .populate("panelSurveyId", "surveyName surveyCode surveyStatus")
      .lean();
    if (!doc) throw new ApiError(404, "Payment not found");
    return doc;
  },

  async updateStatus(id: string, status: CompanyPaymentStatus, paidAt?: Date | null) {
    const doc = await CompanySurveyPayment.findById(id);
    if (!doc) throw new ApiError(404, "Payment not found");
    doc.status = status;
    if (status === "paid") {
      doc.paidAt = paidAt ?? new Date();
    } else {
      doc.paidAt = null;
    }
    await doc.save();
    return doc;
  },

  async getInvoicePdfBuffer(paymentId: string): Promise<Buffer> {
    const p = await this.getById(paymentId);
    const company = p.surveyCompanyId as unknown as {
      companyName?: string;
      companyEmail?: string;
      companyPhone?: string;
      websiteUrl?: string;
    };
    const survey = p.panelSurveyId as unknown as { surveyName?: string; surveyCode?: string };

    const platformName = process.env.INVOICE_PLATFORM_NAME?.trim() || "InsightMatrix";
    const addrRaw = process.env.INVOICE_PLATFORM_ADDRESS?.trim() || "Survey operations & billing";
    const platformAddressLines = addrRaw
      .split(/\n|\\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const billToLines: string[] = [];
    if (company.companyEmail) billToLines.push(company.companyEmail);
    if (company.companyPhone) billToLines.push(company.companyPhone);
    if (company.websiteUrl) billToLines.push(company.websiteUrl);

    return buildCompanySurveyInvoicePdf({
      invoiceNumber: p.invoiceNumber,
      issuedAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      currency: p.currency || "USD",
      platformName,
      platformAddressLines: platformAddressLines.length ? platformAddressLines : ["Panel marketplace"],
      billToName: company.companyName ?? "Client",
      billToLines,
      lineDescription: p.lineDescription ?? "",
      subtotalAmount: p.subtotalAmount,
      taxPercent: p.taxPercent,
      taxAmount: p.taxAmount,
      totalAmount: p.totalAmount,
      status: p.status,
      surveyCode: survey.surveyCode ?? "",
      surveyName: survey.surveyName ?? "",
      notes: p.notes ?? ""
    });
  }
};

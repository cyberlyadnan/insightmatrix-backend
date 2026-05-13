import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { companySurveyPaymentService } from "../services/company-survey-payment.service";

export const listCompanySurveyPayments = asyncHandler(async (req, res) => {
  const q = req.validatedQuery ?? req.query;
  const result = await companySurveyPaymentService.list({
    page: Number(q.page),
    pageSize: Number(q.pageSize),
    surveyCompanyId: q.surveyCompanyId || undefined,
    panelSurveyId: q.panelSurveyId || undefined,
    status: q.status || undefined
  });
  sendResponse(res, { data: result.items, meta: result.meta });
});

export const createCompanySurveyPayment = asyncHandler(async (req, res) => {
  const doc = await companySurveyPaymentService.createManual({
    ...req.body,
    createdBy: req.user?._id
  });
  sendResponse(res, {
    statusCode: 201,
    message: "Payment entry created",
    data: { id: String(doc._id), invoiceNumber: doc.invoiceNumber }
  });
});

export const patchCompanySurveyPaymentStatus = asyncHandler(async (req, res) => {
  const doc = await companySurveyPaymentService.updateStatus(
    req.params.id,
    req.body.status,
    req.body.paidAt ?? undefined
  );
  sendResponse(res, {
    message: "Payment updated",
    data: { id: String(doc._id), status: doc.status, paidAt: doc.paidAt }
  });
});

export const downloadCompanySurveyPaymentInvoice = asyncHandler(async (req, res) => {
  const buffer = await companySurveyPaymentService.getInvoicePdfBuffer(req.params.id);
  const payment = await companySurveyPaymentService.getById(req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(payment.invoiceNumber)}.pdf"`
  );
  res.send(buffer);
});

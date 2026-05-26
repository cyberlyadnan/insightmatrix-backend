import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { securityValidationLogRepository } from "../repositories/security-validation-log.repository";

export const listSecurityValidationLogs = asyncHandler(async (req, res) => {
  const q = req.validatedQuery ?? req.query;
  const result = await securityValidationLogRepository.list({
    vendorId: q.vendorId as string | undefined,
    panelSurveyId: q.panelSurveyId as string | undefined,
    allocationId: q.allocationId as string | undefined,
    validationDecision: q.validationDecision as string | undefined,
    reasonCode: q.reasonCode as string | undefined,
    country: q.country as string | undefined,
    ipAddress: q.ipAddress as string | undefined,
    botDetected: q.botDetected === "true" ? true : q.botDetected === "false" ? false : undefined,
    vpnDetected: q.vpnDetected === "true" ? true : q.vpnDetected === "false" ? false : undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20
  });

  sendResponse(res, {
    data: result.items,
    meta: result.meta
  });
});

export const getSecurityAnalytics = asyncHandler(async (req, res) => {
  const q = req.validatedQuery ?? req.query;
  const summary = await securityValidationLogRepository.analyticsSummary({
    vendorId: q.vendorId as string | undefined,
    panelSurveyId: q.panelSurveyId as string | undefined,
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined
  });
  sendResponse(res, { data: summary });
});

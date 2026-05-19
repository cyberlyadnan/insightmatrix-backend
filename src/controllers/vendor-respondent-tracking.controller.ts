import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { vendorRespondentTrackingService } from "../services/vendor-respondent-tracking/vendor-respondent-tracking.service";

export const listVendorRespondentSessions = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? req.query;
  const result = await vendorRespondentTrackingService.list({
    vendorId: query.vendorId as string | undefined,
    panelSurveyId: query.panelSurveyId as string | undefined,
    allocationId: query.allocationId as string | undefined,
    status: query.status as never,
    callbackForwarded:
      query.callbackForwarded === "true"
        ? true
        : query.callbackForwarded === "false"
          ? false
          : undefined,
    search: query.search as string | undefined,
    supplierProjectPid: query.supplierProjectPid as string | undefined,
    dateFrom: query.dateFrom as string | undefined,
    dateTo: query.dateTo as string | undefined,
    page: Number(query.page) || 1,
    pageSize: Number(query.pageSize) || 20
  });

  sendResponse(res, { data: result.items, meta: result.meta });
});

export const getVendorRespondentSession = asyncHandler(async (req, res) => {
  const item = await vendorRespondentTrackingService.getById(req.params.id);
  if (!item) throw new ApiError(404, "Session not found");
  sendResponse(res, { data: item });
});

import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { vendorAllocationService } from "../services/vendor-allocation/vendor-allocation.service";
import { fetchAllocationAnalytics } from "../services/vendor-allocation/allocation-analytics.service";
import { toVendorPortalAllocationDto } from "../utils/vendor-allocation.dto";

function mapPortalItem(doc: Record<string, unknown>) {
  const survey = doc.panelSurveyId as Record<string, unknown>;
  return toVendorPortalAllocationDto(doc, {
    surveyName: String(survey?.surveyName ?? "Survey"),
    surveyCode: String(survey?.surveyCode ?? "")
  });
}

export const listVendorPortalSurveys = asyncHandler(async (req, res) => {
  const vendorId = String(req.vendor._id);
  const result = await vendorAllocationService.listForVendor(vendorId, req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => mapPortalItem(item as Record<string, unknown>)),
    meta: result.meta
  });
});

export const getVendorPortalSurvey = asyncHandler(async (req, res) => {
  const vendorId = String(req.vendor._id);
  const doc = await vendorAllocationService.getForVendor(vendorId, req.params.allocationId);
  const analytics = await fetchAllocationAnalytics(req.params.allocationId);
  sendResponse(res, {
    data: {
      allocation: mapPortalItem(doc as Record<string, unknown>),
      analytics
    }
  });
});

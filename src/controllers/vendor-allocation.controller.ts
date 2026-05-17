import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { vendorAllocationService } from "../services/vendor-allocation/vendor-allocation.service";
import {
  fetchAllocationAnalytics,
  fetchSurveyLevelVendorAnalytics
} from "../services/vendor-allocation/allocation-analytics.service";
import {
  toVendorSurveyAllocationDto
} from "../utils/vendor-allocation.dto";

function mapAllocationListItem(doc: Record<string, unknown>) {
  const survey = doc.panelSurveyId as Record<string, unknown> | undefined;
  const vendor = doc.vendorId as Record<string, unknown> | undefined;
  return toVendorSurveyAllocationDto(doc, {
    panelSurvey: survey && survey._id ? survey : null,
    vendor: vendor && vendor._id ? vendor : null
  });
}

export const listVendorAllocations = asyncHandler(async (req, res) => {
  const result = await vendorAllocationService.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => mapAllocationListItem(item as Record<string, unknown>)),
    meta: result.meta
  });
});

export const getVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.getById(req.params.id);
  sendResponse(res, { data: mapAllocationListItem(doc as Record<string, unknown>) });
});

export const createVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.create({
    ...req.body,
    createdBy: req.user._id
  });
  sendResponse(res, {
    statusCode: 201,
    message: "Allocation created",
    data: mapAllocationListItem(doc as Record<string, unknown>)
  });
});

export const updateVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.update(req.params.id, {
    ...req.body,
    updatedBy: req.user._id
  });
  sendResponse(res, {
    message: "Allocation updated",
    data: mapAllocationListItem(doc as Record<string, unknown>)
  });
});

export const pauseVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.pause(req.params.id, req.user._id);
  sendResponse(res, {
    message: "Allocation paused",
    data: mapAllocationListItem(doc as Record<string, unknown>)
  });
});

export const resumeVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.resume(req.params.id, req.user._id);
  sendResponse(res, {
    message: "Allocation resumed",
    data: mapAllocationListItem(doc as Record<string, unknown>)
  });
});

export const closeVendorAllocation = asyncHandler(async (req, res) => {
  const doc = await vendorAllocationService.close(req.params.id, req.user._id);
  sendResponse(res, {
    message: "Allocation closed",
    data: mapAllocationListItem(doc as Record<string, unknown>)
  });
});

export const deleteVendorAllocation = asyncHandler(async (req, res) => {
  await vendorAllocationService.remove(req.params.id);
  sendResponse(res, { message: "Allocation removed" });
});

export const getVendorAllocationAnalytics = asyncHandler(async (req, res) => {
  const data = await fetchAllocationAnalytics(req.params.id);
  sendResponse(res, { data });
});

export const getPanelSurveyVendorAllocations = asyncHandler(async (req, res) => {
  const result = await vendorAllocationService.list({
    panelSurveyId: req.params.surveyId,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 50
  });
  sendResponse(res, {
    data: result.items.map((item) => mapAllocationListItem(item as Record<string, unknown>)),
    meta: result.meta
  });
});

export const getPanelSurveyVendorAllocationSummary = asyncHandler(async (req, res) => {
  const data = await fetchSurveyLevelVendorAnalytics(req.params.surveyId);
  sendResponse(res, { data });
});

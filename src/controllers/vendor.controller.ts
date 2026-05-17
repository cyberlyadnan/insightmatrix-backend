import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { vendorService } from "../services/vendor.service";
import { toVendorAnalyticsSummary, toVendorDto } from "../utils/vendor.dto";

export const listVendors = asyncHandler(async (req, res) => {
  const result = await vendorService.list(req.validatedQuery ?? req.query);
  sendResponse(res, {
    data: result.items.map((item) => toVendorDto(item)),
    meta: result.meta
  });
});

export const getVendor = asyncHandler(async (req, res) => {
  const doc = await vendorService.getById(req.params.id);
  sendResponse(res, { data: toVendorDto(doc) });
});

export const getVendorAnalytics = asyncHandler(async (req, res) => {
  const doc = await vendorService.getAnalyticsSummary(req.params.id);
  sendResponse(res, { data: toVendorAnalyticsSummary(doc) });
});

export const createVendor = asyncHandler(async (req, res) => {
  const createdBy = req.user?._id ? String(req.user._id) : undefined;
  const doc = await vendorService.create(req.body, createdBy);
  sendResponse(res, {
    statusCode: 201,
    message: "Vendor created",
    data: toVendorDto(doc)
  });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const updatedBy = req.user?._id ? String(req.user._id) : undefined;
  const doc = await vendorService.updateById(req.params.id, req.body, updatedBy);
  sendResponse(res, { message: "Vendor updated", data: toVendorDto(doc) });
});

export const patchVendorStatus = asyncHandler(async (req, res) => {
  const updatedBy = req.user?._id ? String(req.user._id) : undefined;
  const doc = await vendorService.setStatus(req.params.id, req.body.status, updatedBy);
  sendResponse(res, { message: "Vendor status updated", data: toVendorDto(doc) });
});

export const deleteVendor = asyncHandler(async (req, res) => {
  await vendorService.deleteById(req.params.id);
  sendResponse(res, { message: "Vendor deleted" });
});

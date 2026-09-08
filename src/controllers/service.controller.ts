import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { serviceService } from "../services/service.service";

export const listPublicServices = asyncHandler(async (req, res) => {
  const result = await serviceService.list(req.validatedQuery ?? req.query, true);
  sendResponse(res, {
    data: result.items,
    meta: result.meta,
  });
});

export const listAdminServices = asyncHandler(async (req, res) => {
  const result = await serviceService.list(req.validatedQuery ?? req.query, false);
  sendResponse(res, {
    data: result.items,
    meta: result.meta,
  });
});

export const getServiceBySlugOrId = asyncHandler(async (req, res) => {
  const doc = await serviceService.getByIdOrSlug(req.params.slugOrId);
  sendResponse(res, { data: doc });
});

export const createService = asyncHandler(async (req, res) => {
  const doc = await serviceService.create(req.body);
  sendResponse(res, {
    statusCode: 201,
    message: "Service created successfully",
    data: doc,
  });
});

export const updateService = asyncHandler(async (req, res) => {
  const doc = await serviceService.updateById(req.params.id, req.body);
  sendResponse(res, {
    message: "Service updated successfully",
    data: doc,
  });
});

export const patchServiceStatus = asyncHandler(async (req, res) => {
  const doc = await serviceService.setStatus(req.params.id, req.body.status);
  sendResponse(res, {
    message: "Service status updated successfully",
    data: doc,
  });
});

export const deleteService = asyncHandler(async (req, res) => {
  await serviceService.deleteById(req.params.id);
  sendResponse(res, { message: "Service deleted successfully" });
});

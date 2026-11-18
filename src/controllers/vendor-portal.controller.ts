import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { vendorPortalService } from "../services/vendor-portal.service";
import { vendorAuthService } from "../services/vendor-auth.service";

export const vendorMe = asyncHandler(async (req, res) => {
  const profile = await vendorPortalService.getProfile(String(req.vendor!._id));
  sendResponse(res, { data: profile });
});

export const vendorUpdateProfile = asyncHandler(async (req, res) => {
  const profile = await vendorPortalService.updateProfile(String(req.vendor!._id), req.body);
  sendResponse(res, { message: "Profile updated", data: profile });
});

export const vendorChangePassword = asyncHandler(async (req, res) => {
  await vendorAuthService.changePassword(String(req.vendor!._id), req.body);
  sendResponse(res, { message: "Password updated" });
});

export const vendorDashboardSummary = asyncHandler(async (req, res) => {
  const query = (req.validatedQuery ?? req.query) as { dateFrom?: string; dateTo?: string };
  const summary = await vendorPortalService.getDashboardSummary(String(req.vendor!._id), {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  });
  sendResponse(res, { data: summary });
});

export const vendorHourlyReport = asyncHandler(async (req, res) => {
  const query = (req.validatedQuery ?? req.query) as {
    dateFrom?: string;
    dateTo?: string;
    allocationId?: string;
    status?: string;
    country?: string;
    tzOffsetMinutes?: number;
  };
  const report = await vendorPortalService.getHourlyReport(String(req.vendor!._id), query);
  sendResponse(res, { data: report });
});

export const vendorApiTrafficReport = asyncHandler(async (req, res) => {
  const query = (req.validatedQuery ?? req.query) as {
    dateFrom?: string;
    dateTo?: string;
    country?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  };
  const report = await vendorPortalService.getApiTrafficReport(String(req.vendor!._id), query);
  sendResponse(res, { data: report });
});

export const vendorLiveInventory = asyncHandler(async (req, res) => {
  const query = (req.validatedQuery ?? req.query) as { country?: string };
  const inventory = await vendorPortalService.getLiveInventory(String(req.vendor!._id), query);
  sendResponse(res, { data: inventory });
});

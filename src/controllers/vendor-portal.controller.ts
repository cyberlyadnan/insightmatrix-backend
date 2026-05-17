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
  const summary = await vendorPortalService.getDashboardSummary(String(req.vendor!._id));
  sendResponse(res, { data: summary });
});

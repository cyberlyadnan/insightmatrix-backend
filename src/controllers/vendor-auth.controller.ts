import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { vendorAuthService } from "../services/vendor-auth.service";
import { clearVendorAuthCookies, setVendorAuthCookies } from "../utils/vendor-cookie-settings";

export const vendorLogin = asyncHandler(async (req, res) => {
  const { vendor, accessToken, refreshToken } = await vendorAuthService.login(req.body);
  setVendorAuthCookies(res, accessToken, refreshToken);
  sendResponse(res, { message: "Login successful", data: { vendor } });
});

export const vendorRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.vendorRefreshToken || req.body.refreshToken;
  try {
    const { accessToken, refreshToken } = await vendorAuthService.refresh(token);
    setVendorAuthCookies(res, accessToken, refreshToken);
    sendResponse(res, { message: "Token refreshed", data: { ok: true } });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        details: err.details ?? null
      });
    }
    throw err;
  }
});

export const vendorLogout = asyncHandler(async (req, res) => {
  const token = req.cookies.vendorRefreshToken || req.body.refreshToken;
  await vendorAuthService.logout(token);
  clearVendorAuthCookies(res);
  sendResponse(res, { message: "Logout successful" });
});

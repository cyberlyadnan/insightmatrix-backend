import { ApiError } from "../utils/ApiError";
import { verifyVendorAccessToken } from "../utils/vendor-tokens";
import { vendorRepository } from "../repositories/vendor.repository";

const VENDOR_ACCESS_COOKIE = "vendorAccessToken";

/**
 * Isolated vendor authentication — does not load User or panel session.
 */
export const authenticateVendor = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const cookieToken = req.cookies?.[VENDOR_ACCESS_COOKIE];
    const token = bearer || cookieToken || null;

    if (!token) return next(new ApiError(401, "Unauthorized"));

    const decoded = verifyVendorAccessToken(token);
    const vendor = await vendorRepository.findById(decoded.sub);
    if (!vendor) return next(new ApiError(401, "Unauthorized"));

    if (vendor.status === "suspended") {
      return next(new ApiError(403, "Vendor account is suspended"));
    }

    req.vendor = vendor;
    return next();
  } catch {
    return next(new ApiError(401, "Unauthorized"));
  }
};

/** Vendor portal routes require active (not paused) account */
export const requireActiveVendor = (req, res, next) => {
  if (!req.vendor) return next(new ApiError(401, "Unauthorized"));
  if (req.vendor.status === "paused") {
    return next(new ApiError(403, "Vendor account is paused"));
  }
  return next();
};

export const VENDOR_AUTH_COOKIE_NAMES = {
  accessToken: VENDOR_ACCESS_COOKIE,
  refreshToken: "vendorRefreshToken"
} as const;

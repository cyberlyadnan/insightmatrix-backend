import type { Response } from "express";
import { env } from "../config/env";
import { baseCookieOptions, jwtDurationToMs } from "./cookie-settings";
import { VENDOR_AUTH_COOKIE_NAMES } from "../middleware/vendor-auth.middleware";

export function setVendorAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = baseCookieOptions();
  res.cookie(VENDOR_AUTH_COOKIE_NAMES.accessToken, accessToken, {
    ...base,
    maxAge: jwtDurationToMs(env.JWT_ACCESS_EXPIRES_IN)
  });
  res.cookie(VENDOR_AUTH_COOKIE_NAMES.refreshToken, refreshToken, {
    ...base,
    maxAge: jwtDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  });
}

export function clearVendorAuthCookies(res: Response) {
  const base = baseCookieOptions();
  res.clearCookie(VENDOR_AUTH_COOKIE_NAMES.accessToken, base);
  res.clearCookie(VENDOR_AUTH_COOKIE_NAMES.refreshToken, base);
}

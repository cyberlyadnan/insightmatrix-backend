import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { authService } from '../services/auth.service';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/"
};

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendResponse(res, { statusCode: 201, message: "Registration successful", data: user });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  sendResponse(res, { message: "Login successful", data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh(token);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  sendResponse(res, { message: "Token refreshed", data: { accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  await authService.logout(token);
  res.clearCookie("refreshToken", refreshCookieOptions);
  sendResponse(res, { message: "Logout successful" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendResponse(res, { message: "If this email exists, reset instructions have been sent." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  sendResponse(res, { message: "Password reset successful" });
});


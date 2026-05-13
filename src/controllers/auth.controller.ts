import type { Response } from "express";
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { enrichAuthUser } from '../utils/user.dto';
import { baseCookieOptions, jwtDurationToMs } from '../utils/cookie-settings';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = baseCookieOptions();
  res.cookie("accessToken", accessToken, {
    ...base,
    maxAge: jwtDurationToMs(env.JWT_ACCESS_EXPIRES_IN)
  });
  res.cookie("refreshToken", refreshToken, {
    ...base,
    maxAge: jwtDurationToMs(env.JWT_REFRESH_EXPIRES_IN)
  });
}

function clearAuthCookies(res: Response) {
  const base = baseCookieOptions();
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  if (result.accessToken && result.refreshToken) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
  }
  const fresh = result.user?.email ? await userRepository.findByEmail(result.user.email) : null;
  const userPayload = fresh ? await enrichAuthUser(fresh) : result.user;
  sendResponse(res, {
    statusCode: 201,
    message: result.accessToken ? "Registration successful" : "Please verify your email to continue.",
    data: { user: userPayload }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  const userPayload = await enrichAuthUser(user);
  sendResponse(res, { message: "Login successful", data: { user: userPayload } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  try {
    const { accessToken, refreshToken } = await authService.refresh(token);
    setAuthCookies(res, accessToken, refreshToken);
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

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  await authService.logout(token);
  clearAuthCookies(res);
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

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  try {
    await authService.verifyEmail(token);
    return res.redirect(302, `${env.CLIENT_URL}/login?verified=1`);
  } catch {
    return res.redirect(302, `${env.CLIENT_URL}/login?verifyError=1`);
  }
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body.email);
  sendResponse(res, { message: "If the account exists and is unverified, a new email was sent." });
});

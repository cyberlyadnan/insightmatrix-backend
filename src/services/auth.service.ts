import crypto from "node:crypto";
import dayjs from "dayjs";
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { comparePassword, hashPassword } from '../utils/password';
import { getRefreshTokenExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { userRepository } from '../repositories/user.repository';
import { RefreshToken } from '../models/RefreshToken';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { sendEmail } from './email.service';

const buildAuthPayload = (user) => ({ sub: user._id.toString(), role: user.role, email: user.email });

export const authService = {
  register: async (payload) => {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) throw new ApiError(409, "Email is already in use");
    const user = await userRepository.create({ ...payload, password: await hashPassword(payload.password) });
    return user;
  },

  login: async ({ email, password }) => {
    const user = await userRepository.findByEmail(email, true);
    if (!user) throw new ApiError(401, "Invalid credentials");
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const accessToken = signAccessToken(buildAuthPayload(user));
    const refreshToken = signRefreshToken(buildAuthPayload(user));
    await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: getRefreshTokenExpiryDate() });

    return { user, accessToken, refreshToken };
  },

  refresh: async (token) => {
    const decoded = verifyRefreshToken(token);
    const stored = await RefreshToken.findOne({ token, revoked: false });
    if (!stored) throw new ApiError(401, "Invalid refresh token");
    if (dayjs(stored.expiresAt).isBefore(dayjs())) throw new ApiError(401, "Refresh token expired");

    const user = await userRepository.findById(decoded.sub);
    if (!user) throw new ApiError(401, "User no longer exists");

    const accessToken = signAccessToken(buildAuthPayload(user));
    const nextRefreshToken = signRefreshToken(buildAuthPayload(user));
    stored.revoked = true;
    await stored.save();
    await RefreshToken.create({ userId: user._id, token: nextRefreshToken, expiresAt: getRefreshTokenExpiryDate() });

    return { accessToken, refreshToken: nextRefreshToken };
  },

  logout: async (token) => {
    await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
  },

  forgotPassword: async (email) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const rawToken = crypto.randomUUID();
    await PasswordResetToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: dayjs().add(env.JWT_RESET_PASSWORD_EXPIRES_MIN, "minute").toDate()
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your InsightMatrix password",
      html: `<p>Use this token to reset password: <strong>${rawToken}</strong></p>`
    });
  },

  resetPassword: async ({ token, password }) => {
    const resetDoc = await PasswordResetToken.findOne({ token });
    if (!resetDoc || dayjs(resetDoc.expiresAt).isBefore(dayjs())) throw new ApiError(400, "Invalid reset token");
    await userRepository.updateById(resetDoc.userId, { password: await hashPassword(password) });
    await PasswordResetToken.deleteMany({ userId: resetDoc.userId });
    await RefreshToken.deleteMany({ userId: resetDoc.userId });
  }
};


import crypto from "node:crypto";
import dayjs from "dayjs";
import type { Types } from "mongoose";
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { comparePassword, hashPassword } from '../utils/password';
import { getRefreshTokenExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { userRepository } from '../repositories/user.repository';
import { RefreshToken } from '../models/RefreshToken';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { EmailVerificationToken } from '../models/EmailVerificationToken';
import { sendEmail } from './email.service';
import { toPublicUser } from '../utils/user.dto';
import { ROLES } from '../constants/roles';

const buildAuthPayload = (user: unknown) => {
  const u = user as { _id: Types.ObjectId; role?: string; email?: string };
  return {
    sub: u._id.toString(),
    role: u.role,
    email: u.email
  };
};

const verificationExpiryHours = 48;

async function issueTokens(user: unknown) {
  const u = user as { _id: Types.ObjectId; role?: string; email?: string };
  const accessToken = signAccessToken(buildAuthPayload(user));
  const refreshToken = signRefreshToken(buildAuthPayload(user));
  await RefreshToken.create({ userId: u._id, token: refreshToken, expiresAt: getRefreshTokenExpiryDate() });
  return { accessToken, refreshToken };
}

export const authService = {
  register: async (payload: { fullName: string; email: string; password: string }) => {
    const existing = await userRepository.findByEmail(payload.email);
    if (existing) throw new ApiError(409, "Email is already in use");

    const user = await userRepository.create({
      fullName: payload.fullName,
      email: payload.email,
      password: await hashPassword(payload.password),
      role: ROLES.USER,
      isVerified: env.skipEmailVerification
    });

    if (env.skipEmailVerification) {
      const tokens = await issueTokens(user);
      return { user: toPublicUser(user), ...tokens };
    }

    const rawToken = crypto.randomUUID();
    await EmailVerificationToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: dayjs().add(verificationExpiryHours, "hour").toDate()
    });

    const verifyUrl = `${env.API_PUBLIC_URL}${env.API_PREFIX}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your InsightMatrix account",
      html: `<p>Welcome ${payload.fullName}!</p><p><a href="${verifyUrl}">Click here to verify your email</a></p><p>This link expires in ${verificationExpiryHours} hours.</p>`
    }).catch(() => {});

    return { user: toPublicUser(user), accessToken: null as null, refreshToken: null as null };
  },

  verifyEmail: async (token: string | undefined) => {
    if (!token || typeof token !== "string") throw new ApiError(400, "Verification token required");
    const doc = await EmailVerificationToken.findOne({ token });
    if (!doc || dayjs(doc.expiresAt).isBefore(dayjs())) throw new ApiError(400, "Invalid or expired verification link");

    await userRepository.updateById(doc.userId, { isVerified: true });
    await EmailVerificationToken.deleteMany({ userId: doc.userId });
    return true;
  },

  resendVerification: async (email: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user || user.isVerified) return;

    await EmailVerificationToken.deleteMany({ userId: user._id });

    const rawToken = crypto.randomUUID();
    await EmailVerificationToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: dayjs().add(verificationExpiryHours, "hour").toDate()
    });

    const verifyUrl = `${env.API_PUBLIC_URL}${env.API_PREFIX}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your InsightMatrix account",
      html: `<p><a href="${verifyUrl}">Verify your email</a></p>`
    }).catch(() => {});
  },

  login: async ({ email, password }: { email: string; password: string }) => {
    const user = await userRepository.findByEmail(email, true);
    if (!user) throw new ApiError(401, "Invalid credentials");
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    if (!user.isVerified && !env.skipEmailVerification) {
      throw new ApiError(403, "Please verify your email before signing in.");
    }

    if (user.status !== "active" || user.isActive === false) {
      throw new ApiError(403, "Your account is inactive.");
    }

    const tokens = await issueTokens(user);
    return {
      user: toPublicUser(user),
      ...tokens
    };
  },

  refresh: async (token: string | undefined) => {
    if (!token) throw new ApiError(401, "Missing refresh token");
    const decoded = verifyRefreshToken(token);
    const stored = await RefreshToken.findOne({ token, revoked: false });
    if (!stored) throw new ApiError(401, "Invalid refresh token");
    if (dayjs(stored.expiresAt).isBefore(dayjs())) throw new ApiError(401, "Refresh token expired");

    const user = await userRepository.findById(decoded.sub);
    if (!user || user.status !== "active" || user.isActive === false) {
      throw new ApiError(401, "User no longer exists");
    }

    const accessToken = signAccessToken(buildAuthPayload(user));
    const nextRefreshToken = signRefreshToken(buildAuthPayload(user));
    stored.revoked = true;
    await stored.save();
    await RefreshToken.create({ userId: user._id, token: nextRefreshToken, expiresAt: getRefreshTokenExpiryDate() });

    return { accessToken, refreshToken: nextRefreshToken };
  },

  logout: async (token: string | undefined) => {
    if (!token) return;
    await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
  },

  forgotPassword: async (email: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const rawToken = crypto.randomUUID();
    await PasswordResetToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: dayjs().add(env.JWT_RESET_PASSWORD_EXPIRES_MIN, "minute").toDate()
    });

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your InsightMatrix password",
      html: `<p>Reset your password using this link (expires in ${env.JWT_RESET_PASSWORD_EXPIRES_MIN} minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    }).catch(() => {});
  },

  resetPassword: async ({ token, password }: { token: string; password: string }) => {
    const resetDoc = await PasswordResetToken.findOne({ token });
    if (!resetDoc || dayjs(resetDoc.expiresAt).isBefore(dayjs())) throw new ApiError(400, "Invalid reset token");
    await userRepository.updateById(resetDoc.userId, { password: await hashPassword(password) });
    await PasswordResetToken.deleteMany({ userId: resetDoc.userId });
    await RefreshToken.deleteMany({ userId: resetDoc.userId });
  }
};

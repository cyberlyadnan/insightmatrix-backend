import { ApiError } from "../utils/ApiError";
import { comparePassword, hashPassword } from "../utils/password";
import {
  getVendorRefreshTokenExpiryDate,
  signVendorAccessToken,
  signVendorRefreshToken,
  verifyVendorRefreshToken
} from "../utils/vendor-tokens";
import { vendorRepository } from "../repositories/vendor.repository";
import { VendorRefreshToken } from "../models/VendorRefreshToken";
import { toVendorPublicProfile } from "../utils/vendor.dto";

async function issueVendorTokens(vendor: { _id: { toString(): string }; email: string }) {
  const payload = { sub: vendor._id.toString(), email: vendor.email };
  const accessToken = signVendorAccessToken(payload);
  const refreshToken = signVendorRefreshToken(payload);
  await VendorRefreshToken.create({
    vendorId: vendor._id,
    token: refreshToken,
    expiresAt: getVendorRefreshTokenExpiryDate()
  });
  return { accessToken, refreshToken };
}

export const vendorAuthService = {
  login: async (payload: { email: string; password: string }) => {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password?.trim() ?? "";
    if (!email || !password) throw new ApiError(401, "Invalid email or password");

    const vendor = await vendorRepository.findByEmail(email, true);
    if (!vendor?.passwordHash) throw new ApiError(401, "Invalid email or password");

    const ok = await comparePassword(password, vendor.passwordHash);
    if (!ok) throw new ApiError(401, "Invalid email or password");

    if (vendor.status === "suspended") {
      throw new ApiError(403, "Vendor account is suspended. Contact support.");
    }
    if (vendor.status === "paused") {
      throw new ApiError(403, "Vendor account is paused. Contact support.");
    }

    await vendorRepository.updateById(String(vendor._id), { lastLoginAt: new Date() });

    const tokens = await issueVendorTokens(vendor);
    return {
      vendor: toVendorPublicProfile(vendor),
      ...tokens
    };
  },

  refresh: async (refreshToken: string | undefined) => {
    if (!refreshToken) throw new ApiError(401, "Refresh token required");

    let decoded;
    try {
      decoded = verifyVendorRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "Invalid refresh token");
    }

    const stored = await VendorRefreshToken.findOne({ token: refreshToken });
    if (!stored) throw new ApiError(401, "Invalid refresh token");

    const vendor = await vendorRepository.findById(decoded.sub);
    if (!vendor) throw new ApiError(401, "Vendor not found");
    if (vendor.status === "suspended" || vendor.status === "paused") {
      throw new ApiError(403, "Vendor account is not active");
    }

    if (stored.revoked) {
      const revokedAt = stored.revokedAt ? new Date(stored.revokedAt).getTime() : 0;
      const withinGracePeriod = Date.now() - revokedAt <= 30_000;

      if (withinGracePeriod && stored.replacedByToken) {
        const replacement = await VendorRefreshToken.findOne({
          token: stored.replacedByToken,
          revoked: false
        });
        if (replacement && new Date(replacement.expiresAt).getTime() > Date.now()) {
          const payload = { sub: vendor._id.toString(), email: vendor.email };
          const accessToken = signVendorAccessToken(payload);
          return { accessToken, refreshToken: replacement.token };
        }
      }

      await VendorRefreshToken.updateMany(
        { vendorId: vendor._id, revoked: false },
        { revoked: true, revokedAt: new Date() }
      );
      throw new ApiError(401, "Invalid or revoked refresh token");
    }

    if (new Date(stored.expiresAt).getTime() < Date.now()) {
      throw new ApiError(401, "Refresh token expired");
    }

    const payload = { sub: vendor._id.toString(), email: vendor.email };
    const accessToken = signVendorAccessToken(payload);
    const nextRefreshToken = signVendorRefreshToken(payload);

    stored.revoked = true;
    stored.revokedAt = new Date();
    stored.replacedByToken = nextRefreshToken;
    await stored.save();

    await VendorRefreshToken.create({
      vendorId: vendor._id,
      token: nextRefreshToken,
      expiresAt: getVendorRefreshTokenExpiryDate()
    });

    return { accessToken, refreshToken: nextRefreshToken };
  },

  logout: async (refreshToken: string | undefined) => {
    if (!refreshToken) return;
    await VendorRefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true, revokedAt: new Date() }
    );
  },

  changePassword: async (
    vendorId: string,
    payload: { currentPassword: string; newPassword: string }
  ) => {
    const vendor = await vendorRepository.findById(vendorId, true);
    if (!vendor?.passwordHash) throw new ApiError(404, "Vendor not found");

    const ok = await comparePassword(payload.currentPassword, vendor.passwordHash);
    if (!ok) throw new ApiError(400, "Current password is incorrect");

    await vendorRepository.updateById(vendorId, {
      passwordHash: await hashPassword(payload.newPassword)
    });
  }
};

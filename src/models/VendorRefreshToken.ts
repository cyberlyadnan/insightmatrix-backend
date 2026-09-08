import mongoose from "mongoose";

/** Isolated refresh tokens for B2B vendor sessions (not User refresh tokens) */
const vendorRefreshTokenSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    replacedByToken: { type: String, default: null }
  },
  { timestamps: true }
);

export const VendorRefreshToken = mongoose.model("VendorRefreshToken", vendorRefreshTokenSchema);

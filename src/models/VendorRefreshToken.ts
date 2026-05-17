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
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export const VendorRefreshToken = mongoose.model("VendorRefreshToken", vendorRefreshTokenSchema);

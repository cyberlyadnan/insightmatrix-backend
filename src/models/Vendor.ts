import mongoose from "mongoose";
import { VENDOR_STATUSES } from "../constants/vendor";

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      index: true
    },
    vendorUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 64,
      index: true
    },

    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    contactPerson: { type: String, trim: true, maxlength: 120, default: "" },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true
    },
    passwordHash: { type: String, required: true, select: false },

    phone: { type: String, trim: true, maxlength: 40, default: "" },
    website: { type: String, trim: true, maxlength: 500, default: "" },

    status: {
      type: String,
      enum: VENDOR_STATUSES,
      default: "active",
      index: true
    },

    callbackUrls: {
      complete: { type: String, trim: true, maxlength: 2000, default: "" },
      terminate: { type: String, trim: true, maxlength: 2000, default: "" },
      quota_full: { type: String, trim: true, maxlength: 2000, default: "" },
      quality_reject: { type: String, trim: true, maxlength: 2000, default: "" }
    },
    allowedIps: { type: [String], default: [] },
    allowedCountries: { type: [String], default: [] },

    notes: { type: String, trim: true, maxlength: 16000, default: "" },

    totalAssignedQuota: { type: Number, min: 0, default: 0 },
    totalCompletes: { type: Number, min: 0, default: 0 },
    totalTerminates: { type: Number, min: 0, default: 0 },
    totalQuotaFull: { type: Number, min: 0, default: 0 },
    totalQualityRejects: { type: Number, min: 0, default: 0 },

    totalRevenueGenerated: { type: Number, min: 0, default: 0 },
    totalPayoutDue: { type: Number, min: 0, default: 0 },

    lastLoginAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

vendorSchema.index({ companyName: "text", vendorCode: "text", contactPerson: "text", email: "text" });
vendorSchema.index({ createdAt: -1 });

vendorSchema.pre("save", function normalizeVendorCode(next) {
  if (this.vendorCode) {
    this.vendorCode = String(this.vendorCode).trim().toUpperCase();
  }
  next();
});

export const Vendor = mongoose.model("Vendor", vendorSchema);

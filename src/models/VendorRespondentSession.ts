import mongoose from "mongoose";
import type { VendorRespondentSessionStatus } from "../constants/vendor-allocation";

const vendorRespondentSessionSchema = new mongoose.Schema(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSurveyAllocation",
      required: true,
      index: true
    },
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      required: true,
      index: true
    },
    supplierProjectPid: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: [
        "started",
        "redirected",
        "complete",
        "terminate",
        "quota_full",
        "quality_reject"
      ],
      default: "started",
      index: true
    },
    trafficSource: { type: String, trim: true, maxlength: 500, default: "" },
    sourceIp: { type: String, trim: true, maxlength: 64, default: "" },
    userAgent: { type: String, trim: true, maxlength: 2000, default: "" },
    vendorRespondentId: { type: String, trim: true, maxlength: 500, default: "" },
    startedAt: { type: Date, default: Date.now },
    redirectedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

vendorRespondentSessionSchema.index({ allocationId: 1, createdAt: -1 });
vendorRespondentSessionSchema.index({ panelSurveyId: 1, status: 1 });

export type VendorRespondentSessionDoc = mongoose.InferSchemaType<
  typeof vendorRespondentSessionSchema
> & {
  _id: mongoose.Types.ObjectId;
  status: VendorRespondentSessionStatus;
};

export const VendorRespondentSession = mongoose.model(
  "VendorRespondentSession",
  vendorRespondentSessionSchema
);

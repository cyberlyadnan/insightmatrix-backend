import mongoose from "mongoose";
import type { VendorRespondentSessionStatus } from "../constants/vendor-allocation";
import { RESPONDENT_OWNER_TYPES, TRAFFIC_TYPES } from "../constants/token";

const vendorRespondentSessionSchema = new mongoose.Schema(
  {
    /** @deprecated alias — equals internalSessionToken for supplier lookup */
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    internalSessionToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    vendorRespondentToid: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      index: true
    },
    supplierReturnedToken: {
      type: String,
      trim: true,
      maxlength: 64,
      default: ""
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
    responseStatus: {
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
    trafficType: {
      type: String,
      enum: TRAFFIC_TYPES,
      default: "vendor_panel",
      index: true
    },
    respondentOwnerType: {
      type: String,
      enum: RESPONDENT_OWNER_TYPES,
      default: "vendor",
      index: true
    },
    callbackForwarded: { type: Boolean, default: false, index: true },
    callbackForwardedAt: { type: Date, default: null },
    trafficSource: { type: String, trim: true, maxlength: 500, default: "" },
    sourceIp: { type: String, trim: true, maxlength: 64, default: "" },
    userAgent: { type: String, trim: true, maxlength: 2000, default: "" },
    /** Legacy field — synced with vendorRespondentToid */
    vendorRespondentId: { type: String, trim: true, maxlength: 500, default: "" },
    startedAt: { type: Date, default: Date.now },
    redirectedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

vendorRespondentSessionSchema.index({ allocationId: 1, createdAt: -1 });
vendorRespondentSessionSchema.index({ panelSurveyId: 1, status: 1 });
vendorRespondentSessionSchema.index({ vendorId: 1, createdAt: -1 });
vendorRespondentSessionSchema.index({ vendorRespondentToid: 1, vendorId: 1 });
vendorRespondentSessionSchema.index({ internalSessionToken: 1 });
vendorRespondentSessionSchema.index({ createdAt: -1 });

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

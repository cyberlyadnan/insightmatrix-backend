import mongoose from "mongoose";
import { SECURITY_DECISIONS } from "../constants/gateway-security";

const securityValidationLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRespondentSession",
      default: null,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true
    },
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSurveyAllocation",
      default: null,
      index: true
    },
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      default: null,
      index: true
    },
    channel: { type: String, enum: ["panel", "vendor"], required: true, index: true },
    ipAddress: { type: String, trim: true, maxlength: 64, default: "", index: true },
    forwardedIp: { type: String, trim: true, maxlength: 256, default: "" },
    country: { type: String, trim: true, maxlength: 8, default: "", index: true },
    city: { type: String, trim: true, maxlength: 120, default: "" },
    captchaPassed: { type: Boolean, default: null },
    vpnDetected: { type: Boolean, default: false, index: true },
    proxyDetected: { type: Boolean, default: false, index: true },
    botDetected: { type: Boolean, default: false, index: true },
    validationDecision: {
      type: String,
      enum: SECURITY_DECISIONS,
      required: true,
      index: true
    },
    blockedReason: { type: String, trim: true, maxlength: 500, default: "" },
    reasonCode: { type: String, trim: true, maxlength: 64, default: "", index: true },
    userAgent: { type: String, trim: true, maxlength: 2000, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

securityValidationLogSchema.index({ createdAt: -1 });
securityValidationLogSchema.index({ validationDecision: 1, createdAt: -1 });
securityValidationLogSchema.index({ panelSurveyId: 1, createdAt: -1 });

export const SecurityValidationLog = mongoose.model(
  "SecurityValidationLog",
  securityValidationLogSchema
);

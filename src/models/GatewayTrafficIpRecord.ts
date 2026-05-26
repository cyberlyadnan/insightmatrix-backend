import mongoose from "mongoose";

const gatewayTrafficIpRecordSchema = new mongoose.Schema(
  {
    ipAddress: { type: String, required: true, trim: true, maxlength: 64, index: true },
    forwardedIp: { type: String, trim: true, maxlength: 256, default: "" },
    userAgent: { type: String, trim: true, maxlength: 2000, default: "" },
    country: { type: String, trim: true, maxlength: 8, default: "", index: true },
    channel: { type: String, enum: ["panel", "vendor"], required: true, index: true },
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRespondentSession",
      default: null,
      index: true
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyRespondentProfile",
      default: null
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

gatewayTrafficIpRecordSchema.index({ ipAddress: 1, panelSurveyId: 1, createdAt: -1 });
gatewayTrafficIpRecordSchema.index({ ipAddress: 1, allocationId: 1, createdAt: -1 });
gatewayTrafficIpRecordSchema.index({ createdAt: -1 });

export const GatewayTrafficIpRecord = mongoose.model(
  "GatewayTrafficIpRecord",
  gatewayTrafficIpRecordSchema
);

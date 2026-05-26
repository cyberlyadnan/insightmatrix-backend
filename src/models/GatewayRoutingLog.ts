import mongoose from "mongoose";
import type { RoutingChannel, GatewayRoutingAction } from "../constants/routing-gateway";

const gatewayRoutingLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["panel", "vendor"],
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        "start_validation",
        "redirect_success",
        "validation_failed",
        "prescreen_required",
        "security_captcha_required",
        "callback_received",
        "callback_forwarded",
        "callback_forward_skipped"
      ],
      required: true,
      index: true
    },
    success: { type: Boolean, required: true, index: true },
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
      default: null
    },
    sessionToken: { type: String, trim: true, maxlength: 128, default: "" },
    failureReason: { type: String, trim: true, maxlength: 500, default: "" },
    sourceIp: { type: String, trim: true, maxlength: 64, default: "" },
    userAgent: { type: String, trim: true, maxlength: 2000, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

gatewayRoutingLogSchema.index({ createdAt: -1 });

export type GatewayRoutingLogDoc = mongoose.InferSchemaType<typeof gatewayRoutingLogSchema> & {
  _id: mongoose.Types.ObjectId;
  channel: RoutingChannel;
  action: GatewayRoutingAction;
};

export const GatewayRoutingLog = mongoose.model("GatewayRoutingLog", gatewayRoutingLogSchema);

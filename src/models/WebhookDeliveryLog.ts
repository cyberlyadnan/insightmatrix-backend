import mongoose from "mongoose";
import type { VendorCallbackOutcome } from "../constants/vendor-callback";
import type { WebhookDeliveryStatus } from "../constants/routing-gateway";

const webhookDeliveryLogSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
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
      required: true,
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRespondentSession",
      default: null,
      index: true
    },
    callbackType: {
      type: String,
      enum: ["complete", "terminate", "quota_full", "quality_reject"],
      required: true,
      index: true
    },
    destinationUrl: { type: String, required: true, trim: true, maxlength: 2000 },
    requestPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    responseStatus: { type: Number, default: null },
    responsePayload: { type: String, maxlength: 16000, default: "" },
    deliveryStatus: {
      type: String,
      enum: ["success", "failed"],
      required: true,
      index: true
    },
    errorMessage: { type: String, trim: true, maxlength: 2000, default: "" },
    attemptedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

webhookDeliveryLogSchema.index({ vendorId: 1, attemptedAt: -1 });
webhookDeliveryLogSchema.index({ panelSurveyId: 1, attemptedAt: -1 });

export type WebhookDeliveryLogDoc = mongoose.InferSchemaType<typeof webhookDeliveryLogSchema> & {
  _id: mongoose.Types.ObjectId;
  callbackType: VendorCallbackOutcome;
  deliveryStatus: WebhookDeliveryStatus;
};

export const WebhookDeliveryLog = mongoose.model("WebhookDeliveryLog", webhookDeliveryLogSchema);

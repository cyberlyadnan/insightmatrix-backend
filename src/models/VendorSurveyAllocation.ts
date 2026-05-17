import mongoose from "mongoose";
import type { VendorAllocationStatus } from "../constants/vendor-allocation";

const vendorSurveyAllocationSchema = new mongoose.Schema(
  {
    allocationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      required: true,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "closed"],
      default: "active",
      index: true
    },
    allocatedQuota: { type: Number, required: true, min: 1 },
    startedCount: { type: Number, default: 0, min: 0 },
    completedCount: { type: Number, default: 0, min: 0 },
    terminateCount: { type: Number, default: 0, min: 0 },
    quotaFullCount: { type: Number, default: 0, min: 0 },
    qualityRejectCount: { type: Number, default: 0, min: 0 },
    liveRemainingQuota: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    incidenceRate: { type: Number, default: 0, min: 0, max: 100 },
    vendorCpi: { type: Number, default: 0, min: 0 },
    clientCpi: { type: Number, default: 0, min: 0 },
    marginPerComplete: { type: Number, default: 0 },
    routingLink: { type: String, required: true, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 8000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

vendorSurveyAllocationSchema.index({ panelSurveyId: 1, vendorId: 1 });
vendorSurveyAllocationSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
vendorSurveyAllocationSchema.index({ panelSurveyId: 1, status: 1 });

vendorSurveyAllocationSchema.pre("save", function normalizeCode(next) {
  if (this.allocationCode) {
    this.allocationCode = String(this.allocationCode).trim().toUpperCase();
  }
  next();
});

export type VendorSurveyAllocationDoc = mongoose.InferSchemaType<typeof vendorSurveyAllocationSchema> & {
  _id: mongoose.Types.ObjectId;
  status: VendorAllocationStatus;
};

export const VendorSurveyAllocation = mongoose.model(
  "VendorSurveyAllocation",
  vendorSurveyAllocationSchema
);

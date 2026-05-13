import mongoose from "mongoose";
import {
  COMPANY_PAYMENT_SOURCES,
  COMPANY_PAYMENT_STATUSES,
  type CompanyPaymentStatus
} from "../constants/company-payment";

const companySurveyPaymentSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true, maxlength: 40, index: true },
    surveyCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyCompany",
      required: true,
      index: true
    },
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: COMPANY_PAYMENT_SOURCES,
      required: true,
      index: true
    },
    currency: { type: String, required: true, trim: true, uppercase: true, maxlength: 8, default: "USD" },
    subtotalAmount: { type: Number, required: true, min: 0, default: 0 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    lineDescription: { type: String, trim: true, maxlength: 500, default: "" },
    status: {
      type: String,
      enum: COMPANY_PAYMENT_STATUSES,
      default: "pending" as CompanyPaymentStatus,
      index: true
    },
    paidAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 8000, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

companySurveyPaymentSchema.index({ createdAt: -1 });
companySurveyPaymentSchema.index(
  { panelSurveyId: 1, source: 1 },
  { unique: true, partialFilterExpression: { source: "auto_survey_create" } }
);

export const CompanySurveyPayment = mongoose.model("CompanySurveyPayment", companySurveyPaymentSchema);

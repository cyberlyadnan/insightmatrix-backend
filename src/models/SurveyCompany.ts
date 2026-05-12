import mongoose from "mongoose";
import { SURVEY_COMPANY_STATUSES, SURVEY_PROVIDER_TYPES } from '../constants/survey-company';

const surveyCompanySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    companyCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
      match: [/^[A-Z0-9][A-Z0-9_-]*$/, "Invalid company code format"]
    },
    contactPersonName: { type: String, trim: true, maxlength: 120, default: "" },
    companyEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    companyPhone: { type: String, trim: true, maxlength: 40, default: "" },
    websiteUrl: { type: String, trim: true, maxlength: 500, default: "" },
    providerType: { type: String, enum: SURVEY_PROVIDER_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: SURVEY_COMPANY_STATUSES,
      default: "active",
      index: true
    },
    notes: { type: String, trim: true, maxlength: 8000, default: "" }
  },
  { timestamps: true }
);

surveyCompanySchema.index({ companyName: "text", companyCode: "text", contactPersonName: "text" });
surveyCompanySchema.index({ createdAt: -1 });

surveyCompanySchema.pre("save", function normalizeCode(next) {
  if (this.companyCode) {
    this.companyCode = String(this.companyCode).trim().toUpperCase();
  }
  next();
});

export const SurveyCompany = mongoose.model("SurveyCompany", surveyCompanySchema);

import mongoose from "mongoose";
import {
  RESPONDENT_SURVEY_STATUSES,
  RESPONDENT_OWNER_TYPES
} from "../constants/survey-respondent";

const lifecycleEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const surveyRespondentProfileSchema = new mongoose.Schema(
  {
    panelSurveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurvey",
      required: true,
      index: true
    },
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSurveyAllocation",
      default: null,
      index: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    vendorRespondentSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorRespondentSession",
      default: null,
      index: true
    },
    panelSurveyAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PanelSurveyAttempt",
      default: null,
      index: true
    },
    prescreenFormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrescreenForm",
      default: null
    },
    respondentOwnerType: {
      type: String,
      enum: RESPONDENT_OWNER_TYPES,
      required: true,
      index: true
    },
    vendorRespondentToid: { type: String, trim: true, maxlength: 500, default: "", index: true },
    internalSessionToken: { type: String, trim: true, maxlength: 64, default: "", index: true },
    prescreenAnswers: { type: mongoose.Schema.Types.Mixed, default: null },
    prescreenCompletedAt: { type: Date, default: null },
    prescreenDurationMs: { type: Number, default: null },
    surveyStatus: {
      type: String,
      enum: RESPONDENT_SURVEY_STATUSES,
      default: "prescreen_pending",
      index: true
    },
    lifecycleHistory: { type: [lifecycleEventSchema], default: [] },
    trafficSource: { type: String, trim: true, maxlength: 500, default: "" },
    sourceIp: { type: String, trim: true, maxlength: 64, default: "" },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

surveyRespondentProfileSchema.index({ vendorId: 1, createdAt: -1 });
surveyRespondentProfileSchema.index({ panelSurveyId: 1, surveyStatus: 1 });
surveyRespondentProfileSchema.index({ allocationId: 1, createdAt: -1 });
surveyRespondentProfileSchema.index({ internalSessionToken: 1 });
surveyRespondentProfileSchema.index({ vendorRespondentToid: 1, panelSurveyId: 1 });
surveyRespondentProfileSchema.index({ createdAt: -1 });

export const SurveyRespondentProfile = mongoose.model(
  "SurveyRespondentProfile",
  surveyRespondentProfileSchema
);

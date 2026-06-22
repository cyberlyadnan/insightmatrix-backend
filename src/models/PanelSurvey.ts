import mongoose from "mongoose";
import {
  PANEL_QUOTA_GROUP_STATUSES,
  PANEL_SURVEY_DEVICE_TYPES,
  PANEL_SURVEY_GENDER_TARGETS,
  PANEL_SURVEY_STATUSES
} from '../constants/panel-survey';

const quotaGroupSchema = new mongoose.Schema(
  {
    groupName: { type: String, required: true, trim: true, maxlength: 200 },
    groupDescription: { type: String, trim: true, maxlength: 2000, default: "" },
    totalQuota: { type: Number, required: true, min: 0 },
    remainingQuota: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PANEL_QUOTA_GROUP_STATUSES,
      default: "active",
      index: true
    }
  },
  { _id: true }
);

const panelSurveySchema = new mongoose.Schema(
  {
    surveyName: { type: String, required: true, trim: true, maxlength: 300 },
    surveyCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 64,
      match: [/^[A-Z0-9][A-Z0-9_-]*$/, "Invalid survey code"]
    },
    externalSurveyId: { type: String, trim: true, maxlength: 200, default: "" },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyCompany",
      required: true,
      index: true
    },
    surveyStatus: {
      type: String,
      enum: PANEL_SURVEY_STATUSES,
      default: "draft",
      index: true
    },

    externalSurveyUrl: { type: String, required: true, trim: true, maxlength: 4000 },
    /** Company project id from supplier URL (?pid=…) — match callbacks by this value */
    supplierProjectPid: { type: String, trim: true, maxlength: 200, default: "", index: true },
    trackingParameterName: { type: String, trim: true, maxlength: 80, default: "toid" },
    /** Query key on OUR landing URL (?pid=…) supplied by the router; forwarded to supplier as `trackingParameterName` */
    participantQueryParam: { type: String, trim: true, maxlength: 80, default: "toid" },

    targetCountries: { type: [String], default: [] },
    targetGender: {
      type: String,
      enum: PANEL_SURVEY_GENDER_TARGETS,
      default: "all"
    },
    targetAgeMin: { type: Number, min: 0, max: 120, default: null },
    targetAgeMax: { type: Number, min: 0, max: 120, default: null },
    targetProfessions: { type: [String], default: [] },
    targetIndustries: { type: [String], default: [] },
    targetCompanySizes: { type: [String], default: [] },
    targetDevices: {
      type: [String],
      default: [],
      validate: {
        validator(arr: string[]) {
          return arr.every((d) => PANEL_SURVEY_DEVICE_TYPES.includes(d as never));
        },
        message: "Invalid device value"
      }
    },
    targetLanguages: { type: [String], default: [] },

    incidenceRate: { type: Number, min: 0, max: 100, default: null },
    estimatedLOI: { type: Number, min: 0, default: null },
    payoutToUser: { type: Number, min: 0, default: null },
    revenuePerComplete: { type: Number, min: 0, default: null },

    /** What the supplier company pays InsightMatrix for this routing study (money, not member points). */
    companyBillingAmount: { type: Number, min: 0, default: 0 },
    /** Tax % applied to companyBillingAmount for invoicing (0 = none). */
    companyBillingTaxPercent: { type: Number, min: 0, max: 100, default: 0 },

    totalQuota: { type: Number, min: 0, default: 0 },
    remainingQuota: { type: Number, min: 0, default: 0 },
    dynamicQuotaGroups: [quotaGroupSchema],

    surveyPriority: { type: Number, default: 0, index: true },
    /** Max times a member may start this survey (e.g. after terminate). Completed (rewarded) always blocks further starts. */
    maxMemberAttempts: { type: Number, default: 2, min: 1, max: 10 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 16000, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

panelSurveySchema.index({ surveyName: "text", surveyCode: "text", externalSurveyId: "text" });
panelSurveySchema.index({ createdAt: -1 });
panelSurveySchema.index({ targetCountries: 1 });

panelSurveySchema.pre("save", function normalizeSurveyCode(next) {
  if (this.surveyCode) {
    this.surveyCode = String(this.surveyCode).trim().toUpperCase();
  }
  next();
});

export const PanelSurvey = mongoose.model("PanelSurvey", panelSurveySchema);

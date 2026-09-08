import Joi from "joi";
import { PANEL_ROUTING_EVENT_TYPES } from '../constants/panel-survey-routing';
import {
  PANEL_QUOTA_GROUP_STATUSES,
  PANEL_SURVEY_AUDIENCES,
  PANEL_SURVEY_DEVICE_TYPES,
  PANEL_SURVEY_GENDER_TARGETS,
  PANEL_SURVEY_STATUSES
} from '../constants/panel-survey';

const quotaGroupSchema = Joi.object({
  groupName: Joi.string().min(1).max(200).required(),
  groupDescription: Joi.string().max(2000).allow("", null),
  totalQuota: Joi.number().integer().min(0).required(),
  remainingQuota: Joi.number().integer().min(0).required(),
  status: Joi.string().valid(...PANEL_QUOTA_GROUP_STATUSES).default("active")
});

const surveyPayload = {
  surveyName: Joi.string().min(2).max(300).required(),
  surveyCode: Joi.string().min(2).max(64).required(),
  externalSurveyId: Joi.string().max(200).allow("", null),
  providerId: Joi.string().hex().length(24).required(),
  surveyStatus: Joi.string().valid(...PANEL_SURVEY_STATUSES).default("draft"),
  surveyAudience: Joi.string().valid(...PANEL_SURVEY_AUDIENCES).default("public"),
  externalSurveyUrl: Joi.string().trim().max(4000).required(),
  supplierProjectPid: Joi.string().trim().max(200).allow("", null),
  trackingParameterName: Joi.string().trim().max(80).allow("", null),
  participantQueryParam: Joi.string().trim().max(80).allow("", null),
  targetCountries: Joi.array().items(Joi.string().trim().max(8)).max(500).default([]),
  targetGender: Joi.string().valid(...PANEL_SURVEY_GENDER_TARGETS).default("all"),
  targetAgeMin: Joi.number().integer().min(0).max(120).allow(null),
  targetAgeMax: Joi.number().integer().min(0).max(120).allow(null),
  targetProfessions: Joi.array().items(Joi.string().max(120)).max(500).default([]),
  targetIndustries: Joi.array().items(Joi.string().max(120)).max(500).default([]),
  targetCompanySizes: Joi.array().items(Joi.string().max(120)).max(200).default([]),
  targetDevices: Joi.array()
    .items(Joi.string().valid(...PANEL_SURVEY_DEVICE_TYPES))
    .max(20)
    .default([]),
  targetLanguages: Joi.array().items(Joi.string().max(32)).max(100).default([]),
  incidenceRate: Joi.number().min(0).max(100).allow(null),
  estimatedLOI: Joi.number().min(0).allow(null),
  payoutToUser: Joi.number().min(0).allow(null),
  revenuePerComplete: Joi.number().min(0).allow(null),
  companyBillingAmount: Joi.number().min(0).default(0),
  companyBillingTaxPercent: Joi.number().min(0).max(100).default(0),
  totalQuota: Joi.number().integer().min(0).default(0),
  remainingQuota: Joi.number().integer().min(0).default(0),
  dynamicQuotaGroups: Joi.array().items(quotaGroupSchema).default([]),
  surveyPriority: Joi.number().integer().default(0),
  maxMemberAttempts: Joi.number().integer().min(1).max(10).default(2),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  notes: Joi.string().max(16000).allow("", null)
};

export const listPanelSurveysSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow(""),
    providerId: Joi.string().hex().length(24).allow(""),
    country: Joi.string().trim().max(8),
    surveyStatus: Joi.string().valid(...PANEL_SURVEY_STATUSES),
    surveyAudience: Joi.string().valid(...PANEL_SURVEY_AUDIENCES),
    sortBy: Joi.string().valid(
      "surveyName",
      "surveyCode",
      "createdAt",
      "surveyStatus",
      "incidenceRate",
      "estimatedLOI",
      "remainingQuota",
      "totalQuota"
    ),
    sortOrder: Joi.string().valid("asc", "desc")
  }).required()
});

export const createPanelSurveySchema = Joi.object({
  body: Joi.object(surveyPayload).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const updatePanelSurveySchema = Joi.object({
  body: Joi.object({
    surveyName: Joi.string().min(2).max(300),
    surveyCode: Joi.string().min(2).max(64),
    externalSurveyId: Joi.string().max(200).allow("", null),
    providerId: Joi.string().hex().length(24).optional(),
    surveyStatus: Joi.string().valid(...PANEL_SURVEY_STATUSES),
    surveyAudience: Joi.string().valid(...PANEL_SURVEY_AUDIENCES),
    externalSurveyUrl: Joi.string().trim().max(4000),
    supplierProjectPid: Joi.string().trim().max(200).allow("", null),
    trackingParameterName: Joi.string().trim().max(80).allow("", null),
    participantQueryParam: Joi.string().trim().max(80).allow("", null),
    targetCountries: Joi.array().items(Joi.string().trim().max(8)).max(500),
    targetGender: Joi.string().valid(...PANEL_SURVEY_GENDER_TARGETS),
    targetAgeMin: Joi.number().integer().min(0).max(120).allow(null),
    targetAgeMax: Joi.number().integer().min(0).max(120).allow(null),
    targetProfessions: Joi.array().items(Joi.string().max(120)).max(500),
    targetIndustries: Joi.array().items(Joi.string().max(120)).max(500),
    targetCompanySizes: Joi.array().items(Joi.string().max(120)).max(200),
    targetDevices: Joi.array().items(Joi.string().valid(...PANEL_SURVEY_DEVICE_TYPES)).max(20),
    targetLanguages: Joi.array().items(Joi.string().max(32)).max(100),
    incidenceRate: Joi.number().min(0).max(100).allow(null),
    estimatedLOI: Joi.number().min(0).allow(null),
    payoutToUser: Joi.number().min(0).allow(null),
    revenuePerComplete: Joi.number().min(0).allow(null),
    companyBillingAmount: Joi.number().min(0),
    companyBillingTaxPercent: Joi.number().min(0).max(100),
    totalQuota: Joi.number().integer().min(0),
    remainingQuota: Joi.number().integer().min(0),
    dynamicQuotaGroups: Joi.array().items(quotaGroupSchema),
    surveyPriority: Joi.number().integer(),
    maxMemberAttempts: Joi.number().integer().min(1).max(10),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    notes: Joi.string().max(16000).allow("", null)
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const patchPanelSurveyStatusSchema = Joi.object({
  body: Joi.object({
    surveyStatus: Joi.string().valid(...PANEL_SURVEY_STATUSES).required()
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const paramsIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const panelSurveyRoutingEventSchema = Joi.object({
  body: Joi.object({
    eventType: Joi.string()
      .valid(...PANEL_ROUTING_EVENT_TYPES)
      .required(),
    quotaGroupId: Joi.string().trim().max(64).allow("", null),
    quotaGroupName: Joi.string().trim().max(200).allow("", null),
    supplierParticipantRef: Joi.string().trim().max(500).allow("", null),
    meta: Joi.any().optional()
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

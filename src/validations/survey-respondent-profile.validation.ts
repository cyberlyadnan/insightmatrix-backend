import Joi from "joi";
import { RESPONDENT_SURVEY_STATUSES } from "../constants/survey-respondent";

const emptyObject = Joi.object({}).required();

export const listSurveyRespondentProfilesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    allocationId: Joi.string().hex().length(24),
    surveyStatus: Joi.string().valid(...RESPONDENT_SURVEY_STATUSES),
    respondentOwnerType: Joi.string().valid("internal", "vendor"),
    search: Joi.string().trim().max(200).allow(""),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate()
  }).required()
});

export const surveyRespondentProfileIdParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }).required(),
  query: emptyObject
});

export const exportRespondentsSchema = Joi.object({
  body: Joi.object({
    format: Joi.string().valid("csv", "xlsx", "pdf").default("csv"),
    vendorId: Joi.string().hex().length(24).allow("", null),
    panelSurveyId: Joi.string().hex().length(24).allow("", null),
    allocationId: Joi.string().hex().length(24).allow("", null),
    surveyStatus: Joi.string()
      .valid(...RESPONDENT_SURVEY_STATUSES)
      .allow("", null),
    respondentOwnerType: Joi.string().valid("internal", "vendor").allow("", null),
    dateFrom: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow("", null),
    dateTo: Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/).allow("", null)
  }).required(),
  params: emptyObject,
  query: emptyObject
});

export const respondentAnalyticsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate()
  }).required()
});

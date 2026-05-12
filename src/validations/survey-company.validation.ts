import Joi from "joi";
import { SURVEY_COMPANY_STATUSES, SURVEY_PROVIDER_TYPES } from '../constants/survey-company';

const optionalEmail = Joi.alternatives().try(Joi.string().trim().email().max(254), Joi.valid("", null));
const optionalUrl = Joi.alternatives().try(
  Joi.string().trim().uri({ allowRelative: false }).max(500),
  Joi.valid("", null)
);

const companyBody = {
  companyName: Joi.string().min(2).max(200).required(),
  companyCode: Joi.string().min(2).max(40).required(),
  contactPersonName: Joi.string().max(120).allow("", null),
  companyEmail: optionalEmail,
  companyPhone: Joi.string().max(40).allow("", null),
  websiteUrl: optionalUrl,
  providerType: Joi.string()
    .valid(...SURVEY_PROVIDER_TYPES)
    .required(),
  status: Joi.string().valid(...SURVEY_COMPANY_STATUSES),
  notes: Joi.string().max(8000).allow("", null)
};

export const listSurveyCompaniesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow(""),
    status: Joi.string().valid("active", "inactive"),
    sortBy: Joi.string().valid(
      "companyName",
      "companyCode",
      "createdAt",
      "providerType",
      "status",
      "contactPersonName"
    ),
    sortOrder: Joi.string().valid("asc", "desc")
  }).required()
});

export const createSurveyCompanySchema = Joi.object({
  body: Joi.object(companyBody).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const updateSurveyCompanySchema = Joi.object({
  body: Joi.object({
    companyName: Joi.string().min(2).max(200),
    companyCode: Joi.string().min(2).max(40),
    contactPersonName: Joi.string().max(120).allow("", null),
    companyEmail: optionalEmail,
    companyPhone: Joi.string().max(40).allow("", null),
    websiteUrl: optionalUrl,
    providerType: Joi.string().valid(...SURVEY_PROVIDER_TYPES),
    status: Joi.string().valid(...SURVEY_COMPANY_STATUSES),
    notes: Joi.string().max(8000).allow("", null)
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const surveyCompanyStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...SURVEY_COMPANY_STATUSES).required()
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const paramsIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

import Joi from "joi";
import { COMPANY_PAYMENT_STATUSES } from "../constants/company-payment";

export const listCompanySurveyPaymentsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    surveyCompanyId: Joi.string().hex().length(24).allow(""),
    panelSurveyId: Joi.string().hex().length(24).allow(""),
    status: Joi.string().valid(...COMPANY_PAYMENT_STATUSES)
  }).required()
});

export const createCompanySurveyPaymentSchema = Joi.object({
  body: Joi.object({
    surveyCompanyId: Joi.string().hex().length(24).required(),
    panelSurveyId: Joi.string().hex().length(24).required(),
    subtotalAmount: Joi.number().min(0).required(),
    taxPercent: Joi.number().min(0).max(100).default(0),
    currency: Joi.string().trim().uppercase().max(8).default("USD"),
    notes: Joi.string().max(8000).allow("", null)
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const patchCompanySurveyPaymentStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...COMPANY_PAYMENT_STATUSES).required(),
    paidAt: Joi.date().allow(null)
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const companySurveyPaymentIdParamSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

import Joi from "joi";
import { SECURITY_DECISIONS } from "../constants/gateway-security";

const emptyObject = Joi.object({}).required();

export const listSecurityLogsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    allocationId: Joi.string().hex().length(24),
    validationDecision: Joi.string().valid(...SECURITY_DECISIONS),
    reasonCode: Joi.string().trim().max(64),
    country: Joi.string().trim().max(8),
    ipAddress: Joi.string().trim().max(64),
    botDetected: Joi.string().valid("true", "false"),
    vpnDetected: Joi.string().valid("true", "false"),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate()
  }).required()
});

export const securityAnalyticsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate()
  }).required()
});

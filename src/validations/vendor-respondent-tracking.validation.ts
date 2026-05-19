import Joi from "joi";
import { VENDOR_RESPONDENT_SESSION_STATUSES } from "../constants/vendor-allocation";

const emptyObject = Joi.object({}).required();

export const listVendorRespondentSessionsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    allocationId: Joi.string().hex().length(24),
    status: Joi.string().valid(...VENDOR_RESPONDENT_SESSION_STATUSES),
    callbackForwarded: Joi.string().valid("true", "false"),
    search: Joi.string().trim().max(200).allow(""),
    supplierProjectPid: Joi.string().trim().max(120).allow(""),
    dateFrom: Joi.string().isoDate(),
    dateTo: Joi.string().isoDate()
  }).required()
});

export const vendorRespondentSessionIdParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }).required(),
  query: emptyObject
});

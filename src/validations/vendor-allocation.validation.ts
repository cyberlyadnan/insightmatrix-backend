import Joi from "joi";
import { VENDOR_ALLOCATION_STATUSES } from "../constants/vendor-allocation";

export const listVendorAllocationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    panelSurveyId: Joi.string().hex().length(24),
    vendorId: Joi.string().hex().length(24),
    status: Joi.string().valid(...VENDOR_ALLOCATION_STATUSES),
    search: Joi.string().trim().max(200)
  })
};

export const vendorAllocationIdParamsSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
};

export const createVendorAllocationSchema = {
  body: Joi.object({
    panelSurveyId: Joi.string().hex().length(24).required(),
    vendorId: Joi.string().hex().length(24).required(),
    allocatedQuota: Joi.number().integer().min(1).required(),
    vendorCpi: Joi.number().min(0),
    clientCpi: Joi.number().min(0),
    startDate: Joi.date().iso().allow(null),
    endDate: Joi.date().iso().allow(null),
    notes: Joi.string().trim().max(8000).allow("")
  })
};

export const updateVendorAllocationSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }),
  body: Joi.object({
    allocatedQuota: Joi.number().integer().min(1),
    vendorCpi: Joi.number().min(0),
    clientCpi: Joi.number().min(0),
    startDate: Joi.date().iso().allow(null),
    endDate: Joi.date().iso().allow(null),
    notes: Joi.string().trim().max(8000).allow("")
  }).min(1)
};

export const vendorRoutingStartSchema = {
  body: Joi.object({
    allocationCode: Joi.string().trim().min(4).max(32).required(),
    vendorRespondentId: Joi.string().trim().max(500).allow(""),
    trafficSource: Joi.string().trim().max(500).allow("")
  })
};

export const panelSurveyIdAllocationsParamsSchema = {
  params: Joi.object({
    surveyId: Joi.string().hex().length(24).required()
  })
};

export const vendorPortalAllocationIdParamsSchema = {
  params: Joi.object({
    allocationId: Joi.string().hex().length(24).required()
  })
};

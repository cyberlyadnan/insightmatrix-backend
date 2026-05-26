import Joi from "joi";
import { VENDOR_ALLOCATION_STATUSES } from "../constants/vendor-allocation";

const emptyObject = Joi.object({}).required();

export const listVendorAllocationsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    panelSurveyId: Joi.string().hex().length(24),
    vendorId: Joi.string().hex().length(24),
    status: Joi.string().valid(...VENDOR_ALLOCATION_STATUSES),
    search: Joi.string().trim().max(200).allow("")
  }).required()
});

export const vendorAllocationIdParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }).required(),
  query: emptyObject
});

const allocationBodyFields = {
  panelSurveyId: Joi.string().hex().length(24).required(),
  vendorId: Joi.string().hex().length(24).required(),
  allocatedQuota: Joi.number().integer().min(1).required(),
  vendorCpi: Joi.number().min(0).optional(),
  clientCpi: Joi.number().min(0).optional(),
  startDate: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null)).optional(),
  endDate: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null)).optional(),
  notes: Joi.string().trim().max(8000).allow("", null).optional()
};

export const createVendorAllocationSchema = Joi.object({
  body: Joi.object(allocationBodyFields).required(),
  params: emptyObject,
  query: emptyObject
});

export const updateVendorAllocationSchema = Joi.object({
  body: Joi.object({
    allocatedQuota: Joi.number().integer().min(1),
    vendorCpi: Joi.number().min(0),
    clientCpi: Joi.number().min(0),
    startDate: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null)),
    endDate: Joi.alternatives().try(Joi.date().iso(), Joi.valid(null)),
    notes: Joi.string().trim().max(8000).allow("", null)
  })
    .min(1)
    .required(),
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  }).required(),
  query: emptyObject
});

const compactTokenPattern = /^[A-Z]{3}[A-Z2-9]{7,12}$/i;

export const vendorRoutingStartSchema = Joi.object({
  body: Joi.object({
    routingSlug: Joi.string().trim().min(10).max(15).pattern(compactTokenPattern).required(),
    vendorRespondentToid: Joi.string().trim().max(500).allow(""),
    vendorRespondentId: Joi.string().trim().max(500).allow(""),
    trafficSource: Joi.string().trim().max(500).allow(""),
    captchaToken: Joi.string().trim().max(4000).allow("", null)
  }).required(),
  params: emptyObject,
  query: emptyObject
});

export const panelSurveyIdAllocationsParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    surveyId: Joi.string().hex().length(24).required()
  }).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1),
    pageSize: Joi.number().integer().min(1).max(100)
  }).required()
});

export const vendorPortalAllocationIdParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    allocationId: Joi.string().hex().length(24).required()
  }).required(),
  query: emptyObject
});

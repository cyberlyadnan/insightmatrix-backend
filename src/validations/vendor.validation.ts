import Joi from "joi";
import { VENDOR_STATUSES } from "../constants/vendor";
import { VENDOR_CALLBACK_OUTCOMES } from "../constants/vendor-callback";

const optionalUrl = Joi.alternatives().try(
  Joi.string().trim().uri({ allowRelative: false }).max(2000),
  Joi.valid("", null)
);

const callbackUrlsSchema = Joi.object(
  Object.fromEntries(VENDOR_CALLBACK_OUTCOMES.map((key) => [key, optionalUrl]))
).optional();

const vendorCreateBody = {
  companyName: Joi.string().min(2).max(200).required(),
  contactPerson: Joi.string().max(120).allow("", null),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().max(40).allow("", null),
  website: optionalUrl,
  callbackUrls: callbackUrlsSchema,
  allowedIps: Joi.array().items(Joi.string().trim().max(64)).max(200).optional(),
  allowedCountries: Joi.array().items(Joi.string().trim().max(8)).max(300).optional(),
  notes: Joi.string().max(16000).allow("", null),
  status: Joi.string().valid(...VENDOR_STATUSES)
};

export const listVendorsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(500).default(20),
    search: Joi.string().allow(""),
    status: Joi.string().valid(...VENDOR_STATUSES),
    sortBy: Joi.string().valid(
      "companyName",
      "vendorCode",
      "email",
      "status",
      "createdAt",
      "totalCompletes",
      "lastLoginAt"
    ),
    sortOrder: Joi.string().valid("asc", "desc")
  }).required()
});

export const createVendorSchema = Joi.object({
  body: Joi.object(vendorCreateBody).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const updateVendorSchema = Joi.object({
  body: Joi.object({
    companyName: Joi.string().min(2).max(200),
    contactPerson: Joi.string().max(120).allow("", null),
    email: Joi.string().trim().email().max(254),
    phone: Joi.string().max(40).allow("", null),
    website: optionalUrl,
    callbackUrls: callbackUrlsSchema,
    allowedIps: Joi.array().items(Joi.string().trim().max(64)).max(200),
    allowedCountries: Joi.array().items(Joi.string().trim().max(8)).max(300),
    notes: Joi.string().max(16000).allow("", null),
    status: Joi.string().valid(...VENDOR_STATUSES),
    password: Joi.string().min(8).max(128).allow("", null)
  }).required(),
  params: Joi.object({ id: Joi.string().hex().length(24).required() }).required(),
  query: Joi.object({}).required()
});

export const vendorStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid(...VENDOR_STATUSES)
      .required()
  }).required(),
  params: Joi.object({ id: Joi.string().hex().length(24).required() }).required(),
  query: Joi.object({}).required()
});

export const vendorIdParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().hex().length(24).required() }).required(),
  query: Joi.object({}).required()
});

import Joi from "joi";
import { VENDOR_CALLBACK_OUTCOMES } from "../constants/vendor-callback";

const optionalUrl = Joi.alternatives().try(
  Joi.string().trim().uri({ allowRelative: false }).max(2000),
  Joi.valid("", null)
);

const callbackUrlsSchema = Joi.object(
  Object.fromEntries(VENDOR_CALLBACK_OUTCOMES.map((key) => [key, optionalUrl]))
).optional();

export const vendorLoginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().max(254).required(),
    password: Joi.string().min(8).max(128).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const vendorChangePasswordSchema = Joi.object({
  body: Joi.object({
    currentPassword: Joi.string().min(8).max(128).required(),
    newPassword: Joi.string().min(8).max(128).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const vendorUpdateProfileSchema = Joi.object({
  body: Joi.object({
    companyName: Joi.string().min(2).max(200),
    contactPerson: Joi.string().max(120).allow("", null),
    phone: Joi.string().max(40).allow("", null),
    website: Joi.alternatives().try(
      Joi.string().trim().uri({ allowRelative: false }).max(500),
      Joi.valid("", null)
    ),
    callbackUrls: callbackUrlsSchema
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

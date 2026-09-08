import Joi from "joi";

export const updateSiteSettingsSchema = Joi.object({
  body: Joi.object({
    companyName: Joi.string().trim().max(200).allow("", null),
    tagline: Joi.string().trim().max(300).allow("", null),
    statement: Joi.string().trim().max(2000).allow("", null),
    shortDescription: Joi.string().trim().max(2000).allow("", null),
    longDescription: Joi.array().items(Joi.string()).default([]),
    email: Joi.string().trim().email().allow("", null),
    salesEmail: Joi.string().trim().email().allow("", null),
    supportEmail: Joi.string().trim().email().allow("", null),
    phones: Joi.array().items(Joi.string().trim()).default([]),
    businessHours: Joi.string().trim().max(200).allow("", null),
    address: Joi.object({
      street: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      country: Joi.string().allow("", null),
      postalCode: Joi.string().allow("", null),
      hqLabel: Joi.string().allow("", null),
    }).default({}),
    socialLinks: Joi.object({
      linkedin: Joi.string().allow("", null),
      instagram: Joi.string().allow("", null),
      twitter: Joi.string().allow("", null),
      facebook: Joi.string().allow("", null),
      youtube: Joi.string().allow("", null),
      website: Joi.string().allow("", null),
    }).default({}),
    seoDefaultTitle: Joi.string().allow("", null),
    seoDefaultDescription: Joi.string().allow("", null),
    seoKeywords: Joi.array().items(Joi.string()).default([]),
    copyrightText: Joi.string().allow("", null),
  })
    .min(1)
    .required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required(),
});

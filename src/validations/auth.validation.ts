import Joi from "joi";

const emailRule = Joi.string().email({ tlds: false }).trim().lowercase();

export const registerSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(120).required(),
    email: emailRule.required(),
    password: Joi.string().min(8).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const loginSchema = Joi.object({
  body: Joi.object({
    email: emailRule.required(),
    password: Joi.string().required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const forgotPasswordSchema = Joi.object({
  body: Joi.object({ email: emailRule.required() }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const resetPasswordSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const resendVerificationSchema = Joi.object({
  body: Joi.object({ email: emailRule.required() }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});


import Joi from "joi";

export const registerSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const forgotPasswordSchema = Joi.object({
  body: Joi.object({ email: Joi.string().email().required() }).required(),
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
  body: Joi.object({ email: Joi.string().email().required() }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

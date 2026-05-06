import Joi from "joi";

export const updateUserSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(120),
    role: Joi.string().valid("admin", "user", "survey_manager"),
    status: Joi.string().valid("active", "suspended")
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});


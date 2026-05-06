import Joi from "joi";

export const updateUserSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(80),
    role: Joi.string().valid("admin", "user", "survey_manager"),
    isActive: Joi.boolean()
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});


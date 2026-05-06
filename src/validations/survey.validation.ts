import Joi from "joi";

const questionSchema = Joi.object({
  question: Joi.string().required(),
  type: Joi.string().valid("text", "single_choice", "multi_choice", "rating").required(),
  options: Joi.array().items(Joi.string()).default([])
});

export const createSurveySchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow("").default(""),
    questions: Joi.array().items(questionSchema).min(1).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const updateSurveySchema = Joi.object({
  body: Joi.object({
    title: Joi.string(),
    description: Joi.string().allow(""),
    questions: Joi.array().items(questionSchema),
    status: Joi.string().valid("draft", "published")
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});


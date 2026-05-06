import Joi from "joi";

export const submitResponseSchema = Joi.object({
  body: Joi.object({
    surveyId: Joi.string().required(),
    respondentEmail: Joi.string().email().required(),
    answers: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().required(),
          value: Joi.any().required()
        })
      )
      .min(1)
      .required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});


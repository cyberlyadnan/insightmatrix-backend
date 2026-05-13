import Joi from "joi";

export const submitPanelPrescreenSchema = Joi.object({
  body: Joi.object({
    answers: Joi.object().pattern(Joi.string(), Joi.any()).required(),
    durationMs: Joi.number().integer().min(0).max(1000 * 60 * 60 * 24).optional()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

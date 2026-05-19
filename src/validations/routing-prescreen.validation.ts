import Joi from "joi";

const emptyObject = Joi.object({}).required();

export const completeRoutingPrescreenSchema = Joi.object({
  body: Joi.object({
    profileId: Joi.string().hex().length(24).required(),
    internalSessionToken: Joi.string().trim().min(8).max(64).required(),
    channel: Joi.string().valid("panel", "vendor").required(),
    answers: Joi.object().min(1).required(),
    durationMs: Joi.number().integer().min(0).max(86400000).allow(null)
  }).required(),
  params: emptyObject,
  query: emptyObject
});

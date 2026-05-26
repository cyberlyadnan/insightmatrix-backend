import Joi from "joi";

const emptyObject = Joi.object({}).required();

export const panelGatewayRedirectSchema = Joi.object({
  body: Joi.object({
    surveyId: Joi.string().hex().length(24).required(),
    attemptToken: Joi.string().trim().min(8).max(128).required(),
    captchaToken: Joi.string().trim().max(4000).allow("", null)
  }).required(),
  params: emptyObject,
  query: emptyObject
});

export const listWebhookLogsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    vendorId: Joi.string().hex().length(24),
    panelSurveyId: Joi.string().hex().length(24),
    allocationId: Joi.string().hex().length(24),
    deliveryStatus: Joi.string().valid("success", "failed"),
    callbackType: Joi.string().valid("complete", "terminate", "quota_full", "quality_reject")
  }).required()
});

export const listGatewayLogsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    channel: Joi.string().valid("panel", "vendor"),
    action: Joi.string().valid(
      "start_validation",
      "redirect_success",
      "validation_failed",
      "prescreen_required",
      "callback_received",
      "callback_forwarded",
      "callback_forward_skipped"
    ),
    panelSurveyId: Joi.string().hex().length(24),
    vendorId: Joi.string().hex().length(24),
    success: Joi.boolean()
  }).required()
});

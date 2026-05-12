import Joi from "joi";
import { PANEL_ROUTING_EVENT_TYPES } from '../constants/panel-survey-routing';

export const publicRoutingCallbackSchema = Joi.object({
  body: Joi.object({
    supplierProjectPid: Joi.string().trim().min(1).max(200).required(),
    eventType: Joi.string()
      .valid(...PANEL_ROUTING_EVENT_TYPES)
      .required(),
    quotaGroupId: Joi.string().trim().max(64).allow("", null),
    quotaGroupName: Joi.string().trim().max(200).allow("", null),
    supplierParticipantRef: Joi.string().trim().max(500).allow("", null),
    meta: Joi.object().unknown(true).optional()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

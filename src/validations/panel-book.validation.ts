import Joi from "joi";
import { PANEL_BOOK_ORG_TYPES } from "../constants/panel-book";

export const submitPanelBookLeadSchema = Joi.object({
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(80).required(),
    lastName: Joi.string().trim().min(1).max(80).required(),
    workEmail: Joi.string().trim().email().max(254).required(),
    companyName: Joi.string().trim().min(1).max(200).required(),
    organizationType: Joi.string()
      .valid(...PANEL_BOOK_ORG_TYPES)
      .required(),
    jobTitle: Joi.string().trim().min(1).max(120).required(),
    country: Joi.string().trim().length(2).uppercase().pattern(/^[A-Z]{2}$/).required(),
    acceptedTerms: Joi.boolean().valid(true).required().messages({
      "any.only": "You must accept the Terms and Privacy Policy"
    })
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const listPanelBookLeadsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow("")
  }).required()
});

import Joi from "joi";
import { CONTACT_QUERY_LABELS, CONTACT_QUERY_SUBJECTS } from '../models/ContactQuery';

export const submitContactQuerySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    subject: Joi.string().valid(...CONTACT_QUERY_SUBJECTS).required(),
    message: Joi.string().min(10).max(4000).required()
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const listContactQueriesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("pending", "in_progress", "resolved", "completed", "unread", "read"),
    subject: Joi.string(),
    starred: Joi.boolean(),
    archived: Joi.boolean(),
    label: Joi.string().valid(...CONTACT_QUERY_LABELS),
    search: Joi.string().allow("")
  }).required()
});

export const updateContactQueryStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid("pending", "in_progress", "resolved", "completed", "unread", "read").required()
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const updateContactQuerySchema = Joi.object({
  body: Joi.object({
    starred: Joi.boolean(),
    archived: Joi.boolean(),
    labels: Joi.array().items(Joi.string().valid(...CONTACT_QUERY_LABELS)).max(10)
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const paramsIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

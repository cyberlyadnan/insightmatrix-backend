import Joi from "joi";

const emptyObject = Joi.object({}).required();

export const emailStatusSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: emptyObject,
  query: Joi.object({}).optional()
});

export const sendTestEmailSchema = Joi.object({
  body: Joi.object({
    to: Joi.string().email().required().messages({
      "string.email": "Enter a valid recipient email address",
      "any.required": "Recipient email is required"
    })
  }).required(),
  params: emptyObject,
  query: Joi.object({}).optional()
});

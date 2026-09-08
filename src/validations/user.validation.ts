import Joi from "joi";

export const listUsersSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().allow(""),
    status: Joi.string().valid("active", "suspended", "deactivated"),
    role: Joi.string().valid("admin", "user", "survey_manager"),
    verified: Joi.string().valid("true", "false"),
    prescreen: Joi.string().valid("complete", "incomplete"),
    sortBy: Joi.string().valid("createdAt", "fullName", "email", "panelPoints", "status"),
    sortOrder: Joi.string().valid("asc", "desc"),
  }).required(),
});

export const updateUserSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(120),
    role: Joi.string().valid("admin", "user", "survey_manager"),
    status: Joi.string().valid("active", "suspended"),
  })
    .min(1)
    .required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required(),
});

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(120),
    email: Joi.string().email(),
    avatar: Joi.alternatives().try(Joi.string().uri(), Joi.valid(null)),
  })
    .min(1)
    .required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required(),
});

export const changePasswordSchema = Joi.object({
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required(),
});

export const requestDeletionSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().max(500).allow("", null),
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required(),
});

export const panelSurveyIdParamSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ surveyId: Joi.string().hex().length(24).required() }).required(),
  query: Joi.object({}).required(),
});

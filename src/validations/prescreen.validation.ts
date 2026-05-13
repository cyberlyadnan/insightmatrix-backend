import Joi from "joi";

const optionSchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().required(),
  value: Joi.string().required()
});

const questionSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string()
    .valid("short_text", "paragraph", "radio", "checkbox", "dropdown", "number", "email", "date", "yes_no")
    .required(),
  title: Joi.string().min(2).required(),
  description: Joi.string().allow("").default(""),
  helperText: Joi.string().allow("").default(""),
  required: Joi.boolean().default(false),
  placeholder: Joi.string().allow("").default(""),
  defaultValue: Joi.any().allow(null),
  options: Joi.array().items(optionSchema).default([]),
  validation: Joi.object({
    minLength: Joi.number().allow(null),
    maxLength: Joi.number().allow(null),
    minSelections: Joi.number().allow(null),
    maxSelections: Joi.number().allow(null),
    minValue: Joi.number().allow(null),
    maxValue: Joi.number().allow(null),
    pattern: Joi.string().allow(null, "")
  }).default({}),
  randomizeOptions: Joi.boolean().default(false),
  order: Joi.number().required(),
  visibilityConditions: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        operator: Joi.string().valid("equals", "not_equals", "includes", "greater_than", "less_than").required(),
        value: Joi.any().required()
      })
    )
    .default([])
});

const prescreenBodySchema = Joi.object({
  title: Joi.string().required(),
  slug: Joi.string().allow(""),
  description: Joi.string().allow("").default(""),
  status: Joi.string().valid("draft", "published", "archived").default("draft"),
  category: Joi.string().allow(null, ""),
  tags: Joi.array().items(Joi.string()).default([]),
  visibility: Joi.string().valid("private", "internal", "public").default("internal"),
  targetAudience: Joi.object({
    ageGroups: Joi.array().items(Joi.string()).default([]),
    countries: Joi.array().items(Joi.string()).default([]),
    industries: Joi.array().items(Joi.string()).default([]),
    professions: Joi.array().items(Joi.string()).default([]),
    vendors: Joi.array().items(Joi.string()).default([]),
    customSegments: Joi.array().items(Joi.string()).default([])
  }).default({}),
  settings: Joi.object({
    collectEmail: Joi.boolean().default(false),
    allowEditAfterSubmit: Joi.boolean().default(false),
    showProgressBar: Joi.boolean().default(true)
  }).default({}),
  questions: Joi.array().items(questionSchema).default([]),
  isRequiredForPanel: Joi.boolean().default(false)
});

export const listPrescreensSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid("draft", "published", "archived"),
    category: Joi.string(),
    search: Joi.string().allow("")
  }).required()
});

export const createPrescreenSchema = Joi.object({
  body: prescreenBodySchema.required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

export const updatePrescreenSchema = Joi.object({
  body: prescreenBodySchema.min(1).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const paramsIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const reorderQuestionsSchema = Joi.object({
  body: Joi.object({
    questionIds: Joi.array().items(Joi.string().required()).min(1).required()
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required()
});

export const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    slug: Joi.string().allow(""),
    description: Joi.string().allow("")
  }).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required()
});

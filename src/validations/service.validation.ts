import Joi from "joi";

const ctaSchema = Joi.object({
  label: Joi.string().allow("", null),
  link: Joi.string().allow("", null),
});

const categoryGroupSchema = Joi.object({
  title: Joi.string().allow("", null),
  items: Joi.array().items(Joi.string().allow("", null)).default([]),
});

const whyItemSchema = Joi.object({
  title: Joi.string().allow("", null),
  description: Joi.string().allow("", null),
});

const processStepSchema = Joi.object({
  step: Joi.alternatives().try(Joi.number(), Joi.string()).allow("", null),
  title: Joi.string().allow("", null),
  description: Joi.string().allow("", null),
});

const faqSchema = Joi.object({
  question: Joi.string().allow("", null),
  answer: Joi.string().allow("", null),
});

const internalLinkSchema = Joi.object({
  title: Joi.string().allow("", null),
  url: Joi.string().allow("", null),
});

const serviceBody = {
  slug: Joi.string().trim().lowercase().min(2).max(120).required(),
  service_name: Joi.string().trim().min(2).max(300).required(),
  category: Joi.string().trim().default("core"),
  status: Joi.string().valid("published", "draft").default("published"),
  order: Joi.number().integer().default(0),
  icon: Joi.string().trim().allow("", null).default("Layers"),
  featured: Joi.boolean().default(false),
  seo: Joi.object({
    page_title: Joi.string().allow("", null),
    meta_description: Joi.string().allow("", null),
    url: Joi.string().allow("", null),
    keywords: Joi.array().items(Joi.string()).default([]),
    canonicalUrl: Joi.string().allow("", null),
    ogImage: Joi.string().allow("", null),
  }).default({}),
  hero: Joi.object({
    title: Joi.string().allow("", null),
    subtitle: Joi.string().allow("", null),
    ctas: Joi.array().items(ctaSchema).default([]),
  }).default({}),
  introduction: Joi.object({
    title: Joi.string().allow("", null),
    paragraphs: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  what_we_offer: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    items: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  target_audiences: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    categories: Joi.array().items(categoryGroupSchema).default([]),
  }).default({}),
  research_types: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    items: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  quality_assurance: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    quality_measures: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  global_coverage: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    regions: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  why_insightmatrix: Joi.object({
    title: Joi.string().allow("", null),
    items: Joi.array().items(whyItemSchema).default([]),
  }).default({}),
  process: Joi.object({
    title: Joi.string().allow("", null),
    steps: Joi.array().items(processStepSchema).default([]),
  }).default({}),
  why_clients_trust_us: Joi.object({
    title: Joi.string().allow("", null),
    items: Joi.array().items(Joi.string()).default([]),
  }).default({}),
  faqs: Joi.object({
    title: Joi.string().allow("", null),
    items: Joi.array().items(faqSchema).default([]),
  }).default({}),
  final_cta: Joi.object({
    title: Joi.string().allow("", null),
    description: Joi.string().allow("", null),
    buttons: Joi.array().items(ctaSchema).default([]),
  }).default({}),
  internal_links: Joi.array().items(internalLinkSchema).default([]),
};

export const listServicesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(500).default(50),
    search: Joi.string().allow(""),
    category: Joi.string().allow(""),
    status: Joi.string().valid("published", "draft", "all"),
    featured: Joi.boolean(),
    sortBy: Joi.string().valid("order", "service_name", "createdAt", "status", "category"),
    sortOrder: Joi.string().valid("asc", "desc"),
  }).required(),
});

export const createServiceSchema = Joi.object({
  body: Joi.object(serviceBody).required(),
  params: Joi.object({}).required(),
  query: Joi.object({}).required(),
});

export const updateServiceSchema = Joi.object({
  body: Joi.object(serviceBody).min(1).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required(),
});

export const toggleServiceStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid("published", "draft").required(),
  }).required(),
  params: Joi.object({ id: Joi.string().required() }).required(),
  query: Joi.object({}).required(),
});

export const serviceParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({ slugOrId: Joi.string().required() }).required(),
  query: Joi.object({}).required(),
});

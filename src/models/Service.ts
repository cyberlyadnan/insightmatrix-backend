import mongoose from "mongoose";

const serviceCtaSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const serviceCategoryGroupSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    items: [{ type: String, trim: true }],
  },
  { _id: false }
);

const serviceWhyItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const serviceProcessStepSchema = new mongoose.Schema(
  {
    step: { type: mongoose.Schema.Types.Mixed, default: "" },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const serviceFaqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: "" },
    answer: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const serviceInternalLinkSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    service_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "core",
      index: true,
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "published",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    icon: {
      type: String,
      trim: true,
      default: "Layers",
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    seo: {
      page_title: { type: String, trim: true, default: "" },
      meta_description: { type: String, trim: true, default: "" },
      url: { type: String, trim: true, default: "" },
      keywords: [{ type: String, trim: true }],
      canonicalUrl: { type: String, trim: true, default: "" },
      ogImage: { type: String, trim: true, default: "" },
    },
    hero: {
      title: { type: String, trim: true, default: "" },
      subtitle: { type: String, trim: true, default: "" },
      ctas: [serviceCtaSchema],
    },
    introduction: {
      title: { type: String, trim: true, default: "" },
      paragraphs: [{ type: String, trim: true }],
    },
    what_we_offer: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      items: [{ type: String, trim: true }],
    },
    target_audiences: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      categories: [serviceCategoryGroupSchema],
    },
    research_types: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      items: [{ type: String, trim: true }],
    },
    quality_assurance: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      quality_measures: [{ type: String, trim: true }],
    },
    global_coverage: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      regions: [{ type: String, trim: true }],
    },
    why_insightmatrix: {
      title: { type: String, trim: true, default: "" },
      items: [serviceWhyItemSchema],
    },
    process: {
      title: { type: String, trim: true, default: "" },
      steps: [serviceProcessStepSchema],
    },
    why_clients_trust_us: {
      title: { type: String, trim: true, default: "" },
      items: [{ type: String, trim: true }],
    },
    faqs: {
      title: { type: String, trim: true, default: "" },
      items: [serviceFaqSchema],
    },
    final_cta: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      buttons: [serviceCtaSchema],
    },
    internal_links: [serviceInternalLinkSchema],
  },
  { timestamps: true }
);

serviceSchema.index({
  service_name: "text",
  "seo.page_title": "text",
  "seo.meta_description": "text",
  "hero.title": "text",
  "hero.subtitle": "text",
});

export const Service = mongoose.model("Service", serviceSchema);

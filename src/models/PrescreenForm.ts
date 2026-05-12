import mongoose from "mongoose";

export const PRESCREEN_STATUSES = ["draft", "published", "archived"] as const;
export const PRESCREEN_VISIBILITIES = ["private", "internal", "public"] as const;
export const PRESCREEN_QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "radio",
  "checkbox",
  "dropdown",
  "number",
  "email",
  "date",
  "yes_no"
] as const;

const validationRuleSchema = new mongoose.Schema(
  {
    minLength: { type: Number, default: null },
    maxLength: { type: Number, default: null },
    minSelections: { type: Number, default: null },
    maxSelections: { type: Number, default: null },
    minValue: { type: Number, default: null },
    maxValue: { type: Number, default: null },
    pattern: { type: String, default: null }
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const visibilityConditionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    operator: { type: String, enum: ["equals", "not_equals", "includes", "greater_than", "less_than"], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: PRESCREEN_QUESTION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    helperText: { type: String, default: "" },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
    options: { type: [optionSchema], default: [] },
    validation: { type: validationRuleSchema, default: () => ({}) },
    randomizeOptions: { type: Boolean, default: false },
    order: { type: Number, required: true },
    visibilityConditions: { type: [visibilityConditionSchema], default: [] }
  },
  { _id: false }
);

const targetAudienceSchema = new mongoose.Schema(
  {
    ageGroups: { type: [String], default: [] },
    countries: { type: [String], default: [] },
    industries: { type: [String], default: [] },
    professions: { type: [String], default: [] },
    vendors: { type: [String], default: [] },
    customSegments: { type: [String], default: [] }
  },
  { _id: false }
);

const prescreenFormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    status: { type: String, enum: PRESCREEN_STATUSES, default: "draft", index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "PrescreenCategory", default: null, index: true },
    tags: { type: [String], default: [] },
    targetAudience: { type: targetAudienceSchema, default: () => ({}) },
    visibility: { type: String, enum: PRESCREEN_VISIBILITIES, default: "internal" },
    settings: {
      collectEmail: { type: Boolean, default: false },
      allowEditAfterSubmit: { type: Boolean, default: false },
      showProgressBar: { type: Boolean, default: true }
    },
    questions: { type: [questionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

prescreenFormSchema.index({ title: "text", description: "text", tags: "text" });

export const PrescreenForm = mongoose.model("PrescreenForm", prescreenFormSchema);

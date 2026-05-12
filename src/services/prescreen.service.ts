import { ApiError } from '../utils/ApiError';
import { PrescreenForm } from '../models/PrescreenForm';
import { PrescreenCategory } from '../models/PrescreenCategory';
import { paginatePrescreens, type PrescreenListQuery } from '../utils/query/prescreen-query';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || `prescreen-${Date.now()}`;
  let cursor = 1;
  while (true) {
    const existing = await PrescreenForm.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!existing) return slug;
    cursor += 1;
    slug = `${slugify(base)}-${cursor}`;
  }
}

function makeTemplateQuestions(seed: string) {
  return [
    {
      id: `${seed}_q1`,
      type: "radio",
      title: "What is your current employment status?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        { id: `${seed}_q1_o1`, label: "Full-time", value: "full_time" },
        { id: `${seed}_q1_o2`, label: "Part-time", value: "part_time" },
        { id: `${seed}_q1_o3`, label: "Student", value: "student" },
        { id: `${seed}_q1_o4`, label: "Self-employed", value: "self_employed" }
      ],
      validation: {},
      randomizeOptions: false,
      order: 0,
      visibilityConditions: []
    },
    {
      id: `${seed}_q2`,
      type: "number",
      title: "What is your age?",
      description: "",
      helperText: "",
      required: true,
      placeholder: "Enter age",
      defaultValue: null,
      options: [],
      validation: { minValue: 16, maxValue: 99 },
      randomizeOptions: false,
      order: 1,
      visibilityConditions: []
    },
    {
      id: `${seed}_q3`,
      type: "dropdown",
      title: "Select your country",
      description: "",
      helperText: "",
      required: true,
      placeholder: "",
      defaultValue: null,
      options: [
        { id: `${seed}_q3_o1`, label: "United States", value: "us" },
        { id: `${seed}_q3_o2`, label: "India", value: "in" },
        { id: `${seed}_q3_o3`, label: "United Kingdom", value: "uk" },
        { id: `${seed}_q3_o4`, label: "Other", value: "other" }
      ],
      validation: {},
      randomizeOptions: false,
      order: 2,
      visibilityConditions: []
    },
    {
      id: `${seed}_q4`,
      type: "checkbox",
      title: "Which areas are you familiar with?",
      description: "",
      helperText: "Select all that apply",
      required: false,
      placeholder: "",
      defaultValue: null,
      options: [
        { id: `${seed}_q4_o1`, label: "Technology", value: "technology" },
        { id: `${seed}_q4_o2`, label: "Healthcare", value: "healthcare" },
        { id: `${seed}_q4_o3`, label: "Education", value: "education" },
        { id: `${seed}_q4_o4`, label: "Finance", value: "finance" }
      ],
      validation: { minSelections: 1, maxSelections: 3 },
      randomizeOptions: false,
      order: 3,
      visibilityConditions: []
    }
  ];
}

export const prescreenService = {
  list: (query: PrescreenListQuery) => paginatePrescreens(query),
  getById: async (id: string) => {
    const form = await PrescreenForm.findById(id).populate("category", "name slug");
    if (!form) throw new ApiError(404, "Prescreen form not found");
    return form;
  },
  create: async (payload: Record<string, unknown>) => {
    const slug = await ensureUniqueSlug(String(payload.slug || payload.title || "prescreen"));
    return PrescreenForm.create({ ...payload, slug });
  },
  updateById: async (id: string, payload: Record<string, unknown>) => {
    const nextPayload = { ...payload };
    if (payload.slug || payload.title) {
      nextPayload.slug = await ensureUniqueSlug(String(payload.slug || payload.title), id);
    }
    const form = await PrescreenForm.findByIdAndUpdate(id, nextPayload, { new: true });
    if (!form) throw new ApiError(404, "Prescreen form not found");
    return form;
  },
  deleteById: async (id: string) => {
    const form = await PrescreenForm.findByIdAndDelete(id);
    if (!form) throw new ApiError(404, "Prescreen form not found");
  },
  setStatus: async (id: string, status: "draft" | "published") => {
    const form = await PrescreenForm.findByIdAndUpdate(id, { status }, { new: true });
    if (!form) throw new ApiError(404, "Prescreen form not found");
    return form;
  },
  duplicate: async (id: string, createdBy: string) => {
    const form = await PrescreenForm.findById(id);
    if (!form) throw new ApiError(404, "Prescreen form not found");
    const obj = form.toObject();
    delete (obj as { _id?: unknown })._id;
    const title = `${obj.title} (Copy)`;
    const slug = await ensureUniqueSlug(title);
    return PrescreenForm.create({
      ...obj,
      title,
      slug,
      status: "draft",
      createdBy
    });
  },
  reorderQuestions: async (id: string, questionIds: string[]) => {
    const form = await PrescreenForm.findById(id);
    if (!form) throw new ApiError(404, "Prescreen form not found");
    const map = new Map(form.questions.map((q) => [q.id, q]));
    if (questionIds.length !== form.questions.length) {
      throw new ApiError(400, "Invalid reorder payload");
    }
    const reordered = questionIds.map((qId, idx) => {
      const question = map.get(qId);
      if (!question) throw new ApiError(400, "Invalid question id in reorder");
      const next = { ...(question.toObject() as Record<string, unknown>), order: idx };
      return next;
    });
    form.questions = reordered as typeof form.questions;
    await form.save();
    return form;
  },
  listCategories: async () => PrescreenCategory.find({ active: true }).sort({ name: 1 }),
  createCategory: async (payload: { name: string; slug?: string; description?: string }) => {
    const slug = slugify(payload.slug || payload.name);
    const exists = await PrescreenCategory.findOne({ slug });
    if (exists) throw new ApiError(409, "Category already exists");
    return PrescreenCategory.create({ name: payload.name, description: payload.description ?? "", slug });
  },
  seedDefaultPrescreens: async (createdBy: string) => {
    const templates = [
      {
        title: "General Prescreen",
        slug: "general-prescreen",
        description: "Baseline qualification form for all participants.",
        tags: ["general", "baseline"],
        targetAudience: {}
      },
      {
        title: "18-24 Age Group Prescreen",
        slug: "18-24-age-group-prescreen",
        description: "Prescreen tailored for young adult respondents.",
        tags: ["age-group", "18-24"],
        targetAudience: { ageGroups: ["18-24"] }
      },
      {
        title: "IT Professionals Prescreen",
        slug: "it-professionals-prescreen",
        description: "Prescreen for technology and IT professionals.",
        tags: ["it", "technology", "professionals"],
        targetAudience: { industries: ["Information Technology"], professions: ["Software Engineer", "IT Specialist"] }
      },
      {
        title: "Students Prescreen",
        slug: "students-prescreen",
        description: "Qualification form targeting student respondents.",
        tags: ["students", "education"],
        targetAudience: { professions: ["Student"] }
      },
      {
        title: "USA Users Prescreen",
        slug: "usa-users-prescreen",
        description: "Prescreen specifically for users based in the USA.",
        tags: ["usa", "country"],
        targetAudience: { countries: ["US"] }
      }
    ];

    const operations = templates.map((template, idx) =>
      PrescreenForm.findOneAndUpdate(
        { slug: template.slug },
        {
          $set: {
            title: template.title,
            description: template.description,
            status: "draft",
            visibility: "internal",
            tags: template.tags,
            targetAudience: {
              ageGroups: [],
              countries: [],
              industries: [],
              professions: [],
              vendors: [],
              customSegments: [],
              ...template.targetAudience
            },
            settings: {
              collectEmail: false,
              allowEditAfterSubmit: false,
              showProgressBar: true
            },
            questions: makeTemplateQuestions(`seed_${idx + 1}`),
            createdBy
          },
          $setOnInsert: { slug: template.slug }
        },
        { new: true, upsert: true }
      )
    );

    const forms = await Promise.all(operations);
    return forms;
  }
};

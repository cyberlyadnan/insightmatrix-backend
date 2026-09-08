import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { PrescreenForm } from '../models/PrescreenForm';
import { PrescreenCategory } from '../models/PrescreenCategory';
import { PrescreenSubmission } from '../models/PrescreenSubmission';
import { paginatePrescreens, type PrescreenListQuery } from '../utils/query/prescreen-query';
import { clearOtherRequiredPanelFlags } from './panel-prescreen.service';
import { buildMemberPanelQuestions } from '../utils/member-panel-questions';
import {
  isLockedMemberPanelQuestionId,
  lockedQuestionLabel
} from '../utils/member-panel-locked';

const PANEL_MEMBER_PROFILE_SLUG = "panel-member-profile";

type QuestionLike = {
  id?: string;
  title?: string;
  required?: boolean;
  isLocked?: boolean;
  [key: string]: unknown;
};

function enforceLockedPanelQuestions(
  existingQuestions: QuestionLike[],
  incomingQuestions: QuestionLike[] | undefined,
  opts: { isRequiredForPanel: boolean; slug?: string }
) {
  const protect =
    opts.isRequiredForPanel || opts.slug === PANEL_MEMBER_PROFILE_SLUG;
  if (!protect || !incomingQuestions) return incomingQuestions;

  const existingLocked = existingQuestions.filter(
    (q) => Boolean(q.isLocked) || isLockedMemberPanelQuestionId(String(q.id || ""))
  );

  for (const locked of existingLocked) {
    const id = String(locked.id || "");
    if (!incomingQuestions.some((q) => String(q.id) === id)) {
      throw new ApiError(
        400,
        `Cannot remove required matching question “${locked.title || lockedQuestionLabel(id)}”. These fields power survey eligibility.`
      );
    }
  }

  // Also ensure canonical locked suffixes always remain if this is the panel profile
  if (opts.slug === PANEL_MEMBER_PROFILE_SLUG || opts.isRequiredForPanel) {
    const missingCanonical = [
      "_q_age",
      "_q_gender",
      "_q_country",
      "_q_employment",
      "_q_industry",
      "_q_devices"
    ].filter((suffix) => !incomingQuestions.some((q) => String(q.id || "").endsWith(suffix)));
    if (missingCanonical.length > 0) {
      throw new ApiError(
        400,
        `Panel profile must keep core matching fields: ${missingCanonical
          .map((s) => lockedQuestionLabel(`x${s}`))
          .join(", ")}.`
      );
    }
  }

  return incomingQuestions.map((q) => {
    const id = String(q.id || "");
    const locked = Boolean(q.isLocked) || isLockedMemberPanelQuestionId(id);
    return {
      ...q,
      isLocked: locked,
      required: locked ? true : Boolean(q.required)
    };
  });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDurationMs(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m ${rs}s`;
  }
  if (m > 0) return `${m}m ${rs}s`;
  return `${rs}s`;
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
    const form = await PrescreenForm.create({ ...payload, slug });
    if (form.isRequiredForPanel) {
      await clearOtherRequiredPanelFlags(String(form._id));
    }
    return form;
  },
  updateById: async (id: string, payload: Record<string, unknown>) => {
    const existing = await PrescreenForm.findById(id);
    if (!existing) throw new ApiError(404, "Prescreen form not found");

    if (
      existing.slug === PANEL_MEMBER_PROFILE_SLUG &&
      payload.isRequiredForPanel === false
    ) {
      throw new ApiError(
        400,
        "The panel member profile must stay required for survey matching."
      );
    }

    if (payload.isRequiredForPanel === true) {
      await clearOtherRequiredPanelFlags(id);
    }

    const nextPayload = { ...payload };
    if (payload.slug || payload.title) {
      nextPayload.slug = await ensureUniqueSlug(String(payload.slug || payload.title), id);
    }

    if (Array.isArray(payload.questions)) {
      nextPayload.questions = enforceLockedPanelQuestions(
        existing.questions as unknown as QuestionLike[],
        payload.questions as QuestionLike[],
        {
          isRequiredForPanel:
            payload.isRequiredForPanel === true ||
            (payload.isRequiredForPanel !== false && existing.isRequiredForPanel),
          slug: String(nextPayload.slug || existing.slug)
        }
      );
    }

    const form = await PrescreenForm.findByIdAndUpdate(id, nextPayload, { new: true });
    if (!form) throw new ApiError(404, "Prescreen form not found");
    if (form.isRequiredForPanel) {
      await clearOtherRequiredPanelFlags(String(form._id));
    }
    return form;
  },
  /** Make this prescreen the sole required-for-panel form (clears others; publishes if draft). */
  setRequiredForPanel: async (id: string) => {
    const form = await PrescreenForm.findById(id);
    if (!form) throw new ApiError(404, "Prescreen form not found");
    if (form.status === "archived") {
      throw new ApiError(400, "Archived prescreens cannot be set as required.");
    }
    await clearOtherRequiredPanelFlags(id);
    form.isRequiredForPanel = true;
    if (form.status !== "published") {
      form.status = "published";
    }
    await form.save();
    return form;
  },
  deleteById: async (id: string) => {
    const form = await PrescreenForm.findById(id);
    if (!form) throw new ApiError(404, "Prescreen form not found");
    if (form.isRequiredForPanel || form.slug === PANEL_MEMBER_PROFILE_SLUG) {
      throw new ApiError(
        400,
        "Cannot delete the required panel member profile. It is required to match and distribute surveys."
      );
    }
    await PrescreenForm.findByIdAndDelete(id);
  },
  setStatus: async (id: string, status: "draft" | "published") => {
    const form = await PrescreenForm.findByIdAndUpdate(id, { status }, { new: true });
    if (!form) throw new ApiError(404, "Prescreen form not found");
    if (status === "published" && form.isRequiredForPanel) {
      await clearOtherRequiredPanelFlags(String(form._id));
    }
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
      isRequiredForPanel: false,
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
  },
  /**
   * Upserts the canonical published panel profile prescreen (required for member surveys).
   */
  seedPanelMemberPrescreen: async (createdBy: string) => {
    const slug = PANEL_MEMBER_PROFILE_SLUG;
    const seed = "pm_prof_v1";
    const questions = buildMemberPanelQuestions(seed);
    const form = await PrescreenForm.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: "Member profile & demographics",
          description:
            "Your demographic profile is used to match you with relevant public surveys. Core fields (age, gender, country, employment, industry, devices) are required for eligibility and cannot be removed by admins.",
          status: "published",
          visibility: "public",
          isRequiredForPanel: true,
          tags: ["panel", "required", "demographics", "profiling", "locked-core"],
          targetAudience: {
            ageGroups: [],
            countries: [],
            industries: [],
            professions: [],
            vendors: [],
            customSegments: []
          },
          settings: {
            collectEmail: false,
            allowEditAfterSubmit: true,
            showProgressBar: true
          },
          questions,
          createdBy
        },
        $setOnInsert: { slug }
      },
      { new: true, upsert: true }
    );
    if (!form) throw new ApiError(500, "Could not seed panel prescreen");
    await clearOtherRequiredPanelFlags(String(form._id));
    return form;
  },

  /** Submission row counts per form id (for admin list). */
  getSubmissionCountsByFormIds: async (formIds: string[]) => {
    const map = new Map<string, number>();
    const valid = formIds.filter((id) => Types.ObjectId.isValid(id));
    if (!valid.length) return map;
    const oids = valid.map((id) => new Types.ObjectId(id));
    const rows = await PrescreenSubmission.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { formId: { $in: oids } } },
      { $group: { _id: "$formId", count: { $sum: 1 } } }
    ]);
    for (const r of rows) {
      map.set(String(r._id), r.count);
    }
    return map;
  },

  /** Aggregated submission analytics for a single prescreen form (admin). */
  getSubmissionStats: async (formId: string) => {
    if (!Types.ObjectId.isValid(formId)) throw new ApiError(400, "Invalid prescreen id");
    const form = await PrescreenForm.findById(formId).select("_id");
    if (!form) throw new ApiError(404, "Prescreen form not found");
    const oid = new Types.ObjectId(formId);

    const [totalSubmissions, distinctUserIds, durAgg, bounds] = await Promise.all([
      PrescreenSubmission.countDocuments({ formId: oid }),
      PrescreenSubmission.distinct("userId", { formId: oid }),
      PrescreenSubmission.aggregate<{ avgMs?: number; withDur?: number }>([
        {
          $match: {
            formId: oid,
            durationMs: { $type: "number", $gte: 0 }
          }
        },
        { $group: { _id: null, avgMs: { $avg: "$durationMs" }, withDur: { $sum: 1 } } }
      ]),
      PrescreenSubmission.aggregate<{ firstAt?: Date; lastAt?: Date }>([
        { $match: { formId: oid } },
        {
          $group: {
            _id: null,
            firstAt: { $min: "$submittedAt" },
            lastAt: { $max: "$submittedAt" }
          }
        }
      ])
    ]);

    const drow = durAgg[0];
    const avgMs = drow?.avgMs != null && Number.isFinite(drow.avgMs) ? Math.round(drow.avgMs) : null;
    const submissionsWithDuration = drow?.withDur ?? 0;
    const brow = bounds[0];

    return {
      totalSubmissions,
      uniqueSubmitters: distinctUserIds.length,
      submissionsWithDuration,
      averageDurationMs: avgMs,
      averageDurationFormatted: avgMs != null ? formatDurationMs(avgMs) : null,
      firstSubmittedAt: brow?.firstAt ?? null,
      lastSubmittedAt: brow?.lastAt ?? null
    };
  }
};

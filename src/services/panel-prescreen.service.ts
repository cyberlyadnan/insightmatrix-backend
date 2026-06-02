import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { ROLES } from "../constants/roles";
import { PrescreenForm } from "../models/PrescreenForm";
import { PrescreenSubmission } from "../models/PrescreenSubmission";
import { User } from "../models/User";
import { toPrescreenDto } from "../utils/prescreen.dto";

type QuestionPlain = {
  id: string;
  type: string;
  title: string;
  required: boolean;
  options?: { value: string }[];
  validation?: {
    minValue?: number | null;
    maxValue?: number | null;
    minSelections?: number | null;
    maxSelections?: number | null;
    minLength?: number | null;
    maxLength?: number | null;
  };
};

export async function clearOtherRequiredPanelFlags(exceptFormId: string) {
  await PrescreenForm.updateMany(
    { _id: { $ne: new Types.ObjectId(exceptFormId) }, isRequiredForPanel: true },
    { $set: { isRequiredForPanel: false } }
  );
}

export async function getPanelPrescreenBundle(userId: string, role: string | undefined) {
  if (!userId || userId === "undefined" || !Types.ObjectId.isValid(userId)) {
    return {
      needsCompletion: false,
      notConfigured: false,
      form: null as ReturnType<typeof toPrescreenDto> | null
    };
  }

  if (role === ROLES.ADMIN) {
    return {
      needsCompletion: false,
      notConfigured: false,
      form: null as ReturnType<typeof toPrescreenDto> | null
    };
  }

  const form = await PrescreenForm.findOne({ status: "published", isRequiredForPanel: true });
  if (!form) {
    return { needsCompletion: false, notConfigured: true, form: null };
  }

  const user = await User.findById(userId).select("panelPrescreenCompletedAt panelPrescreenFormId");
  if (!user) throw new ApiError(401, "Unauthorized");

  const fid = user.panelPrescreenFormId;
  const completed = user.panelPrescreenCompletedAt;
  if (fid && completed && String(fid) === String(form._id)) {
    return { needsCompletion: false, notConfigured: false, form: null };
  }

  return {
    needsCompletion: true,
    notConfigured: false,
    form: toPrescreenDto(form)
  };
}

function optionValues(q: QuestionPlain): Set<string> {
  return new Set((q.options ?? []).map((o) => o.value));
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

function validateAndNormalizeQuestion(
  q: QuestionPlain,
  raw: unknown
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (q.type === "checkbox") {
    if (raw === undefined || raw === null) {
      return q.required ? { ok: false, message: q.title } : { ok: true, value: [] };
    }
    if (!Array.isArray(raw)) {
      return { ok: false, message: q.title };
    }
    const vals = raw.map((x) => String(x));
    const allowed = optionValues(q);
    for (const v of vals) {
      if (!allowed.has(v)) return { ok: false, message: `Invalid option for “${q.title}”` };
    }
    const minS = q.validation?.minSelections ?? null;
    const maxS = q.validation?.maxSelections ?? null;
    if (q.required && vals.length === 0) return { ok: false, message: q.title };
    if (minS != null && vals.length < minS) return { ok: false, message: q.title };
    if (maxS != null && vals.length > maxS) return { ok: false, message: q.title };
    return { ok: true, value: vals };
  }

  if (q.type === "radio" || q.type === "dropdown") {
    if (isEmpty(raw)) {
      return q.required ? { ok: false, message: q.title } : { ok: true, value: "" };
    }
    const s = String(raw);
    if (!optionValues(q).has(s)) return { ok: false, message: `Invalid choice for “${q.title}”` };
    return { ok: true, value: s };
  }

  if (q.type === "yes_no") {
    if (raw === undefined || raw === null || raw === "") {
      return q.required ? { ok: false, message: q.title } : { ok: true, value: null };
    }
    if (typeof raw === "boolean") return { ok: true, value: raw };
    const s = String(raw).toLowerCase();
    if (s === "yes" || s === "true" || s === "1") return { ok: true, value: true };
    if (s === "no" || s === "false" || s === "0") return { ok: true, value: false };
    return { ok: false, message: q.title };
  }

  if (q.type === "number") {
    if (raw === undefined || raw === null || raw === "") {
      return q.required ? { ok: false, message: q.title } : { ok: true, value: null };
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(n)) return { ok: false, message: q.title };
    const minV = q.validation?.minValue ?? null;
    const maxV = q.validation?.maxValue ?? null;
    if (minV != null && n < minV) return { ok: false, message: q.title };
    if (maxV != null && n > maxV) return { ok: false, message: q.title };
    return { ok: true, value: n };
  }

  if (q.type === "short_text" || q.type === "paragraph" || q.type === "email") {
    const s = raw === undefined || raw === null ? "" : String(raw).trim();
    if (q.required && !s) return { ok: false, message: q.title };
    const minL = q.validation?.minLength ?? null;
    const maxL = q.validation?.maxLength ?? null;
    if (minL != null && s.length < minL) return { ok: false, message: q.title };
    if (maxL != null && s.length > maxL) return { ok: false, message: q.title };
    return { ok: true, value: s };
  }

  if (q.type === "date") {
    const s = raw === undefined || raw === null ? "" : String(raw).trim();
    if (q.required && !s) return { ok: false, message: q.title };
    return { ok: true, value: s };
  }

  return { ok: true, value: raw };
}

export async function submitPanelPrescreen(
  userId: string,
  answers: Record<string, unknown>,
  durationMs?: number | null
) {
  const form = await PrescreenForm.findOne({ status: "published", isRequiredForPanel: true });
  if (!form) throw new ApiError(400, "Required panel prescreen is not configured.");

  const normalized: Record<string, unknown> = {};
  const missing: string[] = [];

  const sorted = [...form.questions].sort((a, b) => a.order - b.order);
  for (const qDoc of sorted) {
    const q =
      typeof qDoc === "object" &&
      qDoc !== null &&
      "toObject" in qDoc &&
      typeof (qDoc as { toObject?: () => unknown }).toObject === "function"
        ? ((qDoc as { toObject: () => QuestionPlain }).toObject() as QuestionPlain)
        : ({ ...(qDoc as object) } as QuestionPlain);
    const raw = answers[q.id];
    const result = validateAndNormalizeQuestion(q, raw);
    if (!result.ok) {
      missing.push(result.message);
      continue;
    }
    normalized[q.id] = result.value;
  }

  if (missing.length > 0) {
    throw new ApiError(400, `Please complete all required fields: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`);
  }

  const dm =
    typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0
      ? Math.min(Math.floor(durationMs), 1000 * 60 * 60 * 24)
      : null;

  const userOid = new Types.ObjectId(userId);
  await PrescreenSubmission.findOneAndUpdate(
    { userId: userOid, formId: form._id },
    {
      $set: {
        answers: normalized,
        durationMs: dm,
        submittedAt: new Date()
      },
      $setOnInsert: { userId: userOid, formId: form._id }
    },
    { upsert: true }
  );

  await User.findByIdAndUpdate(userId, {
    panelPrescreenCompletedAt: new Date(),
    panelPrescreenFormId: form._id
  });

  return { submitted: true };
}

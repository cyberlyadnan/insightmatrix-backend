export type QuestionPlain = {
  id: string;
  type: string;
  title: string;
  order: number;
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

function optionValues(q: QuestionPlain): Set<string> {
  return new Set((q.options ?? []).map((o) => o.value));
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

export function validateAndNormalizeQuestion(
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

export function toQuestionPlain(qDoc: unknown): QuestionPlain {
  if (
    typeof qDoc === "object" &&
    qDoc !== null &&
    "toObject" in qDoc &&
    typeof (qDoc as { toObject?: () => unknown }).toObject === "function"
  ) {
    return (qDoc as { toObject: () => QuestionPlain }).toObject() as QuestionPlain;
  }
  return { ...(qDoc as object) } as QuestionPlain;
}

export function normalizePrescreenAnswers(
  questions: unknown[],
  answers: Record<string, unknown>
): { normalized: Record<string, unknown>; missing: string[] } {
  const normalized: Record<string, unknown> = {};
  const missing: string[] = [];
  const sorted = [...questions].sort(
    (a, b) => toQuestionPlain(a).order - toQuestionPlain(b).order
  );

  for (const qDoc of sorted) {
    const q = toQuestionPlain(qDoc);
    const result = validateAndNormalizeQuestion(q, answers[q.id]);
    if (!result.ok) {
      missing.push(result.message);
      continue;
    }
    normalized[q.id] = result.value;
  }

  return { normalized, missing };
}

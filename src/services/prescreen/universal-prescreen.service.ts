import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PrescreenForm } from "../../models/PrescreenForm";
import { PrescreenSubmission } from "../../models/PrescreenSubmission";
import { toPrescreenDto } from "../../utils/prescreen.dto";
import { normalizePrescreenAnswers } from "./prescreen-validation";

/** Published form used for all routing respondents (panel + vendor) */
export async function getUniversalRoutingPrescreenForm() {
  const form = await PrescreenForm.findOne({ status: "published", isRequiredForPanel: true });
  if (!form) {
    return { configured: false as const, form: null };
  }
  return { configured: true as const, form, formDto: toPrescreenDto(form) };
}

export async function validateUniversalPrescreenAnswers(answers: Record<string, unknown>) {
  const { configured, form } = await getUniversalRoutingPrescreenForm();
  if (!configured || !form) {
    throw new ApiError(400, "Prescreen is not configured for routing");
  }
  const { normalized, missing } = normalizePrescreenAnswers(form.questions, answers);
  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Please complete all required fields: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`
    );
  }
  return { form, normalized };
}

export async function persistRoutingPrescreenSubmission(input: {
  profileId: Types.ObjectId;
  formId: Types.ObjectId;
  answers: Record<string, unknown>;
  durationMs?: number | null;
  respondentOwnerType: "internal" | "vendor";
  vendorRespondentToid?: string;
  userId?: Types.ObjectId | null;
}) {
  const dm =
    typeof input.durationMs === "number" && Number.isFinite(input.durationMs) && input.durationMs >= 0
      ? Math.min(Math.floor(input.durationMs), 1000 * 60 * 60 * 24)
      : null;

  await PrescreenSubmission.create({
    userId: input.userId ?? null,
    respondentProfileId: input.profileId,
    respondentOwnerType: input.respondentOwnerType,
    vendorRespondentToid: String(input.vendorRespondentToid ?? "").slice(0, 500),
    formId: input.formId,
    answers: input.answers,
    durationMs: dm,
    submittedAt: new Date()
  });
}

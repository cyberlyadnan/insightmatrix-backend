import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PrescreenForm } from "../../models/PrescreenForm";
import { PrescreenSubmission } from "../../models/PrescreenSubmission";
import { toPrescreenDto } from "../../utils/prescreen.dto";
import { normalizePrescreenAnswers } from "./prescreen-validation";
import { findPublishedRequiredPanelPrescreen } from "../panel-prescreen.service";

/** Published form used for all routing respondents (panel + vendor) */
export async function getUniversalRoutingPrescreenForm() {
  const form = await findPublishedRequiredPanelPrescreen();
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

  const payload = {
    respondentProfileId: input.profileId,
    respondentOwnerType: input.respondentOwnerType,
    vendorRespondentToid: String(input.vendorRespondentToid ?? "").slice(0, 500),
    answers: input.answers,
    durationMs: dm,
    submittedAt: new Date()
  };

  // Members may already have submitted this form via dashboard panel prescreen (unique userId+formId).
  if (input.userId) {
    await PrescreenSubmission.findOneAndUpdate(
      { userId: input.userId, formId: input.formId },
      {
        $set: payload,
        $setOnInsert: { userId: input.userId, formId: input.formId }
      },
      { upsert: true }
    );
    return;
  }

  try {
    // Filter keys (respondentProfileId, formId) are applied on insert; do not repeat them in $setOnInsert.
    await PrescreenSubmission.findOneAndUpdate(
      { respondentProfileId: input.profileId, formId: input.formId },
      {
        $set: payload,
        $unset: { userId: "" }
      },
      { upsert: true }
    );
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 11000) throw err;
    // Legacy DB index may still block — profile prescreen answers remain the source of truth.
  }
}

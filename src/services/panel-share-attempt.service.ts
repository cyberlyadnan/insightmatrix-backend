import { Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { PanelSurveyAttempt } from "../models/PanelSurveyAttempt";
import { validatePanelSurveyForRouting } from "./routing/routing-gateway.service";
import { tokenGeneratorService } from "./token/token-generator.service";
import { surveyRespondentProfileService } from "./survey-respondent-profile/survey-respondent-profile.service";

const PLACEHOLDER_RESPONDENT_ID = "RESPONDENT_ID";

export function normalizeExternalParticipantRef(value: unknown): string {
  const ref = String(value ?? "").trim();
  if (!ref || ref === PLACEHOLDER_RESPONDENT_ID) return "";
  return ref.slice(0, 200);
}

/** Attach team tracking id to an existing share-link attempt + respondent profile */
export async function attachExternalParticipantRefToAttempt(input: {
  surveyId: string;
  attemptToken: string;
  externalParticipantRef: string;
}) {
  const ref = normalizeExternalParticipantRef(input.externalParticipantRef);
  if (!ref) {
    throw new ApiError(400, "Tracking id is required");
  }

  const validated = await validatePanelSurveyForRouting(input.surveyId);
  const token = input.attemptToken.trim();
  if (!token) throw new ApiError(400, "Attempt token is required");

  const attempt = await PanelSurveyAttempt.findOne({
    token,
    panelSurveyId: validated.surveyId
  });
  if (!attempt) throw new ApiError(404, "Invalid or expired survey attempt");

  if (!String(attempt.externalParticipantRef ?? "").trim()) {
    attempt.externalParticipantRef = ref;
    await attempt.save();
  }

  await surveyRespondentProfileService.createForPanelAttempt({
    panelSurveyId: validated.surveyId,
    panelSurveyAttemptId: attempt._id as Types.ObjectId,
    userId: (attempt.userId as Types.ObjectId | null | undefined) ?? null,
    internalSessionToken: token,
    externalParticipantRef: ref
  });

  const participantQueryParam =
    String(validated.participantQueryParam ?? "toid").trim() || "toid";

  return {
    attemptToken: token,
    surveyId: String(validated.surveyId),
    externalParticipantRef: ref,
    participantQueryParam
  };
}

/** Public share-link entry — creates a tracked attempt without member login */
export async function createSharedPanelSurveyAttempt(
  surveyId: string,
  options?: { externalParticipantRef?: string; attemptToken?: string }
) {
  const attachToken = String(options?.attemptToken ?? "").trim();
  if (attachToken) {
    return attachExternalParticipantRefToAttempt({
      surveyId,
      attemptToken: attachToken,
      externalParticipantRef: options?.externalParticipantRef ?? ""
    });
  }

  const validated = await validatePanelSurveyForRouting(surveyId);

  const token = await tokenGeneratorService.generateUniqueInternalSessionToken();
  const pid = String(validated.supplierProjectPid ?? "").trim();
  if (!pid) {
    throw new ApiError(400, "Survey is missing supplier project id (pid) for tracking");
  }

  const externalParticipantRef = normalizeExternalParticipantRef(options?.externalParticipantRef);
  const participantQueryParam =
    String(validated.participantQueryParam ?? "toid").trim() || "toid";

  const attempt = await PanelSurveyAttempt.create({
    userId: null,
    panelSurveyId: validated.surveyId,
    token,
    externalParticipantRef,
    supplierProjectPidSnapshot: pid,
    status: "started"
  });

  await surveyRespondentProfileService.createForPanelAttempt({
    panelSurveyId: validated.surveyId,
    panelSurveyAttemptId: attempt._id as Types.ObjectId,
    userId: null,
    internalSessionToken: token,
    externalParticipantRef
  });

  return {
    attemptToken: token,
    surveyId: String(validated.surveyId),
    supplierProjectPid: pid,
    externalParticipantRef: externalParticipantRef || undefined,
    participantQueryParam
  };
}

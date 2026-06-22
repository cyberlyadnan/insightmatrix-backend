import { env } from "../config/env";

/** Public panel entry URL — no login required when the survey is active */
export function buildPanelSurveyShareLink(surveyId: string): string {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  const id = surveyId.trim();
  return `${base}/survey/start/${encodeURIComponent(id)}`;
}

/** Copy template — replace RESPONDENT_ID with each respondent's id (toid, pid, gid, etc.) */
export function buildPanelSurveyShareLinkExample(
  surveyId: string,
  participantQueryParam = "toid"
): string {
  const base = buildPanelSurveyShareLink(surveyId);
  const key = String(participantQueryParam || "pid").trim() || "pid";
  return `${base}?${encodeURIComponent(key)}=RESPONDENT_ID`;
}

import { env } from "../config/env";

/** Public panel entry URL — no login required when the survey is active */
export function buildPanelSurveyShareLink(surveyId: string): string {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  const id = surveyId.trim();
  return `${base}/survey/start/${encodeURIComponent(id)}`;
}

/** Same as panelShareLink — im_attempt is auto-created when the link is opened */
export function buildPanelSurveyShareLinkExample(surveyId: string): string {
  return buildPanelSurveyShareLink(surveyId);
}

/**
 * Automatically generates a public-facing survey title branded under InsightMatrix.
 * Used for participant-facing links, routing landing screens, and member survey views.
 */
export function generatePublicSurveyName(
  surveyCode?: string | null,
  surveyId?: string | null
): string {
  const rawCode = (surveyCode || "").trim();
  if (rawCode) {
    return `InsightMatrix Survey #${rawCode}`;
  }

  const fallbackId = surveyId ? String(surveyId).trim().slice(-8).toUpperCase() : "";
  if (fallbackId) {
    return `InsightMatrix Survey #${fallbackId}`;
  }

  return "InsightMatrix Research Survey";
}

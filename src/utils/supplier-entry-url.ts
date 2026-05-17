/**
 * Appends our session token to the supplier entry URL (only tracking param changes).
 * pid and vid on the supplier URL remain untouched.
 */
export function buildSupplierEntryUrl(
  externalSurveyUrl: string,
  trackingParameterName: string,
  sessionToken: string
): string {
  const key = (trackingParameterName || "toid").trim() || "toid";
  const url = new URL(externalSurveyUrl);
  url.searchParams.set(key, sessionToken);
  return url.toString();
}

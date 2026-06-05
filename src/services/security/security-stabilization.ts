import type { SecurityValidationResult } from "./security.types";

/**
 * Stabilization mode: advanced security signals are recorded for analytics but must not
 * block legitimate respondents. Only captcha verification may hard-block when enabled.
 */
export function toReviewOnly(
  ruleName: string,
  result: SecurityValidationResult
): SecurityValidationResult {
  if (result.allowed || result.decision !== "block" || result.requiresCaptcha) {
    return result;
  }

  return {
    ...result,
    allowed: true,
    decision: "review",
    reasonMessage: `[review-only:${ruleName}] ${result.reasonMessage}`,
    publicMessage: "OK",
    metadata: {
      ...result.metadata,
      stabilization: true,
      wouldHaveBlocked: true,
      reviewRule: ruleName,
      originalReasonCode: result.reasonCode
    }
  };
}

import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { routingOrchestratorService } from "../services/routing/routing-orchestrator.service";
import { resolveClientIp } from "../utils/request-ip";

/** Public panel gateway redirect — validates attempt + survey, returns supplier URL */
export const postPanelGatewayRedirect = asyncHandler(async (req, res) => {
  const { ip, forwardedIp } = resolveClientIp(req);
  const result = await routingOrchestratorService.resolvePanelRedirect({
    surveyId: req.body.surveyId,
    attemptToken: req.body.attemptToken,
    captchaToken: req.body.captchaToken,
    sourceIp: ip,
    forwardedIp,
    userAgent: String(req.headers["user-agent"] ?? ""),
    headers: req.headers as Record<string, string>
  });

  const message = result.requiresCaptcha
    ? "Security verification required"
    : result.requiresPrescreen
      ? "Prescreen required"
      : "Redirect URL generated";

  sendResponse(res, {
    statusCode: 201,
    message,
    data: {
      sessionToken: result.sessionToken,
      redirectUrl: result.redirectUrl,
      channel: result.channel,
      requiresPrescreen: result.requiresPrescreen ?? false,
      requiresCaptcha: result.requiresCaptcha ?? false,
      captchaSiteKey: result.captchaSiteKey,
      profileId: result.profileId,
      prescreenForm: result.prescreenForm
    }
  });
});

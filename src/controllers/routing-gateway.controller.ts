import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { routingOrchestratorService } from "../services/routing/routing-orchestrator.service";

/** Public panel gateway redirect — validates attempt + survey, returns supplier URL */
export const postPanelGatewayRedirect = asyncHandler(async (req, res) => {
  const result = await routingOrchestratorService.resolvePanelRedirect({
    surveyId: req.body.surveyId,
    attemptToken: req.body.attemptToken,
    sourceIp: req.ip ?? req.socket?.remoteAddress ?? "",
    userAgent: String(req.headers["user-agent"] ?? "")
  });

  sendResponse(res, {
    statusCode: 201,
    message: "Redirect URL generated",
    data: {
      sessionToken: result.sessionToken,
      redirectUrl: result.redirectUrl,
      channel: result.channel
    }
  });
});

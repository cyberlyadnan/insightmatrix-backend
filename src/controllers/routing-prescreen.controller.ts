import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { routingOrchestratorService } from "../services/routing/routing-orchestrator.service";

export const postCompleteRoutingPrescreen = asyncHandler(async (req, res) => {
  const result = await routingOrchestratorService.completePrescreenAndRedirect({
    profileId: req.body.profileId,
    internalSessionToken: req.body.internalSessionToken,
    answers: req.body.answers,
    durationMs: req.body.durationMs,
    channel: req.body.channel,
    sourceIp: req.ip ?? req.socket?.remoteAddress ?? "",
    userAgent: String(req.headers["user-agent"] ?? "")
  });

  sendResponse(res, {
    statusCode: 201,
    message: "Prescreen completed",
    data: {
      sessionToken: result.sessionToken,
      redirectUrl: result.redirectUrl,
      channel: result.channel,
      profileId: result.profileId
    }
  });
});

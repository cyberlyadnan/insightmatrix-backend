import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { startVendorRoutingSession } from "../services/vendor-allocation/vendor-routing.service";
import { resolveClientIp } from "../utils/request-ip";

/**
 * Public vendor routing start — returns supplier redirect URL for browser redirect only.
 * Never expose supplier URLs on vendor portal APIs.
 */
export const postVendorRoutingStart = asyncHandler(async (req, res) => {
  const { ip, forwardedIp } = resolveClientIp(req);
  const result = await startVendorRoutingSession({
    routingSlug: req.body.routingSlug,
    vendorRespondentToid: req.body.vendorRespondentToid ?? req.body.vendorRespondentId,
    vendorRespondentId: req.body.vendorRespondentId ?? req.body.vendorRespondentToid,
    trafficSource: req.body.trafficSource,
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
      : "Session created";

  sendResponse(res, {
    statusCode: 201,
    message,
    data: {
      sessionToken: result.sessionToken,
      redirectUrl: result.redirectUrl,
      requiresPrescreen: result.requiresPrescreen ?? false,
      requiresCaptcha: result.requiresCaptcha ?? false,
      captchaSiteKey: result.captchaSiteKey,
      profileId: result.profileId,
      prescreenForm: result.prescreenForm,
      allocationCode: result.allocationCode
    }
  });
});

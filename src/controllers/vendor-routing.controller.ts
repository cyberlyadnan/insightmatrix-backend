import { asyncHandler } from "../utils/asyncHandler";
import { sendResponse } from "../utils/ApiResponse";
import { startVendorRoutingSession } from "../services/vendor-allocation/vendor-routing.service";

/**
 * Public vendor routing start — returns supplier redirect URL for browser redirect only.
 * Never expose supplier URLs on vendor portal APIs.
 */
export const postVendorRoutingStart = asyncHandler(async (req, res) => {
  const result = await startVendorRoutingSession({
    routingSlug: req.body.routingSlug,
    vendorRespondentToid: req.body.vendorRespondentToid ?? req.body.vendorRespondentId,
    vendorRespondentId: req.body.vendorRespondentId ?? req.body.vendorRespondentToid,
    trafficSource: req.body.trafficSource,
    sourceIp: req.ip ?? req.socket?.remoteAddress ?? "",
    userAgent: String(req.headers["user-agent"] ?? "")
  });

  sendResponse(res, {
    statusCode: 201,
    message: "Session created",
    data: {
      sessionToken: result.sessionToken,
      redirectUrl: result.redirectUrl
    }
  });
});

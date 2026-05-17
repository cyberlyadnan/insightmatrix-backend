import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { processSupplierCallback } from '../services/routing/routing-callback-processor.service';

/**
 * Unauthenticated endpoint for routing outcomes (browser landing pages POST here).
 * Unified pipeline: analytics → session → vendor relay → webhook log.
 */
export const postPublicRoutingCallback = asyncHandler(async (req, res) => {
  const result = await processSupplierCallback({
    supplierProjectPid: req.body.supplierProjectPid,
    eventType: req.body.eventType,
    quotaGroupId: req.body.quotaGroupId,
    quotaGroupName: req.body.quotaGroupName,
    supplierParticipantRef: req.body.supplierParticipantRef,
    meta: req.body.meta ?? null
  });

  sendResponse(res, {
    statusCode: 201,
    message: "Routing event recorded",
    data: {
      id: result.routingEventId,
      sessionType: result.sessionType,
      vendorRelay: result.vendorRelay
    }
  });
});

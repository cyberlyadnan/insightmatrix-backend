import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/ApiResponse';
import { recordRoutingEventBySupplierProjectPid } from '../services/panel-survey-analytics.service';
import { tryApplyOutcomeFromRoutingEvent } from '../services/vendor-allocation/session-tracking.service';

/**
 * Unauthenticated endpoint for routing outcomes (browser landing pages POST here).
 * Suppliers can later switch to direct server-to-server POST with the same payload shape.
 */
export const postPublicRoutingCallback = asyncHandler(async (req, res) => {
  const doc = await recordRoutingEventBySupplierProjectPid(req.body.supplierProjectPid, {
    eventType: req.body.eventType,
    quotaGroupId: req.body.quotaGroupId,
    quotaGroupName: req.body.quotaGroupName,
    supplierParticipantRef: req.body.supplierParticipantRef,
    meta: req.body.meta ?? null
  });

  await tryApplyOutcomeFromRoutingEvent(
    req.body.supplierParticipantRef,
    req.body.eventType
  ).catch(() => {});

  sendResponse(res, {
    statusCode: 201,
    message: "Routing event recorded",
    data: { id: String(doc._id) }
  });
});

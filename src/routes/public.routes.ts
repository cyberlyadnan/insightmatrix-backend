import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { publicRoutingCallbackLimiter } from '../middleware/public-callback-rate-limit.middleware';
import { postPublicRoutingCallback } from '../controllers/public-panel-callback.controller';
import { postVendorRoutingStart } from '../controllers/vendor-routing.controller';
import { postPanelGatewayRedirect } from '../controllers/routing-gateway.controller';
import { publicRoutingCallbackSchema } from '../validations/public-routing-callback.validation';
import { vendorRoutingStartSchema } from '../validations/vendor-allocation.validation';
import { panelGatewayRedirectSchema } from '../validations/routing-gateway.validation';

const router = Router();

router.post(
  "/panel-routing-callback",
  publicRoutingCallbackLimiter,
  validate(publicRoutingCallbackSchema),
  postPublicRoutingCallback
);

router.post(
  "/vendor-routing/start",
  publicRoutingCallbackLimiter,
  validate(vendorRoutingStartSchema),
  postVendorRoutingStart
);

router.post(
  "/routing/gateway/panel-redirect",
  publicRoutingCallbackLimiter,
  validate(panelGatewayRedirectSchema),
  postPanelGatewayRedirect
);

export default router;

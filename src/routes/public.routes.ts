import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { publicRoutingCallbackLimiter } from '../middleware/public-callback-rate-limit.middleware';
import { postPublicRoutingCallback } from '../controllers/public-panel-callback.controller';
import { publicRoutingCallbackSchema } from '../validations/public-routing-callback.validation';

const router = Router();

router.post(
  "/panel-routing-callback",
  publicRoutingCallbackLimiter,
  validate(publicRoutingCallbackSchema),
  postPublicRoutingCallback
);

export default router;

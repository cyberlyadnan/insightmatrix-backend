import { Router } from "express";
import { ROLES } from "../constants/roles";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  listGatewayRoutingLogs,
  listWebhookDeliveryLogs
} from "../controllers/routing-logs.controller";
import {
  listGatewayLogsSchema,
  listWebhookLogsSchema
} from "../validations/routing-gateway.validation";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SURVEY_MANAGER));

router.get("/webhooks", validate(listWebhookLogsSchema), listWebhookDeliveryLogs);
router.get("/gateway", validate(listGatewayLogsSchema), listGatewayRoutingLogs);

export default router;

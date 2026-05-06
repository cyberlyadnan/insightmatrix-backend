import { Router } from "express";
import { healthCheck } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import surveyRoutes from './survey.routes';
import responseRoutes from './response.routes';

const router = Router();

router.get("/health", healthCheck);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/surveys", surveyRoutes);
router.use("/responses", responseRoutes);

export default router;


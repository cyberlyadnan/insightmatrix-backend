import { Router } from "express";
import { healthCheck } from '../controllers/health.controller';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import surveyRoutes from './survey.routes';
import responseRoutes from './response.routes';
import prescreenRoutes from './prescreen.routes';
import contactQueryRoutes from './contact-query.routes';
import surveyCompanyRoutes from './survey-company.routes';
import panelSurveyRoutes from './panel-survey.routes';
import companySurveyPaymentRoutes from './company-survey-payment.routes';
import panelBookRoutes from './panel-book.routes';
import publicRoutes from './public.routes';

const router = Router();

router.get("/health", healthCheck);
router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/surveys", surveyRoutes);
router.use("/responses", responseRoutes);
router.use("/prescreens", prescreenRoutes);
router.use("/contact-queries", contactQueryRoutes);
router.use("/survey-companies", surveyCompanyRoutes);
router.use("/panel-surveys", panelSurveyRoutes);
router.use("/company-payments", companySurveyPaymentRoutes);
router.use("/panel-book", panelBookRoutes);

export default router;


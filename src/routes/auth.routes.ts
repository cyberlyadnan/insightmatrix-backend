import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema
} from '../validations/auth.validation';

const router = Router();

router.get("/verify-email", verifyEmail);

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh-token", refresh);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerification);

export default router;

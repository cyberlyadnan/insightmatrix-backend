import { Router } from "express";
import { forgotPassword, login, logout, refresh, register, resetPassword } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validations/auth.validation';

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh-token", refresh);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;


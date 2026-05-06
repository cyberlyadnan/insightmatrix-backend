import { Router } from "express";
import { deleteUser, getProfile, getUser, listUsers, updateUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateUserSchema } from '../validations/user.validation';
import { ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);
router.get("/profile", getProfile);
router.get("/", authorize(ROLES.ADMIN), listUsers);
router.get("/:id", authorize(ROLES.ADMIN), getUser);
router.patch("/:id", authorize(ROLES.ADMIN), validate(updateUserSchema), updateUser);
router.delete("/:id", authorize(ROLES.ADMIN), deleteUser);

export default router;


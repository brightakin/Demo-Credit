import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { validate } from "../middleware/validate";
import { RegisterSchema, LoginSchema } from "../schemas";

const router = Router();

router.post("/register", validate(RegisterSchema), AuthController.register);
router.post("/login", validate(LoginSchema), AuthController.login);

export default router;

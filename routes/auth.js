import { Router } from "express";
import authController from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import { validateRegistration } from "../middleware/validation.js";



const authRouter = Router();


authRouter.post("/register", validateRegistration, authController.register);

authRouter.post("/login", authController.login);

authRouter.get("/profile", authenticateToken, authController.getProfile);


export default authRouter;
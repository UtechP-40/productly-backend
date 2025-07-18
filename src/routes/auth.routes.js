import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";
import authController from "../controllers/auth.controller.js";

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit());

// Public authentication routes
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/logout", authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.get("/verify-session", authController.verifySession);
router.post("/validate-password", authController.validatePassword);

// Protected routes (require authentication)
router.use(verifyJWT);
router.get("/me", authController.getCurrentUser);
router.get("/sessions", authController.getUserSessions);
router.delete("/sessions/:sessionId", authController.revokeSession);
router.delete("/sessions", authController.revokeAllSessions);

export default router;
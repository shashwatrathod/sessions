import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

// GET /api/auth/login - Redirects to Spotify authorization page
router.get("/login", AuthController.login);

// GET /api/auth/callback - Spotify redirects here after user authorization
router.get("/callback", AuthController.callback);

// GET /api/auth/me - Returns current logged-in user's profile
router.get("/me", AuthController.me);

// POST /api/auth/logout
router.post("/logout", AuthController.logout);

export default router;

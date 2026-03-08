import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { SharesController } from "../controllers/shares.controller";

const router = Router();

// POST /shares — Create a share link for a saved session (auth required)
router.post("/", requireAuth, SharesController.createShareLink);

// GET /shares/session/:savedSessionId — List share links for a saved session
router.get(
  "/session/:savedSessionId",
  requireAuth,
  SharesController.listShareLinksForSession,
);

// DELETE /shares/:id — Revoke a share link
router.delete("/:id", requireAuth, SharesController.deleteShareLink);

// GET /shares/:token — Public endpoint: resolve a share token (no auth required)
router.get("/:token", SharesController.resolveShareToken);

export default router;

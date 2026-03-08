import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { HistoryController } from "../controllers/history.controller";

const router = Router();

router.use(requireAuth);

// GET /history/sync
// Polls Spotify for new recently-played tracks, upserts into the shared `tracks`
// table, then writes PlayHistory rows referencing them.
router.get("/sync", HistoryController.syncHistory);

// GET /history/sessions
// Returns paginated listening sessions computed from the user's stored play history
router.get("/sessions", HistoryController.getSessions);

// GET /history/sessions/:id
// Returns the full track list for a specific session.
router.get("/sessions/:id", HistoryController.getSessionDetail);

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { PlaylistsController } from "../controllers/playlists.controller";

const router = Router();

router.use(requireAuth);

// POST /playlists
// Creates a Spotify playlist from a session and saves it to the DB
router.post("/", PlaylistsController.createPlaylist);

// GET /playlists/saved
// Returns the user's saved sessions enriched with album art preview images
router.get("/saved", PlaylistsController.getSavedSessions);

// PATCH /playlists/saved/:id - Rename a saved session
router.patch("/saved/:id", PlaylistsController.renameSession);

// POST /playlists/save-session
// Saves a listening session to the DB with a custom name — no Spotify playlist required.
router.post("/save-session", PlaylistsController.saveSessionOnly);

// DELETE /playlists/saved/:id
// Deletes a saved session (must belong to the current user)
router.delete("/saved/:id", PlaylistsController.deleteSession);

export default router;

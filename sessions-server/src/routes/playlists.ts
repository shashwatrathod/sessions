import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { createPlaylist, addTracksToPlaylist } from "../lib/spotify";

const router = Router();

router.use(requireAuth);

// POST /playlists
// Creates a Spotify playlist from a session and saves it to the DB
router.post("/", async (req, res) => {
  const userId = req.session.userId!;
  const {
    name,
    description,
    trackUris,
    isPublic,
    sessionStartTime,
    sessionEndTime,
  } = req.body as {
    name: string;
    description?: string;
    trackUris: string[];
    isPublic: boolean;
    sessionStartTime: string;
    sessionEndTime: string;
  };

  if (!name || !trackUris?.length || !sessionStartTime || !sessionEndTime) {
    res.status(400).json({
      error:
        "Missing required fields: name, trackUris, sessionStartTime, sessionEndTime",
    });
    return;
  }

  try {
    // Create the playlist on Spotify
    const playlist = await createPlaylist(
      userId,
      name,
      description ??
        `A listening session from ${new Date(sessionStartTime).toLocaleDateString()}`,
      isPublic ?? false,
    );

    // Add tracks to the playlist
    await addTracksToPlaylist(userId, playlist.id, trackUris);

    // Save the session record in our DB
    const saved = await prisma.savedSession.create({
      data: {
        name,
        startTime: new Date(sessionStartTime),
        endTime: new Date(sessionEndTime),
        spotifyPlaylistId: playlist.id,
        spotifyPlaylistUrl: playlist.external_urls.spotify,
        trackUris,
        userId,
      },
    });

    res.json({
      id: saved.id,
      spotifyPlaylistId: playlist.id,
      spotifyPlaylistUrl: playlist.external_urls.spotify,
      name: saved.name,
    });
  } catch (err) {
    console.error("Create playlist error:", err);
    res.status(500).json({ error: "Failed to create playlist" });
  }
});

// GET /playlists/saved
// Returns the user's saved sessions from the DB
router.get("/saved", async (req, res) => {
  const userId = req.session.userId!;

  try {
    const sessions = await prisma.savedSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        startTime: true,
        endTime: true,
        spotifyPlaylistId: true,
        spotifyPlaylistUrl: true,
        trackUris: true,
      },
    });

    res.json(sessions);
  } catch (err) {
    console.error("Saved sessions error:", err);
    res.status(500).json({ error: "Failed to load saved sessions" });
  }
});

// PATCH /playlists/saved/:id - Rename a saved session
router.patch("/saved/:id", async (req, res) => {
  const userId = req.session.userId!;
  const { id } = req.params;
  const { name } = req.body as { name: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  try {
    const session = await prisma.savedSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const updated = await prisma.savedSession.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json({ id: updated.id, name: updated.name });
  } catch (err) {
    console.error("Rename session error:", err);
    res.status(500).json({ error: "Failed to rename session" });
  }
});

export default router;

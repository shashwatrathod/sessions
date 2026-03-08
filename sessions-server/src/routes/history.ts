import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { getRecentlyPlayed } from "../lib/spotify";
import { groupTracksIntoSessions } from "../lib/sessions";

const router = Router();

router.use(requireAuth);

// GET /history/sync
// Polls Spotify for new recently-played tracks and stores them in the DB
router.get("/sync", async (req, res) => {
  const userId = req.session.userId!;

  try {
    // Find the most recent track we have stored — use it as the 'after' cursor
    const mostRecent = await prisma.playHistory.findFirst({
      where: { userId },
      orderBy: { playedAt: "desc" },
      select: { playedAt: true },
    });

    const afterMs = mostRecent ? mostRecent.playedAt.getTime() : undefined;
    const tracks = await getRecentlyPlayed(userId, afterMs);

    if (tracks.length === 0) {
      res.json({ synced: 0, message: "Already up to date" });
      return;
    }

    // Upsert all new tracks (deduplication via unique constraint on userId + playedAt)
    await prisma.$transaction(
      tracks.map((t) =>
        prisma.playHistory.upsert({
          where: { userId_playedAt: { userId, playedAt: t.playedAt } },
          update: {},
          create: {
            playedAt: t.playedAt,
            trackId: t.trackId,
            trackUri: t.trackUri,
            trackName: t.trackName,
            artistNames: t.artistNames,
            albumName: t.albumName,
            albumArt: t.albumArt,
            durationMs: t.durationMs,
            userId,
          },
        }),
      ),
    );

    res.json({ synced: tracks.length });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Failed to sync listening history" });
  }
});

// GET /history/sessions
// Returns all listening sessions computed from the user's stored play history
router.get("/sessions", async (req, res) => {
  const userId = req.session.userId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));

  try {
    const tracks = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
    });

    const sessions = groupTracksIntoSessions(tracks);
    const startIndex = (page - 1) * limit;
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit);

    // Return sessions without full track data (just metadata + preview images)
    const sessionList = paginatedSessions.map(
      ({ id, startTime, endTime, trackCount, previewImages }) => ({
        id,
        startTime,
        endTime,
        trackCount,
        previewImages,
      }),
    );

    res.set("Cache-Control", "private, max-age=300");
    res.json({
      data: sessionList,
      hasMore: startIndex + limit < sessions.length,
    });
  } catch (err) {
    console.error("Sessions error:", err);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

// GET /history/sessions/:id
// Returns the full track list for a specific session.
// Since sessions are virtual (computed from timestamps), we derive them on-the-fly.
router.get("/sessions/:id", async (req, res) => {
  const userId = req.session.userId!;
  const { id } = req.params;

  // Session ID format: session_{startMs}_{endMs}
  const match = id.match(/^session_(\d+)_(\d+)$/);
  if (!match) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const startMs = Number(match[1]);
  const endMs = Number(match[2]);

  try {
    // Fetch all tracks and re-compute sessions to find this one
    const tracks = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" },
    });

    const sessions = groupTracksIntoSessions(tracks);
    const session = sessions.find((s) => s.id === id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.set("Cache-Control", "private, max-age=3600");
    res.json(session);
  } catch (err) {
    console.error("Session detail error:", err);
    res.status(500).json({ error: "Failed to load session" });
  }

  // Suppress unused variable warning
  void startMs;
  void endMs;
});

export default router;

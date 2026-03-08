import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import {
  getRecentlyPlayed,
  upsertTracks,
  refreshTrackPopularities,
} from "../lib/spotify";
import { groupTracksIntoSessions } from "../lib/sessions";

const router = Router();

router.use(requireAuth);

// GET /history/sync
// Polls Spotify for new recently-played tracks, upserts into the shared `tracks`
// table, then writes PlayHistory rows referencing them.
router.get("/sync", async (req, res) => {
  const userId = req.session.userId!;

  try {
    // Find the most recent play we already have — use it as the 'after' cursor
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

    // 1. Upsert track metadata into the shared `tracks` table
    await upsertTracks(tracks);

    // 2. Write PlayHistory rows (reference tracks by ID)
    await prisma.$transaction(
      tracks.map((t) =>
        prisma.playHistory.upsert({
          where: { userId_playedAt: { userId, playedAt: t.playedAt } },
          update: {},
          create: {
            playedAt: t.playedAt,
            trackId: t.trackId,
            userId,
          },
        }),
      ),
    );

    // 3. Refresh popularities for new tracks in the background (best-effort)
    const newTrackIds = [...new Set(tracks.map((t) => t.trackId))];
    refreshTrackPopularities(userId, newTrackIds).catch((err) =>
      console.warn("Popularity refresh failed:", err),
    );

    res.json({ synced: tracks.length });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Failed to sync listening history" });
  }
});

// GET /history/sessions
// Returns paginated listening sessions computed from the user's stored play history
router.get("/sessions", async (req, res) => {
  const userId = req.session.userId!;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));

  try {
    const histories = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      include: { track: true },
    });

    const sessions = groupTracksIntoSessions(histories);
    const startIndex = (page - 1) * limit;
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit);

    const sessionList = paginatedSessions.map(
      ({ id, startTime, endTime, trackCount, previewImages, tags }) => ({
        id,
        startTime,
        endTime,
        trackCount,
        previewImages,
        tags,
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
router.get("/sessions/:id", async (req, res) => {
  const userId = req.session.userId!;
  const { id } = req.params;

  // Session ID format: session_{startMs}_{endMs}
  const match = id.match(/^session_(\d+)_(\d+)$/);
  if (!match) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  try {
    const histories = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" },
      include: { track: true },
    });

    const sessions = groupTracksIntoSessions(histories);
    const session = sessions.find((s) => s.id === id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Flatten into a shape the client expects
    const responseSession = {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      trackCount: session.trackCount,
      previewImages: session.previewImages,
      tags: session.tags,
      tracks: session.tracks.map((ph) => ({
        id: ph.id,
        playedAt: ph.playedAt,
        trackId: ph.track.id,
        trackUri: ph.track.uri,
        trackName: ph.track.name,
        artistNames: ph.track.artistNames,
        albumName: ph.track.albumName,
        albumArt: ph.track.albumArt,
        durationMs: ph.track.durationMs,
        popularity: ph.track.popularity,
        userId: ph.userId,
      })),
    };

    res.set("Cache-Control", "private, max-age=3600");
    res.json(responseSession);
  } catch (err) {
    console.error("Session detail error:", err);
    res.status(500).json({ error: "Failed to load session" });
  }
});

export default router;

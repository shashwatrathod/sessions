import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";

const router = Router();

// POST /shares — Create a share link for a saved session (auth required)
router.post("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const {
    savedSessionId,
    visibility = "LINK_ANYONE",
    expiresAt,
  } = req.body as {
    savedSessionId: string;
    visibility?: "PRIVATE" | "LINK_ANYONE" | "SPECIFIC_USER";
    expiresAt?: string;
  };

  if (!savedSessionId) {
    res.status(400).json({ error: "savedSessionId is required" });
    return;
  }

  try {
    // Verify the saved session belongs to this user
    const session = await prisma.savedSession.findFirst({
      where: { id: savedSessionId, userId },
    });
    if (!session) {
      res.status(404).json({ error: "Saved session not found" });
      return;
    }

    const link = await prisma.shareLink.create({
      data: {
        token: randomUUID(),
        savedSessionId,
        visibility,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.json({
      id: link.id,
      token: link.token,
      url: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/shared/${link.token}`,
      visibility: link.visibility,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("Create share link error:", err);
    res.status(500).json({ error: "Failed to create share link" });
  }
});

// GET /shares/session/:savedSessionId — List share links for a saved session
router.get("/session/:savedSessionId", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { savedSessionId } = req.params;

  try {
    // Verify ownership
    const session = await prisma.savedSession.findFirst({
      where: { id: savedSessionId, userId },
    });
    if (!session) {
      res.status(404).json({ error: "Saved session not found" });
      return;
    }

    const links = await prisma.shareLink.findMany({
      where: { savedSessionId },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      links.map((l) => ({
        id: l.id,
        token: l.token,
        url: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/shared/${l.token}`,
        visibility: l.visibility,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error("List share links error:", err);
    res.status(500).json({ error: "Failed to load share links" });
  }
});

// DELETE /shares/:id — Revoke a share link
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { id } = req.params;

  try {
    const link = await prisma.shareLink.findFirst({
      where: { id },
      include: { savedSession: { select: { userId: true } } },
    });

    if (!link || link.savedSession.userId !== userId) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    await prisma.shareLink.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete share link error:", err);
    res.status(500).json({ error: "Failed to revoke share link" });
  }
});

// GET /shares/:token — Public endpoint: resolve a share token (no auth required)
router.get("/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        savedSession: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            trackUris: true,
            spotifyPlaylistUrl: true,
          },
        },
      },
    });

    if (!link) {
      res.status(404).json({ error: "Share link not found" });
      return;
    }

    if (link.visibility === "PRIVATE") {
      res.status(403).json({ error: "This session is private" });
      return;
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      res.status(410).json({ error: "This share link has expired" });
      return;
    }

    const s = link.savedSession;

    // Fetch album art for tracks
    const trackArt = s.trackUris.length
      ? await prisma.track.findMany({
          where: { uri: { in: s.trackUris } },
          select: { uri: true, albumArt: true, name: true, artistNames: true },
        })
      : [];

    const tracksByUri = new Map(trackArt.map((t) => [t.uri, t]));

    const tracks = s.trackUris
      .map((uri) => tracksByUri.get(uri))
      .filter(Boolean);

    const seen = new Set<string>();
    const previewImages: string[] = [];
    for (const t of tracks) {
      if (t && t.albumArt && !seen.has(t.albumArt)) {
        seen.add(t.albumArt);
        previewImages.push(t.albumArt);
        if (previewImages.length >= 4) break;
      }
    }

    res.json({
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      trackCount: s.trackUris.length,
      spotifyPlaylistUrl: s.spotifyPlaylistUrl,
      previewImages,
      tracks,
    });
  } catch (err) {
    console.error("Resolve share token error:", err);
    res.status(500).json({ error: "Failed to load shared session" });
  }
});

export default router;

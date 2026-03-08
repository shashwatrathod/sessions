import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";

export class SharesService {
  static async createShareLink(
    userId: string,
    savedSessionId: string,
    visibility: "PRIVATE" | "LINK_ANYONE" | "SPECIFIC_USER" = "LINK_ANYONE",
    expiresAt?: string,
  ) {
    const session = await prisma.savedSession.findFirst({
      where: { id: savedSessionId, userId },
    });

    if (!session) {
      throw { statusCode: 404, message: "Saved session not found" };
    }

    const link = await prisma.shareLink.create({
      data: {
        token: randomUUID(),
        savedSessionId,
        visibility,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return {
      id: link.id,
      token: link.token,
      url: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/shared/${link.token}`,
      visibility: link.visibility,
      expiresAt: link.expiresAt?.toISOString() ?? null,
    };
  }

  static async listShareLinksForSession(
    userId: string,
    savedSessionId: string,
  ) {
    const session = await prisma.savedSession.findFirst({
      where: { id: savedSessionId, userId },
    });

    if (!session) {
      throw { statusCode: 404, message: "Saved session not found" };
    }

    const links = await prisma.shareLink.findMany({
      where: { savedSessionId },
      orderBy: { createdAt: "desc" },
    });

    return links.map((l: any) => ({
      id: l.id,
      token: l.token,
      url: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/shared/${l.token}`,
      visibility: l.visibility,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  static async deleteShareLink(userId: string, id: string) {
    const link = await prisma.shareLink.findFirst({
      where: { id },
      include: { savedSession: { select: { userId: true } } },
    });

    if (!link || link.savedSession.userId !== userId) {
      throw { statusCode: 404, message: "Share link not found" };
    }

    await prisma.shareLink.delete({ where: { id } });
    return { success: true };
  }

  static async resolveShareToken(token: string, requestingUserId?: string) {
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
      throw { statusCode: 404, message: "Share link not found" };
    }

    if (link.visibility === "PRIVATE") {
      throw { statusCode: 403, message: "This session is private" };
    }

    if (link.visibility === "SPECIFIC_USER") {
      if (!requestingUserId || requestingUserId !== link.sharedWithUserId) {
        throw {
          statusCode: 403,
          message: "You are not authorized to view this session",
        };
      }
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw { statusCode: 410, message: "This share link has expired" };
    }

    const s = link.savedSession;

    const trackArt = s.trackUris.length
      ? await prisma.track.findMany({
          where: { uri: { in: s.trackUris } },
          select: { uri: true, albumArt: true, name: true, artistNames: true },
        })
      : [];

    const tracksByUri = new Map(trackArt.map((t: any) => [t.uri, t]));

    const tracks = s.trackUris
      .map((uri: string) => tracksByUri.get(uri))
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

    return {
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      trackCount: s.trackUris.length,
      spotifyPlaylistUrl: s.spotifyPlaylistUrl,
      previewImages,
      tracks,
    };
  }
}

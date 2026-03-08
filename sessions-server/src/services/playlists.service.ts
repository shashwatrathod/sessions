import { prisma } from "../lib/prisma";
import { createPlaylist, addTracksToPlaylist } from "../lib/spotify";

export class PlaylistsService {
  static async createSavedSessionWithSpotifyPlaylist(
    userId: string,
    sessionData: any,
    name: string,
    description: string | undefined,
    isPublic: boolean,
    trackUris: string[],
    sessionStartTime: string,
    sessionEndTime: string,
  ) {
    const playlist = await createPlaylist(
      userId,
      sessionData,
      name,
      description ??
        `A listening session from ${new Date(sessionStartTime).toLocaleDateString()}`,
      isPublic,
    );

    await addTracksToPlaylist(userId, sessionData, playlist.id, trackUris);

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

    return {
      id: saved.id,
      spotifyPlaylistId: playlist.id,
      spotifyPlaylistUrl: playlist.external_urls.spotify,
      name: saved.name,
    };
  }

  static async getSavedSessions(userId: string) {
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

    const allUris = [...new Set(sessions.flatMap((s: any) => s.trackUris))];
    const trackArt = allUris.length
      ? await prisma.track.findMany({
          where: { uri: { in: allUris } },
          select: { uri: true, albumArt: true },
        })
      : [];

    const artByUri = new Map<string, string>(
      trackArt.map((t: any) => [t.uri, t.albumArt]),
    );

    return sessions.map((s: any) => {
      const seen = new Set<string>();
      const previewImages: string[] = [];
      for (const uri of s.trackUris) {
        const art = artByUri.get(uri);
        if (art && !seen.has(art)) {
          seen.add(art);
          previewImages.push(art);
          if (previewImages.length >= 4) break;
        }
      }
      return { ...s, previewImages };
    });
  }

  static async renameSession(id: string, userId: string, name: string) {
    const session = await prisma.savedSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw { statusCode: 404, message: "Session not found" };
    }

    const updated = await prisma.savedSession.update({
      where: { id },
      data: { name: name.trim() },
    });

    return { id: updated.id, name: updated.name };
  }

  static async saveSessionOnly(
    userId: string,
    name: string,
    trackUris: string[],
    sessionStartTime: string,
    sessionEndTime: string,
  ) {
    const saved = await prisma.savedSession.create({
      data: {
        name: name.trim(),
        startTime: new Date(sessionStartTime),
        endTime: new Date(sessionEndTime),
        trackUris,
        userId,
      },
    });

    return {
      id: saved.id,
      name: saved.name,
      startTime: saved.startTime.toISOString(),
      endTime: saved.endTime.toISOString(),
      createdAt: saved.createdAt.toISOString(),
    };
  }

  static async deleteSession(id: string, userId: string) {
    const session = await prisma.savedSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      throw { statusCode: 404, message: "Session not found" };
    }

    await prisma.savedSession.delete({ where: { id } });
    return { success: true };
  }
}

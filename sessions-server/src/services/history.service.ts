import { prisma } from "../lib/prisma";
import {
  getRecentlyPlayed,
  upsertTracks,
  refreshTrackPopularities,
} from "../lib/spotify";
import { groupTracksIntoSessions } from "../lib/sessions";
import { config } from "../config";

export class HistoryService {
  static async syncHistory(userId: string, sessionData: any) {
    const mostRecent = await prisma.playHistory.findFirst({
      where: { userId },
      orderBy: { playedAt: "desc" },
      select: { playedAt: true },
    });

    const afterMs = mostRecent ? mostRecent.playedAt.getTime() : undefined;
    const tracks = await getRecentlyPlayed(userId, sessionData, afterMs);

    if (tracks.length === 0) {
      return { synced: 0, message: "Already up to date" };
    }

    await upsertTracks(tracks);

    await prisma.$transaction(
      tracks.map((t: any) =>
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

    const newTrackIds = [...new Set(tracks.map((t: any) => t.trackId))];
    refreshTrackPopularities(
      userId,
      sessionData,
      newTrackIds as string[],
    ).catch((err: any) => console.warn("Popularity refresh failed:", err));

    return { synced: tracks.length };
  }

  static async getPaginatedSessions(
    userId: string,
    page: number,
    limit: number,
    timezoneOffsetMinutes: number = 0,
  ) {
    const histories = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" }, // Must be ascending for chronological grouping
      include: { track: true },
    });

    const sessions = groupTracksIntoSessions(histories, timezoneOffsetMinutes);
    const startIndex = (page - 1) * limit;
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit);

    const sessionList = paginatedSessions.map(
      ({ id, startTime, endTime, trackCount, previewImages, tags }: any) => ({
        id,
        startTime,
        endTime,
        trackCount,
        previewImages,
        tags,
      }),
    );

    return {
      data: sessionList,
      hasMore: startIndex + limit < sessions.length,
    };
  }

  static async getSessionDetail(
    userId: string,
    id: string,
    timezoneOffsetMinutes: number = 0,
  ) {
    const match = id.match(/^session_(\d+)_(\d+)$/);
    if (!match) {
      throw { statusCode: 400, message: "Invalid session ID" };
    }

    const histories = await prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" },
      include: { track: true },
    });

    const sessions = groupTracksIntoSessions(histories, timezoneOffsetMinutes);
    const session = sessions.find((s: any) => s.id === id);

    if (!session) {
      throw { statusCode: 404, message: "Session not found" };
    }

    return {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      trackCount: session.trackCount,
      previewImages: session.previewImages,
      tags: session.tags,
      tracks: session.tracks.map((ph: any) => ({
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
  }
}

import { PlayHistory, Track } from "@prisma/client";
import { config } from "../config";

// PlayHistory joined with its Track record
export type PlayHistoryWithTrack = PlayHistory & { track: Track };

export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  trackCount: number;
  tracks: PlayHistoryWithTrack[];
  // Album art images for the preview thumbnail grid
  previewImages: string[];
  tags: string[];
}

// Configurable gap between sessions
const SESSION_GAP_MS = config.sessionGapMinutes * 60 * 1000;

/**
 * Groups a sorted list of PlayHistoryWithTrack records into listening sessions.
 * Sessions are defined by gaps of SESSION_GAP_MS or more between consecutive plays.
 */
export function groupTracksIntoSessions(
  tracks: PlayHistoryWithTrack[],
  timezoneOffsetMinutes: number = 0,
): Session[] {
  if (tracks.length === 0) return [];

  // Sort ascending by playedAt
  const sorted = [...tracks].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime(),
  );

  const sessions: Session[] = [];
  let currentGroup: PlayHistoryWithTrack[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.playedAt.getTime() - prev.playedAt.getTime();

    if (gap > SESSION_GAP_MS) {
      sessions.push(makeSession(currentGroup, timezoneOffsetMinutes));
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }

  if (currentGroup.length > 0) {
    sessions.push(makeSession(currentGroup, timezoneOffsetMinutes));
  }

  // Return newest sessions first
  return sessions.reverse();
}

function makeSession(
  tracks: PlayHistoryWithTrack[],
  timezoneOffsetMinutes: number,
): Session {
  const start = tracks[0].playedAt;
  const end = tracks[tracks.length - 1].playedAt;

  // Deterministic ID from start + end timestamps
  const id = `session_${start.getTime()}_${end.getTime()}`;

  // Unique album art URLs for preview (up to 4)
  const seen = new Set<string>();
  const previewImages: string[] = [];
  for (const t of tracks) {
    if (t.track.albumArt && !seen.has(t.track.albumArt)) {
      seen.add(t.track.albumArt);
      previewImages.push(t.track.albumArt);
      if (previewImages.length >= 4) break;
    }
  }

  return {
    id,
    startTime: start,
    endTime: end,
    trackCount: tracks.length,
    tracks,
    previewImages,
    tags: computeTags(tracks, start, timezoneOffsetMinutes),
  };
}

// --- Auto-tagging ---

/**
 * Derives descriptive tags for a session based on time-of-day and listening patterns.
 * All logic is local — no extra API calls needed.
 */
export function computeTags(
  tracks: PlayHistoryWithTrack[],
  sessionStart: Date,
  timezoneOffsetMinutes: number,
): string[] {
  const tags: string[] = [];

  // Calculate the user's local hour in UTC
  const localTimeMs =
    sessionStart.getTime() - timezoneOffsetMinutes * 60 * 1000;
  const localDate = new Date(localTimeMs);
  const hour = localDate.getUTCHours();

  const durationMs =
    tracks[tracks.length - 1].playedAt.getTime() - tracks[0].playedAt.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // Time-of-day tags
  if (hour >= 0 && hour < 5) tags.push("🌙 Late Night");
  else if (hour >= 5 && hour < 9) tags.push("🌅 Early Morning");
  else if (hour >= 9 && hour < 12) tags.push("🌤 Morning");
  else if (hour >= 12 && hour < 17) tags.push("☀️ Afternoon");
  else if (hour >= 17 && hour < 21) tags.push("🌆 Evening");
  else tags.push("🌃 Night");

  // Session length
  if (durationHours >= 3) tags.push("📺 Binge Session");
  else if (durationHours >= 1.5) tags.push("🎧 Long Session");

  // Focus block: long session but few unique tracks (implies repeats)
  const uniqueTrackIds = new Set(tracks.map((t) => t.trackId));
  if (durationHours >= 1 && uniqueTrackIds.size <= 5) {
    tags.push("🎯 Focus Block");
  }

  return tags;
}

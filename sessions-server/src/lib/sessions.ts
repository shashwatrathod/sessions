import { PlayHistory } from "@prisma/client";

export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  trackCount: number;
  tracks: PlayHistory[];
  // Album art images for the preview thumbnail grid
  previewImages: string[];
}

// 30 minutes of inactivity = new session
const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Groups a sorted (descending) list of PlayHistory records into listening sessions.
 * Sessions are defined by gaps of SESSION_GAP_MS or more between consecutive plays.
 */
export function groupTracksIntoSessions(tracks: PlayHistory[]): Session[] {
  if (tracks.length === 0) return [];

  // Sort ascending by playedAt
  const sorted = [...tracks].sort(
    (a, b) => a.playedAt.getTime() - b.playedAt.getTime(),
  );

  const sessions: Session[] = [];
  let currentGroup: PlayHistory[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.playedAt.getTime() - prev.playedAt.getTime();

    if (gap > SESSION_GAP_MS) {
      // Flush current group and start new one
      sessions.push(makeSession(currentGroup));
      currentGroup = [curr];
    } else {
      currentGroup.push(curr);
    }
  }

  // Flush last group
  if (currentGroup.length > 0) {
    sessions.push(makeSession(currentGroup));
  }

  // Return newest sessions first
  return sessions.reverse();
}

function makeSession(tracks: PlayHistory[]): Session {
  const start = tracks[0].playedAt;
  const end = tracks[tracks.length - 1].playedAt;

  // Deterministic ID from start + end timestamps
  const id = `session_${start.getTime()}_${end.getTime()}`;

  // Unique album art URLs for preview (up to 4)
  const seen = new Set<string>();
  const previewImages: string[] = [];
  for (const t of tracks) {
    if (t.albumArt && !seen.has(t.albumArt)) {
      seen.add(t.albumArt);
      previewImages.push(t.albumArt);
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
  };
}

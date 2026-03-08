// Shared types matching the backend API responses

export interface User {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

export interface TrackInfo {
  id: string;
  playedAt: string; // ISO timestamp
  trackId: string;
  trackUri: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumArt: string;
  durationMs: number;
  userId: string;
}

export interface SessionSummary {
  id: string;
  startTime: string;
  endTime: string;
  trackCount: number;
  previewImages: string[];
}

export interface PaginatedSessions {
  data: SessionSummary[];
  hasMore: boolean;
}

export interface SessionDetail {
  id: string;
  startTime: string;
  endTime: string;
  trackCount: number;
  tracks: TrackInfo[];
  previewImages: string[];
}

export interface SavedSession {
  id: string;
  name: string;
  createdAt: string;
  startTime: string;
  endTime: string;
  spotifyPlaylistId?: string;
  spotifyPlaylistUrl?: string;
  trackUris: string[];
}

export interface SyncResult {
  synced: number;
  message?: string;
}

export interface CreatePlaylistResult {
  id: string;
  spotifyPlaylistId: string;
  spotifyPlaylistUrl: string;
  name: string;
}

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
  popularity?: number; // 0-100, from Spotify GET /tracks (may be null for older records)
  userId: string;
}

export interface SessionSummary {
  id: string;
  startTime: string;
  endTime: string;
  trackCount: number;
  previewImages: string[];
  tags: string[];
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
  tags: string[];
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
  previewImages: string[]; // album art derived from track URIs
}

export interface UserSavedTrack {
  id: string;
  savedAt: string;
  trackId: string;
  trackUri: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumArt: string;
  durationMs: number;
  popularity?: number;
}

export interface ShareLink {
  id: string;
  token: string;
  savedSessionId: string;
  visibility: "PRIVATE" | "LINK_ANYONE" | "SPECIFIC_USER";
  sharedWithUserId?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ShareLinkResponse {
  id: string;
  token: string;
  url: string;
  savedSessionId?: string;
  visibility: "PRIVATE" | "LINK_ANYONE" | "SPECIFIC_USER";
  expiresAt?: string;
  createdAt?: string;
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

export interface SaveSessionResult {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

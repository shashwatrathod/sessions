import axios, { AxiosError } from "axios";
import { prisma } from "./prisma";
import { config } from "../config";
import { encrypt, decrypt } from "./crypto";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export interface SpotifyTrack {
  playedAt: Date;
  trackId: string;
  trackUri: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumArt: string;
  durationMs: number;
}

// --- Token management ---

export async function getValidAccessToken(
  userId: string,
  session: import("express-session").Session &
    Partial<import("express-session").SessionData>,
): Promise<string> {
  // If token is in session and still valid (with 60s buffer), return it
  if (
    session.accessToken &&
    session.tokenExpiresAt &&
    new Date(session.tokenExpiresAt) > new Date(Date.now() + 60_000)
  ) {
    return session.accessToken;
  }

  // Token is missing or expired, we need to refresh it.
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Decrypt the refresh token
  const refreshToken = decrypt(user.encryptedRefreshToken);

  // Refresh the token
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.spotifyClientId,
    client_secret: config.spotifyClientSecret,
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>(`${SPOTIFY_ACCOUNTS}/api/token`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const {
    access_token,
    expires_in,
    refresh_token: new_refresh_token,
  } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  // If a new refresh token is provided, encrypt and save it
  if (new_refresh_token) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        encryptedRefreshToken: encrypt(new_refresh_token),
        tokenExpiresAt: expiresAt, // Keep DB timestamp in sync
      },
    });
  } else {
    // Just update the expiration time in the DB
    await prisma.user.update({
      where: { id: userId },
      data: { tokenExpiresAt: expiresAt },
    });
  }

  // Save the new access token to the session
  session.accessToken = access_token;
  session.tokenExpiresAt = expiresAt;

  // NOTE: The caller route must eventually respond, which triggers session auto-save,
  // or explicitly call session.save().

  return access_token;
}

function spotifyHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// --- Recently played ---

export async function getRecentlyPlayed(
  userId: string,
  session: import("express-session").Session,
  after?: number,
): Promise<SpotifyTrack[]> {
  const token = await getValidAccessToken(userId, session);

  const params: Record<string, string | number> = { limit: 50 };
  if (after !== undefined) params.after = after;

  try {
    const response = await axios.get<{
      items: Array<{
        played_at: string;
        track: {
          id: string;
          uri: string;
          name: string;
          duration_ms: number;
          artists: Array<{ name: string }>;
          album: {
            name: string;
            images: Array<{ url: string; width: number; height: number }>;
          };
        };
      }>;
    }>(`${SPOTIFY_API}/me/player/recently-played`, {
      headers: spotifyHeaders(token),
      params,
    });

    return response.data.items.map((item) => ({
      playedAt: new Date(item.played_at),
      trackId: item.track.id,
      trackUri: item.track.uri,
      trackName: item.track.name,
      artistNames: item.track.artists.map((a) => a.name),
      albumName: item.track.album.name,
      albumArt:
        item.track.album.images[1]?.url ??
        item.track.album.images[0]?.url ??
        "",
      durationMs: item.track.duration_ms,
    }));
  } catch (err) {
    const error = err as AxiosError;
    console.error("Failed to get recently played:", error.response?.data);
    throw error;
  }
}

/**
 * Upserts track metadata into the shared `tracks` table.
 * Call this during sync so PlayHistory can reference tracks by ID.
 */
export async function upsertTracks(tracks: SpotifyTrack[]): Promise<void> {
  if (tracks.length === 0) return;

  // Deduplicate by trackId (same track may appear multiple times in a sync batch)
  const unique = new Map<string, SpotifyTrack>();
  for (const t of tracks) unique.set(t.trackId, t);

  await prisma.$transaction(
    Array.from(unique.values()).map((t) =>
      prisma.track.upsert({
        where: { id: t.trackId },
        update: {
          // Always refresh name/art in case Spotify updated them
          name: t.trackName,
          artistNames: t.artistNames,
          albumName: t.albumName,
          albumArt: t.albumArt,
          durationMs: t.durationMs,
          uri: t.trackUri,
        },
        create: {
          id: t.trackId,
          uri: t.trackUri,
          name: t.trackName,
          artistNames: t.artistNames,
          albumName: t.albumName,
          albumArt: t.albumArt,
          durationMs: t.durationMs,
        },
      }),
    ),
  );
}

/**
 * Fetches track popularities from Spotify in batches of 50 and updates
 * the `popularity` field on existing Track records.
 */
export async function refreshTrackPopularities(
  userId: string,
  session: import("express-session").Session,
  trackIds: string[],
): Promise<void> {
  if (trackIds.length === 0) return;
  const token = await getValidAccessToken(userId, session);

  const BATCH = 50;
  for (let i = 0; i < trackIds.length; i += BATCH) {
    const batch = trackIds.slice(i, i + BATCH);
    try {
      const response = await axios.get<{
        tracks: Array<{ id: string; popularity: number } | null>;
      }>(`${SPOTIFY_API}/tracks`, {
        headers: spotifyHeaders(token),
        params: { ids: batch.join(",") },
      });

      await prisma.$transaction(
        response.data.tracks
          .filter((t): t is { id: string; popularity: number } => t !== null)
          .map((t) =>
            prisma.track.update({
              where: { id: t.id },
              data: { popularity: t.popularity },
            }),
          ),
      );
    } catch (err) {
      // Non-fatal — popularity is optional
      console.warn("Failed to refresh track popularities for batch:", err);
    }
  }
}

// --- User profile ---

export async function getSpotifyProfile(accessToken: string): Promise<{
  id: string;
  display_name: string;
  email?: string;
  images: Array<{ url: string }>;
}> {
  const response = await axios.get(`${SPOTIFY_API}/me`, {
    headers: spotifyHeaders(accessToken),
  });
  return response.data;
}

// --- Playlists ---

export async function createPlaylist(
  userId: string,
  session: import("express-session").Session,
  name: string,
  description: string,
  isPublic: boolean,
): Promise<{ id: string; external_urls: { spotify: string } }> {
  const token = await getValidAccessToken(userId, session);

  const response = await axios.post(
    `${SPOTIFY_API}/me/playlists`,
    { name, description, public: isPublic },
    {
      headers: { ...spotifyHeaders(token), "Content-Type": "application/json" },
    },
  );

  return response.data;
}

export async function addTracksToPlaylist(
  userId: string,
  session: import("express-session").Session,
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  const token = await getValidAccessToken(userId, session);

  // Spotify allows max 100 tracks per request
  const BATCH_SIZE = 100;
  for (let i = 0; i < trackUris.length; i += BATCH_SIZE) {
    const batch = trackUris.slice(i, i + BATCH_SIZE);
    await axios.post(
      `${SPOTIFY_API}/playlists/${playlistId}/tracks`,
      { uris: batch },
      {
        headers: {
          ...spotifyHeaders(token),
          "Content-Type": "application/json",
        },
      },
    );
  }
}

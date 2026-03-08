import axios, { AxiosError } from "axios";
import { prisma } from "./prisma";

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

async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // If token is still valid (with 60s buffer), return it
  if (user.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return user.accessToken;
  }

  // Refresh the token
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: user.refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  });

  const response = await axios.post<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>(`${SPOTIFY_ACCOUNTS}/api/token`, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const { access_token, expires_in, refresh_token } = response.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: access_token,
      tokenExpiresAt: expiresAt,
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
    },
  });

  return access_token;
}

function spotifyHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// --- Recently played ---

export async function getRecentlyPlayed(
  userId: string,
  after?: number,
): Promise<SpotifyTrack[]> {
  const token = await getValidAccessToken(userId);

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
  name: string,
  description: string,
  isPublic: boolean,
): Promise<{ id: string; external_urls: { spotify: string } }> {
  const token = await getValidAccessToken(userId);

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
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  const token = await getValidAccessToken(userId);

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

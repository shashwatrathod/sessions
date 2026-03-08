import { prisma } from "../lib/prisma";
import { getSpotifyProfile } from "../lib/spotify";
import { config } from "../config";
import { encrypt } from "../lib/crypto";
import axios from "axios";

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export class AuthService {
  static getSpotifyLoginUrl(): string {
    const clientId = config.spotifyClientId;
    const redirectUri = config.spotifyRedirectUri;
    const scope = [
      "user-read-private",
      "user-read-email",
      "user-read-recently-played",
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope,
      redirect_uri: redirectUri,
    });

    return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(
    code: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.spotifyRedirectUri,
      client_id: config.spotifyClientId,
      client_secret: config.spotifyClientSecret,
    });

    const response = await axios.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(`${SPOTIFY_ACCOUNTS}/api/token`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response.data;
  }

  static async upsertSpotifyUser(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): Promise<{ id: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const profile = await getSpotifyProfile(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);

    await prisma.user.upsert({
      where: { id: profile.id },
      update: {
        displayName: profile.display_name,
        email: profile.email,
        avatarUrl: profile.images?.[0]?.url ?? null,
        encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
      },
      create: {
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        avatarUrl: profile.images?.[0]?.url ?? null,
        encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
      },
    });

    return { id: profile.id, expiresAt };
  }

  static async getUserProfile(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, email: true, avatarUrl: true },
    });
  }
}

import { Router } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma";
import { getSpotifyProfile } from "../lib/spotify";

const router = Router();

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

// GET /api/auth/login - Redirects to Spotify authorization page
router.get("/login", (_req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? "";

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

  res.redirect(`${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`);
});

// GET /api/auth/callback - Spotify redirects here after user authorization
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

  if (error || !code) {
    res.redirect(`${frontendUrl}?error=access_denied`);
    return;
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
      client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
      client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
    });

    const tokenResponse = await axios.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(`${SPOTIFY_ACCOUNTS}/api/token`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Fetch user profile
    const profile = await getSpotifyProfile(access_token);

    // Upsert user in database
    await prisma.user.upsert({
      where: { id: profile.id },
      update: {
        displayName: profile.display_name,
        email: profile.email,
        avatarUrl: profile.images?.[0]?.url ?? null,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
      },
      create: {
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        avatarUrl: profile.images?.[0]?.url ?? null,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
      },
    });

    // Set session userId, then explicitly wait for the store to persist the
    // session row before redirecting. Without save(), the redirect fires before
    // Postgres commits the row and the subsequent /me call returns 401.
    req.session.userId = profile.id;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        res.redirect(`${frontendUrl}?error=session_failed`);
        return;
      }
      console.log(
        "[callback] session saved OK, sid:",
        req.session.id,
        "userId:",
        profile.id,
      );
      res.redirect(`${frontendUrl}/sessions`);
    });
  } catch (err) {
    console.error("Auth callback error:", err);
    res.redirect(`${frontendUrl}?error=auth_failed`);
  }
});

// GET /api/auth/me - Returns current logged-in user's profile
router.get("/me", async (req, res) => {
  console.log("[/me] cookies:", req.headers.cookie);
  console.log("[/me] session:", req.session);
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, displayName: true, email: true, avatarUrl: true },
    });

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

export default router;

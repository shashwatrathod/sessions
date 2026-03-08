/**
 * Centralized configuration module.
 * Reads and validates all environment variables at startup.
 * Required vars throw immediately if missing so the process fails fast.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // --- Spotify OAuth ---
  spotifyClientId: requireEnv("SPOTIFY_CLIENT_ID"),
  spotifyClientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
  spotifyRedirectUri: requireEnv("SPOTIFY_REDIRECT_URI"),

  // --- Database ---
  databaseUrl: requireEnv("DATABASE_URL"),

  // --- Session / Auth ---
  sessionSecret: requireEnv("SESSION_SECRET"),
  /**
   * Number of days the session cookie stays alive.
   * @default 7
   */
  sessionCookieDays: Number(process.env.SESSION_COOKIE_DAYS ?? 7),
  /**
   * SameSite attribute for the session cookie.
   * Use "none" (with secure=true) for cross-origin setups.
   * @default "lax"
   */
  cookieSameSite: (process.env.COOKIE_SAME_SITE ?? "lax") as
    | "lax"
    | "strict"
    | "none",

  // --- Server ---
  port: Number(process.env.PORT ?? 3000),
  /**
   * Derive secure cookie flag from NODE_ENV.
   * In production cookies must be sent over HTTPS only.
   */
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },

  // --- Frontend ---
  frontendUrl: requireEnv("FRONTEND_URL"),

  // --- Business logic ---
  /**
   * Gap in minutes between consecutive plays that splits a listening session.
   * @default 30
   */
  sessionGapMinutes: Number(process.env.SESSION_GAP_MINUTES ?? 30),
  /**
   * Maximum number of sessions returned per page.
   * @default 50
   */
  sessionsPageLimitMax: Number(process.env.SESSIONS_PAGE_LIMIT_MAX ?? 50),
} as const;

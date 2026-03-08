-- ============================================================
-- Migration: normalize_tracks_add_sharing
--
-- Steps:
--   1. Create the `tracks` table (normalized track metadata)
--   2. Migrate existing track data from `play_histories`
--   3. Add `tracks` FK to `play_histories`, drop old columns
--   4. Create `user_saved_tracks` (bookmarks)
--   5. Create `share_links` + enum for session sharing
-- ============================================================

-- 1. Create shared tracks table
CREATE TABLE "tracks" (
    "id"          TEXT NOT NULL,          -- Spotify track ID
    "uri"         TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "artistNames" TEXT[],
    "albumName"   TEXT NOT NULL,
    "albumArt"    TEXT NOT NULL,
    "durationMs"  INTEGER NOT NULL,
    "popularity"  INTEGER,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracks_uri_key" ON "tracks"("uri");

-- 2. Migrate existing track metadata from play_histories into tracks
--    Use ON CONFLICT DO NOTHING so duplicate Spotify track IDs are silently skipped.
INSERT INTO "tracks" ("id", "uri", "name", "artistNames", "albumName", "albumArt", "durationMs", "updatedAt")
SELECT DISTINCT ON ("trackId")
    "trackId",
    "trackUri",
    "trackName",
    "artistNames",
    "albumName",
    "albumArt",
    "durationMs",
    CURRENT_TIMESTAMP
FROM "play_histories"
ON CONFLICT ("id") DO NOTHING;

-- 3a. Add the new FK column to play_histories
--     The column already exists as TEXT (old Spotify ID); we just need to add
--     the FK constraint. But first verify — if column is missing (shouldn't be),
--     add it. Here we just add the constraint.

-- Add FK constraint: play_histories.trackId → tracks.id
ALTER TABLE "play_histories"
    ADD CONSTRAINT "play_histories_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3b. Drop the now-redundant denormalized columns from play_histories
ALTER TABLE "play_histories"
    DROP COLUMN IF EXISTS "trackUri",
    DROP COLUMN IF EXISTS "trackName",
    DROP COLUMN IF EXISTS "artistNames",
    DROP COLUMN IF EXISTS "albumName",
    DROP COLUMN IF EXISTS "albumArt",
    DROP COLUMN IF EXISTS "durationMs";

-- 4. Create user_saved_tracks (track bookmarks per user)
CREATE TABLE "user_saved_tracks" (
    "id"       TEXT NOT NULL,
    "savedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"   TEXT NOT NULL,
    "trackId"  TEXT NOT NULL,

    CONSTRAINT "user_saved_tracks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_saved_tracks_userId_trackId_key"
    ON "user_saved_tracks"("userId", "trackId");

CREATE INDEX "user_saved_tracks_userId_idx"
    ON "user_saved_tracks"("userId");

ALTER TABLE "user_saved_tracks"
    ADD CONSTRAINT "user_saved_tracks_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_saved_tracks"
    ADD CONSTRAINT "user_saved_tracks_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Create ShareVisibility enum + share_links table
CREATE TYPE "ShareVisibility" AS ENUM ('PRIVATE', 'LINK_ANYONE', 'SPECIFIC_USER');

CREATE TABLE "share_links" (
    "id"               TEXT NOT NULL,
    "token"            TEXT NOT NULL,
    "savedSessionId"   TEXT NOT NULL,
    "visibility"       "ShareVisibility" NOT NULL DEFAULT 'PRIVATE',
    "sharedWithUserId" TEXT,
    "expiresAt"        TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");
CREATE INDEX "share_links_savedSessionId_idx" ON "share_links"("savedSessionId");
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

ALTER TABLE "share_links"
    ADD CONSTRAINT "share_links_savedSessionId_fkey"
    FOREIGN KEY ("savedSessionId") REFERENCES "saved_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

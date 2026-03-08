-- Rename User table
ALTER TABLE "User" RENAME TO "users";

-- Rename PlayHistory table
ALTER TABLE "PlayHistory" RENAME TO "play_histories";

-- Rename SavedSession table
ALTER TABLE "SavedSession" RENAME TO "saved_sessions";

-- Rename Primary Keys
ALTER INDEX "User_pkey" RENAME TO "users_pkey";
ALTER INDEX "PlayHistory_pkey" RENAME TO "play_histories_pkey";
ALTER INDEX "SavedSession_pkey" RENAME TO "saved_sessions_pkey";

-- Rename Indexes
ALTER INDEX "PlayHistory_userId_playedAt_idx" RENAME TO "play_histories_userId_playedAt_idx";
ALTER INDEX "PlayHistory_userId_playedAt_key" RENAME TO "play_histories_userId_playedAt_key";
ALTER INDEX "SavedSession_userId_idx" RENAME TO "saved_sessions_userId_idx";

-- Rename Foreign Keys
ALTER TABLE "play_histories" RENAME CONSTRAINT "PlayHistory_userId_fkey" TO "play_histories_userId_fkey";
ALTER TABLE "saved_sessions" RENAME CONSTRAINT "SavedSession_userId_fkey" TO "saved_sessions_userId_fkey";

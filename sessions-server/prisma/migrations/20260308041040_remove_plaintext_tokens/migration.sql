/*
  Warnings:

  - You are about to drop the column `accessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `users` table. All the data in the column will be lost.
  - Added the required column `encryptedRefreshToken` to the `users` table without a default value. This is not possible if the table is not empty.

*/

DELETE FROM "play_histories";
DELETE FROM "user_saved_tracks";
DELETE FROM "share_links";
DELETE FROM "saved_sessions";
DELETE FROM "users";

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "accessToken",
DROP COLUMN "refreshToken",
ADD COLUMN     "encryptedRefreshToken" TEXT NOT NULL;

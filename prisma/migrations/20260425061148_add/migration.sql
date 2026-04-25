/*
  Warnings:

  - You are about to drop the column `age` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `banExpires` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `banReason` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `banned` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profileCompleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Artwork` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Artwork" DROP CONSTRAINT "Artwork_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_userId_fkey";

-- DropForeignKey
ALTER TABLE "post_tags" DROP CONSTRAINT "post_tags_postId_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropIndex
DROP INDEX "users_role_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "age",
DROP COLUMN "banExpires",
DROP COLUMN "banReason",
DROP COLUMN "banned",
DROP COLUMN "emailVerified",
DROP COLUMN "gender",
DROP COLUMN "image",
DROP COLUMN "profileCompleted",
DROP COLUMN "role",
ADD COLUMN     "timezone" TEXT;

-- DropTable
DROP TABLE "Artwork";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Media";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "documents";

-- DropTable
DROP TABLE "post_tags";

-- DropTable
DROP TABLE "posts";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verifications";

-- DropEnum
DROP TYPE "PostStatus";

-- DropEnum
DROP TYPE "Tag";

-- DropEnum
DROP TYPE "UserRole";

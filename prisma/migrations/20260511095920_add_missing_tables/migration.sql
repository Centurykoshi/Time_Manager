-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TodoDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'BOSS');

-- CreateEnum
CREATE TYPE "StudySessionSource" AS ENUM ('TIMER', 'MANUAL', 'IMPORTED');

-- CreateEnum
CREATE TYPE "GoalCadence" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "priority" "TodoPriority" NOT NULL DEFAULT 'MEDIUM',
    "difficulty" "TodoDifficulty" NOT NULL DEFAULT 'EASY',
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "tagId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "todo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_tags" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "goalXp" INTEGER NOT NULL DEFAULT 10,
    "userId" TEXT NOT NULL,

    CONSTRAINT "todo_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL,
    "subject" TEXT,
    "notes" TEXT,
    "source" "StudySessionSource" NOT NULL DEFAULT 'TIMER',
    "userId" TEXT NOT NULL,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_study_summaries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "day" DATE NOT NULL,
    "studiedMinutes" INTEGER NOT NULL DEFAULT 0,
    "focusSessions" INTEGER NOT NULL DEFAULT 0,
    "todosCompleted" INTEGER NOT NULL DEFAULT 0,
    "todosPlanned" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "daily_study_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_study_summaries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "studiedMinutes" INTEGER NOT NULL DEFAULT 0,
    "focusSessions" INTEGER NOT NULL DEFAULT 0,
    "todosCompleted" INTEGER NOT NULL DEFAULT 0,
    "studyDays" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "weekly_study_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cadence" "GoalCadence" NOT NULL DEFAULT 'WEEKLY',
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'sessions',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "goalGroupId" TEXT,
    "goalTagId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_groups" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "goal_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timer_settings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "animationIcon" TEXT NOT NULL DEFAULT 'Zap',
    "soundType" TEXT NOT NULL DEFAULT 'wind',
    "soundUrl" TEXT,
    "favoriteMinutes" INTEGER NOT NULL DEFAULT 25,
    "latestMinutes" INTEGER NOT NULL DEFAULT 25,
    "timerStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "timerDurationSec" INTEGER NOT NULL DEFAULT 1500,
    "timerRemainingSec" INTEGER NOT NULL DEFAULT 1500,
    "timerEndsAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "timer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "todo_items_userId_isDone_idx" ON "todo_items"("userId", "isDone");

-- CreateIndex
CREATE INDEX "todo_items_userId_dueAt_idx" ON "todo_items"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "todo_items_userId_createdAt_idx" ON "todo_items"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "todo_tags_userId_isBuiltin_idx" ON "todo_tags"("userId", "isBuiltin");

-- CreateIndex
CREATE UNIQUE INDEX "todo_tags_userId_slug_key" ON "todo_tags"("userId", "slug");

-- CreateIndex
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "study_sessions_userId_source_idx" ON "study_sessions"("userId", "source");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountId_providerId_key" ON "accounts"("accountId", "providerId");

-- CreateIndex
CREATE INDEX "verifications_expiresAt_idx" ON "verifications"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE INDEX "daily_study_summaries_userId_day_idx" ON "daily_study_summaries"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_study_summaries_userId_day_key" ON "daily_study_summaries"("userId", "day");

-- CreateIndex
CREATE INDEX "weekly_study_summaries_userId_weekStart_idx" ON "weekly_study_summaries"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_study_summaries_userId_weekStart_key" ON "weekly_study_summaries"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "goals_userId_cadence_idx" ON "goals"("userId", "cadence");

-- CreateIndex
CREATE INDEX "goals_userId_isArchived_idx" ON "goals"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "goals_userId_goalTagId_idx" ON "goals"("userId", "goalTagId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_groups_userId_slug_key" ON "goal_groups"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "timer_settings_userId_key" ON "timer_settings"("userId");

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "todo_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_study_summaries" ADD CONSTRAINT "daily_study_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_study_summaries" ADD CONSTRAINT "weekly_study_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_goalGroupId_fkey" FOREIGN KEY ("goalGroupId") REFERENCES "goal_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_goalTagId_fkey" FOREIGN KEY ("goalTagId") REFERENCES "todo_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_groups" ADD CONSTRAINT "goal_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timer_settings" ADD CONSTRAINT "timer_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

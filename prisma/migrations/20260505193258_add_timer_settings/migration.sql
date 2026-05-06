-- CreateTable
CREATE TABLE "timer_settings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "animationIcon" TEXT NOT NULL DEFAULT 'Zap',
    "soundType" TEXT NOT NULL DEFAULT 'wind',
    "soundUrl" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "timer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timer_settings_userId_key" ON "timer_settings"("userId");

-- AddForeignKey
ALTER TABLE "timer_settings" ADD CONSTRAINT "timer_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

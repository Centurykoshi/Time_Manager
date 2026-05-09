export const XP_PER_LEVEL = 500;
export const SESSION_MINUTES_PER_XP = 10;
export const MAX_DAILY_XP = 120;

// Task difficulty XP rewards (base values)
export const DIFFICULTY_XP = {
  EASY: 5,
  MEDIUM: 10,
  HARD: 15,
  BOSS: 40,
} as const;

export type Difficulty = keyof typeof DIFFICULTY_XP;

// Minimum XP for each difficulty (can't go below)
const DIFFICULTY_MIN_XP = {
  EASY: 2,
  MEDIUM: 5,
  HARD: 8,
  BOSS: 20,
} as const;

export function getTaskXp(difficulty: Difficulty, completedCountForDifficulty: number = 0): number {
  const baseXp = DIFFICULTY_XP[difficulty] ?? 5;
  const minXp = DIFFICULTY_MIN_XP[difficulty] ?? 2;
  
  // If 3 or fewer tasks completed for this difficulty, award full XP
  if (completedCountForDifficulty <= 3) {
    return baseXp;
  }
  
  // For each task beyond 3, decrease by 1 (minimum enforced)
  const tasksOverThreshold = completedCountForDifficulty - 3;
  const xpWithDecrease = baseXp - tasksOverThreshold;
  
  return Math.max(minXp, xpWithDecrease);
}

  const GOAL_CHECK_IN_BASE_XP = {
    WEEKLY: 12,
    MONTHLY: 18,
    YEARLY: 24,
    ALL_TIME: 30,
  } as const;

  export type GoalCadence = keyof typeof GOAL_CHECK_IN_BASE_XP;

  export function getGoalCheckInXp(targetValue: number, cadence: GoalCadence, tagXp?: number | null) {
    const safeTarget = Math.max(1, Math.round(targetValue));
    const cadenceBase = GOAL_CHECK_IN_BASE_XP[cadence] ?? GOAL_CHECK_IN_BASE_XP.WEEKLY;
    const baseXp = Math.max(1, Math.round(tagXp ?? cadenceBase));
    return Math.max(5, Math.round((baseXp * 4) / safeTarget));
  }

export function getSessionXp(durationMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(durationMinutes));
  return Math.floor(safeMinutes / SESSION_MINUTES_PER_XP);
}

export function getXpLevel(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safeXp % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel;

  return {
    level,
    xpIntoLevel,
    xpToNextLevel,
    progress: Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)),
  };
}
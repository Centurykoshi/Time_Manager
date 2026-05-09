export type GoalCadence = "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL_TIME";

export type Goal = {
  id: string;
  title: string;
  description?: string;
  cadence: GoalCadence;
  targetValue: number;
  currentValue: number;
  unit: string;
  createdAt?: string;
  updatedAt?: string;
  goalGroup?: { id: string; name: string; type: GoalCadence } | null;
};

export type GoalTemplate = {
  title: string;
  description: string;
  targetValue: number;
  unit: string;
};

export type GoalGroup = { id: string; name: string; slug: string; type: GoalCadence };

export const groupOrder: GoalCadence[] = ["WEEKLY", "MONTHLY", "YEARLY", "ALL_TIME"];

export const groupLabels: Record<GoalCadence, string> = {
  WEEKLY: "Weekly Goals",
  MONTHLY: "Monthly Goals",
  YEARLY: "Yearly Goals",
  ALL_TIME: "All Time Goals",
};

export const goalTemplates: Record<GoalCadence, GoalTemplate[]> = {
  WEEKLY: [
    { title: "Study sessions", description: "Hit a steady weekly study rhythm.", targetValue: 10, unit: "sessions" },
    { title: "Deep work blocks", description: "Protect focused work blocks during the week.", targetValue: 8, unit: "blocks" },
    { title: "Walks completed", description: "Move every week and keep energy steady.", targetValue: 5, unit: "walks" },
  ],
  MONTHLY: [
    { title: "Project milestones", description: "Push one meaningful milestone every month.", targetValue: 4, unit: "milestones" },
    { title: "Books read", description: "Create a monthly reading habit.", targetValue: 2, unit: "books" },
    { title: "Workout sessions", description: "Keep monthly health goals visible.", targetValue: 16, unit: "sessions" },
  ],
  YEARLY: [
    { title: "Big wins delivered", description: "Keep your biggest yearly objective on track.", targetValue: 1, unit: "win" },
    { title: "Books finished", description: "Stretch your learning across the year.", targetValue: 12, unit: "books" },
    { title: "Skills mastered", description: "Track major skill upgrades year over year.", targetValue: 3, unit: "skills" },
  ],
  ALL_TIME: [
    { title: "Dream streak", description: "A long-term goal that never expires.", targetValue: 365, unit: "days" },
    { title: "Lifetime sessions", description: "All focus sessions ever completed.", targetValue: 1000, unit: "sessions" },
    { title: "Milestones collected", description: "A durable total for the long game.", targetValue: 100, unit: "milestones" },
  ],
};

const cadenceWindowDays: Record<GoalCadence, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  YEARLY: 365,
  ALL_TIME: 3650,
};

const dayMs = 1000 * 60 * 60 * 24;

export function getGoalProgress(goal: Goal) {
  return Math.min(100, Math.round((goal.currentValue / Math.max(goal.targetValue, 1)) * 100));
}

export function getGoalPace(goal: Goal, now = new Date()) {
  if (!goal.createdAt) return null;

  const createdAtMs = new Date(goal.createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return null;

  const elapsedDays = Math.max(0, (now.getTime() - createdAtMs) / dayMs);
  const windowDays = cadenceWindowDays[goal.cadence];
  const expectedProgress = Math.min(100, (elapsedDays / windowDays) * 100);
  const actualProgress = getGoalProgress(goal);
  const expectedValue = Math.min(goal.targetValue, Math.round((goal.targetValue * expectedProgress) / 100));
  const paceDelta = actualProgress - expectedProgress;

  return {
    expectedProgress,
    actualProgress,
    expectedValue,
    paceDelta,
    status: paceDelta >= 10 ? ("ahead" as const) : paceDelta <= -15 ? ("behind" as const) : ("on-track" as const),
  };
}

export function getGoalPaceLabel(goal: Goal, now = new Date()) {
  const pace = getGoalPace(goal, now);
  if (!pace) return "No pace data";
  if (pace.status === "ahead") return "Ahead of pace";
  if (pace.status === "behind") return "Behind pace";
  return "On track";
}

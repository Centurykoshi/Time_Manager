export type DashboardSnapshot = {
  todosSummary: {
    total: number;
    done: number;
    open: number;
  };
  goalsSummary: {
    total: number;
  };
  xpSummary: {
    totalXp: number;
    level: number;
  };
  todaySummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
  };
  weekSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
    studyDays: number;
    weekStart: string;
    weekEnd: string;
  };
  allTimeSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
  };
  streakDays: number;
  streakBreakAt: string | null;
  dailySeries: Array<{
    day: string;
    label: string;
    studiedMinutes: number;
    focusSessions: number;
  }>;
  studyHeatmap: Array<{
    day: string;
    label: string;
    studiedMinutes: number;
    intensity: number;
  }>;
  taskDifficulty: {
    total: number;
    completed: number;
    completionRate: number;
    byDifficulty: Array<{
      level: "EASY" | "MEDIUM" | "HARD" | "BOSS";
      total: number;
      completed: number;
      percentOfTotal: number;
      completionRate: number;
    }>;
  };
  productivity: {
    averageSessionMinutes: number;
    averageDailyMinutesLast14Days: number;
    mostFocusedDayLabel: string;
  };
};

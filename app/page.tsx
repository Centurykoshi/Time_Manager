"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, CircleDot, Flame } from "lucide-react";
import { TimerPanel } from "./components/TimerPanel";
import { TodoPanel } from "./components/TodoPanel";
import { Sidebar } from "./components/Sidebar";
import { TodosPage } from "./components/TodosPage";
import { GoalsPage } from "./components/GoalsPage";
import { XpPage } from "./components/XpPage";
import { CommandSearch } from "./components/CommandSearch";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { AuthMenu } from "./components/AuthMenu";
import { NotificationPermissionBanner } from "./components/NotificationPermissionBanner";

type DashboardSnapshot = {
  todosSummary: { total: number; done: number; open: number };
  todaySummary: { studiedMinutes: number; focusSessions: number; todosCompleted: number; todosPlanned: number };
  weekSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    studyDays: number;
    weekStart: string;
    weekEnd: string;
  };
  streakDays: number;
  streakBreakAt: string | null;
  dailySeries: Array<{ day: string; label: string; studiedMinutes: number; focusSessions: number }>;
};

type SidebarPage = "main" | "todos" | "goals" | "xp";

type DashboardTodo = {
  id: string;
  createdAt: string;
  isDone: boolean;
};

type DashboardStudySession = {
  id: string;
  startedAt: string;
  durationMinutes: number;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(left: string, right: Date) {
  const leftDate = new Date(left);
  return startOfLocalDay(leftDate).getTime() === startOfLocalDay(right).getTime();
}

function formatTimeUntilStreakBreak(reference: Date, snapshot: DashboardSnapshot | null) {
  if (!snapshot || snapshot.streakDays <= 0) return "0m";

  const hasTodayActivity =
    snapshot.todaySummary.studiedMinutes > 0 || snapshot.todaySummary.focusSessions > 0 || snapshot.todaySummary.todosCompleted > 0;

  const breakAt = new Date(reference);
  breakAt.setDate(breakAt.getDate() + (hasTodayActivity ? 1 : 0));
  breakAt.setHours(23, 59, 59, 999);

  const remainingMs = Math.max(0, breakAt.getTime() - reference.getTime());
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState<SidebarPage>("main");
  const [todoCount, setTodoCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [xpLevel, setXpLevel] = useState<number | null>(null);
  const [todosForTodayStats, setTodosForTodayStats] = useState<DashboardTodo[]>([]);
  const [studySessionsForFooter, setStudySessionsForFooter] = useState<DashboardStudySession[]>([]);
  const lastLocalDayRef = useRef(startOfLocalDay(new Date()).getTime());

  const todaysTodos = todosForTodayStats.filter((todo) => isSameLocalDay(todo.createdAt, now));
  const todaysDoneCount = todaysTodos.filter((todo) => todo.isDone).length;
  const todaysOpenCount = Math.max(0, todaysTodos.length - todaysDoneCount);
  const todaysStudySessions = studySessionsForFooter.filter((session) => isSameLocalDay(session.startedAt, now));
  const todaysStudyMinutes = todaysStudySessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const todaysFocusSessions = todaysStudySessions.length;

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch("/api/dashboard");
      if (!response.ok) return;
      const data = (await response.json()) as DashboardSnapshot;
      if (active) setSnapshot(data);
    };

    const loadCounts = async () => {
      try {
        const [todosRes, goalsRes, xpRes, sessionsRes] = await Promise.all([
          fetch("/api/todos"),
          fetch("/api/goals"),
          fetch("/api/xp"),
          fetch("/api/study-sessions"),
        ]);

        if (todosRes.ok) {
          const todosData = (await todosRes.json()) as { todos: DashboardTodo[] };
          setTodoCount(todosData.todos.length);
          setTodosForTodayStats(todosData.todos);
        }

        if (goalsRes.ok) {
          const goalsData = (await goalsRes.json()) as { goals: Array<{ id: string }> };
          setGoalCount(goalsData.goals.length);
        }

        if (xpRes.ok) {
          const xpData = (await xpRes.json()) as { summary?: { level?: number } };
          setXpLevel(xpData.summary?.level ?? null);
        }

        if (sessionsRes.ok) {
          const sessionsData = (await sessionsRes.json()) as {
            sessions: DashboardStudySession[];
          };
          setStudySessionsForFooter(sessionsData.sessions);
        }
      } catch (error) {
        console.error("Failed to load counts:", error);
      }
    };

    const refresh = () => {
      void load();
      void loadCounts();
    };

    void load();
    void loadCounts();
    window.addEventListener("dashboard:changed", refresh);

    const timer = window.setInterval(() => {
      const current = new Date();
      setNow(current);

      const currentDay = startOfLocalDay(current).getTime();
      if (currentDay !== lastLocalDayRef.current) {
        lastLocalDayRef.current = currentDay;
        refresh();
      }
    }, 60_000);

    return () => {
      active = false;
      window.removeEventListener("dashboard:changed", refresh);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col bg-background text-foreground"
    >
      <header className="border-b border-border/40 bg-card/50 px-8 py-4">
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto flex max-w-7xl items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg className="h-4 w-4 text-primary-foreground" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="7" r="2" fill="currentColor" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-wide">FocusFlow</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <CommandSearch onNavigate={setCurrentPage} />
            <AuthMenu />
            <ThemeToggle />
          </div>
        </motion.div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activePage={currentPage} 
          onPageChange={setCurrentPage}
          todoCount={todoCount}
          goalCount={goalCount}
          xpCount={xpLevel ?? undefined}
        />
        <main className="flex-1 overflow-auto px-8 py-8">
          <div className="mx-auto max-w-4xl">
            {currentPage === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-2 mb-8"
                >
                  <h1 className="text-3xl font-semibold">Focus session</h1>
                  <p className="text-sm text-muted-foreground">Stay focused and finish what matters</p>
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <NotificationPermissionBanner />
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="grid gap-6 lg:grid-cols-[1.2fr_1fr]"
                >
                  <TimerPanel />
                  <TodoPanel />
                </motion.div>
              </motion.div>
            )}

            {currentPage === "todos" && (
              <div key="todos">
                <TodosPage />
              </div>
            )}

            {currentPage === "goals" && (
              <div key="goals">
                <GoalsPage />
              </div>
            )}

            {currentPage === "xp" && (
              <div key="xp">
                <XpPage />
              </div>
            )}
          </div>
        </main>
      </div>

      <motion.footer
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="border-t border-border/40 bg-card/50 px-8 py-4"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Tasks done today", value: todaysDoneCount, sub: `of ${todaysTodos.length}`, Icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Study time today", value: `${todaysStudyMinutes}m`, sub: `${todaysFocusSessions} sessions`, Icon: Clock, color: "text-blue-500" },
              {
                label: "Open tasks today",
                value: todaysOpenCount,
                sub: "Ready to focus",
                Icon: CircleDot,
                color: "text-amber-500",
              },
              {
                label: "Streak",
                value: `${snapshot?.streakDays ?? 0}d`,
                sub: `[${formatTimeUntilStreakBreak(now, snapshot)} left until it breaks]`,
                Icon: Flame,
                color: "text-orange-500",
                compact: true,
              },
            ].map((item) => {
              const Icon = item.Icon;
              return (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.02, y: -2 }}
                    className={`rounded-lg border border-border/30 bg-secondary/20 backdrop-blur-sm transition ${item.compact ? "p-2" : "p-3"}`}
                >
                  <div className={`flex items-start gap-2 ${item.compact ? "gap-1.5" : "gap-2"}`}>
                    <Icon className={`${item.compact ? "h-3.5 w-3.5" : "h-4 w-4"} mt-0.5 opacity-70 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`${item.compact ? "text-[9px]" : "text-xs"} uppercase tracking-wider text-muted-foreground`}>{item.label}</div>
                      <div className={`${item.compact ? "mt-0.5 text-sm" : "mt-1 text-xl"} font-semibold`}>{item.value}</div>
                      <div className={`${item.compact ? "text-[8px]" : "text-xs"} text-muted-foreground`}>{item.sub}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
}

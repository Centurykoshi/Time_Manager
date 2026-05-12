"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, CircleDot, Flame } from "lucide-react";
import Link from "next/link";
import { TimerPanel } from "./components/TimerPanel";
import { TodoPanel } from "./components/TodoPanel";
import { Sidebar } from "./components/Sidebar";
import { TodosPage } from "./components/TodosPage";
import { GoalsPage } from "./components/GoalsPage";
import { XpPage } from "./components/XpPage";

import { CommandSearch } from "./components/CommandSearch";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { Button } from "./components/ui/button";
import { UserAvatarMenu } from "./components/UserAvatarMenu";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";

import { NotificationPermissionBanner } from "./components/NotificationPermissionBanner";
import { authClient } from "@/lib/auth-client";

type DashboardSnapshot = {
  todosSummary: { total: number; done: number; open: number };
  goalsSummary: { total: number };
  xpSummary: { totalXp: number; level: number };
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

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
  const [currentPage, setCurrentPage] = useState<SidebarPage>("main");
  const [session, setSession] = useState<any>(null);
  const lastLocalDayRef = useRef(startOfLocalDay(new Date()).getTime());


  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionData = await authClient.getSession();
        // Only set session if there's an actual authenticated user
        // (not the demo user)
        if (sessionData?.data?.user?.id && !sessionData.data.user.email?.includes("focus.local")) {
          setSession(sessionData.data);
        }
      } catch (error) {
        // No session, that's fine
      }
    };
    fetchSession();
  }, []);

  const todoCount = snapshot?.todosSummary.total ?? 0;
  const goalCount = snapshot?.goalsSummary.total ?? 0;
  const xpLevel = snapshot?.xpSummary.level ?? null;
  const todaysDoneCount = snapshot?.todaySummary.todosCompleted ?? 0;
  const todaysOpenCount = Math.max(0, (snapshot?.todaySummary.todosPlanned ?? 0) - todaysDoneCount);
  const todaysStudyMinutes = snapshot?.todaySummary.studiedMinutes ?? 0;
  const todaysFocusSessions = snapshot?.todaySummary.focusSessions ?? 0;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) return;
        const data = (await response.json()) as DashboardSnapshot;
        if (active) setSnapshot(data);
      } catch (error) {
        console.error("Failed to load dashboard snapshot:", error);
      }
    };

    const refresh = () => {
      void load();
    };

    void load();
    window.addEventListener("dashboard:changed", refresh);

    const timer = window.setInterval(() => {
      const current = new Date();

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
    <SidebarProvider defaultOpen>
      <Sidebar 
        activePage={currentPage} 
        onPageChange={setCurrentPage}
        todoCount={todoCount}
        goalCount={goalCount}
        xpCount={xpLevel ?? undefined}
      />
      <SidebarInset>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen flex flex-col bg-background text-foreground"
        >
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm px-6 py-4">
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-end gap-3"
          >
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100">
            <CommandSearch onNavigate={setCurrentPage} />
            <ThemeToggle />
            {session?.user ? (
              <UserAvatarMenu user={session.user} />
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="default" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
          </motion.div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-8">
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
                  className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:auto-rows-[34rem] lg:items-stretch"
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
            )}          </div>
        </main>

        <motion.footer
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="px-6 py-4 mt-auto bg-transparent"
        >
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Tasks done today", value: todaysDoneCount, sub: `of ${snapshot?.todaySummary.todosPlanned ?? 0}`, Icon: CheckCircle2, color: "text-emerald-500" },
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
                sub: <StreakCountdown snapshot={snapshot} />,
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
                    className={`rounded-lg bg-secondary/20 backdrop-blur-sm transition ${item.compact ? "p-2" : "p-3"}`}
                >
                  <div className={`flex items-start gap-2 ${item.compact ? "gap-1.5" : "gap-2"}`}>
                    <Icon className={`${item.compact ? "h-3.5 w-3.5" : "h-4 w-4"} mt-0.5 opacity-70 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`${item.compact ? "text-[9px]" : "text-xs"} uppercase tracking-wider text-muted-foreground`}>{item.label}</div>
                      <div className={`${item.compact ? "mt-0.5 text-sm" : "mt-1 text-xl"} font-semibold`}>{item.value}</div>
                      <div className={`${item.compact ? "text-[8px]" : "text-xs"} text-muted-foreground`}>
                        {typeof item.sub === "string" ? item.sub : item.sub}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        </motion.footer>
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function StreakCountdown({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return <>{`[${formatTimeUntilStreakBreak(now, snapshot)} left until it breaks]`}</>;
}


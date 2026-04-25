"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Panel } from "./Panel";
import { Badge } from "./ui/badge";

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
  dailySeries: Array<{ day: string; label: string; studiedMinutes: number; focusSessions: number }>;
};

export function GoalPanel() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/dashboard");
        if (!response.ok) throw new Error("Failed to load dashboard data.");
        const data = (await response.json()) as DashboardSnapshot;
        if (active) setSnapshot(data);
      } catch (dashboardError) {
        if (active) {
          setError(dashboardError instanceof Error ? dashboardError.message : "Failed to load dashboard data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleRefresh = () => {
      void loadDashboard();
    };

    void loadDashboard();
    window.addEventListener("dashboard:changed", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("dashboard:changed", handleRefresh);
    };
  }, []);

  const progress = snapshot && snapshot.todosSummary.total > 0 ? snapshot.todosSummary.done / snapshot.todosSummary.total : 0;
  const completionPercent = Math.round(Math.min(progress, 1) * 100);

  return (
    <Panel
      title="Overview"
      right={
        <Badge variant="outline" className="opacity-40">
          {snapshot ? `${snapshot.streakDays} day streak` : "Loading..."}
        </Badge>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="flex h-full flex-col gap-3.5"
      >
        {loading ? (
          <div className="rounded-md border border-border bg-secondary/25 p-3 text-xs text-secondary-foreground/70">
            Loading saved study metrics...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            {error}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-md border border-border bg-secondary/20 p-2.5">
                <div className="text-[9px] uppercase tracking-[0.16em] text-secondary-foreground/40">Today</div>
                <div className="mt-1.5 text-xl font-semibold text-foreground">{snapshot.todaySummary.studiedMinutes}m</div>
                <div className="mt-0.5 text-[11px] text-secondary-foreground/40">{snapshot.todaySummary.focusSessions} sessions</div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-2.5">
                <div className="text-[9px] uppercase tracking-[0.16em] text-secondary-foreground/40">This week</div>
                <div className="mt-1.5 text-xl font-semibold text-foreground">{snapshot.weekSummary.studiedMinutes}m</div>
                <div className="mt-0.5 text-[11px] text-secondary-foreground/40">{snapshot.weekSummary.focusSessions} sessions</div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-2.5">
                <div className="text-[9px] uppercase tracking-[0.16em] text-secondary-foreground/40">Tasks</div>
                <div className="mt-1.5 text-xl font-semibold text-foreground">{snapshot.todosSummary.done}/{snapshot.todosSummary.total}</div>
                <div className="mt-0.5 text-[11px] text-secondary-foreground/40">{snapshot.todosSummary.open} open</div>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md border border-border bg-secondary/20 p-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-secondary-foreground/40">Task completion</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{completionPercent}%</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex min-w-44 flex-col gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-secondary-foreground/40">Current streak</div>
                  <div className="mt-0.5 text-lg font-semibold text-foreground">{snapshot.streakDays} days</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-secondary-foreground/40">Week window</div>
                  <div className="mt-0.5 text-xs text-secondary-foreground/70">
                    {snapshot.weekSummary.weekStart} to {snapshot.weekSummary.weekEnd}
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 pt-1 text-center text-[10px]">
                  {snapshot.dailySeries.map((day) => (
                    <div key={day.day} className="flex flex-col items-center gap-1">
                      <div className="h-8 w-1.5 overflow-hidden rounded-full bg-secondary/40">
                        <div
                          className="w-full rounded-full bg-primary"
                          style={{ height: `${Math.min(100, day.studiedMinutes * 4)}%`, marginTop: `${100 - Math.min(100, day.studiedMinutes * 4)}%` }}
                        />
                      </div>
                      <div className="text-secondary-foreground/40">{day.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </motion.div>
    </Panel>
  );
}

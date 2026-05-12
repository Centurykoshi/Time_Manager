"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, CalendarDays, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { XpTasksModal } from "./XpTasksModal";
import { XpAllTimeModal } from "./XpAllTimeModal";
import { getXpCache, loadRemoteXp, subscribeXpCache, type XpResponse } from "@/lib/xp-cache";

const DAILY_XP_CAP = 120;

function formatDateLabel(value: string) {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
  } catch {
    return "Unknown";
  }
}

function formatFullDateWithDay(value: string | null | undefined) {
  try {
    if (!value) return "Today";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date);
  } catch {
    return "Unknown";
  }
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayFromKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function XpPage() {
  const [data, setData] = useState<XpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showAllTimeModal, setShowAllTimeModal] = useState(false);
  const viewAllButtonProps = {
    variant: "default" as const,
    size: "sm" as const,
    className: "shrink-0",
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeXpCache((nextData) => {
      if (!active || !nextData) return;
      setData(nextData);
      setLoading(false);
    });

    const load = async (force = false) => {
      setLoading(true);
      try {
        const cachedData = getXpCache();
        if (cachedData && !force) {
          if (active) setData(cachedData);
          return;
        }

        const payload = await loadRemoteXp(force);
        if (active) {
          setData(payload);
        }
      } catch (error) {
        console.error("Failed to load XP data:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const onDashboardChanged = () => {
      void load(true);
    };
    const onWindowFocus = () => {
      void load(true);
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void load(true);
      }
    };

    // Keep XP in sync even when background updates happen without explicit events.
    const refreshInterval = window.setInterval(() => {
      void load(true);
    }, 15000);

    window.addEventListener("dashboard:changed", onDashboardChanged);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refreshInterval);
      window.removeEventListener("dashboard:changed", onDashboardChanged);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const summary = data?.summary;
  const todayKey = toLocalDateKey(new Date());
  const sortedDailyXp = useMemo(
    () => [...(data?.dailyXp ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [data?.dailyXp],
  );

  const visibleDailyXp = useMemo(() => {
    if (sortedDailyXp.length === 0) return [];

    const todayIndex = sortedDailyXp.findIndex((entry) => entry.day === todayKey);
    if (todayIndex === -1) return sortedDailyXp.slice(-7);

    const start = Math.max(0, todayIndex - 1);
    const end = Math.min(sortedDailyXp.length, todayIndex + 6);

    return sortedDailyXp.slice(start, end);
  }, [sortedDailyXp, todayKey]);

  const todayXp = sortedDailyXp.find((day) => day.day === todayKey)?.xp ?? 0;
  const allTimeDailyXp = useMemo(
    () => sortedDailyXp.filter((entry) => entry.day <= todayKey).reverse(),
    [sortedDailyXp, todayKey],
  );

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6 xl:-ml-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">XP tracker</p>
        <h2 className="mt-1 text-3xl font-semibold">All experience points</h2>
        <p className="mt-2 text-sm text-muted-foreground">Complete tasks to earn XP and level up. Harder tasks reward more points.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Lifetime XP
              </div>
              <div className="mt-2 text-4xl font-semibold">{summary?.totalXp ?? 0}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary?.tasksCompleted ?? 0} tasks completed
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current level</p>
              <p className="mt-1 text-3xl font-semibold text-amber-500">Lv {summary?.level ?? 1}</p>
              <p className="text-xs text-muted-foreground">{summary?.xpToNextLevel ?? 500} XP to next level</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-background/45 px-3 py-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <span>Daily XP</span>
                <span>{todayXp} / {DAILY_XP_CAP}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, (todayXp / DAILY_XP_CAP) * 100)}%` }} />
              </div>
            </div>

            <div className="rounded-xl bg-background/45 px-3 py-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <span>Today&apos;s level progress</span>
                <span>{summary?.progress ?? 0}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary?.progress ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {[
            { label: "XP this level", value: summary?.xpIntoLevel ?? 0, icon: Award },
            { label: "Next level XP", value: summary?.xpToNextLevel ?? 0, icon: Flame },
            { label: "Tasks completed", value: summary?.tasksCompleted ?? 0, icon: CalendarDays },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-amber-500" />
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold">{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
          <div>
            <h3 className="text-lg font-semibold">Your XP for 7 days</h3>
            <p className="text-sm text-muted-foreground">1 previous day, today, and the next 5 days.</p>
          </div>

          <div className="mt-4 space-y-3">
            {visibleDailyXp.map((day) => {
              const dayOffset = Math.round((dayFromKey(day.day).getTime() - dayFromKey(todayKey).getTime()) / 86400000);
              const isToday = dayOffset === 0;

              return (
                <div
                  key={day.day}
                  className={cn(
                    "rounded-xl bg-background/70 p-3",
                    isToday && "bg-linear-to-r from-amber-500/15 via-amber-400/8 to-transparent",
                  )}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{day.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDateLabel(day.day)} • {day.tasksCompleted} tasks</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-amber-500">{day.xp} XP</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/60">
                    <div className={cn("h-full rounded-full bg-primary transition-all", day.xp === 0 ? "opacity-20" : "opacity-100")} style={{ width: `${Math.min(100, (day.xp / DAILY_XP_CAP) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">All tasks with XP</h3>
              <p className="text-sm text-muted-foreground">All-time completed tasks and earned XP.</p>
            </div>
            <Button
              onClick={() => setShowTasksModal(true)}
              {...viewAllButtonProps}
            >
              View all
            </Button>
          </div>

          <div className="max-h-80 space-y-3 overflow-auto pr-1">
            {(data?.recentTasks ?? []).slice(0, 5).map((task) => (
              <div key={task.id} className="rounded-xl border border-border/50 bg-background/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.difficulty} • {formatFullDateWithDay(task.completedAt ?? new Date().toISOString())}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-amber-500">+{task.xpEarned}</p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </div>
              </div>
            ))}

            {loading ? <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">Loading task XP history...</div> : null}
            {!loading && (data?.recentTasks.length ?? 0) === 0 ? <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">No tasks completed with XP yet.</div> : null}
          </div>

          <XpTasksModal
            isOpen={showTasksModal}
            onClose={() => setShowTasksModal(false)}
            tasks={data?.recentTasks ?? []}
            loading={loading}
            formatFullDateWithDay={formatFullDateWithDay}
          />
          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">All time XP</h3>
                <p className="text-sm text-muted-foreground">Every tracked day with date, day name, and earned XP.</p>
              </div>
              <Button
                onClick={() => setShowAllTimeModal(true)}
                {...viewAllButtonProps}
              >
                View all
              </Button>
            </div>

            <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
              {allTimeDailyXp.map((day) => (
                <div key={day.day} className="rounded-xl border border-border/50 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{day.label}</p>
                      <p className="text-xs text-muted-foreground">{formatFullDateWithDay(day.day)} • {day.tasksCompleted} tasks</p>
                    </div>
                    <p className="text-lg font-semibold text-amber-500">{day.xp} XP</p>
                  </div>
                </div>
              ))}

              {loading ? <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">Loading all-time XP...</div> : null}
              {!loading && allTimeDailyXp.length === 0 ? <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">No daily XP records yet.</div> : null}
            </div>
          </div>

          <XpAllTimeModal
            isOpen={showAllTimeModal}
            onClose={() => setShowAllTimeModal(false)}
            entries={allTimeDailyXp}
            loading={loading}
            formatFullDateWithDay={formatFullDateWithDay}
          />
        </div>
      </div>
    </motion.section>
  );
}

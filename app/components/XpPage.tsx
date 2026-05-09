"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, CalendarDays, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type XpResponse = {
  summary: {
    totalXp: number;
    tasksCompleted: number;
    level: number;
    xpIntoLevel: number;
    xpToNextLevel: number;
    progress: number;
  };
  dailyXp: Array<{ day: string; label: string; xp: number; tasksCompleted: number }>;
  recentTasks: Array<{
    id: string;
    title: string;
    difficulty: string;
    xpEarned: number;
    completedAt: string | null;
  }>;
};

const DAILY_XP_CAP = 120;

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatFullDateWithDay(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function dayFromKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function XpPage() {
  const [data, setData] = useState<XpResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/xp");
        if (!response.ok) return;
        const payload = (await response.json()) as XpResponse;
        if (active) setData(payload);
      } catch (error) {
        console.error("Failed to load XP data:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    window.addEventListener("dashboard:changed", load);

    return () => {
      active = false;
      window.removeEventListener("dashboard:changed", load);
    };
  }, []);

  const summary = data?.summary;
  const todayKey = new Date().toISOString().slice(0, 10);
  const sortedDailyXp = useMemo(
    () => [...(data?.dailyXp ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
    [data?.dailyXp],
  );

  const visibleDailyXp = useMemo(() => {
    if (showAllDays) return sortedDailyXp;
    if (sortedDailyXp.length === 0) return [];

    let anchorIndex = sortedDailyXp.findIndex((entry) => entry.day === todayKey);
    if (anchorIndex === -1) {
      const firstAfterToday = sortedDailyXp.findIndex((entry) => entry.day > todayKey);
      anchorIndex = firstAfterToday === -1 ? sortedDailyXp.length - 1 : Math.max(0, firstAfterToday - 1);
    }

    let start = Math.max(0, anchorIndex - 2);
    let end = Math.min(sortedDailyXp.length, start + 7);
    if (end - start < 7) {
      start = Math.max(0, end - 7);
    }

    return sortedDailyXp.slice(start, end);
  }, [showAllDays, sortedDailyXp, todayKey]);

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
            <h3 className="text-lg font-semibold">Your all xps for 6 days</h3>
            <p className="text-sm text-muted-foreground">Daily XP earnings over the last 6 days.</p>
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
          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
            <h3 className="text-lg font-semibold">All task with XP</h3>
            <p className="text-sm text-muted-foreground">All-time completed tasks and earned XP.</p>

            <div className="mt-4 max-h-90 space-y-3 overflow-auto pr-1">
              {(data?.recentTasks ?? []).map((task) => (
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
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
            <h3 className="text-lg font-semibold">All time XP</h3>
            <p className="text-sm text-muted-foreground">Every tracked day with date, day name, and earned XP.</p>

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
        </div>
      </div>
    </motion.section>
  );
}
"use client";

import { motion } from "framer-motion";
import { Clock, Flame, Gauge, LogOut, Sparkles, Target, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/app/components/ui/sheet";
import { getGradientColors } from "@/lib/color-utils";
import type { DashboardSnapshot } from "@/lib/dashboard-types";

interface UserSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { email?: string; name?: string; image?: string; provider?: string };
  snapshot?: DashboardSnapshot | null;
}

function formatStudyTime(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours <= 0) return `${safeMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function heatColor(intensity: number) {
  if (intensity <= 0) return "bg-zinc-800/70";
  if (intensity === 1) return "bg-amber-900/60";
  if (intensity === 2) return "bg-amber-700/70";
  if (intensity === 3) return "bg-yellow-600/80";
  return "bg-yellow-400";
}

export function UserSummaryModal({ isOpen, onClose, user, snapshot }: UserSummaryModalProps) {
  const userEmail = user?.email || "user@example.com";
  const { color1, color2 } = getGradientColors(userEmail);
  const isGoogle = user?.provider === "google";
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  };

  const studyHeatmap = snapshot?.studyHeatmap ?? [];
  const heatWeeks = Array.from(
    { length: Math.ceil(studyHeatmap.length / 7) },
    (_, weekIndex) => studyHeatmap.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        title="Your analytics"
        side="right"
        className="w-full sm:w-[30rem] bg-background/95 backdrop-blur-xl border-l border-border/30 p-0"
      >
        <SheetHeader className="border-b border-border/30 px-6 py-5 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-full border border-border/30 flex items-center justify-center text-sm font-semibold shrink-0 relative overflow-hidden shadow-sm"
              style={{
                background: isGoogle
                  ? "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%)"
                  : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
              }}
            >
              {!isGoogle && <span className="relative z-10 text-white/90 drop-shadow-sm">{initials}</span>}
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6 overflow-auto max-h-[calc(100vh-96px)]">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Total XP",
                value: `${snapshot?.xpSummary.totalXp ?? 0}`,
                sub: `Level ${snapshot?.xpSummary.level ?? 1}`,
                Icon: Trophy,
              },
              {
                label: "Streak",
                value: `${snapshot?.streakDays ?? 0}d`,
                sub: "Keep momentum",
                Icon: Flame,
              },
              {
                label: "Study Time",
                value: formatStudyTime(snapshot?.allTimeSummary.studiedMinutes ?? 0),
                sub: `${snapshot?.allTimeSummary.focusSessions ?? 0} sessions`,
                Icon: Clock,
              },
              {
                label: "Task Completion",
                value: `${snapshot?.taskDifficulty.completionRate ?? 0}%`,
                sub: `${snapshot?.todosSummary.done ?? 0}/${snapshot?.todosSummary.total ?? 0}`,
                Icon: Target,
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.05 }}
                className="rounded-xl bg-gradient-to-br from-yellow-400/10 via-amber-500/5 to-transparent p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                  </div>
                  <item.Icon className="h-4 w-4 text-yellow-300/80 mt-0.5" />
                </div>
              </motion.div>
            ))}
          </div>

          <section className="rounded-xl border border-border/30 bg-card/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-300/90" />
              <h3 className="text-sm font-semibold">Study Heatmap (Last 6 Weeks)</h3>
            </div>
            <div className="flex gap-1.5">
              {heatWeeks.map((week, index) => (
                <div key={`week-${index}`} className="grid grid-rows-7 gap-1.5">
                  {week.map((cell) => (
                    <div
                      key={cell.day}
                      title={`${cell.day}: ${cell.studiedMinutes}m`}
                      className={`h-3 w-3 rounded-[2px] ${heatColor(cell.intensity)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/30 bg-card/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-300/90" />
              <h3 className="text-sm font-semibold">Task Difficulty Analytics</h3>
            </div>
            <div className="space-y-3">
              {(snapshot?.taskDifficulty.byDifficulty ?? []).map((row) => (
                <div key={row.level} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{row.level}</span>
                    <span className="text-muted-foreground">
                      {row.completed}/{row.total} done - {row.percentOfTotal}% mix
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-200"
                      style={{ width: `${row.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/30 bg-card/40 p-4">
            <h3 className="text-sm font-semibold mb-3">Focus Quality</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Avg Session</p>
                <p className="text-sm font-semibold mt-1">{snapshot?.productivity.averageSessionMinutes ?? 0}m</p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Avg Daily (14d)</p>
                <p className="text-sm font-semibold mt-1">
                  {snapshot?.productivity.averageDailyMinutesLast14Days ?? 0}m
                </p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Best Day</p>
                <p className="text-xs font-semibold mt-1 truncate">{snapshot?.productivity.mostFocusedDayLabel ?? "-"}</p>
              </div>
            </div>
          </section>

          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

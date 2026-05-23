"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame, LogOut, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader } from "@/app/components/ui/sheet";
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
          <SheetDescription className="sr-only">
            User summary with key productivity stats including streak, tasks completed, and focus time.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6 overflow-auto max-h-[calc(100vh-96px)]">
          <div className="grid grid-cols-1 gap-3">
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
                label: "Tasks Completed",
                value: `${snapshot?.todosSummary.done ?? 0}`,
                sub: `${snapshot?.todosSummary.total ?? 0} total tasks`,
                Icon: CheckCircle2,
              },
              {
                label: "Focus Time",
                value: formatStudyTime(snapshot?.allTimeSummary.studiedMinutes ?? 0),
                sub: `${snapshot?.allTimeSummary.focusSessions ?? 0} sessions`,
                Icon: Clock,
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
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Quick Overview</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Today</p>
                <p className="text-sm font-semibold mt-1">{snapshot?.todaySummary.todosCompleted ?? 0} done</p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">This Week</p>
                <p className="text-sm font-semibold mt-1">{snapshot?.weekSummary.todosCompleted ?? 0} done</p>
              </div>
              <div className="rounded-lg bg-secondary/20 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Sessions</p>
                <p className="text-sm font-semibold mt-1">{snapshot?.allTimeSummary.focusSessions ?? 0}</p>
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

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Trophy, TrendingUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/app/components/ui/sheet";
import { getGradientColors } from "@/lib/color-utils";

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
  allTimeSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
  };
  streakDays: number;
  streakBreakAt: string | null;
  dailySeries: Array<{ day: string; label: string; studiedMinutes: number; focusSessions: number }>;
};

interface UserSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { email?: string; name?: string; image?: string; provider?: string };
  snapshot?: DashboardSnapshot | null;
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

  const totalStudyMinutes = snapshot?.allTimeSummary.studiedMinutes ?? 0;
  const totalFocusSessions = snapshot?.allTimeSummary.focusSessions ?? 0;
  const formatStudyTime = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.floor(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours <= 0) {
      return `${safeMinutes} minute${safeMinutes === 1 ? "" : "s"}`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
  };
  const totalTasksDone = snapshot?.todosSummary.done ?? 0;
  const totalTasksPlanned = snapshot?.todosSummary.total ?? 0;
  const totalXp = snapshot?.xpSummary.totalXp ?? 0;
  const xpLevel = snapshot?.xpSummary.level ?? 1;
  const streakDays = snapshot?.streakDays ?? 0;
  const allTimeTasksDone = snapshot?.allTimeSummary.todosCompleted ?? 0;
  const allTimeTasksPlanned = snapshot?.allTimeSummary.todosPlanned ?? 0;

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent title="User summary" side="right" className="w-full sm:w-96 bg-background/95 backdrop-blur-sm border-l border-border/30 p-0">
        <SheetHeader className="border-b border-border/30 px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full border border-border/30 flex items-center justify-center text-sm font-semibold shrink-0 relative overflow-hidden shadow-sm"
              style={{
                background: isGoogle
                  ? "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%)"
                  : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
              }}
            >
              <div className="absolute inset-0 bg-primary/14 transition-colors" />
              <div className="absolute inset-0 bg-background/8 mix-blend-soft-light" />
              {!isGoogle && <span className="relative z-10 text-white/90 drop-shadow-sm">{initials}</span>}
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-6 space-y-6 overflow-auto max-h-[calc(100vh-100px)]">
          {/* Stats Grid */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              Summary Statistics
            </h3>

            <div className="grid gap-3">
              {/* Total Study Hours */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-lg bg-secondary/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Study Hours</p>
                    <p className="text-2xl font-bold mt-2">{formatStudyTime(totalStudyMinutes)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{totalStudyMinutes} minutes total</p>
                  </div>
                  <Clock className="h-5 w-5 text-blue-500 opacity-70" />
                </div>
              </motion.div>

              {/* Total Tasks Done */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-lg bg-secondary/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Tasks Completed</p>
                    <p className="text-2xl font-bold mt-2">{totalTasksDone}</p>
                    <p className="text-xs text-muted-foreground mt-1">of {totalTasksPlanned} total tasks</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-70" />
                </div>
              </motion.div>

              {/* Total XP */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-lg bg-secondary/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Experience</p>
                    <p className="text-2xl font-bold mt-2">{totalXp.toLocaleString()} XP</p>
                    <p className="text-xs text-muted-foreground mt-1">Level {xpLevel}</p>
                  </div>
                  <Trophy className="h-5 w-5 text-amber-500 opacity-70" />
                </div>
              </motion.div>

              {/* Streak */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 rounded-lg bg-secondary/20 backdrop-blur-sm border border-border/20 hover:border-border/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Streak</p>
                    <p className="text-2xl font-bold mt-2">{streakDays} days</p>
                    <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-orange-500 opacity-70" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* All Time Stats */}
          <div className="space-y-4 pt-4 border-t border-border/20">
            <h3 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              All Time
            </h3>

            <div className="grid gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-3 rounded-lg bg-secondary/10 border border-border/20"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Study Time</p>
                  <p className="font-semibold">{formatStudyTime(totalStudyMinutes)}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-3 rounded-lg bg-secondary/10 border border-border/20"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Focus Sessions</p>
                  <p className="font-semibold">{totalFocusSessions}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-3 rounded-lg bg-secondary/10 border border-border/20"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Tasks Done</p>
                  <p className="font-semibold">{allTimeTasksDone} of {allTimeTasksPlanned}</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Logout Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            onClick={handleLogout}
            className="w-full mt-6 px-4 py-2 rounded-lg text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
          >
            Logout
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { motion } from "framer-motion";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Goal, getGoalPace, getGoalPaceLabel, getGoalProgress } from "./goals";
import { cn } from "@/lib/utils";
import { getGoalCheckInXp } from "@/lib/xp";

type GoalProgressCardProps = {
  goal: Goal;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgress: (id: string, newValue: number) => Promise<void>;
};

export function GoalProgressCard({ goal, onDelete, onUpdateProgress }: GoalProgressCardProps) {
  const progress = getGoalProgress(goal);
  const pace = getGoalPace(goal);
  const paceLabel = getGoalPaceLabel(goal);
  const behindPace = pace?.status === "behind";
  const isCompleted = progress >= 100;
  const expectedWidth = pace ? `${Math.max(0, Math.min(100, pace.expectedProgress))}%` : "0%";
  const xpPerCheckIn = getGoalCheckInXp(goal.targetValue, goal.cadence, goal.goalTag?.goalXp);
  const statusLabel = isCompleted ? "Completed" : behindPace ? "Behind" : pace?.status === "ahead" ? "Ahead" : "On track";
  const statusClassName = isCompleted
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
    : behindPace
      ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
      : pace?.status === "ahead"
        ? "border-sky-400/35 bg-sky-500/10 text-sky-200"
        : "border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        isCompleted
          ? "border-emerald-500/35 bg-emerald-500/8"
          : behindPace
            ? "border-amber-500/35 bg-amber-500/8"
            : "border-border/60 bg-card/85",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{goal.goalGroup?.type ?? goal.cadence}</div>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-base font-semibold">{goal.title}</p>
            {goal.goalTag ? <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">{goal.goalTag.name}</Badge> : null}
            <Badge variant="outline" className={statusClassName}>{statusLabel}</Badge>
            <Badge variant="secondary" className="gap-1">
              +{xpPerCheckIn} XP
              <ArrowRight className="h-3 w-3" />
              / check-in
            </Badge>
          </div>
          {goal.description ? <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">Every progress log creates a completed todo entry and feeds XP into the dashboard.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {goal.currentValue} of {goal.targetValue} {goal.unit}
          </p>
        </div>
        <button onClick={() => void onDelete(goal.id)} className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Delete goal">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{paceLabel}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          {pace ? <div className="absolute top-0 h-full w-px bg-amber-500/90" style={{ left: expectedWidth }} /> : null}
        </div>
        {pace ? <p className="text-xs text-muted-foreground">Expected pace: {Math.round(pace.expectedProgress)}% by now</p> : null}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 1, goal.targetValue))}>Log 1</Button>
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 5, goal.targetValue))}>Log 5</Button>
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 10, goal.targetValue))}>Log 10</Button>
      </div>
    </motion.div>
  );
}
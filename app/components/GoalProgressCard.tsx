"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Goal, getGoalPace, getGoalPaceLabel, getGoalProgress } from "./goals";
import { cn } from "@/lib/utils";

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
  const expectedWidth = pace ? `${Math.max(0, Math.min(100, pace.expectedProgress))}%` : "0%";

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border p-4 transition-colors", behindPace ? "border-amber-500/35 bg-amber-500/8" : "border-border/60 bg-card/85")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{goal.goalGroup?.type ?? goal.cadence}</div>
          <p className="mt-2 text-base font-semibold">{goal.title}</p>
          {goal.description ? <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p> : null}
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
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 1, goal.targetValue))}>+1</Button>
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 5, goal.targetValue))}>+5</Button>
        <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 10, goal.targetValue))}>+10</Button>
      </div>
    </motion.div>
  );
}
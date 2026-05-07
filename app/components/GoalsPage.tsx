"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type GoalGroupType = "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL_TIME";

type Goal = {
  id: string;
  title: string;
  description?: string;
  cadence: GoalGroupType;
  targetValue: number;
  currentValue: number;
  unit: string;
  goalGroup?: { id: string; name: string; type: GoalGroupType } | null;
};

type GoalGroup = { id: string; name: string; slug: string; type: GoalGroupType };

const groupOrder: GoalGroupType[] = ["WEEKLY", "MONTHLY", "YEARLY", "ALL_TIME"];

const groupLabels: Record<GoalGroupType, string> = {
  WEEKLY: "Weekly Goals",
  MONTHLY: "Monthly Goals",
  YEARLY: "Yearly Goals",
  ALL_TIME: "All Time Goals",
};

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [groups, setGroups] = useState<GoalGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupFilter, setActiveGroupFilter] = useState<GoalGroupType | "ALL">("WEEKLY");

  useEffect(() => {
    loadAll();
    window.addEventListener("dashboard:changed", loadAll);
    return () => window.removeEventListener("dashboard:changed", loadAll);
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [gRes, goalsRes] = await Promise.all([fetch("/api/goal-groups"), fetch("/api/goals")]);
      const gJson = gRes.ok ? await gRes.json() : { groups: [] };
      const goalsJson = goalsRes.ok ? await goalsRes.json() : { goals: [] };
      const groupsData: GoalGroup[] = (gJson.groups ?? []).slice().sort((a: GoalGroup, b: GoalGroup) => groupOrder.indexOf(a.type) - groupOrder.indexOf(b.type));
      const goalsData: Goal[] = goalsJson.goals ?? [];

      setGroups(groupsData);
      setGoals(goalsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createGoal = async (group: GoalGroup, title: string, target: number) => {
    if (!title || !target) return null;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetValue: Math.round(target),
          cadence: group.type,
          goalGroupId: group.id,
        }),
      });
      if (res.ok) {
        const j = await res.json();
        setGoals((s) => [j.goal, ...s]);
        window.dispatchEvent(new Event("dashboard:changed"));
        return j.goal;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleUpdateProgress = async (id: string, newValue: number) => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: newValue }),
      });

      if (response.ok) {
        setGoals((g) => g.map((x) => (x.id === id ? { ...x, currentValue: newValue } : x)));
        window.dispatchEvent(new Event("dashboard:changed"));
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });

      if (response.ok) {
        setGoals((g) => g.filter((x) => x.id !== id));
        window.dispatchEvent(new Event("dashboard:changed"));
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const orderedGroups = groupOrder.map((type) => groups.find((group) => group.type === type)).filter(Boolean) as GoalGroup[];
  const goalsForGroup = (groupType: GoalGroupType) => goals.filter((goal) => goal.goalGroup?.type === groupType);
  const visibleGoals = goals.filter((goal) => {
    if (activeGroupFilter === "ALL") return true;
    return goal.goalGroup?.type === activeGroupFilter || (!goal.goalGroup && goal.cadence === activeGroupFilter);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Goals</h1>
        <p className="text-sm text-muted-foreground">{goals.length} active goal{goals.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderedGroups.map((group) => (
          <GoalGroupCard
            key={group.id}
            group={group}
            goals={goalsForGroup(group.type)}
            onCreate={createGoal}
            onDelete={handleDeleteGoal}
          />
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveGroupFilter("ALL")} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", activeGroupFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            All Goals
          </button>
          {groupOrder.map((type) => (
            <button key={type} onClick={() => setActiveGroupFilter(type)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", activeGroupFilter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {groupLabels[type]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
          ) : (
            visibleGoals.map((goal) => {
              const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
              const isComplete = goal.currentValue >= goal.targetValue;

              return (
                <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className={cn("rounded-lg border bg-muted/20 p-4 transition-all hover:border-border/80 hover:bg-muted/40", isComplete ? "border-border/50" : "border-border/50")}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold break-words">{goal.title}</h3>
                        {goal.description ? <p className="mt-1 break-words text-sm text-muted-foreground">{goal.description}</p> : null}
                        <p className="mt-2 text-xs text-muted-foreground">{goal.goalGroup?.type ?? goal.cadence}</p>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="flex-shrink-0 rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <span className="font-semibold text-primary">{Math.round(progress)}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className="h-full rounded-full bg-primary" />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleUpdateProgress(goal.id, Math.min(goal.currentValue + 1, goal.targetValue))} className="rounded bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80">+1</button>
                        <button onClick={() => handleUpdateProgress(goal.id, Math.min(goal.currentValue + 5, goal.targetValue))} className="rounded bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80">+5</button>
                        <button onClick={() => handleUpdateProgress(goal.id, Math.min(goal.currentValue + 10, goal.targetValue))} className="rounded bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/80">+10</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}

function GoalGroupCard({
  group,
  goals,
  onCreate,
  onDelete,
}: {
  group: GoalGroup;
  goals: Goal[];
  onCreate: (group: GoalGroup, title: string, target: number) => Promise<Goal | null>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const trimmedTitle = title.trim();
    const parsedTarget = Number(target);
    if (!trimmedTitle || !Number.isFinite(parsedTarget) || parsedTarget <= 0) return;

    setIsAdding(true);
    try {
      const created = await onCreate(group, trimmedTitle, parsedTarget);
      if (created) {
        setTitle("");
        setTarget("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{groupLabels[group.type]}</h2>
          <p className="text-sm text-muted-foreground">Create and track goals in this bucket.</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{goals.length}</span>
      </div>

      <div className="mt-4 space-y-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Goal title" />
        <div className="flex gap-2">
          <Input value={target} onChange={(event) => setTarget(event.target.value)} type="number" min="1" placeholder="Target" className="w-28" />
          <Button onClick={handleAdd} disabled={isAdding} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet.</p> : null}
        {goals.slice(0, 3).map((goal) => (
          <div key={goal.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/40 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{goal.title}</p>
              <p className="text-xs text-muted-foreground">{goal.currentValue} / {goal.targetValue} {goal.unit}</p>
            </div>
            <button onClick={() => void onDelete(goal.id)} className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Delete goal">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

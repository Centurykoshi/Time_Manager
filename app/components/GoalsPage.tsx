"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Clock3, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Goal, GoalCadence, GoalGroup, groupLabels, groupOrder } from "./goals";
import { GoalDetailPage } from "./GoalDetailPage";
import { GoalProgressCard } from "./GoalProgressCard";
import { XpPage } from "./XpPage";
import { notifyGoalReached } from "@/lib/notifications";
import { DIFFICULTY_XP, type Difficulty } from "@/lib/xp";

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [groups, setGroups] = useState<GoalGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupFilter, setActiveGroupFilter] = useState<GoalCadence | "ALL">("WEEKLY");
  const [selectedCadence, setSelectedCadence] = useState<GoalCadence | null>(null);
  const [activeView, setActiveView] = useState<"goals" | "xp">("goals");

  async function loadAll() {
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
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
    window.addEventListener("dashboard:changed", loadAll);
    return () => window.removeEventListener("dashboard:changed", loadAll);
  }, []);

  const ensureTag = async (tagName: string, goalXp: number) => {
    const trimmed = tagName.trim();
    if (!trimmed) return null;

    try {
      const response = await fetch("/api/todo-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, goalXp }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { tag: { id: string } };
      return payload.tag;
    } catch {
      return null;
    }
  };

  const createGoal = async (group: GoalGroup, title: string, target: number, description: string, unit: string, difficulty: Difficulty) => {
    if (!title || !target) return null;
    try {
      const tag = await ensureTag(difficulty, DIFFICULTY_XP[difficulty]);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          targetValue: Math.round(target),
          cadence: group.type,
          currentValue: 0,
          unit: unit.trim() || "sessions",
          goalGroupId: group.id,
          goalTagId: tag?.id ?? null,
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
      const goal = goals.find((g) => g.id === id);
      const response = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: newValue }),
      });

      if (response.ok) {
        setGoals((g) => g.map((x) => (x.id === id ? { ...x, currentValue: newValue } : x)));
        window.dispatchEvent(new Event("dashboard:changed"));

        // Send notification if goal is reached
        if (goal && newValue >= goal.targetValue && goal.currentValue < goal.targetValue) {
          notifyGoalReached(goal.title);
        }
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
  const goalsForGroup = (groupType: GoalCadence) => goals.filter((goal) => goal.goalGroup?.type === groupType || (!goal.goalGroup && goal.cadence === groupType));
  const visibleGoals = activeGroupFilter === "ALL" ? goals : goalsForGroup(activeGroupFilter);
  const selectedGroup = selectedCadence ? groups.find((group) => group.type === selectedCadence) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Goals</h1>
        <p className="text-sm text-muted-foreground">
          {goals.length} active goal{goals.length !== 1 ? "s" : ""} • XP grows from completed focus sessions
        </p>
      </div>

      <div className="inline-flex rounded-full border border-border/60 bg-muted/20 p-1">
        <button
          onClick={() => setActiveView("goals")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
            activeView === "goals" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Target className="h-4 w-4" />
          Goals
        </button>
        <button
          onClick={() => setActiveView("xp")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
            activeView === "xp" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-4 w-4" />
          XP
        </button>
      </div>

      {activeView === "xp" ? (
        <XpPage />
      ) : selectedGroup ? (
        <GoalDetailPage
          group={selectedGroup}
          goals={goalsForGroup(selectedGroup.type)}
          onBack={() => setSelectedCadence(null)}
          onCreate={createGoal}
          onDelete={handleDeleteGoal}
          onUpdateProgress={handleUpdateProgress}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {orderedGroups.map((group) => {
              const bucketGoals = goalsForGroup(group.type);
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedCadence(group.type)}
                  className={cn(
                    "group rounded-2xl border border-border/60 bg-muted/15 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/25",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {group.type === "WEEKLY" ? <CalendarDays className="h-3.5 w-3.5" /> : group.type === "MONTHLY" ? <Clock3 className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
                        {group.type}
                      </div>
                      <h2 className="mt-2 text-lg font-semibold">{groupLabels[group.type]}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Open the {groupLabels[group.type].toLowerCase()} page.</p>
                    </div>
                    <div className="rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">{bucketGoals.length}</div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Manage goals</span>
                    <span className="inline-flex items-center gap-1 text-primary transition-transform group-hover:translate-x-0.5">
                      Open <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">All goals</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {activeGroupFilter === "ALL" ? "all goals" : groupLabels[activeGroupFilter]}.
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{visibleGoals.length} items</span>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">Loading goals...</div>
              ) : visibleGoals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">No goals match this filter.</div>
              ) : (
                visibleGoals.map((goal) => <GoalProgressCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} onUpdateProgress={handleUpdateProgress} />)
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => setActiveGroupFilter("ALL")} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", activeGroupFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                All Goals
              </button>
              {groupOrder.map((type) => (
                <button key={type} onClick={() => setActiveGroupFilter(type)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", activeGroupFilter === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {groupLabels[type]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

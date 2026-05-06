"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  cadence: "WEEKLY" | "MONTHLY";
  targetValue: number;
  currentValue: number;
  unit: string;
  isArchived: boolean;
};

const cadenceLabel: Record<Goal["cadence"], string> = {
  WEEKLY: "Week",
  MONTHLY: "Month",
};

export function GoalPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("20");
  const [unit, setUnit] = useState("sessions");
  const [cadence, setCadence] = useState<Goal["cadence"]>("WEEKLY");

  const loadGoals = async () => {
    const response = await fetch("/api/goals");
    if (!response.ok) throw new Error("Failed to load goals.");
    const payload = (await response.json()) as { goals: Goal[] };
    return payload.goals;
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextGoals = await loadGoals();
        if (active) setGoals(nextGoals);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Failed to load goals.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const activeGoals = useMemo(() => goals.filter((goal) => !goal.isArchived), [goals]);
  const weeklyGoals = activeGoals.filter((goal) => goal.cadence === "WEEKLY");
  const monthlyGoals = activeGoals.filter((goal) => goal.cadence === "MONTHLY");

  const createGoal = async () => {
    const trimmedTitle = title.trim();
    const parsedTarget = Number(targetValue);

    if (!trimmedTitle || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Goal title and target value are required.");
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          cadence,
          targetValue: parsedTarget,
          currentValue: 0,
          unit: unit.trim() || "sessions",
        }),
      });

      if (!response.ok) throw new Error("Failed to create goal.");

      const payload = (await response.json()) as { goal: Goal };
      setGoals((current) => [payload.goal, ...current]);
      setTitle("");
      setDescription("");
      setTargetValue("20");
      setUnit("sessions");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create goal.");
    }
  };

  const updateGoal = async (id: string, patch: Partial<Pick<Goal, "currentValue" | "isArchived">>) => {
    const target = goals.find((goal) => goal.id === id);
    if (!target) return;

    setGoals((current) => current.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)));

    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) throw new Error("Failed to update goal.");

      const payload = (await response.json()) as { goal: Goal };
      if (payload.goal) {
        setGoals((current) => current.map((goal) => (goal.id === id ? payload.goal : goal)));
      }
    } catch {
      setGoals((current) => current.map((goal) => (goal.id === id ? target : goal)));
      setError("Failed to update goal.");
    }
  };

  const removeGoal = async (id: string) => {
    const previous = goals;
    setGoals((current) => current.filter((goal) => goal.id !== id));

    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete goal.");
    } catch {
      setGoals(previous);
      setError("Failed to delete goal.");
    }
  };

  return (
    <Card className="h-full border-border/70 bg-card/80 shadow-[0_16px_40px_rgba(2,6,23,0.22)] backdrop-blur-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardDescription>Goals</CardDescription>
          <CardTitle className="mt-1 text-2xl">Progress targets</CardTitle>
        </div>
        <Badge variant="outline">{activeGoals.length} active</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-secondary/25 p-4">
          <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Goal title" />
            <Input value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder="Target" inputMode="numeric" />
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" />
            <Button onClick={() => void createGoal()} className="uppercase tracking-[0.12em]">
              Add goal
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Goal description" />
            <Button type="button" variant={cadence === "WEEKLY" ? "default" : "outline"} onClick={() => setCadence("WEEKLY")}>
              Weekly
            </Button>
            <Button type="button" variant={cadence === "MONTHLY" ? "default" : "outline"} onClick={() => setCadence("MONTHLY")}>
              Monthly
            </Button>
          </div>
          {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
        </div>

        {loading ? <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">Loading saved goals...</div> : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {[weeklyGoals, monthlyGoals].map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3 rounded-2xl border border-border/70 bg-secondary/15 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{groupIndex === 0 ? "Weekly" : "Monthly"}</h3>
                <span className="text-xs text-muted-foreground">{group.length} items</span>
              </div>
              <div className="space-y-3">
                {group.map((goal) => {
                  const completion = Math.min(100, Math.round((goal.currentValue / Math.max(goal.targetValue, 1)) * 100));
                  return (
                    <motion.div
                      key={goal.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border/70 bg-card/90 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{cadenceLabel[goal.cadence]}</div>
                          <div className="mt-1 text-base font-semibold text-foreground">{goal.title}</div>
                          {goal.description ? <div className="mt-1 text-sm text-muted-foreground">{goal.description}</div> : null}
                        </div>
                        <Badge variant="secondary">{goal.unit}</Badge>
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {goal.currentValue} of {goal.targetValue} {goal.unit}
                        </span>
                        <span>{completion}%</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void updateGoal(goal.id, { currentValue: goal.currentValue + 1 })}>
                          +1
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateGoal(goal.id, { currentValue: Math.max(0, goal.currentValue - 1) })}>
                          -1
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateGoal(goal.id, { isArchived: true })}>
                          Archive
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void removeGoal(goal.id)}>
                          Delete
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
                {!group.length ? <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">No goals here yet.</div> : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

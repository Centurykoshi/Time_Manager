"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Goal, GoalGroup, groupLabels } from "./goals";
import { DIFFICULTY_XP, type Difficulty } from "@/lib/xp";

type GoalDetailPageProps = {
  group: GoalGroup;
  goals: Goal[];
  onBack: () => void;
  onCreate: (group: GoalGroup, title: string, target: number, description: string, unit: string, difficulty: Difficulty) => Promise<Goal | null>;
  onDelete: (id: string) => Promise<void>;
  onUpdateProgress: (id: string, newValue: number) => Promise<void>;
};

export function GoalDetailPage({ group, goals, onBack, onCreate, onDelete, onUpdateProgress }: GoalDetailPageProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("10");
  const [unit, setUnit] = useState("sessions");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const key = event.key.toLowerCase();
      const shortcutMap: Record<string, Difficulty> = {
        e: "EASY",
        m: "MEDIUM",
        h: "HARD",
        b: "BOSS",
      };

      const nextDifficulty = shortcutMap[key];
      if (!nextDifficulty) return;

      event.preventDefault();
      event.stopPropagation();
      setDifficulty(nextDifficulty);
    };

    window.addEventListener("keydown", onShortcut, true);
    return () => window.removeEventListener("keydown", onShortcut, true);
  }, []);

  const handleAdd = async () => {
    const trimmedTitle = title.trim();
    const parsedTarget = Number(target);

    if (!trimmedTitle || !Number.isFinite(parsedTarget) || parsedTarget <= 0) return;

    setIsAdding(true);
    try {
      const created = await onCreate(group, trimmedTitle, parsedTarget, description.trim(), unit.trim() || "sessions", difficulty);
      if (created) {
        setTitle("");
        setDescription("");
        setTarget("10");
        setUnit("sessions");
        setDifficulty("MEDIUM");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{group.type}</p>
          <h2 className="mt-1 text-3xl font-semibold">{groupLabels[group.type]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create goals for this cadence and track progress from one dedicated view.</p>
        </div>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to grid
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Create a goal</h3>
              <p className="text-sm text-muted-foreground">This goal will be saved under {groupLabels[group.type].toLowerCase()}.</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{goals.length} saved</span>
          </div>

          <div className="mt-4 grid gap-3">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Goal title" />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" />
            <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Difficulty tag</p>
                <p className="text-xs text-muted-foreground">Ctrl+E / M / H / B</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {(["EASY", "MEDIUM", "HARD", "BOSS"] as Difficulty[]).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={difficulty === option ? "default" : "outline"}
                    onClick={() => setDifficulty(option)}
                    className="justify-center"
                  >
                    <span>{option}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[0.9fr_1fr_1fr]">
              <Input value={target} onChange={(event) => setTarget(event.target.value)} type="number" min="1" placeholder="Target" />
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Unit" />
              <Button onClick={handleAdd} disabled={isAdding} className="gap-2">
                <Plus className="h-4 w-4" />
                Add goal
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
          <h3 className="text-lg font-semibold">Goals in this view</h3>
          <div className="mt-4 space-y-3">
            {goals.length === 0 ? <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">No goals in this cadence yet.</p> : null}
            {goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.currentValue / Math.max(goal.targetValue, 1)) * 100));

              return (
                <motion.div key={goal.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/60 bg-card/85 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{goal.title}</p>
                      {goal.goalTag ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-primary/80">{goal.goalTag.name} · {goal.goalTag.goalXp} XP tag</p> : null}
                      {goal.description ? <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p> : null}
                      <p className="mt-2 text-xs text-muted-foreground">{goal.currentValue} of {goal.targetValue} {goal.unit}</p>
                    </div>
                    <button onClick={() => void onDelete(goal.id)} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Delete goal">
                      ×
                    </button>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress}% complete</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 1, goal.targetValue))}>+1</Button>
                      <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 5, goal.targetValue))}>+5</Button>
                      <Button size="sm" variant="outline" onClick={() => void onUpdateProgress(goal.id, Math.min(goal.currentValue + 10, goal.targetValue))}>+10</Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

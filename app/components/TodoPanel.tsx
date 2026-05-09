"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MoreVertical } from "lucide-react";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "BOSS";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
  difficulty?: Difficulty;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(left: string, right: Date) {
  const leftDate = new Date(left);
  return startOfLocalDay(leftDate).getTime() === startOfLocalDay(right).getTime();
}

function formatTaskDate(createdAt: string, reference: Date) {
  const taskDate = new Date(createdAt);
  const currentDay = startOfLocalDay(reference).getTime();
  const taskDay = startOfLocalDay(taskDate).getTime();
  const diffDays = Math.round((currentDay - taskDay) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(taskDate);
}

function dispatchDashboardRefresh() {
  window.dispatchEvent(new Event("dashboard:changed"));
}

export function TodoPanel() {
  const [now, setNow] = useState(() => new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pendingSaves, setPendingSaves] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearInterval(id);
      // Cleanup pending saves
      pendingSaves.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [pendingSaves]);

  useEffect(() => {
    // Close menu on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (openMenuId && !target.closest(".group")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openMenuId]);

  const fetchTodos = async () => {
    const response = await fetch("/api/todos", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load todos.");

    const payload = (await response.json()) as {
      todos: Array<{
        id: string;
        title: string;
        isDone: boolean;
        createdAt: string;
        completedAt: string | null;
        difficulty?: Difficulty;
        xpEarned: number;
      }>;
    };

    return payload.todos.map((todo) => ({
      id: todo.id,
      text: todo.title,
      done: todo.isDone,
      createdAt: todo.createdAt,
      completedAt: todo.completedAt,
      difficulty: todo.difficulty ?? "EASY",
    }));
  };

  const reloadTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextTodos = await fetchTodos();
      setTodos(nextTodos);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load todos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadTodos = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextTodos = await fetchTodos();
        if (active) {
          setTodos(nextTodos);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load todos.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTodos();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onDashboardChanged = () => {
      void reloadTodos();
    };

    window.addEventListener("dashboard:changed", onDashboardChanged);
    return () => {
      window.removeEventListener("dashboard:changed", onDashboardChanged);
    };
  }, []);

  // Show only tasks created today
  const visibleTodos = todos.filter((todo) => isSameLocalDay(todo.createdAt, now));
  const doneCount = visibleTodos.filter((todo) => todo.done).length;

  const add = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Failed to add todo.");
      }

      const payload = (await response.json()) as {
        todo: {
          id: string;
          title: string;
          isDone: boolean;
          createdAt: string;
          completedAt: string | null;
          difficulty?: Difficulty;
        };
      };
      setTodos((current) => [
        {
          id: payload.todo.id,
          text: payload.todo.title,
          done: payload.todo.isDone,
          createdAt: payload.todo.createdAt,
          completedAt: payload.todo.completedAt,
          difficulty: payload.todo.difficulty ?? "EASY",
        },
        ...current,
      ]);
      setText("");
      dispatchDashboardRefresh();
    } catch {
      setError("Failed to add todo.");
    }
  };

  const toggle = async (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    const nextDone = !target.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    
    // Immediately update UI
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: nextDone, completedAt: nextCompletedAt } : todo)));

    // Save immediately (no delay)
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isDone: nextDone, difficulty: target.difficulty }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo.");
      }

      const payload = (await response.json()) as {
        todo: {
          id: string;
          title: string;
          isDone: boolean;
          createdAt: string;
          completedAt: string | null;
          difficulty?: Difficulty;
          xpEarned: number;
        };
      };

      setTodos((current) =>
        current.map((todo) =>
          todo.id === id
            ? {
                id: payload.todo.id,
                text: payload.todo.title,
                done: payload.todo.isDone,
                createdAt: payload.todo.createdAt,
                completedAt: payload.todo.completedAt,
                difficulty: payload.todo.difficulty ?? "EASY",
              }
            : todo,
        ),
      );
      
      // Trigger refresh to update XP display and other pages
      window.dispatchEvent(new Event("dashboard:changed"));

      setPendingSaves((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      dispatchDashboardRefresh();
    } catch {
      setError("Failed to update todo.");
      // Revert to previous state on error
      setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: target.done, completedAt: target.completedAt } : todo)));
      setPendingSaves((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const updateDifficulty = async (id: string, difficulty: Difficulty) => {
    setOpenMenuId(null);
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    // Immediately update UI
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, difficulty } : todo)),
    );

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ difficulty }),
      });

      if (!response.ok) {
        throw new Error("Failed to update difficulty.");
      }

      const payload = (await response.json()) as {
        todo: {
          id: string;
          title: string;
          isDone: boolean;
          createdAt: string;
          completedAt: string | null;
          difficulty?: Difficulty;
        };
      };

      setTodos((current) =>
        current.map((todo) =>
          todo.id === id
            ? {
                id: payload.todo.id,
                text: payload.todo.title,
                done: payload.todo.isDone,
                createdAt: payload.todo.createdAt,
                completedAt: payload.todo.completedAt,
                difficulty: payload.todo.difficulty ?? "EASY",
              }
            : todo,
        ),
      );

      dispatchDashboardRefresh();
    } catch {
      setError("Failed to update difficulty.");
      // Revert to previous state on error
      setTodos((current) =>
        current.map((todo) => (todo.id === id ? { ...todo, difficulty: target.difficulty } : todo)),
      );
    }
  };

  const remove = async (id: string) => {
    const previousTodos = todos;
    setTodos((current) => current.filter((todo) => todo.id !== id));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete todo.");
      }

      dispatchDashboardRefresh();
    } catch {
      setError("Failed to delete todo.");
      setTodos(previousTodos);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-card/50 p-6"
    >
      <div className="mb-4 space-y-2">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Today's tasks</div>
        <h3 className="text-lg font-semibold">Task list</h3>
      </div>

      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="mb-4 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add a task..."
          className="flex h-9 flex-1 rounded-lg border border-border/40 bg-secondary/20 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={add} size="sm" className="px-4">
            Add
          </Button>
        </motion.div>
      </motion.div>

      <div className="flex-1 min-h-0 space-y-2 overflow-auto">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-sm text-muted-foreground"
          >
            Loading tasks...
          </motion.div>
        ) : null}

        {error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        ) : null}

        <AnimatePresence initial={false}>
          {visibleTodos.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center gap-2 rounded-lg bg-secondary/20 px-3 py-2 transition hover:bg-secondary/30 group"
            >
              <div className="relative flex items-center justify-center">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </motion.div>
                {openMenuId === t.id && (
                  <motion.div
                    ref={(el) => {
                      if (el) menuRefs.current[t.id] = el;
                    }}
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-border/40 bg-card/95 shadow-lg z-50"
                  >
                    <div className="p-2 space-y-1">
                      {(["EASY", "MEDIUM", "HARD", "BOSS"] as Difficulty[]).map((diff) => (
                        <motion.button
                          key={diff}
                          onClick={() => updateDifficulty(t.id, diff)}
                          className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition ${
                            t.difficulty === diff
                              ? "bg-primary/20 text-foreground font-medium"
                              : "text-muted-foreground hover:bg-secondary/30"
                          }`}
                          whileHover={{ x: 1 }}
                        >
                          {diff}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => {
                  void toggle(t.id);
                }}
                className="h-4 w-4 rounded-full border border-primary/40 cursor-pointer accent-primary flex-shrink-0"
              />
              <motion.span
                initial={false}
                animate={{ opacity: t.done ? 0.6 : 1 }}
                className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {t.text}
              </motion.span>
              <Badge variant="outline" className="h-5 px-2 text-[10px]">
                {t.difficulty ?? "EASY"}
              </Badge>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => void remove(t.id)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && visibleTodos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
            No tasks yet. Add one to get started.
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

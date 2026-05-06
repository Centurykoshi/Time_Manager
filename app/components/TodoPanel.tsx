"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearInterval(id);
      // Cleanup pending saves
      pendingSaves.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [pendingSaves]);

  const fetchTodos = async () => {
    const response = await fetch("/api/todos");
    if (!response.ok) throw new Error("Failed to load todos.");

    const payload = (await response.json()) as {
      todos: Array<{
        id: string;
        title: string;
        isDone: boolean;
        createdAt: string;
        completedAt: string | null;
      }>;
    };

    return payload.todos.map((todo) => ({
      id: todo.id,
      text: todo.title,
      done: todo.isDone,
      createdAt: todo.createdAt,
      completedAt: todo.completedAt,
    }));
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
        };
      };
      setTodos((current) => [
        {
          id: payload.todo.id,
          text: payload.todo.title,
          done: payload.todo.isDone,
          createdAt: payload.todo.createdAt,
          completedAt: payload.todo.completedAt,
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

    // Cancel any pending save for this todo
    const existingTimeout = pendingSaves.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      setPendingSaves((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }

    const nextDone = !target.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;
    
    // Immediately update UI
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: nextDone, completedAt: nextCompletedAt } : todo)));

    // Set 5-second delay before saving
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ done: nextDone }),
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
                }
              : todo,
          ),
        );

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
    }, 5000);

    setPendingSaves((prev) => new Map(prev).set(id, timeoutId));
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
              className="flex items-center gap-3 rounded-lg bg-secondary/20 px-3 py-2 transition hover:bg-secondary/30 group"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => {
                  void toggle(t.id);
                }}
                className="h-4 w-4 rounded-full border border-primary/40 cursor-pointer accent-primary"
              />
              <motion.span
                initial={false}
                animate={{ opacity: t.done ? 0.6 : 1 }}
                className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {t.text}
              </motion.span>
              <Badge variant="outline" className={formatTaskDate(t.createdAt, now) === "Today" ? "h-5 px-2 text-[10px]" : "text-xs"}>
                {formatTaskDate(t.createdAt, now)}
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

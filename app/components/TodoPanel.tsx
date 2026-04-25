"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Panel } from "./Panel";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

function dispatchDashboardRefresh() {
  window.dispatchEvent(new Event("dashboard:changed"));
}

export function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;

    const loadTodos = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/todos");
        if (!response.ok) throw new Error("Failed to load todos.");
        const payload = (await response.json()) as { todos: Array<{ id: string; title: string; isDone: boolean }> };
        if (active) {
          setTodos(
            payload.todos.map((todo) => ({
              id: todo.id,
              text: todo.title,
              done: todo.isDone,
            })),
          );
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

  const doneCount = todos.filter((todo) => todo.done).length;

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

      const payload = (await response.json()) as { todo: { id: string; title: string; isDone: boolean } };
      setTodos((current) => [{ id: payload.todo.id, text: payload.todo.title, done: payload.todo.isDone }, ...current]);
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
    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: nextDone } : todo)));

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

      dispatchDashboardRefresh();
    } catch {
      setError("Failed to update todo.");
      setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: target.done } : todo)));
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
    <Panel
      title="Tasks"
      subtitle="Saved in Neon"
      right={
        <Badge variant="outline">
          {doneCount} / {todos.length || 0} done
        </Badge>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Add a priority task"
          />
          <Button onClick={add} className="uppercase tracking-[0.08em]">
            Add
          </Button>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {loading ? (
            <div className="rounded-md border border-border p-4 text-sm text-secondary-foreground">
              Loading saved tasks...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              {error}
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {todos.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={
                  "flex items-center gap-3 rounded-md border px-3 py-2 transition " +
                  (t.done
                    ? "border-border bg-[rgb(var(--secondary-rgb)/0.2)]"
                    : "border-border bg-[rgb(var(--secondary-rgb)/0.1)] hover:bg-[rgb(var(--secondary-rgb)/0.16)]")
                }
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => {
                    void toggle(t.id);
                  }}
                  className="h-4 w-4 accent-primary"
                  aria-label={t.done ? "Mark as not done" : "Mark as done"}
                />
                <div
                  className={
                    "flex-1 text-sm " +
                    (t.done ? "text-secondary-foreground line-through" : "text-foreground")
                  }
                >
                  {t.text}
                </div>
                <Button onClick={() => void remove(t.id)} variant="ghost" size="sm" aria-label="Delete task" title="Delete">
                  x
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && todos.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-secondary-foreground">
              No tasks saved yet. Add the first one.
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

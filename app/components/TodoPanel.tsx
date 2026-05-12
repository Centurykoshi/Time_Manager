"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { readLocalTodos, writeLocalTodos } from "@/lib/local-todos";
import { getTodoCache, getTodoCacheSource, loadRemoteTodos, setTodoCache, subscribeTodoCache, type SharedTodo } from "@/lib/todo-cache";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "BOSS";

type Todo = {
  id: string;
  serverId?: string;
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

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toLocalTodo(todo: Todo) {
  return {
    id: todo.id,
    title: todo.text,
    isDone: todo.done,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    difficulty: todo.difficulty ?? "EASY",
  };
}

function fromLocalTodo(todo: ReturnType<typeof readLocalTodos>[number]): Todo {
  return {
    id: todo.id,
    text: todo.title,
    done: todo.isDone,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    difficulty: todo.difficulty ?? "EASY",
  };
}

function toSharedTodo(todo: Todo): SharedTodo {
  return {
    id: todo.id,
    serverId: todo.serverId,
    title: todo.text,
    isDone: todo.done,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    difficulty: todo.difficulty ?? "EASY",
  };
}

function fromSharedTodo(todo: SharedTodo): Todo {
  return {
    id: todo.id,
    serverId: todo.serverId,
    text: todo.title,
    done: todo.isDone,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    difficulty: todo.difficulty ?? "EASY",
  };
}

export function TodoPanel() {
  const [now, setNow] = useState(() => new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  // Only show the loading UI after 300ms — prevents flicker on fast loads
  const [showLoading, setShowLoading] = useState(false);
  const [storageMode, setStorageMode] = useState<"remote" | "local">("remote");
  const [text, setText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getPersistedId = (todo: Todo) => todo.serverId ?? todo.id;

  // Delay showing the loading skeleton so fast loads never cause a flicker
  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLoading(true), 300);
    return () => clearTimeout(timer);
  }, [loading]);

  const openDifficultyMenu = (id: string) => {
    const trigger = menuButtonRefs.current[id];
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = 144;
    const height = 176;
    const gap = 8;
    const padding = 8;

    const left = Math.min(Math.max(padding, rect.left), window.innerWidth - width - padding);
    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - height - gap);
    }

    setMenuPosition({ top, left });
    setOpenMenuId(id);
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        openMenuId &&
        !target.closest("[data-difficulty-menu='true']") &&
        !target.closest("[data-difficulty-trigger='true']")
      ) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!openMenuId) return;

    const reposition = () => openDifficultyMenu(openMenuId);
    reposition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [openMenuId]);

  const loadLocalTodos = () => readLocalTodos().map(fromLocalTodo);

  const saveLocalTodos = (nextTodos: Todo[]) => {
    writeLocalTodos(nextTodos.map(toLocalTodo));
  };

  const applyTodos = (nextTodos: Todo[], source: "remote" | "local") => {
    setTodos(nextTodos);
    setStorageMode(source);
    setLoading(false);
  };

  const writeTodos = (nextTodos: Todo[], source: "remote" | "local") => {
    applyTodos(nextTodos, source);
    setTodoCache(nextTodos.map(toSharedTodo), source);
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeTodoCache((nextTodos) => {
      if (!active || !nextTodos) return;
      applyTodos(nextTodos.map(fromSharedTodo), getTodoCacheSource() === "local" ? "local" : "remote");
    });

    const loadTodos = async () => {
      try {
        const cachedTodos = getTodoCache();
        if (cachedTodos) {
          if (active) {
            applyTodos(cachedTodos.map(fromSharedTodo), getTodoCacheSource() === "local" ? "local" : "remote");
          }
          return;
        }

        setLoading(true);
        const nextTodos = await loadRemoteTodos();
        if (active) {
          applyTodos(nextTodos.map(fromSharedTodo), "remote");
        }
      } catch (loadError) {
        if (active) {
          const nextTodos = loadLocalTodos();
          writeTodos(nextTodos, "local");
          if (loadError instanceof Error && (loadError as Error & { status?: number }).status !== 401) {
            console.error("Failed to load todos:", loadError);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTodos();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeTodoId) return;
    if (!todos.some((todo) => todo.id === activeTodoId && isSameLocalDay(todo.createdAt, now))) {
      setActiveTodoId(null);
    }
  }, [activeTodoId, now, todos]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!activeTodoId || !event.ctrlKey || event.altKey || event.metaKey) return;

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
      void updateDifficulty(activeTodoId, nextDifficulty);
    };

    window.addEventListener("keydown", onShortcut, true);
    return () => {
      window.removeEventListener("keydown", onShortcut, true);
    };
  }, [activeTodoId, todos]);

  const visibleTodos = todos.filter((todo) => isSameLocalDay(todo.createdAt, now));
  const doneCount = visibleTodos.filter((todo) => todo.done).length;

  const add = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Optimistic: insert immediately with a temp ID so the UI responds instantly
    const tempId = createLocalId();
    const optimisticTodo: Todo = {
      id: tempId,
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      difficulty: "EASY",
    };

    setTodos((current) => [optimisticTodo, ...current]);
    setText("");

    if (storageMode === "local") {
      // In local mode, the temp ID is the real ID — just persist it
      setTodos((current) => {
        const next = [optimisticTodo, ...current.filter((todo) => todo.id !== tempId)];
        saveLocalTodos(next);
        setTodoCache(next.map(toSharedTodo), "local");
        return next;
      });
      return;
    }

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) throw new Error("Failed to add todo.");

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

      // Swap the temp ID for the real server ID
      setTodos((current) => {
        const nextTodos = current.map((todo) =>
          todo.id === tempId
            ? {
                id: payload.todo.id,
                serverId: payload.todo.id,
                text: payload.todo.title,
                done: payload.todo.isDone,
                createdAt: payload.todo.createdAt,
                completedAt: payload.todo.completedAt,
                difficulty: payload.todo.difficulty ?? "EASY",
              }
            : todo,
        );
        setTodoCache(nextTodos.map(toSharedTodo), "remote");
        return nextTodos;
      });

      dispatchDashboardRefresh();
    } catch {
      // API failed — fall back to local storage with the temp ID
      setTodos((current) => {
        saveLocalTodos(current);
        setTodoCache(current.map(toSharedTodo), "local");
        return current;
      });
      setStorageMode("local");
    }
  };

  const toggle = async (id: string) => {
    const currentTodos = todos;
    const target = currentTodos.find((todo) => todo.id === id);
    if (!target) return;
    const persistedId = getPersistedId(target);

    const nextDone = !target.done;
    const nextCompletedAt = nextDone ? new Date().toISOString() : null;

    const optimisticTodos = currentTodos.map((todo) => (todo.id === id ? { ...todo, done: nextDone, completedAt: nextCompletedAt } : todo));
    setTodos(optimisticTodos);
    setTodoCache(optimisticTodos.map(toSharedTodo), storageMode);

    if (storageMode === "local") {
      saveLocalTodos(optimisticTodos);
      return;
    }

    try {
      const response = await fetch(`/api/todos/${persistedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: nextDone, difficulty: target.difficulty }),
      });

      if (!response.ok) throw new Error("Failed to update todo.");

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

      const nextTodos = optimisticTodos.map((todo) =>
        todo.id === id
          ? {
              id: payload.todo.id,
              serverId: payload.todo.id,
              text: payload.todo.title,
              done: payload.todo.isDone,
              createdAt: payload.todo.createdAt,
              completedAt: payload.todo.completedAt,
              difficulty: payload.todo.difficulty ?? "EASY",
            }
          : todo,
      );

      setTodos(nextTodos);
      setTodoCache(nextTodos.map(toSharedTodo), "remote");

      if (nextDone) {
        toast.custom((t) => (
          <div className="rounded-lg border border-primary/60 bg-primary/10 px-4 py-3 text-sm font-medium text-primary shadow-lg">
            ✓ Completed: {target.text}
          </div>
        ));
      }

      dispatchDashboardRefresh();
    } catch {
      setTodos(optimisticTodos);
      saveLocalTodos(optimisticTodos);
      setStorageMode("local");
      setTodoCache(optimisticTodos.map(toSharedTodo), "local");
    }
  };

  const updateDifficulty = async (id: string, difficulty: Difficulty) => {
    setOpenMenuId(null);
    const currentTodos = todos;
    const target = currentTodos.find((todo) => todo.id === id);
    if (!target) return;
    const persistedId = getPersistedId(target);

    const optimisticTodos = currentTodos.map((todo) => (todo.id === id ? { ...todo, difficulty } : todo));
    setTodos(optimisticTodos);
    setTodoCache(optimisticTodos.map(toSharedTodo), storageMode);

    if (storageMode === "local") {
      saveLocalTodos(optimisticTodos);
      return;
    }

    try {
      const response = await fetch(`/api/todos/${persistedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });

      if (!response.ok) throw new Error("Failed to update difficulty.");

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

      const nextTodos = optimisticTodos.map((todo) =>
        todo.id === id
          ? {
              id: payload.todo.id,
              serverId: payload.todo.id,
              text: payload.todo.title,
              done: payload.todo.isDone,
              createdAt: payload.todo.createdAt,
              completedAt: payload.todo.completedAt,
              difficulty: payload.todo.difficulty ?? "EASY",
            }
          : todo,
      );

      setTodos(nextTodos);
      setTodoCache(nextTodos.map(toSharedTodo), "remote");
    } catch {
      const revertedTodos = currentTodos.map((todo) => (todo.id === id ? { ...todo, difficulty: target.difficulty } : todo));
      setTodos(revertedTodos);
      setTodoCache(revertedTodos.map(toSharedTodo), "remote");
    }
  };

  const remove = async (id: string) => {
    const previousTodos = todos;
    const target = previousTodos.find((todo) => todo.id === id);
    const persistedId = target ? getPersistedId(target) : id;
    const nextTodos = previousTodos.filter((todo) => todo.id !== id);
    setTodos(nextTodos);
    setTodoCache(nextTodos.map(toSharedTodo), storageMode);

    if (storageMode === "local") {
      saveLocalTodos(nextTodos);
      return;
    }

    try {
      const response = await fetch(`/api/todos/${persistedId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete todo.");
      dispatchDashboardRefresh();
    } catch {
      setTodos(previousTodos);
      setTodoCache(previousTodos.map(toSharedTodo), "remote");
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

      <div
        className="flex-1 min-h-0 space-y-2 overflow-auto"
        onMouseLeave={() => setActiveTodoId(null)}
      >
       
        <AnimatePresence initial={false}>
          {visibleTodos.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={() => setActiveTodoId(t.id)}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-secondary/30 ${
                activeTodoId === t.id
                  ? "bg-secondary/35 border-b border-primary/50 rounded-b-none"
                  : "bg-secondary/20"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    ref={(el) => {
                      menuButtonRefs.current[t.id] = el;
                    }}
                    data-difficulty-trigger="true"
                    onClick={() => {
                      if (openMenuId === t.id) {
                        setOpenMenuId(null);
                        setMenuPosition(null);
                        return;
                      }
                      openDifficultyMenu(t.id);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 p-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </motion.div>
              </div>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => {
                  void toggle(t.id);
                }}
                className="h-4 w-4 shrink-0 rounded-full border border-primary/40 cursor-pointer accent-primary"
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

      {storageMode === "local" ? (
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground/75">
          Your data is saved temporarily in localStorage. Please log in for permanent data.
        </p>
      ) : null}

      {openMenuId && menuPosition
        ? createPortal(
            <AnimatePresence>
              <motion.div
                data-difficulty-menu="true"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="fixed z-70 h-38 w-36 overflow-hidden rounded-lg border border-border/40 bg-card/95 shadow-lg"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <div className="space-y-1 p-2">
                  {(["EASY", "MEDIUM", "HARD", "BOSS"] as Difficulty[]).map((diff) => {
                    const targetTodo = visibleTodos.find((todo) => todo.id === openMenuId);
                    return (
                      <motion.button
                        key={diff}
                        onClick={() => void updateDifficulty(openMenuId, diff)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                          targetTodo?.difficulty === diff
                            ? "bg-primary/20 font-medium text-foreground"
                            : "text-muted-foreground hover:bg-secondary/30"
                        }`}
                        whileHover={{ x: 1 }}
                      >
                        {diff}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>,
            document.body,
          )
        : null}
    </motion.div>
  );
}

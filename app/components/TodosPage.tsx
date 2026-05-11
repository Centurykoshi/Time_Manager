"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { readLocalTodos, writeLocalTodos } from "@/lib/local-todos";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "BOSS";

type TodoItem = {
  id: string;
  title: string;
  description?: string;
  isDone: boolean;
  createdAt: string;
  dueAt?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number;
  difficulty?: Difficulty;
};

type TimeFilter = "today" | "week" | "month" | "year" | "allTime";

type StorageMode = "remote" | "local";

function createLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fromLocalTodo(todo: ReturnType<typeof readLocalTodos>[number]): TodoItem {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    isDone: todo.isDone,
    createdAt: todo.createdAt,
    dueAt: todo.dueAt,
    priority: todo.priority ?? "MEDIUM",
    estimatedMinutes: todo.estimatedMinutes ?? undefined,
    difficulty: todo.difficulty,
  };
}

function toLocalTodo(todo: TodoItem) {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? null,
    isDone: todo.isDone,
    createdAt: todo.createdAt,
    completedAt: null,
    difficulty: todo.difficulty,
    priority: todo.priority,
    dueAt: todo.dueAt,
    estimatedMinutes: todo.estimatedMinutes ?? null,
  };
}

export function TodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");
  const [storageMode, setStorageMode] = useState<StorageMode>("remote");

  const loadLocalTodos = () => readLocalTodos().map(fromLocalTodo);

  const saveLocalTodos = (nextTodos: TodoItem[]) => {
    writeLocalTodos(nextTodos.map(toLocalTodo));
  };

  async function fetchTodos() {
    try {
      const response = await fetch("/api/todos", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { todos: TodoItem[] };
        setStorageMode("remote");
        setTodos(data.todos);
      } else {
        setStorageMode("local");
        setTodos(loadLocalTodos());
      }
    } catch (error) {
      console.error("Failed to fetch todos:", error);
      setStorageMode("local");
      setTodos(loadLocalTodos());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchTodos();
    });
    window.addEventListener("dashboard:changed", fetchTodos);
    return () => window.removeEventListener("dashboard:changed", fetchTodos);
  }, []);

  const getFilteredTodos = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return todos.filter((todo) => {
      const createdDate = new Date(todo.createdAt);
      switch (activeFilter) {
        case "today":
          return createdDate >= today && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case "week":
          const weekEndDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          return now < weekEndDate;
        case "month":
          return createdDate >= monthStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case "year":
          return createdDate >= yearStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        case "allTime":
        default:
          return true;
      }
    });
  };

  const getTodoHighlight = (todo: TodoItem) => {
    if (todo.isDone) {
      return "border-border/50 hover:border-border/80 hover:bg-muted/50";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const createdDate = new Date(todo.createdAt);
    
    // Check if todo was created today
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const createdToday = createdDate >= today && createdDate < todayEnd;
    
    if (createdToday) {
      // No highlight for today's todos
      return "border-border/50 hover:border-border/80 hover:bg-muted/50";
    }
    
    // Check if todo is more than 7 days old
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const isOlderThanSevenDays = createdDate < sevenDaysAgo;
    
    // If older than 7 days AND in month or year view, use destructive
    if (isOlderThanSevenDays && (activeFilter === "month" || activeFilter === "year")) {
      return "border-destructive/40 bg-destructive/10 hover:border-destructive/60 hover:bg-destructive/15";
    }
    
    // If created on a previous day (not today), use primary color
    return "border-primary/40 bg-primary/10 hover:border-primary/60 hover:bg-primary/15";
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    const addLocalTodo = () => {
      const nextTodo: TodoItem = {
        id: createLocalId(),
        title: newTodoTitle.trim(),
        description: undefined,
        isDone: false,
        createdAt: new Date().toISOString(),
        dueAt: undefined,
        priority: "MEDIUM",
        estimatedMinutes: undefined,
        difficulty: "EASY",
      };

      const nextTodos = [nextTodo, ...todos];
      setTodos(nextTodos);
      saveLocalTodos(nextTodos);
      setStorageMode("local");
      setNewTodoTitle("");
      window.dispatchEvent(new Event("dashboard:changed"));
    };

    setIsAdding(true);
    try {
      if (storageMode === "local") {
        addLocalTodo();
        return;
      }

      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle.trim() }),
      });

      if (response.ok) {
        await fetchTodos();
        setNewTodoTitle("");
        window.dispatchEvent(new Event("dashboard:changed"));
      } else {
        addLocalTodo();
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
      addLocalTodo();
    } finally {
      setIsAdding(false);
    }
  };


  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    if (storageMode === "local") {
      const nextTodos = todos.map((todo) => (todo.id === id ? { ...todo, isDone: !currentStatus } : todo));
      setTodos(nextTodos);
      saveLocalTodos(nextTodos);
      window.dispatchEvent(new Event("dashboard:changed"));
      return;
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: !currentStatus }),
      });

      if (response.ok) {
        await fetchTodos();
        window.dispatchEvent(new Event("dashboard:changed"));
      } else {
        const nextTodos = todos.map((todo) => (todo.id === id ? { ...todo, isDone: !currentStatus } : todo));
        setTodos(nextTodos);
        saveLocalTodos(nextTodos);
        setStorageMode("local");
      }
    } catch (error) {
      console.error("Failed to update todo:", error);
      const nextTodos = todos.map((todo) => (todo.id === id ? { ...todo, isDone: !currentStatus } : todo));
      setTodos(nextTodos);
      saveLocalTodos(nextTodos);
      setStorageMode("local");
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (storageMode === "local") {
      const nextTodos = todos.filter((todo) => todo.id !== id);
      setTodos(nextTodos);
      saveLocalTodos(nextTodos);
      window.dispatchEvent(new Event("dashboard:changed"));
      return;
    }

    try {
      const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });

      if (response.ok) {
        await fetchTodos();
        window.dispatchEvent(new Event("dashboard:changed"));
      } else {
        const nextTodos = todos.filter((todo) => todo.id !== id);
        setTodos(nextTodos);
        saveLocalTodos(nextTodos);
        setStorageMode("local");
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
      const nextTodos = todos.filter((todo) => todo.id !== id);
      setTodos(nextTodos);
      saveLocalTodos(nextTodos);
      setStorageMode("local");
    }
  };

  const filteredTodos = getFilteredTodos();
  const completedCount = filteredTodos.filter((t) => t.isDone).length;

  const filters: { key: TimeFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "allTime", label: "All Time" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">All Todos</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {filteredTodos.length} completed
        </p>
      </div>

      {/* Time Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              activeFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Add Todo Form */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
          disabled={isAdding}
          className="flex-1"
        />
        <Button onClick={handleAddTodo} disabled={isAdding} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Progress Bar */}
      {filteredTodos.length > 0 && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / filteredTodos.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      )}

      {/* Todos List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading todos...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">No todos in this period</p>
            <p className="text-sm">Try a different time filter</p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "p-4 rounded-lg border transition-all",
                getTodoHighlight(todo),
                todo.isDone && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleTodo(todo.id, todo.isDone)}
                  className="mt-1 flex-shrink-0"
                >
                  <CheckCircle2
                    className={cn(
                      "w-5 h-5 transition-colors",
                      todo.isDone ? "text-primary fill-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium break-words",
                      todo.isDone && "line-through text-muted-foreground"
                    )}
                  >
                    {todo.title}
                  </p>

                  {todo.description && (
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {todo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    {todo.difficulty && (
                      <Badge variant="outline" className="h-5 px-2 text-[10px]">
                        {todo.difficulty}
                      </Badge>
                    )}
                    {todo.dueAt && (
                      <span>Due: {new Date(todo.dueAt).toLocaleDateString()}</span>
                    )}
                    {todo.estimatedMinutes && (
                      <span>{todo.estimatedMinutes}m</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="flex-shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {storageMode === "local" ? (
        <p className="text-[11px] leading-4 text-muted-foreground/75">
          Your data is saved temporarily in localStorage. Please log in for permanent data.
        </p>
      ) : null}
    </motion.div>
  );
}

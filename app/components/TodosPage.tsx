"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type TodoItem = {
  id: string;
  title: string;
  description?: string;
  isDone: boolean;
  createdAt: string;
  dueAt?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number;
};

type TimeFilter = "today" | "week" | "month" | "year" | "allTime";

export function TodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("today");

  useEffect(() => {
    fetchTodos();
    window.addEventListener("dashboard:changed", fetchTodos);
    return () => window.removeEventListener("dashboard:changed", fetchTodos);
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/todos");
      if (response.ok) {
        const data = (await response.json()) as { todos: TodoItem[] };
        setTodos(data.todos);
      }
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
          return createdDate >= weekStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
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

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodoTitle.trim() }),
      });

      if (response.ok) {
        const data = (await response.json()) as { todo: TodoItem };
        setTodos([data.todo, ...todos]);
        setNewTodoTitle("");
        window.dispatchEvent(new Event("dashboard:changed"));
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: !currentStatus }),
      });

      if (response.ok) {
        setTodos(todos.map((t) => (t.id === id ? { ...t, isDone: !currentStatus } : t)));
        window.dispatchEvent(new Event("dashboard:changed"));
      }
    } catch (error) {
      console.error("Failed to update todo:", error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });

      if (response.ok) {
        setTodos(todos.filter((t) => t.id !== id));
        window.dispatchEvent(new Event("dashboard:changed"));
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
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
                "p-4 rounded-lg border border-border/50 transition-all hover:border-border/80 hover:bg-muted/50",
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
    </motion.div>
  );
}

"use client";

import { readLocalTodos } from "@/lib/local-todos";

export type SharedTodoDifficulty = "EASY" | "MEDIUM" | "HARD" | "BOSS";

export type SharedTodo = {
  id: string;
  serverId?: string;
  title: string;
  description?: string | null;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
  dueAt?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number | null;
  difficulty?: SharedTodoDifficulty;
  xpEarned?: number;
};

type CacheSource = "remote" | "local";
type Listener = (todos: SharedTodo[] | null) => void;

let todoCache: SharedTodo[] | null = null;
let cacheSource: CacheSource | null = null;
let inFlightLoad: Promise<SharedTodo[]> | null = null;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(todoCache);
  }
}

function normalizeTodo(todo: {
  id: string;
  title: string;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
  description?: string | null;
  dueAt?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number | null;
  difficulty?: SharedTodoDifficulty;
  xpEarned?: number;
  serverId?: string;
}): SharedTodo {
  return {
    id: todo.id,
    serverId: todo.serverId,
    title: todo.title,
    description: todo.description ?? null,
    isDone: todo.isDone,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    dueAt: todo.dueAt ?? null,
    priority: todo.priority ?? "MEDIUM",
    estimatedMinutes: todo.estimatedMinutes ?? null,
    difficulty: todo.difficulty ?? "EASY",
    xpEarned: todo.xpEarned,
  };
}

function normalizeLocalTodo(todo: ReturnType<typeof readLocalTodos>[number]): SharedTodo {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? null,
    isDone: todo.isDone,
    createdAt: todo.createdAt,
    completedAt: todo.completedAt,
    dueAt: todo.dueAt ?? null,
    priority: todo.priority ?? "MEDIUM",
    estimatedMinutes: todo.estimatedMinutes ?? null,
    difficulty: todo.difficulty ?? "EASY",
  };
}

export function getTodoCache() {
  return todoCache;
}

export function getTodoCacheSource() {
  return cacheSource;
}

export function subscribeTodoCache(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTodoCache(nextTodos: SharedTodo[], source: CacheSource = "remote") {
  todoCache = nextTodos;
  cacheSource = source;
  notifyListeners();
  return todoCache;
}

export function updateTodoCache(updater: (current: SharedTodo[]) => SharedTodo[], source: CacheSource = cacheSource ?? "remote") {
  const nextTodos = updater(todoCache ?? []);
  return setTodoCache(nextTodos, source);
}

export function loadLocalTodoCache() {
  return setTodoCache(readLocalTodos().map(normalizeLocalTodo), "local");
}

export async function loadRemoteTodos(force = false) {
  if (!force && todoCache) {
    return todoCache;
  }

  if (!force && inFlightLoad) {
    return inFlightLoad;
  }

  const request = (async () => {
    const response = await fetch("/api/todos", { cache: "no-store" });
    if (!response.ok) {
      const error = new Error("Failed to load todos.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const payload = (await response.json()) as {
      todos: Array<{
        id: string;
        title: string;
        isDone: boolean;
        createdAt: string;
        completedAt: string | null;
        description?: string | null;
        dueAt?: string | null;
        priority?: "LOW" | "MEDIUM" | "HIGH";
        estimatedMinutes?: number | null;
        difficulty?: SharedTodoDifficulty;
        xpEarned?: number;
      }>;
    };

    const nextTodos = payload.todos.map(normalizeTodo);
    setTodoCache(nextTodos, "remote");
    return nextTodos;
  })();

  inFlightLoad = request;

  try {
    return await request;
  } finally {
    if (inFlightLoad === request) {
      inFlightLoad = null;
    }
  }
}
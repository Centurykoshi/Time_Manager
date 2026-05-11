export type LocalTodoRecord = {
  id: string;
  title: string;
  description?: string | null;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "BOSS";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueAt?: string;
  estimatedMinutes?: number | null;
};

const LOCAL_TODO_STORAGE_KEY = "focusflow:local-todos";

export function readLocalTodos(): LocalTodoRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_TODO_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is LocalTodoRecord => Boolean(item && typeof item === "object" && "id" in item && "title" in item));
  } catch {
    return [];
  }
}

export function writeLocalTodos(todos: LocalTodoRecord[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LOCAL_TODO_STORAGE_KEY, JSON.stringify(todos));
}
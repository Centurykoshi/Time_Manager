"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Target, ListTodo, Home } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";

type SidebarPage = "main" | "todos" | "goals";

type SearchTodo = { id: string; title: string; description?: string | null };
type SearchGoal = { id: string; title: string; description?: string | null; cadence: string };

type CommandSearchProps = {
  onNavigate: (page: SidebarPage) => void;
};

export function CommandSearch({ onNavigate }: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [todos, setTodos] = useState<SearchTodo[]>([]);
  const [goals, setGoals] = useState<SearchGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const [todosRes, goalsRes] = await Promise.all([fetch("/api/todos"), fetch("/api/goals")]);
        if (todosRes.ok) {
          const todosData = (await todosRes.json()) as { todos: SearchTodo[] };
          setTodos(todosData.todos ?? []);
        }
        if (goalsRes.ok) {
          const goalsData = (await goalsRes.json()) as { goals: SearchGoal[] };
          setGoals(goalsData.goals ?? []);
        }
      } catch (error) {
        console.error("Failed to load search data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [open]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = (value?: string | null) => Boolean(value && value.toLowerCase().includes(normalized));

    const pageActions = [
      { id: "main", label: "Open Main", icon: Home, page: "main" as SidebarPage },
      { id: "todos", label: "Open Todos", icon: ListTodo, page: "todos" as SidebarPage },
      { id: "goals", label: "Open Goals", icon: Target, page: "goals" as SidebarPage },
    ];

    if (!normalized) {
      return { pageActions, todos: todos.slice(0, 5), goals: goals.slice(0, 5) };
    }

    return {
      pageActions: pageActions.filter((item) => item.label.toLowerCase().includes(normalized)),
      todos: todos.filter((todo) => matches(todo.title) || matches(todo.description)).slice(0, 8),
      goals: goals.filter((goal) => matches(goal.title) || matches(goal.description) || matches(goal.cadence)).slice(0, 8),
    };
  }, [goals, query, todos]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Search className="h-4 w-4" />
        Search
        <span className="hidden text-xs text-muted-foreground md:inline">Ctrl+K</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="top" className="inset-auto right-auto bottom-auto left-1/2 top-1/2 mx-auto w-[min(92vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 p-0 shadow-2xl" showCloseButton={false}>
          <SheetHeader className="border-b border-border/60 px-4 py-4">
            <SheetTitle>Search workspace</SheetTitle>
            <SheetDescription>Search todos, goals, and jump between tabs instantly.</SheetDescription>
          </SheetHeader>

          <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search todos, goals, or page names" autoFocus />

            <div className="space-y-4">
              <SearchGroup title="Pages">
                <div className="flex flex-wrap gap-2">
                  {searchResults.pageActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => { onNavigate(item.page); setOpen(false); }} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </SearchGroup>

              <SearchGroup title="Todos">
                {isLoading ? <SearchEmpty label="Loading todos..." /> : null}
                {!isLoading && searchResults.todos.length === 0 ? <SearchEmpty label="No matching todos." /> : null}
                <div className="space-y-2">
                  {searchResults.todos.map((todo) => (
                    <button key={todo.id} onClick={() => { onNavigate("todos"); setOpen(false); }} className="flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-3 py-3 text-left transition-colors hover:bg-card">
                      <div className="min-w-0">
                        <div className="font-medium">{todo.title}</div>
                        {todo.description ? <div className="mt-1 text-sm text-muted-foreground">{todo.description}</div> : null}
                      </div>
                      <Badge variant="secondary">Todo</Badge>
                    </button>
                  ))}
                </div>
              </SearchGroup>

              <SearchGroup title="Goals">
                {isLoading ? <SearchEmpty label="Loading goals..." /> : null}
                {!isLoading && searchResults.goals.length === 0 ? <SearchEmpty label="No matching goals." /> : null}
                <div className="space-y-2">
                  {searchResults.goals.map((goal) => (
                    <button key={goal.id} onClick={() => { onNavigate("goals"); setOpen(false); }} className="flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-3 py-3 text-left transition-colors hover:bg-card">
                      <div className="min-w-0">
                        <div className="font-medium">{goal.title}</div>
                        {goal.description ? <div className="mt-1 text-sm text-muted-foreground">{goal.description}</div> : null}
                      </div>
                      <Badge variant="secondary">{goal.cadence}</Badge>
                    </button>
                  ))}
                </div>
              </SearchGroup>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SearchEmpty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">{label}</div>;
}
import { ClockPanel } from "./components/ClockPanel";
import { GoalPanel } from "./components/GoalPanel";
import { TimerPanel } from "./components/TimerPanel";
import { TodoPanel } from "./components/TodoPanel";

const navItems = ["Today", "Overview", "Timer", "Tasks"];

export default function Home() {
  return (
    <div className="app-shell h-screen overflow-hidden text-foreground">
      <main className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-4">
        <section className="flex h-[calc(100vh-2rem)] w-full flex-col rounded-3xl border border-border bg-[rgb(var(--secondary-rgb)/0.12)] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.4)]">
          <header className="mb-4 flex items-center justify-between px-1">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-secondary-foreground">Forge</div>
              <h1 className="mt-1 text-3xl leading-none text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Focus Command
              </h1>
            </div>
            <nav className="hidden items-center gap-5 md:flex" aria-label="Dashboard sections">
              {navItems.map((item) => (
                <span key={item} className="text-xs uppercase tracking-[0.18em] text-secondary-foreground">
                  {item}
                </span>
              ))}
            </nav>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4 overflow-hidden">
            <div className="min-h-0">
              <ClockPanel />
            </div>
            <div className="min-h-0">
              <GoalPanel />
            </div>
            <div className="min-h-0">
              <TimerPanel />
            </div>
            <div className="min-h-0">
              <TodoPanel />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

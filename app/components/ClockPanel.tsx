"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar, Clock3, Minus, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type DashboardSnapshot = {
  todaySummary: { studiedMinutes: number; focusSessions: number };
};

export function ClockPanel() {
  const [now, setNow] = useState(() => new Date());
  const [targetMinutes, setTargetMinutes] = useState(120);
  const [draftMinutes, setDraftMinutes] = useState(120);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isMinutesModalOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMinutesModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isMinutesModalOpen]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) return;
        const data = (await response.json()) as DashboardSnapshot;
        if (active) setSnapshot(data);
      } catch {
        // keep prior values when dashboard refresh fails
      }
    };

    const handleRefresh = () => {
      void loadDashboard();
    };

    void loadDashboard();
    window.addEventListener("dashboard:changed", handleRefresh);

    return () => {
      active = false;
      window.removeEventListener("dashboard:changed", handleRefresh);
    };
  }, []);

  const dateLine = useMemo(() => {
    const day = now.toLocaleDateString(undefined, { weekday: "long" });
    const date = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { day, date };
  }, [now]);

  const studiedMinutes = snapshot?.todaySummary.studiedMinutes ?? 0;
  const focusSessions = snapshot?.todaySummary.focusSessions ?? 0;
  const remainingMinutes = Math.max(targetMinutes - studiedMinutes, 0);
  const plannedHours = Math.floor(targetMinutes / 60);
  const plannedRemainderMinutes = targetMinutes % 60;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingRemainderMinutes = remainingMinutes % 60;
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const openMinutesModal = () => {
    setDraftMinutes(targetMinutes);
    setIsMinutesModalOpen(true);
  };

  const saveMinutes = () => {
    setTargetMinutes(clamp(draftMinutes, 15, 720));
    setIsMinutesModalOpen(false);
  };

  const adjustDraftMinutes = (delta: number) => {
    setDraftMinutes((prev) => clamp(prev + delta, 15, 720));
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex h-full flex-col gap-4 p-5"
      >
        <div className="absolute right-5 top-5 opacity-40">
          <div className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] text-foreground">
            <Clock3 className="h-3 w-3" />
            {formatTime(now)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-semibold tracking-[0.04em] text-foreground">Today</div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/35 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-secondary-foreground">Study target today</div>
              <div className="mt-2 text-2xl font-semibold leading-none text-primary sm:text-3xl">
                {plannedHours}h {String(plannedRemainderMinutes).padStart(2, "0")}m
              </div>
            </div>
            <div className="w-28 text-right">
              <button
                type="button"
                onClick={openMinutesModal}
                className="inline-flex items-center gap-1 rounded-md bg-secondary/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-secondary"
              >
                <Clock3 className="h-3 w-3" />
                Minutes
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="bg-secondary px-1py-0 text-xs text-foreground/40">
            <Clock3 className="mr-1 h-2.5 w-2.5" />
            {focusSessions} sessions
          </Badge>
          <Badge variant="secondary" className="bg-secondary px-1 py-0 text-xs text-foreground/40">
            <BookOpen className="mr-1 h-2.5 w-2.5" />
            Studied {studiedMinutes}m
          </Badge>
          <Badge variant="secondary" className="bg-secondary px-1 py-0 text-xs  text-foreground/40">
            <Calendar className="mr-1 h-2.5 w-2.5" />
            {dateLine.date}
          </Badge>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-secondary-foreground">Week</div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekLabels.map((label, idx) => {
              const isToday = idx === dayIndex;
              return (
                <div key={`${label}-${idx}`} className="flex flex-col items-center gap-1">
                  <span className={isToday ? "text-[10px] font-semibold text-primary" : "text-[10px] text-secondary-foreground"}>
                    {label}
                  </span>
                  <span className={isToday ? "h-2 w-2 rounded-full bg-primary" : "h-2 w-2 rounded-full bg-secondary"} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/35 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-secondary-foreground">
            Remaining today
          </div>
          <div className="mt-2 text-2xl font-semibold leading-none text-primary sm:text-3xl">
            {remainingHours}h {String(remainingRemainderMinutes).padStart(2, "0")}m
          </div>
        </div>

        <div className="mt-auto" />

        {isMinutesModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={() => setIsMinutesModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg"
            >
              <div className="mb-3 text-sm font-semibold text-foreground">Set Study Minutes</div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => adjustDraftMinutes(-15)}
                  className="h-9 w-9 rounded-md border-border bg-secondary/40 p-0 text-foreground"
                  aria-label="Decrease by 15 minutes"
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={draftMinutes}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (Number.isNaN(parsed)) return;
                    setDraftMinutes(clamp(parsed, 15, 720));
                  }}
                  className="h-9 text-center text-sm text-foreground"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => adjustDraftMinutes(15)}
                  className="h-9 w-9 rounded-md border-border bg-secondary/40 p-0 text-foreground"
                  aria-label="Increase by 15 minutes"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 text-xs text-secondary-foreground">Use manual value or adjust in 15-minute steps.</div>

              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsMinutesModalOpen(false)} className="border-border">
                  Cancel
                </Button>
                <Button type="button" onClick={saveMinutes}>
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

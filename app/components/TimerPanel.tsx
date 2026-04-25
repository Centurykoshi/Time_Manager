"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

type TimerStatus = "idle" | "running" | "paused" | "ended";

const presets = [15, 20, 25, 45, 60];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function TimerPanel() {
  const [durationMin, setDurationMin] = useState<number>(25);
  const [remainingSec, setRemainingSec] = useState<number>(25 * 60);
  const [activeDurationSec, setActiveDurationSec] = useState<number>(25 * 60);
  const [status, setStatus] = useState<TimerStatus>("idle");

  const tickRef = useRef<number | null>(null);
  const savedRunRef = useRef(false);

  const durationSec = clamp(Math.round(durationMin * 60), 60, 60 * 180);
  const progress = clamp(remainingSec / Math.max(activeDurationSec, 1), 0, 1);

  const stopTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const dispatchDashboardRefresh = () => {
    window.dispatchEvent(new Event("dashboard:changed"));
  };

  const saveSession = async (elapsedSeconds: number) => {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - elapsedSeconds * 1000);

    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        durationMinutes,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        source: "TIMER",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save study session.");
    }

    dispatchDashboardRefresh();
  };

  const applyDuration = (minutes: number) => {
    const nextMinutes = clamp(minutes, 1, 180);
    const nextSeconds = clamp(Math.round(nextMinutes * 60), 60, 60 * 180);

    setDurationMin(nextMinutes);
    savedRunRef.current = false;
    if (status !== "running") {
      stopTick();
      setStatus("idle");
      setRemainingSec(nextSeconds);
      setActiveDurationSec(nextSeconds);
    }
  };

  const chime = async () => {
    // WebAudio chime (no external assets).
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = new AudioContextCtor();
      const now = ctx.currentTime;

      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(523.25, now); // C5
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.08, now + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      o1.connect(g1).connect(ctx.destination);
      o1.start(now);
      o1.stop(now + 0.6);

      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "triangle";
      o2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      g2.gain.setValueAtTime(0, now + 0.08);
      g2.gain.linearRampToValueAtTime(0.06, now + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      o2.connect(g2).connect(ctx.destination);
      o2.start(now + 0.08);
      o2.stop(now + 0.65);

      setTimeout(() => ctx.close(), 900);
    } catch {
      // ignore
    }
  };

  const start = () => {
    if (status === "running") return;

    if (status !== "paused") {
      // fresh start
      setActiveDurationSec(durationSec);
      setRemainingSec(durationSec);
      savedRunRef.current = false;
    }

    setStatus("running");
    stopTick();
    tickRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          stopTick();
          if (!savedRunRef.current) {
            savedRunRef.current = true;
            void saveSession(activeDurationSec);
          }
          setStatus("ended");
          void chime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    if (status !== "running") return;
    setStatus("paused");
    stopTick();
  };

  const restart = () => {
    stopTick();
    setActiveDurationSec(durationSec);
    setRemainingSec(durationSec);
    setStatus("idle");
    savedRunRef.current = false;
  };

  const stop = async () => {
    const elapsedSeconds = activeDurationSec - remainingSec;
    if (!savedRunRef.current && elapsedSeconds > 0) {
      savedRunRef.current = true;
      try {
        await saveSession(elapsedSeconds);
      } catch {
        savedRunRef.current = false;
      }
    }
    stopTick();
    setActiveDurationSec(durationSec);
    setRemainingSec(durationSec);
    setStatus("idle");
    savedRunRef.current = false;
  };

  useEffect(() => {
    return () => stopTick();
  }, []);

  const R = 60;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - progress);
  const statusLabel =
    status === "running"
      ? "In focus"
      : status === "paused"
        ? "Paused"
        : status === "ended"
          ? "Complete"
          : "Ready";

    const primaryButtonLabel = status === "paused" ? "Resume" : status === "running" ? "Running" : "Start";
    const showPause = status === "running";
    const resetLabel = status === "ended" ? "Restart" : "Reset";

  return (
      <Card className="relative h-full min-h-0 overflow-hidden border border-border bg-card text-foreground shadow-sm">

        <CardHeader className="relative items-center gap-1 px-6 pt-6 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">Focus Timer</CardTitle>
          <CardDescription className="text-[11px] tracking-[0.22em] text-secondary-foreground">
            Session control
          </CardDescription>
        </CardHeader>

        <CardContent className="relative flex h-[calc(100%-88px)] min-h-0 flex-col items-center justify-center gap-5 px-6 pb-6 pt-0 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="relative flex flex-col items-center"
          >
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <div className="h-44 w-44 rounded-full border border-border bg-secondary/20" />
            </div>



            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                {statusLabel}
              </div>
              <div className="mb-20 mt-2 font-mono text-[36px] font-semibold leading-none tracking-[0.01em] text-primary sm:text-[42px]">
                {fmt(remainingSec)}
              </div>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {presets.map((m) => {
              const selected = durationMin === m;
              return (
                <Button
                  key={m}
                  onClick={() => applyDuration(m)}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className={
                        "h-9 min-w-11 rounded-[0.4rem] px-3 text-[12px] font-bold shadow-none " +
                    (selected
                          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border-border bg-secondary/35 text-secondary-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary")
                  }
                >
                  {m}
                </Button>
              );
            })}
          </div>

          <div className="flex w-full items-center gap-3 pt-1">
            <Button
              onClick={start}
              disabled={status === "running"}
              className="h-12 flex-1 rounded-md bg-primary px-6 font-bold uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              {primaryButtonLabel}
            </Button>

            <Button
              onClick={pause}
              variant="outline"
              disabled={!showPause}
              aria-label="Pause timer"
              className="h-12 w-12 rounded-md border-border bg-secondary/35 text-secondary-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
            >
              <Pause className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => {
                if (status === "ended") {
                  restart();
                  return;
                }
                void stop();
              }}
              variant="outline"
              aria-label={resetLabel}
              className="h-12 w-12 rounded-md border-border bg-secondary/35 text-secondary-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
            >
              {status === "ended" ? <RotateCcw className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Heart, History } from "lucide-react";
import { Button } from "./ui/button";
import { TimerCustomizer } from "./TimerCustomizer";

type TimerStatus = "idle" | "running" | "paused" | "ended";

type TimerSettingsResponse = {
  animationIcon: string;
  soundType: string;
  soundUrl?: string;
  favoriteMinutes?: number;
  latestMinutes?: number;
  timerStatus?: TimerStatus | string;
  timerDurationSec?: number;
  timerRemainingSec?: number;
  timerEndsAt?: string | null;
};

// YouTube Player type declaration
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
      loaded: number;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  getPlayerState(): number;
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [animationIcon, setAnimationIcon] = useState("Zap");
  const [soundType, setSoundType] = useState("wind");
  const [soundUrl, setSoundUrl] = useState("https://www.youtube.com/watch?v=vKov28ce8vo");
  const [favoriteMinutes, setFavoriteMinutes] = useState<number>(25);
  const [latestMinutes, setLatestMinutes] = useState<number>(25);
  const [animationParticles, setAnimationParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteInputValue, setFavoriteInputValue] = useState<string>(String(favoriteMinutes));
  const particleCountRef = useRef(0);
  const timerEndAtRef = useRef<number | null>(null);

  const tickRef = useRef<number | null>(null);
  const savedRunRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef({ y: 0, time: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/timer-settings");
        if (response.ok) {
          const data = (await response.json()) as TimerSettingsResponse;
          setAnimationIcon(data.animationIcon);
          setSoundType(data.soundType);
          if (data.soundUrl) setSoundUrl(data.soundUrl);
          if (data.favoriteMinutes) {
            setFavoriteMinutes(data.favoriteMinutes);
            setFavoriteInputValue(String(data.favoriteMinutes));
          }
          if (data.latestMinutes) setLatestMinutes(data.latestMinutes);

          const storedDurationSec = clamp(Math.round(data.timerDurationSec ?? 25 * 60), 60, 60 * 180);
          const persistedStatus = data.timerStatus?.toUpperCase?.() ?? "IDLE";
          const storedRemainingSec = clamp(Math.round(data.timerRemainingSec ?? storedDurationSec), 0, storedDurationSec);
          const storedEndsAt = data.timerEndsAt ? new Date(data.timerEndsAt).getTime() : null;

          setDurationMin(Math.max(1, Math.round(storedDurationSec / 60)));
          setActiveDurationSec(storedDurationSec);

          if (persistedStatus === "RUNNING") {
            const remainingFromWallClock = storedEndsAt ? Math.max(0, Math.ceil((storedEndsAt - Date.now()) / 1000)) : storedRemainingSec;
            if (remainingFromWallClock <= 0) {
              await completeTimer(false, storedDurationSec, 0, true);
            } else {
              timerEndAtRef.current = storedEndsAt ?? Date.now() + remainingFromWallClock * 1000;
              setRemainingSec(remainingFromWallClock);
              setStatus("running");
              startTicking(storedDurationSec);
            }
          } else if (persistedStatus === "PAUSED") {
            timerEndAtRef.current = null;
            setRemainingSec(storedRemainingSec);
            setStatus("paused");
          } else {
            timerEndAtRef.current = null;
            setRemainingSec(storedDurationSec);
            setStatus("idle");
          }
        }
      } catch (error) {
        console.error("Failed to fetch timer settings:", error);
      }
    };

    void fetchSettings();

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }
  }, []);

  const durationSec = clamp(Math.round(durationMin * 60), 60, 60 * 180);
  const progress = clamp(remainingSec / Math.max(activeDurationSec, 1), 0, 1);

  const persistTimerState = async (patch: {
    timerStatus?: TimerStatus;
    timerDurationSec?: number;
    timerRemainingSec?: number;
    timerEndsAt?: string | null;
  }) => {
    try {
      await fetch("/api/timer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (error) {
      console.error("Failed to persist timer state:", error);
    }
  };

  const stopTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startTicking = (sessionDurationSec: number) => {
    stopTick();
    tickRef.current = window.setInterval(() => {
      if (!timerEndAtRef.current) return;

      const nextRemaining = Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000));
      if (nextRemaining <= 0) {
        void completeTimer(true, sessionDurationSec, 0, true);
        return;
      }

      setRemainingSec(nextRemaining);
    }, 1000);
  };

  const completeTimer = async (showEnded = true, overrideDurationSec?: number, overrideRemainingSec?: number, shouldPersist = true) => {
    stopTick();
    stopAudio();

    const resolvedDuration = overrideDurationSec ?? activeDurationSec;
    const resolvedRemaining = overrideRemainingSec ?? remainingSec;
    const elapsedSeconds = Math.max(0, resolvedDuration - resolvedRemaining);

    if (!savedRunRef.current && elapsedSeconds > 0) {
      savedRunRef.current = true;
      try {
        await saveSession(elapsedSeconds);
      } catch {
        savedRunRef.current = false;
      }
    }

    timerEndAtRef.current = null;
    setActiveDurationSec(resolvedDuration);
    setDurationMin(Math.max(1, Math.round(resolvedDuration / 60)));

    if (showEnded) {
      setStatus("ended");
      setRemainingSec(0);
      void chime();
    } else {
      setStatus("idle");
      setRemainingSec(resolvedDuration);
    }

    savedRunRef.current = false;

    if (shouldPersist) {
      await persistTimerState({
        timerStatus: "idle",
        timerDurationSec: resolvedDuration,
        timerRemainingSec: resolvedDuration,
        timerEndsAt: null,
      });
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
    // Only apply duration changes when timer is idle
    if (status !== "idle") return;

    const nextMinutes = clamp(minutes, 1, 180);
    const nextSeconds = clamp(Math.round(nextMinutes * 60), 60, 60 * 180);

    setDurationMin(nextMinutes);
    savedRunRef.current = false;
    setStatus("idle");
    setRemainingSec(nextSeconds);
    setActiveDurationSec(nextSeconds);
    timerEndAtRef.current = null;
    void persistTimerState({
      timerStatus: "idle",
      timerDurationSec: nextSeconds,
      timerRemainingSec: nextSeconds,
      timerEndsAt: null,
    });
  };

  const updateLatestMinutes = async (minutes: number) => {
    setLatestMinutes(minutes);
    try {
      await fetch("/api/timer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latestMinutes: minutes }),
      });
    } catch (error) {
      console.error("Failed to save latest minutes:", error);
    }
  };

  const updateFavoriteMinutes = async (minutes: number) => {
    setFavoriteMinutes(minutes);
    try {
      await fetch("/api/timer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteMinutes: minutes }),
      });
    } catch (error) {
      console.error("Failed to save favorite minutes:", error);
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
      timerEndAtRef.current = Date.now() + durationSec * 1000;
      savedRunRef.current = false;
      void updateLatestMinutes(durationMin);
      playTimerAnimation();
      void persistTimerState({
        timerStatus: "running",
        timerDurationSec: durationSec,
        timerRemainingSec: durationSec,
        timerEndsAt: new Date(timerEndAtRef.current).toISOString(),
      });
    } else {
      // resuming from pause
      timerEndAtRef.current = Date.now() + remainingSec * 1000;
      resumeAudio();
      void persistTimerState({
        timerStatus: "running",
        timerDurationSec: activeDurationSec,
        timerRemainingSec: remainingSec,
        timerEndsAt: new Date(timerEndAtRef.current).toISOString(),
      });
    }

    setStatus("running");
    startTicking(status === "paused" ? activeDurationSec : durationSec);
  };

  const pause = () => {
    if (status !== "running") return;
    const pausedRemaining = timerEndAtRef.current ? Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000)) : remainingSec;
    timerEndAtRef.current = null;
    setRemainingSec(pausedRemaining);
    setStatus("paused");
    pauseAudio();
    stopTick();
    void persistTimerState({
      timerStatus: "paused",
      timerDurationSec: activeDurationSec,
      timerRemainingSec: pausedRemaining,
      timerEndsAt: null,
    });
  };

  const restart = async () => {
    const resolvedRemaining = timerEndAtRef.current ? Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000)) : remainingSec;
    const elapsedSeconds = activeDurationSec - resolvedRemaining;
    if (!savedRunRef.current && elapsedSeconds > 0) {
      savedRunRef.current = true;
      try {
        await saveSession(elapsedSeconds);
      } catch {
        savedRunRef.current = false;
      }
    }
    stopTick();
    stopAudio();
    timerEndAtRef.current = null;
    setActiveDurationSec(durationSec);
    setRemainingSec(durationSec);
    setStatus("idle");
    savedRunRef.current = false;
    void persistTimerState({
      timerStatus: "idle",
      timerDurationSec: durationSec,
      timerRemainingSec: durationSec,
      timerEndsAt: null,
    });
  };

  const stop = async () => {
    const resolvedRemaining = timerEndAtRef.current ? Math.max(0, Math.ceil((timerEndAtRef.current - Date.now()) / 1000)) : remainingSec;
    const elapsedSeconds = activeDurationSec - resolvedRemaining;
    if (!savedRunRef.current && elapsedSeconds > 0) {
      savedRunRef.current = true;
      try {
        await saveSession(elapsedSeconds);
      } catch {
        savedRunRef.current = false;
      }
    }
    stopTick();
    stopAudio();
    timerEndAtRef.current = null;
    setActiveDurationSec(durationSec);
    setRemainingSec(durationSec);
    setStatus("idle");
    savedRunRef.current = false;
    void persistTimerState({
      timerStatus: "idle",
      timerDurationSec: durationSec,
      timerRemainingSec: durationSec,
      timerEndsAt: null,
    });
  };

  useEffect(() => {
    return () => stopTick();
  }, []);

  const R = 85;
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

  const primaryButtonLabel = status === "paused" ? "Resume" : status === "running" ? "Pause" : "Start";
  const resetLabel = status === "ended" ? "Restart" : "Reset";

  const playAdjustmentSound = async (frequency: number = 800) => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = ctx;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Silent fail if audio context unavailable
    }
  };

  const playTimerAnimation = () => {
    // Create particle burst animation
    stopAudio();
    const particles = Array.from({ length: 8 }).map((_, i) => ({
      id: particleCountRef.current++,
      x: Math.cos((i / 8) * Math.PI * 2) * 100,
      y: Math.sin((i / 8) * Math.PI * 2) * 100,
    }));
    setAnimationParticles(particles);

    // Auto-remove particles after animation
    setTimeout(() => {
      setAnimationParticles([]);
    }, 800);

    // Play YouTube sound via YouTube API
    if (soundUrl) {
      const youtubeId = soundUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\&\?]*)/)?.[1];
      if (youtubeId) {
        const iframeContainer = document.getElementById("timer-sound-player");
        if (iframeContainer) {
          iframeContainer.innerHTML = `<div id="yt-player"></div>`;
          
          // Wait for YouTube API to be ready
          const checkAPI = setInterval(() => {
            if (window.YT && window.YT.Player) {
              clearInterval(checkAPI);
              try {
                playerRef.current = new window.YT.Player("yt-player", {
                  height: "0",
                  width: "0",
                  videoId: youtubeId,
                  events: {
                    onReady: (event: { target: YTPlayer }) => {
                      event.target.playVideo();
                    },
                  },
                });
              } catch {
                // Silent fail if player creation fails
              }
            }
          }, 100);

          // Timeout after 2 seconds
          setTimeout(() => clearInterval(checkAPI), 2000);
        }
      }
    }
  };

  const pauseAudio = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {
        // Silent fail
      }
    }
  };

  const resumeAudio = () => {
    if (playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch {
        // Silent fail
      }
    }
  };

  const stopAudio = () => {
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch {
        // Silent fail
      }
    }
    playerRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (status !== "idle") return;
    
    setIsDragging(true);
    dragStartRef.current = { y: e.clientY, time: remainingSec };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: MouseEvent) => {
      if (!isDragging || status !== "idle") return;

      const deltaY = e.clientY - dragStartRef.current.y;
      // Every 30px = 1 minute adjustment (via right-click + mouse movement)
      const minuteAdjustment = Math.round((-deltaY / 30) * 1);
      
      if (minuteAdjustment !== 0) {
        const newMinutes = clamp(durationMin + minuteAdjustment, 1, 180);
        const newSeconds = newMinutes * 60;
        
        setDurationMin(newMinutes);
        setRemainingSec(newSeconds);
        setActiveDurationSec(newSeconds);
        
        // Play sound for adjustment (higher frequency for increase, lower for decrease)
        const freq = minuteAdjustment > 0 ? 880 : 700;
        void playAdjustmentSound(freq);
        
        dragStartRef.current = { y: e.clientY, time: newSeconds };
      }
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleWindowMove);
    window.addEventListener("mouseup", handleWindowUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMove);
      window.removeEventListener("mouseup", handleWindowUp);
    };
  }, [isDragging, status, durationMin]);

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (status !== "idle") return;
    
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1; // Scroll down = decrease, scroll up = increase
    const newMinutes = clamp(durationMin + direction, 1, 180);
    const newSeconds = newMinutes * 60;

    setDurationMin(newMinutes);
    setRemainingSec(newSeconds);
    setActiveDurationSec(newSeconds);

    // Play sound for adjustment
    const freq = direction > 0 ? 880 : 700;
    void playAdjustmentSound(freq);
  };

  const toggleTimer = () => {
    if (status === "running") {
      pause();
      return;
    }

    if (status === "paused") {
      start();
      return;
    }

    start();
  };

  const setFavoriteFromPrompt = async () => {
    if (status !== "idle") return;
    setFavoriteInputValue(String(favoriteMinutes));
    setShowFavoriteModal(true);
  };

  const handleFavoriteSave = async () => {
    const parsed = Number.parseInt(favoriteInputValue, 10);
    if (Number.isNaN(parsed)) return;

    const next = clamp(parsed, 1, 180);
    applyDuration(next);
    await updateFavoriteMinutes(next);
    setShowFavoriteModal(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/40 bg-card/50 p-6"
    >
      <TimerCustomizer onSettingsChange={(newSettings) => {
        setAnimationIcon(newSettings.animationIcon);
        setSoundType(newSettings.soundType);
        if (newSettings.soundUrl) setSoundUrl(newSettings.soundUrl);
      }} />
      <div id="timer-sound-player" style={{ display: "none" }}></div>
      
      <div className="mb-4 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Pomodoro timer</div>
        <h3 className="text-lg font-semibold">Focus session</h3>
      </div>

      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-5 text-center">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-4"
        >
          {[
            { dur: latestMinutes, id: "latest", icon: History, title: `Latest ${latestMinutes}m` },
            { dur: 25, id: "focus", title: "25m Focus" },
            { dur: 5, id: "short", title: "5m Short" },
            { dur: 15, id: "long", title: "15m Long" },
            { dur: favoriteMinutes, id: "favorite", icon: Heart, title: `${favoriteMinutes}m Favorite` },
          ].map((item, i) => {
            const selected = durationMin === item.dur;
            const Icon = item.icon;
            const handleClick = async () => {
              if (item.id === "favorite") {
                await setFavoriteFromPrompt();
                return;
              }

              applyDuration(item.dur);
            };
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={handleClick}
                title={item.title}
                className={
                  (Icon
                    ? "inline-flex items-center justify-center h-8 w-8 rounded-full border transition "
                    : "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ") +
                  (selected ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/60")
                }
              >
                {Icon ? <Icon className="h-4 w-4" /> : item.title}
              </motion.button>
            );
          })}
        </motion.div>

        <motion.svg
          ref={svgRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          width="160"
          height="160"
          viewBox="0 0 200 200"
          className={`mb-6 ${status === "idle" ? "cursor-grab active:cursor-grabbing" : ""}`}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          onMouseLeave={handleMouseUp}
          style={{ userSelect: "none" }}
        >
          <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="10" className="stroke-secondary/40" />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            className={`stroke-primary transition-all ${isDragging ? "stroke-primary/80" : ""}`}
            style={{ transition: isDragging ? "none" : "stroke-dashoffset 200ms linear" }}
          />
          <text x="100" y="95" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-semibold fill-foreground pointer-events-none">
            {fmt(remainingSec)}
          </text>
          <motion.text
            x="100"
            y="125"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-muted-foreground pointer-events-none"
            animate={{ opacity: isDragging ? 0.5 : 1 }}
          >
            {status === "idle" ? (isDragging ? "Adjust time" : "Right-click drag / Scroll") : statusLabel}
          </motion.text>
        </motion.svg>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex items-center gap-3 justify-center"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={toggleTimer} className="h-11 gap-2 px-6">
              {status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {primaryButtonLabel}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={restart} variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Favorite Minutes Modal */}
      {showFavoriteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowFavoriteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card/90 border border-border/40 rounded-lg p-6 w-96 shadow-lg backdrop-blur-md"
          >
            <h2 className="text-lg font-semibold mb-4">Set Favorite Duration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Minutes (1-180)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={favoriteInputValue}
                  onChange={(e) => setFavoriteInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleFavoriteSave();
                    }
                  }}
                  autoFocus
                  className="w-full h-9 rounded-lg border border-border/40 bg-secondary/20 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowFavoriteModal(false)}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleFavoriteSave()}
                  className="px-4"
                >
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";

type SfxType = "button" | "taskComplete" | "sessionComplete" | "addTask" | "changeDifficulty";

type SfxContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  play: (type: SfxType) => void;
};

const STORAGE_KEY = "focusflow:sfx-enabled";

const AUDIO_SOURCES: Record<SfxType, string> = {
  button: "/media/for buttons.wav",
  taskComplete: "/media/addthisaftercompletingtask.wav",
  sessionComplete: "/media/addthisaftersessioncomplete.wav",
  addTask: "/media/Addtask.wav",
  changeDifficulty: "/media/changediffulty.wav",
};

const SFX_VOLUMES: Record<SfxType, number> = {
  button: 1,
  taskComplete: 1,
  sessionComplete: 1,
  addTask: 1,
  changeDifficulty: 1,
};

const SfxContext = createContext<SfxContextValue | null>(null);

export function SfxProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "0") return false;
      if (stored === "1") return true;
    } catch {
      // ignore storage failures
    }
    return true;
  });
  const audioRefs = useRef<Partial<Record<SfxType, HTMLAudioElement>>>({});
  const lastButtonAtRef = useRef(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [enabled]);

  const play = useCallback(
    (type: SfxType) => {
      if (!enabled) return;

      try {
        let audio = audioRefs.current[type];
        if (!audio) {
          audio = new Audio(AUDIO_SOURCES[type]);
          audio.preload = "auto";
          audio.volume = SFX_VOLUMES[type];
          audioRefs.current[type] = audio;
        }

        audio.volume = SFX_VOLUMES[type];
        audio.currentTime = 0;
        void audio.play();
      } catch {
        // ignore playback failures
      }
    },
    [enabled],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-no-sfx='true']")) return;

      const interactive = target.closest("button, [role='button'], [data-slot='button']");
      if (!interactive) return;

      const now = Date.now();
      if (now - lastButtonAtRef.current < 60) return;
      lastButtonAtRef.current = now;
      play("button");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [play]);

  const value = useMemo<SfxContextValue>(
    () => ({
      enabled,
      setEnabled,
      toggleEnabled: () => setEnabled((prev) => !prev),
      play,
    }),
    [enabled, play],
  );

  return <SfxContext.Provider value={value}>{children}</SfxContext.Provider>;
}

export function useSfx() {
  const ctx = useContext(SfxContext);
  if (!ctx) {
    throw new Error("useSfx must be used within SfxProvider");
  }
  return ctx;
}

export function SfxToggleButton() {
  const { enabled, toggleEnabled } = useSfx();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleEnabled}
      data-no-sfx="true"
      aria-label={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      title={enabled ? "Mute interface sounds" : "Unmute interface sounds"}
      className="h-8 w-8"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  );
}

"use client";
import { getTimeZoneHeaders } from "@/lib/timezone";

export type XpResponse = {
  summary: {
    totalXp: number;
    tasksCompleted: number;
    level: number;
    xpIntoLevel: number;
    xpToNextLevel: number;
    progress: number;
  };
  dailyXp: Array<{ day: string; label: string; xp: number; tasksCompleted: number }>;
  recentTasks: Array<{
    id: string;
    title: string;
    difficulty: string;
    xpEarned: number;
    completedAt: string | null;
  }>;
};

type Listener = (data: XpResponse | null) => void;

let xpCache: XpResponse | null = null;
let inFlightLoad: Promise<XpResponse> | null = null;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(xpCache);
  }
}

export function getXpCache() {
  return xpCache;
}

export function subscribeXpCache(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setXpCache(nextData: XpResponse) {
  xpCache = nextData;
  notifyListeners();
  return xpCache;
}

export async function loadRemoteXp(force = false) {
  if (!force && xpCache) {
    return xpCache;
  }

  if (!force && inFlightLoad) {
    return inFlightLoad;
  }

  const request = (async () => {
    const response = await fetch("/api/xp", {
      headers: getTimeZoneHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to load XP data.");
    }

    const payload = (await response.json()) as XpResponse;
    return setXpCache(payload);
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

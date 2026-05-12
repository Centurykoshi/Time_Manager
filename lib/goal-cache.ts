"use client";

import { Goal, GoalGroup, groupOrder } from "@/app/components/goals";

export type GoalRecord = Goal & { isArchived?: boolean };

export type GoalCacheData = {
  groups: GoalGroup[];
  goals: GoalRecord[];
};

type Listener = (data: GoalCacheData | null) => void;

let goalCache: GoalCacheData | null = null;
let inFlightLoad: Promise<GoalCacheData> | null = null;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(goalCache);
  }
}

function normalizeGroups(groups: GoalGroup[]) {
  return [...groups].sort((left, right) => groupOrder.indexOf(left.type) - groupOrder.indexOf(right.type));
}

export function getGoalCache() {
  return goalCache;
}

export function subscribeGoalCache(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setGoalCache(nextData: GoalCacheData) {
  goalCache = {
    groups: normalizeGroups(nextData.groups),
    goals: nextData.goals,
  };
  notifyListeners();
  return goalCache;
}

export function updateGoalCache(updater: (current: GoalCacheData | null) => GoalCacheData | null) {
  const nextData = updater(goalCache);
  goalCache = nextData ? { groups: normalizeGroups(nextData.groups), goals: nextData.goals } : null;
  notifyListeners();
  return goalCache;
}

export async function loadRemoteGoals(force = false) {
  if (!force && goalCache) {
    return goalCache;
  }

  if (!force && inFlightLoad) {
    return inFlightLoad;
  }

  const request = (async () => {
    const [groupsResponse, goalsResponse] = await Promise.all([fetch("/api/goal-groups"), fetch("/api/goals")]);
    const groupsPayload = groupsResponse.ok ? (await groupsResponse.json()) as { groups: GoalGroup[] } : { groups: [] as GoalGroup[] };
    const goalsPayload = goalsResponse.ok ? (await goalsResponse.json()) as { goals: GoalRecord[] } : { goals: [] as GoalRecord[] };
    return setGoalCache({ groups: groupsPayload.groups ?? [], goals: goalsPayload.goals ?? [] });
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
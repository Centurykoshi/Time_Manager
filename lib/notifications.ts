/**
 * Browser Notifications utility
 * Handles permission requests and sending system notifications
 */

import { toast } from "sonner";

export type NotificationPermissionStatus = "granted" | "denied" | "default";

export function isNotificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationsSupported()) return "default";
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationsSupported()) {
    console.warn("Notifications are not supported by this browser");
    return "default";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  }

  return "denied";
}

export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationsSupported()) {
    console.warn("Notifications are not supported by this browser");
    return null;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      ...options,
    });

    // Auto-close after 5 seconds if no interaction
    const timeout = setTimeout(() => {
      notification.close();
    }, 5000);

    notification.addEventListener("click", () => {
      clearTimeout(timeout);
      notification.close();
      // Focus the window when notification is clicked
      if (typeof window !== "undefined") {
        window.focus();
      }
    });

    notification.addEventListener("close", () => {
      clearTimeout(timeout);
    });

    return notification;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return null;
  }
}

export function notifyTimerComplete(durationMin: number): void {
  sendNotification("🎯 Focus session complete!", {
    body: `Great job! You've completed a ${durationMin} minute focus session.`,
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23f59e0b'/><path d='M35 50 L45 60 L65 40' stroke='white' stroke-width='4' fill='none' stroke-linecap='round'/></svg>",
  });
}

export function notifyTodoCompleted(title: string): void {
  toast.success("Todo completed!", {
    description: `You've finished: ${title}`,
    className: "bg-gradient-to-b from-primary/20 to-primary/10 border-0",
  });
}

export function notifyGoalReached(goalTitle: string): void {
  sendNotification("🚀 Goal reached!", {
    body: `Congratulations! You've achieved: ${goalTitle}`,
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%238b5cf6'/><path d='M50 25 L60 40 L75 45 L60 55 L65 70 L50 60 L35 70 L40 55 L25 45 L40 40 Z' fill='white'/></svg>",
  });
}

export function notifyStreakReset(): void {
  sendNotification("⚠️ Streak paused", {
    body: "Don't forget to keep your streak alive! Complete a task or focus session tomorrow.",
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23ef4444'/><path d='M50 30 L50 60 M35 45 L65 45' stroke='white' stroke-width='4' stroke-linecap='round'/></svg>",
  });
}

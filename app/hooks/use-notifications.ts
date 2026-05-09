"use client";

import { useState } from "react";
import { isNotificationsSupported, getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

export function useNotifications() {
  const [isSupported] = useState(() => isNotificationsSupported());
  const [permission, setPermission] = useState<"granted" | "denied" | "default">(() =>
    isNotificationsSupported() ? getNotificationPermission() : "default",
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const request = async () => {
    if (!isSupported) return;
    setIsRequesting(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setIsRequesting(false);
  };

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    isDefault: permission === "default",
    requestPermission: request,
    isRequesting,
  };
}

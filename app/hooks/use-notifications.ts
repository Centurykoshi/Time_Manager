"use client";

import { useEffect, useState } from "react";
import { isNotificationsSupported, getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "default">("default");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!isNotificationsSupported()) return;

    setIsSupported(true);
    setPermission(getNotificationPermission());
  }, []);

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

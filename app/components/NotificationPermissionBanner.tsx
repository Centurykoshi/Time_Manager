"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useNotifications } from "@/app/hooks/use-notifications";
import { Button } from "./ui/button";

export function NotificationPermissionBanner() {
  const { isSupported, isDefault, requestPermission, isRequesting } = useNotifications();

  if (!isSupported || !isDefault) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 px-4 py-3 backdrop-blur-sm"
      >
        <Bell className="h-4 w-4 text-amber-500" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Enable notifications?</p>
          <p className="text-xs text-muted-foreground">Get alerts when you complete tasks and focus sessions</p>
        </div>
        <Button
          size="sm"
          onClick={requestPermission}
          disabled={isRequesting}
          className="whitespace-nowrap"
        >
          {isRequesting ? "Requesting..." : "Enable"}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

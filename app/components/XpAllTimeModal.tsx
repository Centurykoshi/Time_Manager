"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface DailyXpEntry {
  day: string;
  label: string;
  xp: number;
  tasksCompleted: number;
}

interface XpAllTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DailyXpEntry[];
  loading?: boolean;
  formatFullDateWithDay: (value: string | null | undefined) => string;
}

export function XpAllTimeModal({
  isOpen,
  onClose,
  entries,
  loading = false,
  formatFullDateWithDay,
}: XpAllTimeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
              <div>
                <h2 className="text-2xl font-semibold">All time XP</h2>
                <p className="text-sm text-muted-foreground">Every tracked day with earned XP</p>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-3 overflow-auto px-6 py-4">
              {loading ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading all-time XP...
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No daily XP records yet.
                </div>
              ) : (
                entries.map((day) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-border/50 bg-background/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{day.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFullDateWithDay(day.day)} • {day.tasksCompleted} tasks
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-amber-500">{day.xp} XP</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

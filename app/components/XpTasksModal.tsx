"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface Task {
  id: string;
  title: string;
  difficulty: string;
  xpEarned: number;
  completedAt: string | null;
}

interface XpTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  loading?: boolean;
  formatFullDateWithDay: (value: string | null | undefined) => string;
}

export function XpTasksModal({
  isOpen,
  onClose,
  tasks,
  loading = false,
  formatFullDateWithDay,
}: XpTasksModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
              <div>
                <h2 className="text-2xl font-semibold">All tasks with XP</h2>
                <p className="text-sm text-muted-foreground">View all completed tasks and earned XP</p>
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

            {/* Content */}
            <div className="max-h-[calc(80vh-88px)] space-y-3 overflow-y-auto px-6 py-4 pr-3">
              {loading ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading all tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No tasks completed with XP yet.
                </div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl border border-border/50 bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.difficulty} • {formatFullDateWithDay(task.completedAt ?? new Date().toISOString())}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-amber-500">+{task.xpEarned}</p>
                        <p className="text-xs text-muted-foreground">XP</p>
                      </div>
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

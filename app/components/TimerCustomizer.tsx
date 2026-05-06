"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "./ui/button";

const ANIMATIONS = [
  "Zap",
  "Sparkles",
  "Flame",
  "Heart",
  "Star",
  "Moon",
  "Sun",
  "Cloud",
  "Waves",
  "Wind",
];

const SOUNDS = [
  { name: "Wind", type: "wind", url: "https://www.youtube.com/watch?v=-UfI1X-MSig" },
  { name: "Night", type: "night", url: "https://www.youtube.com/watch?v=_QqabGYTSpQ" },
  { name: "Rain", type: "rain", url: "https://www.youtube.com/watch?v=XKDGZ-VWLMg" },
];

type TimerSettings = {
  animationIcon: string;
  soundType: string;
  soundUrl?: string;
};

interface TimerCustomizerProps {
  onSettingsChange?: (settings: TimerSettings) => void;
}

export function TimerCustomizer({ onSettingsChange }: TimerCustomizerProps = {}) {
  const [settings, setSettings] = useState<TimerSettings>({
    animationIcon: "Zap",
    soundType: "wind",
    soundUrl: "https://www.youtube.com/watch?v=-UfI1X-MSig",
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/timer-settings");
        if (response.ok) {
          const data = (await response.json()) as TimerSettings;
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch timer settings:", error);
      }
    };

    void fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await fetch("/api/timer-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save timer settings:", error);
    }
  };

  const AnimationIcon = LucideIcons[settings.animationIcon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
  const selectedSound = SOUNDS.find((s) => s.type === settings.soundType);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 p-2 hover:bg-secondary/50 rounded-lg transition"
      >
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-card border border-border/40 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Timer Customizer</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Animation Selection */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Animation</div>
                  <div className="flex items-center gap-3 mb-3">
                    {AnimationIcon && <AnimationIcon className="h-6 w-6 text-primary" />}
                    <span className="text-sm text-muted-foreground">{settings.animationIcon}</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                    {ANIMATIONS.map((icon) => {
                      const Icon = LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                      return (
                        <motion.button
                          key={icon}
                          whileHover={{ x: 4 }}
                          onClick={() => setSettings({ ...settings, animationIcon: icon })}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                            settings.animationIcon === icon
                              ? "bg-primary/20 border border-primary text-primary"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          <span className="text-sm">{icon}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Sound Selection */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Sound</div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-muted-foreground">{selectedSound?.name}</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-border/30 rounded-lg p-3">
                    {SOUNDS.map((sound) => (
                      <motion.button
                        key={sound.type}
                        whileHover={{ x: 4 }}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            soundType: sound.type,
                            soundUrl: sound.url,
                          })
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left ${
                          settings.soundType === sound.type
                            ? "bg-primary/20 border border-primary text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <span className="text-sm">{sound.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-4"
                >
                  <Button onClick={handleSaveSettings} className="w-full">
                    Save Settings
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

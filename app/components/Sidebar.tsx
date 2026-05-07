"use client";

import { motion } from "framer-motion";
import { ListTodo, Target, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarPage = "main" | "todos" | "goals";

interface SidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
  todoCount: number;
  goalCount: number;
}

export function Sidebar({ activePage, onPageChange, todoCount, goalCount }: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-64 border-r border-border/40 bg-card/50 flex flex-col max-h-screen sticky top-0"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40">
        <h2 className="text-lg font-semibold">Navigation</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3 space-y-2">
        <NavButton
          icon={<Home className="w-4 h-4" />}
          label="Main"
          active={activePage === "main"}
          onClick={() => onPageChange("main")}
        />
        <NavButton
          icon={<ListTodo className="w-4 h-4" />}
          label="All Todos"
          active={activePage === "todos"}
          onClick={() => onPageChange("todos")}
          badge={todoCount}
        />
        <NavButton
          icon={<Target className="w-4 h-4" />}
          label="Goals"
          active={activePage === "goals"}
          onClick={() => onPageChange("goals")}
          badge={goalCount}
        />
      </nav>
    </motion.aside>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
            active
              ? "bg-primary-foreground text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

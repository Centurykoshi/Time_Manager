"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, ListTodo, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getGradientColors } from "@/lib/color-utils";
import {
  Sidebar as SidebarShell,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { UserSummaryModal } from "./UserSummaryModal";

type SidebarPage = "main" | "todos" | "goals" | "xp";

type DashboardSnapshot = {
  todosSummary: { total: number; done: number; open: number };
  goalsSummary: { total: number };
  xpSummary: { totalXp: number; level: number };
  todaySummary: { studiedMinutes: number; focusSessions: number; todosCompleted: number; todosPlanned: number };
  weekSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    studyDays: number;
    weekStart: string;
    weekEnd: string;
  };
  allTimeSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
  };
  streakDays: number;
  streakBreakAt: string | null;
  dailySeries: Array<{ day: string; label: string; studiedMinutes: number; focusSessions: number }>;
};

interface SidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
  todoCount: number;
  goalCount: number;
  xpCount?: number;
  session?: { user?: { email?: string; name?: string; image?: string; provider?: string } };
  snapshot?: DashboardSnapshot | null;
}

type NavigationItem = {
  key: SidebarPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

const navigationItems: NavigationItem[] = [
  { key: "main", label: "Main", icon: Home },
  { key: "todos", label: "All Todos", icon: ListTodo },
  { key: "goals", label: "Goals", icon: Target },
  { key: "xp", label: "Experience", icon: Trophy },
];

export function Sidebar({ 
  activePage, 
  onPageChange, 
  todoCount, 
  goalCount, 
  xpCount,
  session,
  snapshot 
}: SidebarProps) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  const items = navigationItems.map((item) => {
    if (item.key === "todos") return { ...item, badge: todoCount };
    if (item.key === "goals") return { ...item, badge: goalCount };
    if (item.key === "xp") return { ...item, badge: xpCount !== undefined ? `Lv ${xpCount}` : undefined };
    return item;
  });

  const user = session?.user;
  const userEmail = user?.email || "user@example.com";
  const { color1, color2 } = getGradientColors(userEmail);
  const isGoogle = user?.provider === "google";
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  return (
    <>
      <SidebarShell collapsible="icon" className="border-r border-sidebar-border/60 bg-sidebar/95 backdrop-blur-xl">
        <SidebarHeader className="border-b border-sidebar-border/60 px-2 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_rgba(234,179,8,0.28)] mt-0.5">
                <svg className="h-4.5 w-4.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="7" cy="7" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="text-sm font-semibold tracking-wide text-sidebar-foreground">FocusFlow</div>
            </div>
            <SidebarTrigger className="border-0 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:bg-sidebar-accent/80 group-data-[collapsible=icon]:shadow-[0_0_20px_rgba(234,179,8,0.14)]" />
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1 px-2 py-3 group-data-[collapsible=icon]:px-1.5">
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ key, label, icon: Icon, badge }) => {
                  const active = activePage === key;

                  return (
                    <SidebarMenuItem key={key} className="relative group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            isActive={active}
                            onClick={() => onPageChange(key)}
                            className={cn(
                              "relative h-11 justify-start gap-3 overflow-hidden px-3 transition-all duration-200 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0",
                              active
                                ? "bg-primary text-primary-foreground shadow-[0_12px_24px_-16px_rgba(234,179,8,0.65)] hover:bg-primary/95"
                                : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <AnimatePresence initial={false}>
                              {active && (
                                <motion.span
                                  layoutId="sidebar-active-pill"
                                  className="absolute inset-0 rounded-md bg-primary"
                                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                                />
                              )}
                            </AnimatePresence>
                            <span className="relative z-10 flex w-full items-center gap-3 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-sidebar-foreground/70")} />
                              <span className="truncate text-left group-data-[collapsible=icon]:hidden">{label}</span>
                              {badge !== undefined && (
                                <span
                                  className={cn(
                                    "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums group-data-[collapsible=icon]:hidden",
                                    active
                                      ? "bg-primary-foreground/15 text-primary-foreground"
                                      : "bg-sidebar-accent/20 text-sidebar-accent-foreground"
                                  )}
                                >
                                  {badge}
                                </span>
                              )}
                            </span>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Footer */}
        {user && (
          <SidebarFooter className="border-t border-sidebar-border/60 px-2 py-3">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors group-data-[collapsible=icon]:justify-center"
                >
                  <div
                    className="h-9 w-9 rounded-full border border-border/30 flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{
                      background: isGoogle
                        ? "white"
                        : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                    }}
                  >
                    {!isGoogle && <span className="text-white">{initials}</span>}
                  </div>
                  <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                    <p className="text-xs font-semibold truncate">{user.name || "User"}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{userEmail}</p>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                {user.name || "User"}
              </TooltipContent>
            </Tooltip>
          </SidebarFooter>
        )}
      </SidebarShell>

      {/* User Summary Modal */}
      <UserSummaryModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={user}
        snapshot={snapshot}
      />
    </>
  );
}


"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { getGradientColors } from "@/lib/color-utils";

// Google Icon Component
function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function UserAvatarMenu({ user }: { user?: { email?: string; name?: string; image?: string; provider?: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = user?.email || "user@example.com";
  const { color1, color2 } = getGradientColors(userEmail);
  const isGoogle = user?.provider === "google";
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Circle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-full border border-border/30 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform text-sm font-semibold relative overflow-hidden group"
        style={{
          background: isGoogle 
            ? undefined 
            : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
          backgroundColor: isGoogle ? "white" : undefined,
        }}
        title={userEmail}
      >
        {/* Primary layer overlay */}
        {!isGoogle && (
          <div className="absolute inset-0 bg-card/40 group-hover:bg-card/30 transition-colors"></div>
        )}
        {isGoogle ? <GoogleIcon /> : null}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border/30 bg-card/95 backdrop-blur-sm shadow-lg z-50">
          <div className="p-4 space-y-3">
            {/* User Info */}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
              {isGoogle && <p className="text-xs text-amber-600">Logged in with Google</p>}
            </div>

            <div className="h-px bg-border/20"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-red-500/20 transition-colors text-red-500 hover:text-red-600 font-semibold border border-red-500/30 hover:border-red-500/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

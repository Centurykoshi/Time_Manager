"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AuthMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out");
      setIsOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to sign out"));
    }
  };

  if (isPending) {
    return <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="border-border/70 bg-background/60">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    );
  }

  const initials = (session.user.name || session.user.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 text-sm shadow-sm"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-xs font-semibold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{session.user.name || "Profile"}</span>
      </motion.button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-medium">Signed in as</p>
            <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <div className="space-y-1 p-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
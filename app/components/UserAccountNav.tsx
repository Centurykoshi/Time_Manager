"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";

export function UserAccountNav({ user }: { user?: { email?: string; name?: string; image?: string } }) {
  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        <p className="text-sm font-semibold">{user?.name || user?.email}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );
}

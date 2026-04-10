"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { User, Shield, RotateCcw } from "lucide-react";

export function TopRightProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading || !isAuthenticated || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div className="hidden md:flex fixed top-3 right-6 z-50">
      <Link
        href="/profile"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border/50 shadow-sm hover:shadow-md hover:bg-muted/20 transition-all group"
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary group-hover:scale-105 transition-transform">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <span className="text-xs font-semibold max-w-[100px] truncate">{user?.name?.split(" ")[0]}</span>
      </Link>
    </div>
  );
}

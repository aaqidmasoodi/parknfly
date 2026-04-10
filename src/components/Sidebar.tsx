"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/auth";
import {
  LayoutDashboard,
  CarFront,
  RotateCcw,
  Settings,
  MessageCircle,
  Users,
  LogOut,
  Shield,
} from "lucide-react";
import { useWhatsApp } from "@/lib/whatsapp-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncIndicator } from "@/components/SyncIndicator";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

const allNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { href: "/bookings", label: "Bookings", icon: CarFront, permission: "view_bookings" },
  { href: "/returns", label: "Returns", icon: RotateCcw, permission: "view_returns" },
  { href: "/users", label: "Users", icon: Users, permission: "manage_users" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useWhatsApp();
  const { user, isLoading, isAuthenticated, hasPermission, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Don't render sidebar on login page or while loading
  if (pathname.startsWith("/login") || isLoading || !isAuthenticated) {
    return null;
  }

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const roleLabel = user?.role === "manager" ? "Manager" : "Returns";
  const RoleIcon = user?.role === "manager" ? Shield : RotateCcw;

  return (
    <>
      {/* Fixed-width container to prevent layout shift */}
      <aside className="hidden md:flex flex-col w-20 border-r border-border/40 bg-card/60 backdrop-blur-md h-full z-20 shrink-0">
        <div className="flex items-center justify-center px-2 h-28 border-b border-border/40 shrink-0">
          <Image
            src="/park-and-fly-logo.jpg"
            alt="Park & Fly"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
            priority
          />
        </div>

        <nav className="flex flex-col gap-1.5 p-3 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)] bg-primary/10"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
                title={item.label}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary animate-slide-in" />
                )}
                <item.icon className={cn("h-4 w-4 z-10 transition-colors shrink-0", isActive ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings + User info + logout */}
        <div className="p-3 border-t border-border/40 space-y-1">
          <div className="flex items-center justify-center px-2 py-1.5">
            <SyncIndicator compact />
          </div>
          <div className="flex items-center justify-center px-2 py-2">
            <ThemeToggle />
          </div>
          {hasPermission("view_settings") && (
            <Link
              href="/settings"
              className={cn(
                "flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden",
                pathname === "/settings"
                  ? "text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)] bg-primary/10"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              title="Settings"
            >
              {pathname === "/settings" && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary animate-slide-in" />
              )}
              <Settings className={cn("h-4 w-4 z-10 transition-colors shrink-0", pathname === "/settings" ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
            </Link>
          )}
          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 opacity-70" />
          </button>
        </div>
      </aside>

      {/* Overlay sidebar that appears on hover */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-border/40 bg-card/95 backdrop-blur-xl h-full z-30 transition-all duration-300 ease-in-out absolute top-0 left-0 shadow-2xl",
          isHovered ? "w-72 opacity-100" : "w-72 opacity-0 pointer-events-none"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center px-6 h-28 border-b border-border/40 shrink-0">
          <Image
            src="/park-and-fly-logo.jpg"
            alt="Park & Fly"
            width={280}
            height={100}
            className="h-24 w-auto object-contain"
            priority
          />
        </div>

        <nav className="flex flex-col gap-1.5 p-3 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)] bg-primary/10"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary animate-slide-in" />
                )}
                <item.icon className={cn("h-4 w-4 z-10 transition-colors shrink-0", isActive ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
                <span className="z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings + WA status + User */}
        <div className="p-3 border-t border-border/40 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/30 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RoleIcon className="h-2.5 w-2.5" />
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <SyncIndicator />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          {hasPermission("view_settings") && (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden",
                pathname === "/settings"
                  ? "text-primary shadow-[0_0_12px_rgba(var(--primary),0.2)] bg-primary/10"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {pathname === "/settings" && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary animate-slide-in" />
              )}
              <Settings className={cn("h-4 w-4 z-10 transition-colors", pathname === "/settings" ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
              <span className="z-10">Settings</span>

              <span className="ml-auto flex items-center gap-1 z-10 relative shrink-0">
                {status === "connected" ? (
                  <span title="WhatsApp connected" className="flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366]/10 text-[#25D366]">
                    <MessageCircle className="h-2.5 w-2.5" />
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[#25D366] border border-card shadow-[0_0_6px_#25D366]" />
                  </span>
                ) : status === "qr_ready" || status === "connecting" ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
                ) : null}
              </span>
            </Link>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-4 w-4 opacity-70" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, hasPermission } = useAuth();

  // Don't render on login page or while loading
  if (pathname.startsWith("/login") || isLoading || !isAuthenticated) {
    return null;
  }

  const mobileNavItems: NavItem[] = [
    ...allNavItems.filter(
      (item) => !item.permission || hasPermission(item.permission)
    ),
    ...(hasPermission("view_settings")
      ? [{ href: "/settings", label: "Settings", icon: Settings } as NavItem]
      : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/40 flex justify-around py-2 pb-safe">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors min-w-0",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className={cn("p-1.5 rounded-full transition-all duration-300", isActive && "bg-primary/10 shadow-[0_0_12px_rgba(var(--primary),0.2)]")}>
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
            </div>
            <span className="truncate max-w-[52px] text-center">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTopBar() {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, user, logout } = useAuth();

  if (pathname.startsWith("/login") || isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-border/40 glass-card shrink-0">
      <Image
        src="/park-and-fly-logo.jpg"
        alt="Park & Fly"
        width={80}
        height={32}
        className="h-8 w-auto object-contain"
        priority
      />
      <div className="flex items-center gap-2">
        <Link href="/profile" className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
          <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">{user?.name?.split(" ")[0]}</span>
        </Link>
        <button
          onClick={logout}
          className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

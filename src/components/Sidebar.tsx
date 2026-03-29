"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CarFront,
  RotateCcw,
  PlaneTakeoff,
  Settings,
  MessageCircle,
} from "lucide-react";
import { useWhatsApp } from "@/lib/whatsapp-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CarFront },
  { href: "/returns", label: "Returns", icon: RotateCcw },
];

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useWhatsApp();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-border/40 bg-card/60 backdrop-blur-md h-full z-20">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border/40 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
          <PlaneTakeoff className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight gradient-text">Park &amp; Fly</span>
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
              <item.icon className={cn("h-4 w-4 z-10 transition-colors", isActive ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
              <span className="z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings + WA status */}
      <div className="p-3 border-t border-border/40 space-y-1">
        <Link
          href="/settings#messages-section"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all duration-200 group relative"
        >
          <MessageCircle className="h-4 w-4 opacity-70 group-hover:opacity-100" />
          Messages
        </Link>
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
          
          <span className="ml-auto flex items-center gap-1 z-10 relative">
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
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/40 flex justify-around py-3 pb-safe">
      {[...navItems, { href: "/settings", label: "Settings", icon: Settings }].map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 px-3 py-1 text-[11px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <div className={cn("p-1.5 rounded-full transition-all duration-300", isActive && "bg-primary/10 shadow-[0_0_12px_rgba(var(--primary),0.2)]")}>
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

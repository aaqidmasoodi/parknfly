"use client";

import { useBookings, SyncStatus } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, RefreshCw, AlertCircle } from "lucide-react";

const statusConfig: Record<
  SyncStatus,
  {
    icon: typeof Cloud;
    label: string;
    dotClass: string;
    textClass: string;
  }
> = {
  synced: {
    icon: Cloud,
    label: "Synced",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-500",
  },
  syncing: {
    icon: RefreshCw,
    label: "Syncing…",
    dotClass: "bg-blue-500 animate-pulse",
    textClass: "text-blue-500",
  },
  offline: {
    icon: CloudOff,
    label: "Offline",
    dotClass: "bg-amber-500",
    textClass: "text-amber-500",
  },
  error: {
    icon: AlertCircle,
    label: "Sync Error",
    dotClass: "bg-red-500",
    textClass: "text-red-500",
  },
};

export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const { syncStatus } = useBookings();
  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={config.label}>
        <div
          className={cn("w-2 h-2 rounded-full shrink-0", config.dotClass)}
        />
        <span
          className={cn(
            "text-[10px] font-medium tracking-wide uppercase",
            config.textClass
          )}
        >
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors duration-300",
        syncStatus === "synced" &&
          "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        syncStatus === "syncing" &&
          "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
        syncStatus === "offline" &&
          "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        syncStatus === "error" &&
          "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          syncStatus === "syncing" && "animate-spin"
        )}
      />
      {config.label}
    </div>
  );
}

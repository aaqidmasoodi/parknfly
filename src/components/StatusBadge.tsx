"use client";

import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  [BookingStatus.BOOKED]: {
    label: "Booked",
    variant: "outline",
    className: "border-border/60 text-muted-foreground",
  },
  [BookingStatus.CHECKED_IN]: {
    label: "Checked In",
    variant: "default",
    className: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20",
  },
  [BookingStatus.PARKED]: {
    label: "Parked",
    variant: "default",
    className: "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
  },
  [BookingStatus.RETURN_REQUESTED]: {
    label: "Return Req.",
    variant: "default",
    className: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-subtle-pulse",
  },
  [BookingStatus.SHUTTLE_DISPATCHED]: {
    label: "Shuttle Out",
    variant: "default",
    className: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)] animate-subtle-pulse",
  },
  [BookingStatus.COMPLETED]: {
    label: "Completed",
    variant: "default",
    className: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20",
  },
  [BookingStatus.NO_SHOW]: {
    label: "No Show",
    variant: "destructive",
    className: "bg-destructive/10 hover:bg-destructive/20 border-destructive/20 text-destructive",
  },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = statusConfig[status];
  return (
    <Badge
      variant={config.variant}
      className={cn("text-[11px] font-medium tracking-wide shadow-none px-2 py-0.5", config.className)}
    >
      {config.label}
    </Badge>
  );
}

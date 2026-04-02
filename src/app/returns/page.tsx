"use client";

import { useMemo, useState } from "react";
import { useBookings } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { Booking, BookingStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingDetailSheet } from "@/components/BookingDetailSheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isToday, isPast, format, addMinutes } from "date-fns";
import {
  Search,
  RotateCcw,
  Plane,
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function ReturnsPage() {
  const { bookings, loaded, dispatchShuttle, completeBooking } = useBookings();
  const { settings } = useSettings();
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Active returns: Due today OR overdue, and NOT checked out, NOT cancelled, NOT just booked
  const activeReturns = useMemo(() => {
    // A return is overdue if it's past the return time by more than the configured hours
    const overdueThreshold = addMinutes(new Date(), -settings.overdueReturnHours * 60);
    
    let result = bookings.filter((b) => {
      const returnDate = new Date(b.returnDate);
      const isDue = isToday(returnDate) || returnDate < overdueThreshold;
      const isActiveState =
        b.status === BookingStatus.CHECKED_IN ||
        b.status === BookingStatus.PARKED ||
        b.status === BookingStatus.RETURN_REQUESTED ||
        b.status === BookingStatus.SHUTTLE_DISPATCHED;

      return isDue && isActiveState;
    });

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.vehicle.reg.toLowerCase().includes(q) ||
          b.inFlightNumber?.toLowerCase().includes(q) ||
          b.terminal?.toLowerCase().includes(q)
      );
    }

    // Sort: Requested first, then Overdue, then by time
    return result.sort((a, b) => {
      if (
        a.status === BookingStatus.RETURN_REQUESTED &&
        b.status !== BookingStatus.RETURN_REQUESTED
      )
        return -1;
      if (
        b.status === BookingStatus.RETURN_REQUESTED &&
        a.status !== BookingStatus.RETURN_REQUESTED
      )
        return 1;

      return new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime();
    });
  }, [bookings, search]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const requestedCount = activeReturns.filter(
    (b) => b.status === BookingStatus.RETURN_REQUESTED
  ).length;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border/40 shrink-0 glass-card z-10 sticky top-0">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-amber-500" />
          Live Returns
        </h1>
        {requestedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 shadow-sm animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wide uppercase">
              {requestedCount} awaiting pickup
            </span>
          </div>
        )}
      </header>

      {/* Main Board */}
      <div className="flex-1 overflow-y-auto z-10">
        <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20 md:pb-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Return Dispatch</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Monitor incoming flights and dispatch shuttles when customers request pickup.
              </p>
            </div>
            <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search name, reg, flight…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 shadow-sm h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {activeReturns.length === 0 ? (
              <Card className="border border-dashed border-border/50 bg-background/50 shadow-none">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <RotateCcw className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-lg font-medium text-foreground/80">
                    No active returns right now
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All clear! Expected arrivals and overdue vehicles will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeReturns.map((booking) => {
                const isRequested = booking.status === BookingStatus.RETURN_REQUESTED;
                const isDispatched = booking.status === BookingStatus.SHUTTLE_DISPATCHED;
                const overdueThreshold = addMinutes(new Date(), -settings.overdueReturnHours * 60);
                const isOverdue =
                  new Date(booking.returnDate) < overdueThreshold && !isRequested && !isDispatched;

                return (
                  <Card
                    key={booking.id}
                    className={`group transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-lg border-border/50
                      ${isRequested ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20" : ""}
                      ${isDispatched ? "border-orange-500/30 opacity-80 bg-orange-500/5" : "glass-card"}
                      ${isOverdue ? "border-destructive/30" : ""}
                    `}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setSheetOpen(true);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row border-l-4 border-transparent sm:h-24">
                      {/* Left: Time & Status */}
                      <div className="flex items-center sm:flex-col sm:justify-center sm:items-start p-4 sm:w-48 shrink-0 bg-muted/10 border-b sm:border-b-0 sm:border-r border-border/40 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Due Return
                          </span>
                          <span
                            className={`text-xl font-bold font-mono tracking-tight ${
                              isOverdue ? "text-destructive" : "text-foreground"
                            }`}
                          >
                            {format(new Date(booking.returnDate), "HH:mm")}
                          </span>
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 p-4 grid grid-cols-2 gap-4">
                        <div className="flex flex-col justify-center">
                          <h3 className="font-semibold text-base mb-1 truncate text-foreground/90">
                            {booking.customerName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <span>{booking.vehicle.make} {booking.vehicle.model}</span>
                            <span className="mx-1 opacity-50">•</span>
                            <span className="font-mono text-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">
                              {booking.vehicle.reg}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center gap-2 border-l border-border/40 pl-4">
                          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Plane className="h-3.5 w-3.5 opacity-70" />
                            <span className="font-medium text-foreground/80 truncate">
                              {booking.terminal || "TBA"}
                            </span>
                          </div>
                          {booking.inFlightNumber && (
                            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                              <span className="font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded shadow-sm">
                                {booking.inFlightNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Primary Action */}
                      <div className="flex sm:flex-col p-4 sm:w-40 shrink-0 gap-2 border-t sm:border-t-0 sm:border-l border-border/40 items-center justify-center bg-muted/5 sm:bg-transparent">
                        {isRequested && (
                          <Button
                            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md border-0 group-hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatchShuttle(booking.id);
                            }}
                          >
                            <Send className="h-4 w-4" />
                            Dispatch
                          </Button>
                        )}
                        {isDispatched && (
                          <Button
                            variant="default"
                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md border-0 group-hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              completeBooking(booking.id);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Complete
                          </Button>
                        )}
                        {!isRequested && !isDispatched && (
                          <div className="text-center w-full">
                            {isOverdue ? (
                              <p className="text-xs font-semibold text-destructive flex items-center justify-center gap-1 bg-destructive/10 py-1.5 rounded-md">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Overdue
                              </p>
                            ) : (
                              <p className="text-xs font-medium text-muted-foreground">
                                Waiting...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <BookingDetailSheet
        booking={selectedBooking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useBookings } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { Booking, BookingStatus } from "@/lib/types";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  CarFront,
  CalendarClock,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { format, isToday, isPast, addHours, isWithinInterval, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const {
    bookings,
    loaded,
    getTodaysArrivals,
    getTodaysReturns,
    getCarsOnLot,
    checkIn,
    getBookingById,
  } = useBookings();
  const { settings } = useSettings();

  const copyBookingDetails = (booking: Booking) => {
    const entryDate = new Date(booking.entryDate);
    const returnDate = new Date(booking.returnDate);

    const entryDateStr = format(entryDate, "dd-MMM-yyyy HH:mm:ss");
    const returnDateStr = format(returnDate, "dd-MMM-yyyy HH:mm:ss");

    const details = `${booking.bookingRef} ${booking.customerName} ${booking.customerPhone} ${entryDateStr} ${returnDateStr} ${booking.vehicle.make} ${booking.vehicle.model} ${booking.vehicle.colour} ${booking.vehicle.reg} PR ${booking.passengers}`;

    navigator.clipboard.writeText(details);
    toast.success("Booking details copied", {
      description: `Copied: ${booking.bookingRef} - ${booking.customerName}`,
    });
  };

  const handleCheckIn = (id: string) => {
    const booking = getBookingById(id);
    if (booking) {
      copyBookingDetails(booking);
      checkIn(id);
    }
  };

  const dashboardActiveReturns = useMemo(() => {
    const overdueThreshold = addMinutes(new Date(), -settings.overdueReturnHours * 60);
    return bookings.filter((b) => {
      const returnDate = new Date(b.returnDate);
      const isDue = isToday(returnDate) || returnDate < overdueThreshold;
      const isRequestedOrDispatched = b.status === BookingStatus.RETURN_REQUESTED || b.status === BookingStatus.SHUTTLE_DISPATCHED;
      const isActiveState =
        b.status !== BookingStatus.COMPLETED &&
        b.status !== BookingStatus.NO_SHOW &&
        b.status !== BookingStatus.BOOKED;

      return (isDue && isActiveState) || isRequestedOrDispatched;
    }).sort((a, b) => {
      // Prioritize RETURN_REQUESTED
      if (a.status === BookingStatus.RETURN_REQUESTED && b.status !== BookingStatus.RETURN_REQUESTED) return -1;
      if (b.status === BookingStatus.RETURN_REQUESTED && a.status !== BookingStatus.RETURN_REQUESTED) return 1;
      
      if (a.status === BookingStatus.RETURN_REQUESTED && b.status === BookingStatus.RETURN_REQUESTED) {
        const aTime = a.statusHistory?.slice().reverse().find(h => h.to === BookingStatus.RETURN_REQUESTED)?.timestamp || a.returnDate;
        const bTime = b.statusHistory?.slice().reverse().find(h => h.to === BookingStatus.RETURN_REQUESTED)?.timestamp || b.returnDate;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      }

      // Prioritize SHUTTLE_DISPATCHED
      if (a.status === BookingStatus.SHUTTLE_DISPATCHED && b.status !== BookingStatus.SHUTTLE_DISPATCHED) return -1;
      if (b.status === BookingStatus.SHUTTLE_DISPATCHED && a.status !== BookingStatus.SHUTTLE_DISPATCHED) return 1;

      if (a.status === BookingStatus.SHUTTLE_DISPATCHED && b.status === BookingStatus.SHUTTLE_DISPATCHED) {
        const aTime = a.statusHistory?.slice().reverse().find(h => h.to === BookingStatus.SHUTTLE_DISPATCHED)?.timestamp || a.returnDate;
        const bTime = b.statusHistory?.slice().reverse().find(h => h.to === BookingStatus.SHUTTLE_DISPATCHED)?.timestamp || b.returnDate;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      }

      return new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime();
    });
  }, [bookings, settings.overdueReturnHours]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const todaysArrivals = getTodaysArrivals();
  const carsOnLot = getCarsOnLot();

  const expectedCount = todaysArrivals.filter(
    (b) => b.status === BookingStatus.BOOKED
  ).length;
  const checkedInCount = todaysArrivals.filter(
    (b) => b.status !== BookingStatus.BOOKED && b.status !== BookingStatus.NO_SHOW
  ).length;
  const returnsDueCount = dashboardActiveReturns.length;



  // Show only bookings within the 1-hour window (from 1 hour ago up to 1 hour ahead)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = addHours(now, 1);
  const expectedOrLateArrivals = bookings
    .filter(
      (b) =>
        b.status === BookingStatus.BOOKED &&
        isWithinInterval(new Date(b.entryDate), { start: oneHourAgo, end: oneHourFromNow })
    )
    .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  const hasData = bookings.length > 0;

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 md:pr-48 h-14 border-b border-border/40 shrink-0 glass-card z-10">
        <h1 className="text-lg font-semibold tracking-tight">Mission Control</h1>
        <CSVImportDialog />
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6 animate-fade-in-up">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center glass-card rounded-2xl border border-border/50 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <CarFront className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">No data available</h2>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed pb-4">
                The dashboard is empty. Import a CSV export from your booking platform to see today's overview.
              </p>
              <CSVImportDialog />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-card border-border/50 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cars on Lot
                    </CardTitle>
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                      <CarFront className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight">{carsOnLot.length}</div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-600"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Expected Today
                    </CardTitle>
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold tracking-tight">{expectedCount}</div>
                      <span className="text-sm text-muted-foreground font-medium">pending</span>
                    </div>
                    <p className="text-xs text-emerald-500/80 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      {checkedInCount} checked in
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-border/50 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Returns Due
                    </CardTitle>
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight">{returnsDueCount}</div>

                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Awaiting Check-in */}
                <Card className="glass-card shadow-lg border-border/50 overflow-hidden flex flex-col h-[400px]">
                  <CardHeader className="pb-3 border-b border-border/40 shrink-0 bg-muted/10">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        Awaiting Check-in
                      </div>
                      <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {expectedOrLateArrivals.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1">
                    {expectedOrLateArrivals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70 p-6 text-center">
                        <CheckCircle2 className="h-8 w-8 mb-2" />
                        <p className="text-sm">All expected arrivals checked in.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {expectedOrLateArrivals.map((b) => {
                          const isLate = isPast(new Date(b.entryDate));
                          return (
                            <div
                              key={b.id}
                              className="flex items-center justify-between p-4 group hover:bg-muted/20 transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-[13px] truncate">{b.customerName}</p>
                                  {isLate && (
                                    <span className="text-[9px] uppercase font-bold text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                                      Late
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {b.vehicle.make} {b.vehicle.model} <span className="mx-1">•</span>
                                  <span className="font-mono font-medium text-foreground/80">{b.vehicle.reg}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg border-border/50 hover:bg-accent/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyBookingDetails(b);
                                  }}
                                  title="Copy details"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <div className="flex flex-col items-end">
                                  <span className={cn("text-xs font-mono font-medium", isLate ? "text-destructive" : "text-muted-foreground")}>
                                    {format(new Date(b.entryDate), "HH:mm")}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-semibold px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                                  onClick={() => handleCheckIn(b.id)}
                                >
                                  Check In
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Today's Returns */}
                <Card className="glass-card shadow-lg border-border/50 overflow-hidden flex flex-col h-[400px]">
                  <CardHeader className="pb-3 border-b border-border/40 shrink-0 bg-muted/10">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-amber-500/10">
                          <RotateCcw className="h-4 w-4 text-amber-500" />
                        </div>
                        Returns Active Today
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto flex-1">
                    {dashboardActiveReturns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70 p-6 text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-2">
                          <span className="text-xs">0</span>
                        </div>
                        <p className="text-sm">No active returns currently.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {dashboardActiveReturns.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center justify-between p-4 group hover:bg-muted/20 transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-4">
                                <p className="font-semibold text-[13px] truncate mb-1">{b.customerName}</p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono font-medium text-foreground/80">{b.vehicle.reg}</span>
                                  <span>•</span>
                                  <span>{b.terminal || "No Terminal"}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <StatusBadge status={b.status} />
                                <span className={cn(
                                  "text-[10px] font-mono font-medium",
                                  isPast(new Date(b.returnDate)) ? "text-destructive" : "text-muted-foreground"
                                )}>
                                  Due {format(new Date(b.returnDate), "HH:mm")}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>



              {/* Summary */}
              <Separator className="bg-border/40" />
              <div className="flex flex-wrap justify-center gap-6 text-[11px] font-medium text-muted-foreground opacity-80 pb-4">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-border"></div> Total DB: {bookings.length}</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Checked In: {bookings.filter((b) => b.status === BookingStatus.CHECKED_IN).length}</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Completed: {bookings.filter((b) => b.status === BookingStatus.COMPLETED).length}</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-destructive"></div> No-shows: {bookings.filter((b) => b.status === BookingStatus.NO_SHOW).length}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

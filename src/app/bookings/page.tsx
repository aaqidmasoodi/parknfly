"use client";

import { useState, useMemo } from "react";
import { useBookings } from "@/lib/store";
import { Booking, BookingStatus } from "@/lib/types";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingDetailSheet } from "@/components/BookingDetailSheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import {
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  CarFront,
  Plane,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { value: "all", label: "All" },
  { value: BookingStatus.BOOKED, label: "Expected" },
  { value: BookingStatus.CHECKED_IN, label: "Checked In" },
  { value: BookingStatus.RETURN_REQUESTED, label: "Return Req." },
  { value: BookingStatus.COMPLETED, label: "Completed" },
  { value: BookingStatus.NO_SHOW, label: "No-Show" },
];

type BookingTypeFilter = "all" | "departures" | "returns";

export default function BookingsPage() {
  const { bookings, loaded, checkIn, markNoShow, requestReturn } = useBookings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<BookingTypeFilter>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const copyBookingDetails = (booking: Booking) => {
    // Format: BookingID Name Phone EntryDate EntryTime ReturnDate ReturnTime VehicleMake VehicleModel VehicleColour VehicleReg PR Passengers
    // Example: GO-DUB-243186 Kenneth baird 07835333287 01-Apr-2026 10:30:00 06-Apr-2026 12:00:00 BMW 330i Black XUI3516 PR 1
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

  const filtered = useMemo(() => {
    let result = bookings;

    // Filter by booking type (departures/returns)
    const today = new Date();
    const todayStr = today.toDateString();
    if (bookingTypeFilter === "departures") {
      result = result.filter((b) => new Date(b.entryDate).toDateString() === todayStr);
    } else if (bookingTypeFilter === "returns") {
      result = result.filter((b) => new Date(b.returnDate).toDateString() === todayStr);
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.bookingRef.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerPhone.toLowerCase().includes(q) ||
          b.vehicle.reg.toLowerCase().includes(q)
      );
    }

    // Sort by entry date descending (most recent first)
    return result.sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
  }, [bookings, search, statusFilter, bookingTypeFilter]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border/40 shrink-0 glass-card z-10 sticky top-0">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <CarFront className="h-5 w-5 text-primary" />
          Bookings Database
        </h1>
        <CSVImportDialog />
      </header>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border/40 bg-card/40 backdrop-blur-md shrink-0 space-y-4 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name, reference, phone, or reg…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 focus-visible:ring-primary/30 shadow-sm h-10 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shadow-sm">
              {filtered.length} Result{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tabs
            value={bookingTypeFilter}
            onValueChange={(v) => setBookingTypeFilter(v as BookingTypeFilter)}
            className="w-full"
          >
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex flex-wrap gap-1">
              <TabsTrigger
                value="all"
                className="text-xs rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200"
              >
                All Bookings
              </TabsTrigger>
              <TabsTrigger
                value="departures"
                className="text-xs rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200"
              >
                <Plane className="h-3.5 w-3.5 mr-1.5" />
                Departures Today
              </TabsTrigger>
              <TabsTrigger
                value="returns"
                className="text-xs rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Returns Today
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full"
        >
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            {statusFilters.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="text-xs rounded-lg px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all duration-200"
              >
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto z-10">
        <div className="pb-24 sm:pb-8 animate-fade-in-up">
          <Table className="[&_tr]:border-border/40">
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md z-10 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] pl-6">Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                <TableHead className="hidden xl:table-cell">Entry</TableHead>
                <TableHead className="hidden md:table-cell">Return</TableHead>
                <TableHead className="hidden lg:table-cell">Terminal</TableHead>
                <TableHead className="w-[60px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0 divide-y divide-border/20">
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={8}
                    className="h-[400px] text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground opacity-60">
                      <Search className="h-10 w-10 mb-2" />
                      <p className="text-sm font-medium">
                        {bookings.length === 0
                          ? "No bookings loaded. Drop a CSV to start."
                          : "No bookings match your current filters."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors group"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setSheetOpen(true);
                    }}
                  >
                    <TableCell className="pl-6">
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground/80">
                      {booking.bookingRef}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold tracking-tight">
                          {booking.customerName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {booking.customerPhone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-foreground/90">
                          {booking.vehicle.make} {booking.vehicle.model}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground mt-0.5 px-1.5 py-0.5 bg-muted/50 rounded w-max border border-border/40">
                          {booking.vehicle.reg}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">{format(new Date(booking.entryDate), "dd MMM")}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{format(new Date(booking.entryDate), "HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium">{format(new Date(booking.returnDate), "dd MMM")}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{format(new Date(booking.returnDate), "HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-[13px] font-medium text-foreground/80">
                      {booking.terminal || "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors group-hover:bg-background/80 shadow-sm border border-transparent group-hover:border-border/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-xl border-border/50 rounded-xl">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                              setSheetOpen(true);
                            }}
                            className="text-xs"
                          >
                            <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                            View Full Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              copyBookingDetails(booking);
                            }}
                            className="text-xs"
                          >
                            <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
                            Copy Details
                          </DropdownMenuItem>

                          {booking.status === BookingStatus.BOOKED && (
                            <>
                              <div className="h-px bg-border/40 my-1 mx-2" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  checkIn(booking.id);
                                }}
                                className="text-xs text-primary focus:bg-primary/10"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Checked In
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNoShow(booking.id);
                                }}
                                className="text-xs text-destructive focus:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Report No-Show
                              </DropdownMenuItem>
                            </>
                          )}
                          {booking.status === BookingStatus.CHECKED_IN && (
                            <>
                              <div className="h-px bg-border/40 my-1 mx-2" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestReturn(booking.id);
                                }}
                                className="text-xs text-amber-500 focus:bg-amber-500/10"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Customer Arrived
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

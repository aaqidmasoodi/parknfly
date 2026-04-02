"use client";

import { Booking, BookingStatus } from "@/lib/types";
import { useBookings } from "@/lib/store";
import { StatusBadge } from "./StatusBadge";
import { WhatsAppTemplateSelector } from "./WhatsAppButton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Car,
  User,
  Phone,
  Plane,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  Users,
  MessageCircle,
  Copy,
} from "lucide-react";

interface BookingDetailSheetProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
}: BookingDetailSheetProps) {
  const { checkIn, markNoShow, requestReturn, dispatchShuttle, completeBooking, getBookingById } =
    useBookings();

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
    const b = getBookingById(id);
    if (b) {
      copyBookingDetails(b);
      checkIn(id);
    }
  };

  if (!booking) return null;

  const entryDate = new Date(booking.entryDate);
  const returnDate = new Date(booking.returnDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-base">
              {booking.bookingRef}
            </SheetTitle>
            <StatusBadge status={booking.status} />
          </div>
          <SheetDescription>{booking.productCode}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {/* Customer */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {booking.customerName}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${booking.customerPhone}`} className="underline">
                  {booking.customerPhone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {booking.passengers} passenger{booking.passengers !== 1 ? "s" : ""}
              </div>
            </div>
          </section>

          <Separator />

          {/* Vehicle */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vehicle
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                {booking.vehicle.make} {booking.vehicle.model}
              </div>
              <div className="text-sm text-muted-foreground pl-5.5">
                {booking.vehicle.colour} — <span className="font-mono font-medium text-foreground">{booking.vehicle.reg}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Dates */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Schedule
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Entry</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(entryDate, "dd MMM yyyy")}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(entryDate, "HH:mm")}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Return</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(returnDate, "dd MMM yyyy")}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(returnDate, "HH:mm")}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Flight & Terminal */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Flight Details
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {booking.terminal || "—"}
              </div>
              {booking.inFlightNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                  In: <span className="font-mono">{booking.inFlightNumber}</span>
                </div>
              )}
              {booking.outFlightNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Plane className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
                  Out: <span className="font-mono">{booking.outFlightNumber}</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Price */}
          <section className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              Price
            </div>
            <span className="text-sm font-medium">€{booking.price.toFixed(2)}</span>
          </section>

          {booking.parkingSpot && (
            <>
              <Separator />
              <section className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parking Spot</span>
                <span className="text-sm font-mono font-medium">{booking.parkingSpot}</span>
              </section>
            </>
          )}

          <Separator />

          {/* Actions */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </h4>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => copyBookingDetails(booking)}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Details
              </Button>
              {booking.status === BookingStatus.BOOKED && (
                <>
                  <Button
                    onClick={() => {
                      handleCheckIn(booking.id);
                      onOpenChange(false);
                    }}
                    className="w-full"
                  >
                    Check In
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      markNoShow(booking.id);
                      onOpenChange(false);
                    }}
                    className="w-full"
                  >
                    Mark No-Show
                  </Button>
                </>
              )}
              {booking.status === BookingStatus.CHECKED_IN && (
                <Button
                  onClick={() => {
                    requestReturn(booking.id);
                    onOpenChange(false);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Request Return
                </Button>
              )}
              {booking.status === BookingStatus.RETURN_REQUESTED && (
                <Button
                  onClick={() => {
                    dispatchShuttle(booking.id);
                    onOpenChange(false);
                  }}
                  className="w-full"
                >
                  Dispatch Shuttle
                </Button>
              )}
              {booking.status === BookingStatus.SHUTTLE_DISPATCHED && (
                <Button
                  onClick={() => {
                    completeBooking(booking.id);
                    onOpenChange(false);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Mark Completed
                </Button>
              )}
            </div>
          </section>

          <Separator />

          {/* WhatsApp Messages */}
          <section className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3 text-[#25D366]" />
              Send Message
            </h4>
            <WhatsAppTemplateSelector booking={booking} />
          </section>

          {/* Status History */}
          {booking.statusHistory.length > 0 && (
            <>
              <Separator />
              <section className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  History
                </h4>
                <div className="space-y-2">
                  {booking.statusHistory.map((change, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>
                        {change.from} → {change.to}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(change.timestamp), "HH:mm dd/MM")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

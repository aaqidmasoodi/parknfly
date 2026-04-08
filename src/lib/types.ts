export enum BookingStatus {
  BOOKED = "BOOKED",
  CHECKED_IN = "CHECKED_IN",
  PARKED = "PARKED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  SHUTTLE_DISPATCHED = "SHUTTLE_DISPATCHED",
  COMPLETED = "COMPLETED",
  NO_SHOW = "NO_SHOW",
}

export interface Vehicle {
  make: string;
  model: string;
  colour: string;
  reg: string;
}

export interface Booking {
  id: string;
  productCode: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  entryDate: string; // ISO string
  returnDate: string; // ISO string
  vehicle: Vehicle;
  productType: string;
  passengers: number;
  terminal: string;
  inFlightNumber: string;
  outFlightNumber: string;
  price: number;
  status: BookingStatus;
  statusHistory: StatusChange[];
  parkingSpot?: string;
  shuttleNotes?: string;
}

export interface StatusChange {
  from: BookingStatus;
  to: BookingStatus;
  timestamp: string; // ISO string
  by?: string;
}

export type BookingAction =
  | { type: "IMPORT"; bookings: Booking[] }
  | { type: "MERGE_IMPORT"; bookings: Booking[] }
  | { type: "SET_ALL"; bookings: Booking[] }
  | { type: "CHECK_IN"; id: string; parkingSpot?: string }
  | { type: "MARK_NO_SHOW"; id: string }
  | { type: "MARK_PARKED"; id: string; parkingSpot: string }
  | { type: "REQUEST_RETURN"; id: string }
  | { type: "DISPATCH_SHUTTLE"; id: string; notes?: string }
  | { type: "COMPLETE"; id: string }
  | { type: "UPDATE_STATUS"; id: string; status: BookingStatus }
  | { type: "CLEAR_ALL" };

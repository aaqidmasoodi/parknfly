"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { Booking, BookingAction, BookingStatus, StatusChange } from "./types";
import { mergeBookings } from "./csv-parser";

const STORAGE_KEY = "parkandfly-bookings";
const MESSAGES_STORAGE_KEY = "parkandfly-messages";

interface BookingState {
  bookings: Booking[];
  loaded: boolean;
}

interface BookingContextType {
  bookings: Booking[];
  loaded: boolean;
  dispatch: React.Dispatch<BookingAction>;
  importBookings: (bookings: Booking[]) => void;
  mergeImportBookings: (bookings: Booking[]) => void;
  checkIn: (id: string, parkingSpot?: string) => void;
  markNoShow: (id: string) => void;
  requestReturn: (id: string) => void;
  dispatchShuttle: (id: string, notes?: string) => void;
  completeBooking: (id: string) => void;
  clearAll: () => void;
  getBookingsByStatus: (status: BookingStatus) => Booking[];
  getTodaysArrivals: () => Booking[];
  getTodaysReturns: () => Booking[];
  getCarsOnLot: () => Booking[];
  getTodaysRevenue: () => number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

function addStatusChange(booking: Booking, newStatus: BookingStatus): Booking {
  const change: StatusChange = {
    from: booking.status,
    to: newStatus,
    timestamp: new Date().toISOString(),
  };
  return {
    ...booking,
    status: newStatus,
    statusHistory: [...booking.statusHistory, change],
  };
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "IMPORT":
      return {
        ...state,
        bookings: [...state.bookings, ...action.bookings],
      };
    case "MERGE_IMPORT":
      return {
        ...state,
        bookings: mergeBookings(state.bookings, action.bookings),
      };
    case "CHECK_IN":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? { ...addStatusChange(b, BookingStatus.CHECKED_IN), parkingSpot: action.parkingSpot }
            : b
        ),
      };
    case "MARK_NO_SHOW":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? addStatusChange(b, BookingStatus.NO_SHOW) : b
        ),
      };
    case "MARK_PARKED":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? { ...addStatusChange(b, BookingStatus.PARKED), parkingSpot: action.parkingSpot }
            : b
        ),
      };
    case "REQUEST_RETURN":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? addStatusChange(b, BookingStatus.RETURN_REQUESTED) : b
        ),
      };
    case "DISPATCH_SHUTTLE":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? { ...addStatusChange(b, BookingStatus.SHUTTLE_DISPATCHED), shuttleNotes: action.notes }
            : b
        ),
      };
    case "COMPLETE":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? addStatusChange(b, BookingStatus.COMPLETED) : b
        ),
      };
    case "UPDATE_STATUS":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? addStatusChange(b, action.status) : b
        ),
      };
    case "CLEAR_ALL":
      return { ...state, bookings: [] };
    default:
      return state;
  }
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, {
    bookings: [],
    loaded: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const bookings = JSON.parse(stored) as Booking[];
        dispatch({ type: "IMPORT", bookings });
      }
    } catch (e) {
      console.warn("Failed to load bookings from storage", e);
    }
  }, []);

  // Mark as loaded after first render
  const [loaded, setLoaded] = React.useState(false);
  useEffect(() => {
    setLoaded(true);
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
      } catch (e) {
        console.warn("Failed to save bookings to storage", e);
      }
    }
  }, [state.bookings, loaded]);

  const importBookings = useCallback((bookings: Booking[]) => {
    dispatch({ type: "IMPORT", bookings });
  }, []);

  const mergeImportBookings = useCallback((bookings: Booking[]) => {
    dispatch({ type: "MERGE_IMPORT", bookings });
  }, []);

  const checkIn = useCallback((id: string, parkingSpot?: string) => {
    dispatch({ type: "CHECK_IN", id, parkingSpot });
  }, []);

  const markNoShow = useCallback((id: string) => {
    dispatch({ type: "MARK_NO_SHOW", id });
  }, []);

  const requestReturn = useCallback((id: string) => {
    dispatch({ type: "REQUEST_RETURN", id });
  }, []);

  const dispatchShuttle = useCallback((id: string, notes?: string) => {
    dispatch({ type: "DISPATCH_SHUTTLE", id, notes });
  }, []);

  const completeBooking = useCallback((id: string) => {
    dispatch({ type: "COMPLETE", id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
    // Also clear messages storage
    try {
      localStorage.removeItem(MESSAGES_STORAGE_KEY);
    } catch {}
  }, []);

  const isToday = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const getBookingsByStatus = useCallback(
    (status: BookingStatus) => state.bookings.filter((b) => b.status === status),
    [state.bookings]
  );

  const getTodaysArrivals = useCallback(
    () => state.bookings.filter((b) => isToday(b.entryDate)),
    [state.bookings, isToday]
  );

  const getTodaysReturns = useCallback(
    () => state.bookings.filter((b) => isToday(b.returnDate)),
    [state.bookings, isToday]
  );

  const getCarsOnLot = useCallback(
    () =>
      state.bookings.filter(
        (b) =>
          b.status === BookingStatus.CHECKED_IN ||
          b.status === BookingStatus.PARKED ||
          b.status === BookingStatus.RETURN_REQUESTED ||
          b.status === BookingStatus.SHUTTLE_DISPATCHED
      ),
    [state.bookings]
  );

  const getTodaysRevenue = useCallback(() => {
    return state.bookings
      .filter((b) => isToday(b.entryDate))
      .reduce((sum, b) => sum + b.price, 0);
  }, [state.bookings, isToday]);

  return (
    <BookingContext.Provider
      value={{
        bookings: state.bookings,
        loaded,
        dispatch,
        importBookings,
        mergeImportBookings,
        checkIn,
        markNoShow,
        requestReturn,
        dispatchShuttle,
        completeBooking,
        clearAll,
        getBookingsByStatus,
        getTodaysArrivals,
        getTodaysReturns,
        getCarsOnLot,
        getTodaysRevenue,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBookings must be used within a BookingProvider");
  }
  return context;
}

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Booking,
  BookingAction,
  BookingStatus,
  StatusChange,
} from "./types";
import { mergeBookings } from "./csv-parser";
import { toast } from "sonner";

const STORAGE_KEY = "parkandfly-bookings";
const MESSAGES_STORAGE_KEY = "parkandfly-messages";
const SYNC_INTERVAL = 3000; // 3 seconds

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

interface BookingState {
  bookings: Booking[];
  loaded: boolean;
}

interface BookingContextType {
  bookings: Booking[];
  loaded: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  dispatch: React.Dispatch<BookingAction>;
  importBookings: (bookings: Booking[]) => Promise<void>;
  mergeImportBookings: (bookings: Booking[]) => Promise<void>;
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
  getBookingById: (id: string) => Booking | undefined;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

function addStatusChange(
  booking: Booking,
  newStatus: BookingStatus
): Booking {
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

function bookingReducer(
  state: BookingState,
  action: BookingAction
): BookingState {
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
    case "SET_ALL":
      return {
        ...state,
        bookings: action.bookings,
      };
    case "CHECK_IN":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? {
                ...addStatusChange(b, BookingStatus.CHECKED_IN),
                parkingSpot: action.parkingSpot,
              }
            : b
        ),
      };
    case "MARK_NO_SHOW":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? addStatusChange(b, BookingStatus.NO_SHOW)
            : b
        ),
      };
    case "MARK_PARKED":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? {
                ...addStatusChange(b, BookingStatus.PARKED),
                parkingSpot: action.parkingSpot,
              }
            : b
        ),
      };
    case "REQUEST_RETURN":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? addStatusChange(b, BookingStatus.RETURN_REQUESTED)
            : b
        ),
      };
    case "DISPATCH_SHUTTLE":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? {
                ...addStatusChange(b, BookingStatus.SHUTTLE_DISPATCHED),
                shuttleNotes: action.notes,
              }
            : b
        ),
      };
    case "COMPLETE":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? addStatusChange(b, BookingStatus.COMPLETED)
            : b
        ),
      };
    case "UPDATE_STATUS":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id
            ? addStatusChange(b, action.status)
            : b
        ),
      };
    case "CLEAR_ALL":
      return { ...state, bookings: [] };
    default:
      return state;
  }
}

// --- API helper functions ---

async function apiUpdateStatus(
  id: string,
  status: string,
  extra?: { parkingSpot?: string; shuttleNotes?: string }
) {
  const res = await fetch(`/api/bookings/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extra }),
  });
  if (!res.ok) {
    throw new Error(`Status update failed: ${res.status}`);
  }
  return res.json();
}

async function apiImportBookings(
  bookings: Booking[],
  merge: boolean
) {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookings, merge }),
  });
  if (!res.ok) {
    throw new Error(`Import failed: ${res.status}`);
  }
  return res.json();
}

async function apiClearAll() {
  const res = await fetch("/api/bookings/clear", {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Clear failed: ${res.status}`);
  }
  return res.json();
}

async function apiFetchAll(): Promise<{
  bookings: Booking[];
  serverTime: string;
}> {
  const res = await fetch("/api/bookings");
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }
  return res.json();
}

async function apiSync(since: string): Promise<{
  bookings: Booking[];
  totalCount: number;
  serverTime: string;
}> {
  const res = await fetch(`/api/sync?since=${encodeURIComponent(since)}`);
  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }
  return res.json();
}

export function BookingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(bookingReducer, {
    bookings: [],
    loaded: false,
  });

  const [loaded, setLoaded] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("syncing");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);

  const lastSyncTimeRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // --- Initial load: try localStorage first for instant display, then fetch from DB ---
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      // Step 1: Show cached data immediately
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const cached = JSON.parse(stored) as Booking[];
          if (cached.length > 0) {
            dispatch({ type: "SET_ALL", bookings: cached });
          }
        }
      } catch {
        // Ignore localStorage errors
      }

      // Step 2: Fetch from server (source of truth)
      try {
        setSyncStatus("syncing");
        const data = await apiFetchAll();
        if (!cancelled) {
          dispatch({ type: "SET_ALL", bookings: data.bookings });
          lastSyncTimeRef.current = data.serverTime;
          setLastSyncedAt(data.serverTime);
          setSyncStatus("synced");

          // Cache server data to localStorage
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(data.bookings)
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Failed to fetch from server, using cached data", err);
        if (!cancelled) {
          setSyncStatus("offline");
        }
      }

      if (!cancelled) {
        setLoaded(true);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Polling sync loop ---
  useEffect(() => {
    if (!loaded) return;

    isMountedRef.current = true;

    const poll = async () => {
      if (!isMountedRef.current) return;

      try {
        const since = lastSyncTimeRef.current;
        if (!since) {
          // First sync — do a full fetch
          const data = await apiFetchAll();
          if (isMountedRef.current) {
            dispatch({ type: "SET_ALL", bookings: data.bookings });
            lastSyncTimeRef.current = data.serverTime;
            setLastSyncedAt(data.serverTime);
            setSyncStatus("synced");
            try {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data.bookings)
              );
            } catch {}
          }
          return;
        }

        const data = await apiSync(since);
        if (!isMountedRef.current) return;

        // If totalCount from server differs from our local count,
        // or we received updated bookings, do a merge
        if (data.bookings.length > 0 || data.totalCount !== state.bookings.length) {
          if (data.totalCount === 0) {
            // Server was cleared
            dispatch({ type: "CLEAR_ALL" });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            } catch {}
          } else if (data.bookings.length > 0 || data.totalCount !== state.bookings.length) {
            // We have updated bookings — re-fetch everything for simplicity
            const fullData = await apiFetchAll();
            if (isMountedRef.current) {
              dispatch({ type: "SET_ALL", bookings: fullData.bookings });
              try {
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(fullData.bookings)
                );
              } catch {}
            }
          }
        }

        lastSyncTimeRef.current = data.serverTime;
        setLastSyncedAt(data.serverTime);
        setSyncStatus("synced");
      } catch {
        if (isMountedRef.current) {
          setSyncStatus("offline");
        }
      }
    };

    syncIntervalRef.current = setInterval(poll, SYNC_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [loaded, state.bookings.length]);

  // --- Cache to localStorage on changes ---
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
      } catch {}
    }
  }, [state.bookings, loaded]);

  // --- Mutation functions (optimistic + API) ---

  const importBookings = useCallback(
    async (bookings: Booking[]) => {
      // Optimistic: update UI immediately
      dispatch({ type: "SET_ALL", bookings });

      try {
        setSyncStatus("syncing");
        const result = await apiImportBookings(bookings, false);
        lastSyncTimeRef.current = result.serverTime;
        setLastSyncedAt(result.serverTime);
        setSyncStatus("synced");
      } catch (err) {
        console.error("Import failed:", err);
        setSyncStatus("error");
        toast.error("Failed to sync import to server", {
          description:
            "Data is saved locally. It will sync when connection is restored.",
        });
      }
    },
    []
  );

  const mergeImportBookings = useCallback(
    async (bookings: Booking[]) => {
      // Optimistic
      dispatch({ type: "MERGE_IMPORT", bookings });

      try {
        setSyncStatus("syncing");
        const result = await apiImportBookings(bookings, true);
        lastSyncTimeRef.current = result.serverTime;
        setLastSyncedAt(result.serverTime);
        setSyncStatus("synced");

        // Re-fetch to get the server's merged state
        const data = await apiFetchAll();
        dispatch({ type: "SET_ALL", bookings: data.bookings });
      } catch (err) {
        console.error("Merge import failed:", err);
        setSyncStatus("error");
        toast.error("Failed to sync merge to server");
      }
    },
    []
  );

  const updateStatusOptimistic = useCallback(
    (
      id: string,
      actionType: BookingAction["type"],
      status: BookingStatus,
      extra?: { parkingSpot?: string; notes?: string }
    ) => {
      // Optimistic update
      switch (actionType) {
        case "CHECK_IN":
          dispatch({
            type: "CHECK_IN",
            id,
            parkingSpot: extra?.parkingSpot,
          });
          break;
        case "MARK_NO_SHOW":
          dispatch({ type: "MARK_NO_SHOW", id });
          break;
        case "REQUEST_RETURN":
          dispatch({ type: "REQUEST_RETURN", id });
          break;
        case "DISPATCH_SHUTTLE":
          dispatch({ type: "DISPATCH_SHUTTLE", id, notes: extra?.notes });
          break;
        case "COMPLETE":
          dispatch({ type: "COMPLETE", id });
          break;
        default:
          dispatch({ type: "UPDATE_STATUS", id, status });
      }

      // Fire API call in background
      apiUpdateStatus(id, status, {
        parkingSpot: extra?.parkingSpot,
        shuttleNotes: extra?.notes,
      })
        .then((result) => {
          lastSyncTimeRef.current = result.serverTime;
          setLastSyncedAt(result.serverTime);
          setSyncStatus("synced");
        })
        .catch((err) => {
          console.error("Status update failed:", err);
          setSyncStatus("error");
          toast.error("Failed to sync status change", {
            description: "Change saved locally. Will retry on next sync.",
          });
        });
    },
    []
  );

  const checkIn = useCallback(
    (id: string, parkingSpot?: string) => {
      updateStatusOptimistic(id, "CHECK_IN", BookingStatus.CHECKED_IN, {
        parkingSpot,
      });
    },
    [updateStatusOptimistic]
  );

  const markNoShow = useCallback(
    (id: string) => {
      updateStatusOptimistic(id, "MARK_NO_SHOW", BookingStatus.NO_SHOW);
    },
    [updateStatusOptimistic]
  );

  const requestReturn = useCallback(
    (id: string) => {
      updateStatusOptimistic(
        id,
        "REQUEST_RETURN",
        BookingStatus.RETURN_REQUESTED
      );
    },
    [updateStatusOptimistic]
  );

  const dispatchShuttle = useCallback(
    (id: string, notes?: string) => {
      updateStatusOptimistic(
        id,
        "DISPATCH_SHUTTLE",
        BookingStatus.SHUTTLE_DISPATCHED,
        { notes }
      );
    },
    [updateStatusOptimistic]
  );

  const completeBooking = useCallback(
    (id: string) => {
      updateStatusOptimistic(id, "COMPLETE", BookingStatus.COMPLETED);
    },
    [updateStatusOptimistic]
  );

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
    try {
      localStorage.removeItem(MESSAGES_STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    apiClearAll()
      .then((result) => {
        lastSyncTimeRef.current = result.serverTime;
        setLastSyncedAt(result.serverTime);
        setSyncStatus("synced");
      })
      .catch((err) => {
        console.error("Clear failed:", err);
        setSyncStatus("error");
        toast.error("Failed to sync clear to server");
      });
  }, []);

  // --- Read-only helpers (unchanged) ---

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
    (status: BookingStatus) =>
      state.bookings.filter((b) => b.status === status),
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

  const getBookingById = useCallback(
    (id: string) => state.bookings.find((b) => b.id === id),
    [state.bookings]
  );

  return (
    <BookingContext.Provider
      value={{
        bookings: state.bookings,
        loaded,
        syncStatus,
        lastSyncedAt,
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
        getBookingById,
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

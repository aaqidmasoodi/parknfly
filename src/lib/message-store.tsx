"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Booking } from "./types";
import { format } from "date-fns";

const STORAGE_KEY = "parkandfly-messages";

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;
  imageBase64?: string;
}

export interface MessageStoreContextValue {
  templates: MessageTemplate[];
  addTemplate: (template: Omit<MessageTemplate, "id">) => void;
  updateTemplate: (id: string, updates: Partial<Omit<MessageTemplate, "id">>) => void;
  deleteTemplate: (id: string) => void;
  reorderTemplates: (ids: string[]) => void;
  resetToDefaults: () => void;
  clearAll: () => void;
  buildMessage: (templateId: string, booking: Booking) => string;
  getTemplate: (id: string) => MessageTemplate | undefined;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "check_in_confirmed",
    name: "Check-In Confirmed",
    body: `Hi {{name}}. Your vehicle ({{vehicle}}, {{reg}}) has been safely checked in at Park & Fly. Reference: {{ref}}. We will be ready for your return on {{returnDate}} at {{returnTime}}. Safe travels.`,
  },
  {
    id: "shuttle_dispatched",
    name: "Shuttle Dispatched",
    body: `Hi {{name}}. Your shuttle has been dispatched to {{terminal}}. Please make your way to the pickup point. Booking ref: {{ref}}.`,
  },
  {
    id: "return_reminder",
    name: "Return Reminder",
    body: `Hi {{name}}. Your vehicle ({{vehicle}}, {{reg}}) is ready for collection at Park & Fly. Please let us know your estimated arrival time so we can have everything ready. Ref: {{ref}}.`,
  },
  {
    id: "late_arrival_nudge",
    name: "Late Arrival Nudge",
    body: `Hi {{name}}, we noticed your Park & Fly booking ({{ref}}) was scheduled for {{entryTime}} today. Are you still on your way? Please let us know so we can hold your spot.`,
  },
  {
    id: "return_completed",
    name: "Return Completed",
    body: `Hi {{name}}. Your vehicle ({{reg}}) has been successfully returned. Thank you for choosing Park & Fly. We hope to see you again.`,
  },
];

function replacePlaceholders(body: string, booking: Booking): string {
  const firstName = booking.customerName.split(" ")[0];
  const returnDate = new Date(booking.returnDate);
  const entryDate = new Date(booking.entryDate);

  return body
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{fullName\}\}/g, booking.customerName)
    .replace(/\{\{ref\}\}/g, booking.bookingRef)
    .replace(/\{\{vehicle\}\}/g, `${booking.vehicle.make} ${booking.vehicle.model}`)
    .replace(/\{\{reg\}\}/g, booking.vehicle.reg)
    .replace(/\{\{terminal\}\}/g, booking.terminal || "—")
    .replace(/\{\{returnDate\}\}/g, format(returnDate, "dd MMM"))
    .replace(/\{\{returnTime\}\}/g, format(returnDate, "HH:mm"))
    .replace(/\{\{entryTime\}\}/g, format(entryDate, "HH:mm"))
    .replace(/\{\{entryDate\}\}/g, format(entryDate, "dd MMM"))
    .replace(/\{\{price\}\}/g, `€${booking.price.toFixed(2)}`)
    .replace(/\{\{passengers\}\}/g, String(booking.passengers))
    .replace(/\{\{phone\}\}/g, booking.customerPhone);
}

const MessageStoreContext = createContext<MessageStoreContextValue | undefined>(undefined);

export function MessageStoreProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MessageTemplate[];
        if (parsed.length > 0) {
          setTemplates(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load message templates", e);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      } catch (e) {
        console.warn("Failed to save message templates", e);
      }
    }
  }, [templates, loaded]);

  const addTemplate = useCallback((template: Omit<MessageTemplate, "id">) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTemplates((prev) => [...prev, { ...template, id }]);
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<Omit<MessageTemplate, "id">>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reorderTemplates = useCallback((ids: string[]) => {
    setTemplates((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      return ids.map((id) => map.get(id)!).filter(Boolean);
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setTemplates(DEFAULT_TEMPLATES);
  }, []);

  const clearAll = useCallback(() => {
    setTemplates([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const buildMessageFn = useCallback(
    (templateId: string, booking: Booking): string => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return "";
      return replacePlaceholders(template.body, booking);
    },
    [templates]
  );

  const getTemplate = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates]
  );

  return (
    <MessageStoreContext.Provider
      value={{
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        reorderTemplates,
        resetToDefaults,
        clearAll,
        buildMessage: buildMessageFn,
        getTemplate,
      }}
    >
      {children}
    </MessageStoreContext.Provider>
  );
}

export function useMessages(): MessageStoreContextValue {
  const ctx = useContext(MessageStoreContext);
  if (!ctx) throw new Error("useMessages must be used inside MessageStoreProvider");
  return ctx;
}

export const AVAILABLE_PLACEHOLDERS = [
  { key: "{{name}}", label: "First Name" },
  { key: "{{fullName}}", label: "Full Name" },
  { key: "{{ref}}", label: "Booking Ref" },
  { key: "{{vehicle}}", label: "Vehicle (Make Model)" },
  { key: "{{reg}}", label: "Registration" },
  { key: "{{terminal}}", label: "Terminal" },
  { key: "{{returnDate}}", label: "Return Date" },
  { key: "{{returnTime}}", label: "Return Time" },
  { key: "{{entryTime}}", label: "Entry Time" },
  { key: "{{entryDate}}", label: "Entry Date" },
  { key: "{{price}}", label: "Price" },
  { key: "{{passengers}}", label: "Passengers" },
  { key: "{{phone}}", label: "Phone" },
] as const;

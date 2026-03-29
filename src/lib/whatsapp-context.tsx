"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export type WhatsAppStatus =
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "connected"
  | "error";

interface WhatsAppContextValue {
  status: WhatsAppStatus;
  qrCode: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (phone: string, message: string) => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextValue | null>(null);

const WS_URL =
  typeof window !== "undefined"
    ? `ws://${window.location.hostname}:3001`
    : "ws://localhost:3001";

const API_URL =
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:3001`
    : "http://localhost:3001";

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        switch (msg.type) {
          case "status":
            setStatus(msg.status);
            break;
          case "qr":
            setQrCode(msg.data);
            setStatus("qr_ready");
            break;
          case "connected":
            setQrCode(null);
            setStatus("connected");
            break;
          case "disconnected":
            setStatus("disconnected");
            setQrCode(null);
            break;
        }
      } catch {/* ignore parse errors */}
    };

    ws.onerror = () => {
      setStatus("disconnected");
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Auto-reconnect if we were connected or connecting
      setStatus((prev) => {
        if (prev === "connected" || prev === "connecting") {
          reconnectTimerRef.current = setTimeout(connectWs, 5000);
          return "disconnected";
        }
        return prev;
      });
    };
  }, []);

  const connect = useCallback(async () => {
    connectWs();
    try {
      await fetch(`${API_URL}/api/whatsapp/connect`, { method: "POST" });
    } catch (err) {
      console.error("Failed to start WhatsApp connection", err);
    }
  }, [connectWs]);

  const disconnect = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/whatsapp/disconnect`, { method: "POST" });
    } catch {/* ignore */}
    wsRef.current?.close();
    setStatus("disconnected");
    setQrCode(null);
  }, []);

  const sendMessage = useCallback(async (phone: string, message: string) => {
    const res = await fetch(`${API_URL}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to send message");
    }
  }, []);

  // On mount, try to reach the backend and check its existing status
  useEffect(() => {
    fetch(`${API_URL}/api/whatsapp/status`)
      .then((r) => r.json())
      .then((data: { status: WhatsAppStatus }) => {
        if (["connecting", "connected", "qr_ready"].includes(data.status)) {
          connectWs();
        }
      })
      .catch(() => {/* backend not running, stay disconnected */});

    return () => {
      wsRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connectWs]);

  return (
    <WhatsAppContext.Provider
      value={{
        status,
        qrCode,
        isConnected: status === "connected",
        connect,
        disconnect,
        sendMessage,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp(): WhatsAppContextValue {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error("useWhatsApp must be used inside WhatsAppProvider");
  return ctx;
}

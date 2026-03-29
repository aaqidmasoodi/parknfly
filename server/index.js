/**
 * Park & Fly WhatsApp Bridge Server
 * Express REST API + WebSocket server that bridges whatsapp-web.js to the Next.js dashboard.
 *
 * Endpoints:
 *   GET  /api/whatsapp/status     → current connection status + QR (if waiting)
 *   POST /api/whatsapp/connect    → initialize WA client
 *   POST /api/whatsapp/disconnect → destroy WA session
 *   POST /api/whatsapp/send       → { phone, message }
 *
 * WebSocket events (server → client):
 *   { type: "status",       status: "connecting"|"connected"|"disconnected"|"error" }
 *   { type: "qr",           data: "<base64 PNG data URL>" }
 *   { type: "connected" }
 *   { type: "disconnected" }
 */

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { WhatsAppManager } = require("./whatsapp");

const PORT = 3001;
const app = express();
app.use(express.json());

// ── CORS (allow Next.js dev server) ─────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── WebSocket setup ──────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);

  // Immediately send current status so frontend catches up
  const { status, qr } = manager.getStatus();
  ws.send(JSON.stringify({ type: "status", status }));
  if (qr) ws.send(JSON.stringify({ type: "qr", data: qr }));

  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(data);
  }
}

// ── WhatsApp client ──────────────────────────────────────────────────────────
const manager = new WhatsAppManager(broadcast);

// ── REST routes ──────────────────────────────────────────────────────────────
app.get("/api/whatsapp/status", (req, res) => {
  res.json(manager.getStatus());
});

app.post("/api/whatsapp/connect", async (req, res) => {
  try {
    await manager.initialize();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/whatsapp/disconnect", async (req, res) => {
  try {
    await manager.disconnect();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }
  try {
    await manager.sendMessage(phone, message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[Park & Fly WhatsApp Bridge] listening on http://localhost:${PORT}`);
});

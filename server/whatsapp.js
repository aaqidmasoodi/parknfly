/**
 * WhatsApp session manager using whatsapp-web.js
 * Handles QR generation, session persistence, and message sending.
 */
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const path = require("path");

class WhatsAppManager {
  constructor(broadcast) {
    this.broadcast = broadcast; // WebSocket broadcast fn
    this.client = null;
    this.status = "disconnected";
    this.qrData = null;
    this._initialized = false;
  }

  getStatus() {
    return { status: this.status, qr: this.qrData };
  }

  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    const sessionPath = path.join(__dirname, ".wwebjs_auth");

    console.log("[WhatsApp] Session path:", sessionPath);
    console.log("[WhatsApp] Platform:", process.platform);
    console.log("[WhatsApp] Node version:", process.version);

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
        ],
        executablePath: process.env.CHROME_BIN || undefined,
      },
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
      },
    });

    this.client.on("qr", async (qr) => {
      try {
        this.qrData = await QRCode.toDataURL(qr);
        this.status = "qr_ready";
        this.broadcast({ type: "qr", data: this.qrData });
      } catch (err) {
        console.error("QR generation error:", err);
      }
    });

    this.client.on("ready", () => {
      console.log("[WhatsApp] Connected ✓");
      this.status = "connected";
      this.qrData = null;
      this.broadcast({ type: "connected" });
    });

    this.client.on("authenticated", () => {
      console.log("[WhatsApp] Authenticated");
      this.status = "connected";
      this.qrData = null;
    });

    this.client.on("auth_failure", (msg) => {
      console.error("[WhatsApp] Auth failure:", msg);
      this.status = "error";
      this.broadcast({ type: "status", status: "error" });
    });

    this.client.on("disconnected", (reason) => {
      console.log("[WhatsApp] Disconnected:", reason);
      this.status = "disconnected";
      this.qrData = null;
      this.broadcast({ type: "disconnected" });
      // Auto-restart to allow re-scan
      this._initialized = false;
    });

    this.status = "connecting";
    this.broadcast({ type: "status", status: "connecting" });
    console.log("[WhatsApp] Initializing client…");

    this.client.initialize()
      .then(() => console.log("[WhatsApp] Client initialized successfully"))
      .catch(err => {
        console.error("[WhatsApp] Initialization error:", err.message);
        console.error("[WhatsApp] Full error:", err);
        this.status = "error";
        this.broadcast({ type: "status", status: "error" });
        this._initialized = false;
      });
  }

  /**
   * Send a WhatsApp message.
   * @param {string} phone  - Raw phone number (Irish format, e.g. 0851234567)
   * @param {string} message
   */
  async sendMessage(phone, message) {
    if (this.status !== "connected") {
      throw new Error("WhatsApp not connected");
    }

    // Normalise to international format for WhatsApp
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("08") || digits.startsWith("07") || digits.startsWith("0")) {
      digits = "353" + digits.slice(1);
    }

    const chatId = `${digits}@c.us`;
    await this.client.sendMessage(chatId, message);
    console.log(`[WhatsApp] Sent to ${chatId}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
    this._initialized = false;
    this.status = "disconnected";
    this.qrData = null;
  }
}

module.exports = { WhatsAppManager };

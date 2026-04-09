import { createClient } from "@libsql/client";

// Server-side only — this file should only be imported in API routes
const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

let tablesEnsured = false;

export async function ensureTables() {
  if (tablesEnsured) return;

  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        product_code TEXT DEFAULT '',
        booking_ref TEXT UNIQUE NOT NULL,
        customer_name TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        entry_date TEXT DEFAULT '',
        return_date TEXT DEFAULT '',
        vehicle_make TEXT DEFAULT '',
        vehicle_model TEXT DEFAULT '',
        vehicle_colour TEXT DEFAULT '',
        vehicle_reg TEXT DEFAULT '',
        product_type TEXT DEFAULT 'PR',
        passengers INTEGER DEFAULT 0,
        terminal TEXT DEFAULT '',
        in_flight_number TEXT DEFAULT '',
        out_flight_number TEXT DEFAULT '',
        price REAL DEFAULT 0,
        status TEXT DEFAULT 'BOOKED',
        parking_spot TEXT DEFAULT '',
        shuttle_notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT NOT NULL,
        from_status TEXT DEFAULT '',
        to_status TEXT DEFAULT '',
        changed_at TEXT DEFAULT (datetime('now')),
        changed_by TEXT DEFAULT '',
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings(updated_at)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref ON bookings(booking_ref)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_status_history_booking_id ON status_history(booking_id)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'returns_handler',
        permissions TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT DEFAULT ''
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        image_base64 TEXT,
        position_index INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
  ]);

  // Migration: add permissions column if it doesn't exist (for existing DBs)
  try {
    await db.execute({
      sql: `ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]'`,
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  tablesEnsured = true;
}

export { db };

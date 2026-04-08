import { db, ensureTables } from "@/lib/db";
import { type InStatement } from "@libsql/client";

export const dynamic = "force-dynamic";

// GET /api/bookings — Fetch all bookings with status history
export async function GET() {
  try {
    await ensureTables();

    const bookingsResult = await db.execute({
      sql: "SELECT * FROM bookings ORDER BY entry_date ASC",
      args: [],
    });

    const historyResult = await db.execute({
      sql: "SELECT * FROM status_history ORDER BY id ASC",
      args: [],
    });

    // Group history by booking_id
    const historyMap = new Map<string, Array<{
      from: string;
      to: string;
      timestamp: string;
      by?: string;
    }>>();

    for (const row of historyResult.rows) {
      const bookingId = row.booking_id as string;
      if (!historyMap.has(bookingId)) {
        historyMap.set(bookingId, []);
      }
      historyMap.get(bookingId)!.push({
        from: row.from_status as string,
        to: row.to_status as string,
        timestamp: row.changed_at as string,
        by: (row.changed_by as string) || undefined,
      });
    }

    const bookings = bookingsResult.rows.map((row) => ({
      id: row.id as string,
      productCode: row.product_code as string,
      bookingRef: row.booking_ref as string,
      customerName: row.customer_name as string,
      customerPhone: row.customer_phone as string,
      entryDate: row.entry_date as string,
      returnDate: row.return_date as string,
      vehicle: {
        make: row.vehicle_make as string,
        model: row.vehicle_model as string,
        colour: row.vehicle_colour as string,
        reg: row.vehicle_reg as string,
      },
      productType: row.product_type as string,
      passengers: row.passengers as number,
      terminal: row.terminal as string,
      inFlightNumber: row.in_flight_number as string,
      outFlightNumber: row.out_flight_number as string,
      price: row.price as number,
      status: row.status as string,
      statusHistory: historyMap.get(row.id as string) || [],
      parkingSpot: (row.parking_spot as string) || undefined,
      shuttleNotes: (row.shuttle_notes as string) || undefined,
    }));

    return Response.json({ bookings, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return Response.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

// POST /api/bookings — Bulk upsert bookings (CSV import)
export async function POST(request: Request) {
  try {
    await ensureTables();

    const body = await request.json();
    const { bookings, merge } = body as {
      bookings: Array<{
        id: string;
        productCode: string;
        bookingRef: string;
        customerName: string;
        customerPhone: string;
        entryDate: string;
        returnDate: string;
        vehicle: { make: string; model: string; colour: string; reg: string };
        productType: string;
        passengers: number;
        terminal: string;
        inFlightNumber: string;
        outFlightNumber: string;
        price: number;
        status: string;
        statusHistory: Array<{
          from: string;
          to: string;
          timestamp: string;
          by?: string;
        }>;
        parkingSpot?: string;
        shuttleNotes?: string;
      }>;
      merge: boolean;
    };

    if (!merge) {
      // Replace mode: clear all existing data first
      await db.batch([
        { sql: "DELETE FROM status_history", args: [] },
        { sql: "DELETE FROM bookings", args: [] },
      ]);
    }

    const now = new Date().toISOString();

    // Batch insert/upsert bookings
    const statements: InStatement[] = [];

    for (const b of bookings) {
      if (merge) {
        // In merge mode: insert if new, update empty fields if existing
        // First try to insert; on conflict, update only empty fields
        statements.push({
          sql: `INSERT INTO bookings (
            id, product_code, booking_ref, customer_name, customer_phone,
            entry_date, return_date, vehicle_make, vehicle_model, vehicle_colour,
            vehicle_reg, product_type, passengers, terminal, in_flight_number,
            out_flight_number, price, status, parking_spot, shuttle_notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(booking_ref) DO UPDATE SET
            terminal = CASE WHEN bookings.terminal = '' THEN excluded.terminal ELSE bookings.terminal END,
            in_flight_number = CASE WHEN bookings.in_flight_number = '' THEN excluded.in_flight_number ELSE bookings.in_flight_number END,
            out_flight_number = CASE WHEN bookings.out_flight_number = '' THEN excluded.out_flight_number ELSE bookings.out_flight_number END,
            vehicle_make = CASE WHEN bookings.vehicle_make = '' THEN excluded.vehicle_make ELSE bookings.vehicle_make END,
            vehicle_model = CASE WHEN bookings.vehicle_model = '' THEN excluded.vehicle_model ELSE bookings.vehicle_model END,
            vehicle_colour = CASE WHEN bookings.vehicle_colour = '' THEN excluded.vehicle_colour ELSE bookings.vehicle_colour END,
            vehicle_reg = CASE WHEN bookings.vehicle_reg = '' THEN excluded.vehicle_reg ELSE bookings.vehicle_reg END,
            updated_at = ?`,
          args: [
            b.id, b.productCode, b.bookingRef, b.customerName, b.customerPhone,
            b.entryDate, b.returnDate, b.vehicle.make, b.vehicle.model,
            b.vehicle.colour, b.vehicle.reg, b.productType, b.passengers,
            b.terminal, b.inFlightNumber, b.outFlightNumber, b.price,
            b.status, b.parkingSpot || "", b.shuttleNotes || "",
            now, now,
            now, // for the updated_at in ON CONFLICT
          ],
        });
      } else {
        // Replace mode: just insert
        statements.push({
          sql: `INSERT INTO bookings (
            id, product_code, booking_ref, customer_name, customer_phone,
            entry_date, return_date, vehicle_make, vehicle_model, vehicle_colour,
            vehicle_reg, product_type, passengers, terminal, in_flight_number,
            out_flight_number, price, status, parking_spot, shuttle_notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            b.id, b.productCode, b.bookingRef, b.customerName, b.customerPhone,
            b.entryDate, b.returnDate, b.vehicle.make, b.vehicle.model,
            b.vehicle.colour, b.vehicle.reg, b.productType, b.passengers,
            b.terminal, b.inFlightNumber, b.outFlightNumber, b.price,
            b.status, b.parkingSpot || "", b.shuttleNotes || "",
            now, now,
          ],
        });
      }
    }

    // Turso batch limit: process in chunks of 20
    const CHUNK_SIZE = 20;
    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      const chunk = statements.slice(i, i + CHUNK_SIZE);
      await db.batch(chunk);
    }

    return Response.json({
      success: true,
      count: bookings.length,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return Response.json(
      { error: "Failed to import bookings" },
      { status: 500 }
    );
  }
}

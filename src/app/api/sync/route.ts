import { db, ensureTables } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/sync?since=<ISO timestamp> — Efficient polling endpoint
// Returns only bookings modified after the given timestamp
// If no `since` param, returns everything (initial load)
export async function GET(request: Request) {
  try {
    await ensureTables();

    const url = new URL(request.url);
    const since = url.searchParams.get("since");

    let bookingsResult;
    if (since) {
      bookingsResult = await db.execute({
        sql: "SELECT * FROM bookings WHERE updated_at > ? ORDER BY entry_date ASC",
        args: [since],
      });
    } else {
      bookingsResult = await db.execute({
        sql: "SELECT * FROM bookings ORDER BY entry_date ASC",
        args: [],
      });
    }

    // Get total count for comparison (detect deletions)
    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as total FROM bookings",
      args: [],
    });
    const totalCount = countResult.rows[0].total as number;

    // Only fetch history for modified bookings
    let historyResult;
    if (bookingsResult.rows.length > 0) {
      const ids = bookingsResult.rows.map((r) => r.id as string);
      const placeholders = ids.map(() => "?").join(",");
      historyResult = await db.execute({
        sql: `SELECT * FROM status_history WHERE booking_id IN (${placeholders}) ORDER BY id ASC`,
        args: ids,
      });
    }

    // Group history by booking_id
    const historyMap = new Map<string, Array<{
      from: string;
      to: string;
      timestamp: string;
      by?: string;
    }>>();

    if (historyResult) {
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

    return Response.json({
      bookings,
      totalCount,
      serverTime: new Date().toISOString(),
      since: since || null,
    });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return Response.json(
      { error: "Failed to sync" },
      { status: 500 }
    );
  }
}

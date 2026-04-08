import { db, ensureTables } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/bookings/[id]/status — Update booking status
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/bookings/[id]/status">
) {
  try {
    await ensureTables();

    const { id } = await ctx.params;
    const body = await request.json();
    const { status, parkingSpot, shuttleNotes } = body as {
      status: string;
      parkingSpot?: string;
      shuttleNotes?: string;
    };

    const now = new Date().toISOString();

    // Get current status for history
    const current = await db.execute({
      sql: "SELECT status FROM bookings WHERE id = ?",
      args: [id],
    });

    if (current.rows.length === 0) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    const fromStatus = current.rows[0].status as string;

    // Build update query dynamically
    let updateSql = "UPDATE bookings SET status = ?, updated_at = ?";
    const updateArgs: (string | number)[] = [status, now];

    if (parkingSpot !== undefined) {
      updateSql += ", parking_spot = ?";
      updateArgs.push(parkingSpot);
    }

    if (shuttleNotes !== undefined) {
      updateSql += ", shuttle_notes = ?";
      updateArgs.push(shuttleNotes);
    }

    updateSql += " WHERE id = ?";
    updateArgs.push(id);

    // Execute both in a batch (atomic)
    await db.batch([
      {
        sql: updateSql,
        args: updateArgs,
      },
      {
        sql: `INSERT INTO status_history (booking_id, from_status, to_status, changed_at)
              VALUES (?, ?, ?, ?)`,
        args: [id, fromStatus, status, now],
      },
    ]);

    return Response.json({
      success: true,
      serverTime: now,
    });
  } catch (error) {
    console.error("PATCH /api/bookings/[id]/status error:", error);
    return Response.json(
      { error: "Failed to update booking status" },
      { status: 500 }
    );
  }
}

import { db, ensureTables } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/bookings/clear — Wipe all bookings and history
export async function DELETE() {
  try {
    await ensureTables();

    await db.batch([
      { sql: "DELETE FROM status_history", args: [] },
      { sql: "DELETE FROM bookings", args: [] },
    ]);

    return Response.json({
      success: true,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DELETE /api/bookings/clear error:", error);
    return Response.json(
      { error: "Failed to clear bookings" },
      { status: 500 }
    );
  }
}

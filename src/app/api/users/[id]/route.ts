import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

// DELETE /api/users/:id — delete a user (manage_users required, cannot delete self)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes("manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await ensureTables();

    const result = await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

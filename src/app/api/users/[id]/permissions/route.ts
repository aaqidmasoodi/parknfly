import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Permission, ALL_PERMISSIONS } from "@/lib/auth";

const validPermissions = new Set(ALL_PERMISSIONS.map((p) => p.key));

// PUT /api/users/:id/permissions — update a user's permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes("manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const { permissions } = body as { permissions: Permission[] };

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "permissions must be an array" },
        { status: 400 }
      );
    }

    // Validate that all permissions are valid
    const invalid = permissions.filter((p) => !validPermissions.has(p));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    await ensureTables();

    // Verify user exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE id = ?",
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await db.execute({
      sql: "UPDATE users SET permissions = ? WHERE id = ?",
      args: [JSON.stringify(permissions), id],
    });

    return NextResponse.json({ ok: true, permissions });
  } catch (error) {
    console.error("Update permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    await ensureTables();

    // Check if the user is changing their own password
    const isSelf = session.userId === id;
    
    // Check if the user is an admin changing someone else's password
    const hasAdminRights = session.permissions?.includes("manage_users");

    if (!isSelf && !hasAdminRights) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the target user's current password hash
    const userResult = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If it's a self-update, we must verify the current password
    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash as string);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Password update error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

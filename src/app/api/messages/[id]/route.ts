import { NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables();
  try {
    const user = await getSession();
    if (!user || user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const updates = await request.json();

    // Map fields
    const updateParts: string[] = [];
    const args: any[] = [];

    if ("name" in updates) {
      updateParts.push("name = ?");
      args.push(updates.name);
    }
    if ("body" in updates) {
      updateParts.push("body = ?");
      args.push(updates.body);
    }
    if ("imageBase64" in updates) {
      updateParts.push("image_base64 = ?");
      args.push(updates.imageBase64 || null);
    }
    if ("position_index" in updates) {
      updateParts.push("position_index = ?");
      args.push(updates.position_index);
    }

    if (updateParts.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateParts.push("updated_at = datetime('now')");
    args.push(id);

    const check = await db.execute({
      sql: "SELECT id FROM messages WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await db.execute({
      sql: `UPDATE messages SET ${updateParts.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/messages/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables();
  try {
    const user = await getSession();
    if (!user || user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await db.execute({
      sql: "DELETE FROM messages WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/messages/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

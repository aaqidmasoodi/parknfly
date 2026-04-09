import { NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  await ensureTables();
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db.execute({
      sql: "SELECT * FROM messages ORDER BY position_index ASC, created_at ASC",
      args: [],
    });

    let defaultMessagesSeeded = false;
    let messages = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      body: row.body as string,
      imageBase64: (row.image_base64 as string) || undefined,
    }));

    if (messages.length === 0) {
      // Seed defaults
      const DEFAULT_TEMPLATES = [
        { id: "check_in_confirmed", name: "Check-In Confirmed", body: "Hi {{name}}. Your vehicle ({{vehicle}}, {{reg}}) has been safely checked in at Park & Fly. Reference: {{ref}}. We will be ready for your return on {{returnDate}} at {{returnTime}}. Safe travels.", imageBase64: undefined },
        { id: "shuttle_dispatched", name: "Shuttle Dispatched", body: "Hi {{name}}. Your shuttle has been dispatched to {{terminal}}. Please make your way to the pickup point. Booking ref: {{ref}}.", imageBase64: undefined },
        { id: "return_reminder", name: "Return Reminder", body: "Hi {{name}}. Your vehicle ({{vehicle}}, {{reg}}) is ready for collection at Park & Fly. Please let us know your estimated arrival time so we can have everything ready. Ref: {{ref}}.", imageBase64: undefined },
        { id: "late_arrival_nudge", name: "Late Arrival Nudge", body: "Hi {{name}}, we noticed your Park & Fly booking ({{ref}}) was scheduled for {{entryTime}} today. Are you still on your way? Please let us know so we can hold your spot.", imageBase64: undefined },
        { id: "return_completed", name: "Return Completed", body: "Hi {{name}}. Your vehicle ({{reg}}) has been successfully returned. Thank you for choosing Park & Fly. We hope to see you again.", imageBase64: undefined }
      ];

      for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
        const t = DEFAULT_TEMPLATES[i];
        await db.execute({
          sql: `INSERT INTO messages (id, name, body, position_index) VALUES (?, ?, ?, ?)`,
          args: [t.id, t.name, t.body, i],
        });
      }
      messages = DEFAULT_TEMPLATES;
    }

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await ensureTables();
  try {
    const user = await getSession();
    if (!user || user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const { id, name, body, imageBase64, position_index = 0 } = data;

    if (!id || !name || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO messages (id, name, body, image_base64, position_index) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, name, body, imageBase64 || null, position_index],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

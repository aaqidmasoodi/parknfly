import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { UserRole, ALL_PERMISSIONS } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// POST /api/seed — One-time bootstrap for the first manager account
export async function POST(request: NextRequest) {
  try {
    const seedSecret = process.env.SEED_SECRET;
    if (!seedSecret) {
      return NextResponse.json(
        { error: "Seeding is not configured" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { secret, username, password, name } = body;

    if (secret !== seedSecret) {
      return NextResponse.json(
        { error: "Invalid seed secret" },
        { status: 403 }
      );
    }

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "username, password, and name are required" },
        { status: 400 }
      );
    }

    await ensureTables();

    // Check if any users exist — only allow seeding if DB is empty
    const existing = await db.execute({
      sql: "SELECT COUNT(*) as count FROM users",
      args: [],
    });

    const count = Number(existing.rows[0].count);
    if (count > 0) {
      return NextResponse.json(
        { error: "Users already exist. Seeding is only for initial setup." },
        { status: 409 }
      );
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const allPerms = ALL_PERMISSIONS.map((p) => p.key);

    await db.execute({
      sql: "INSERT INTO users (id, username, password_hash, name, role, permissions, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        id,
        username.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        UserRole.MANAGER,
        JSON.stringify(allPerms),
        "system",
      ],
    });

    return NextResponse.json({
      ok: true,
      message: "Manager account created successfully",
      user: {
        id,
        username: username.toLowerCase().trim(),
        name: name.trim(),
        role: UserRole.MANAGER,
        permissions: allPerms,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

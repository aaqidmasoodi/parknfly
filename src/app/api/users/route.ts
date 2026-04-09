import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";
import { UserRole, Permission, ROLE_PRESETS, ALL_PERMISSIONS } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// GET /api/users — list all users (manage_users permission required)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes("manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureTables();

    const result = await db.execute({
      sql: "SELECT id, username, name, role, permissions, created_at, created_by FROM users ORDER BY created_at DESC",
      args: [],
    });

    const users = result.rows.map((row) => {
      let permissions: Permission[] = [];
      try {
        permissions = JSON.parse((row.permissions as string) || "[]");
      } catch {
        permissions = [];
      }
      return {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        permissions,
        createdAt: row.created_at,
        createdBy: row.created_by,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users — create a new user (manage_users permission required)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes("manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureTables();

    const body = await request.json();
    const { username, password, name, role } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: "All fields are required: username, password, name, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${Object.values(UserRole).join(", ")}` },
        { status: 400 }
      );
    }

    // Check for duplicate username
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username.toLowerCase().trim()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Get default permissions from role preset
    const preset = ROLE_PRESETS[role as UserRole];
    const permissions = preset ? preset.permissions : [];

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: "INSERT INTO users (id, username, password_hash, name, role, permissions, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        id,
        username.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        role,
        JSON.stringify(permissions),
        session.userId,
      ],
    });

    return NextResponse.json({
      ok: true,
      user: {
        id,
        username: username.toLowerCase().trim(),
        name: name.trim(),
        role,
        permissions,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";
import { UserRole, AuthUser, Permission } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    await ensureTables();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Look up user
    const result = await db.execute({
      sql: "SELECT id, username, password_hash, name, role, permissions FROM users WHERE username = ?",
      args: [username.toLowerCase().trim()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const row = result.rows[0];
    const passwordMatch = await bcrypt.compare(
      password,
      row.password_hash as string
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    let permissions: Permission[] = [];
    try {
      permissions = JSON.parse((row.permissions as string) || "[]");
    } catch {
      permissions = [];
    }

    const user: AuthUser = {
      id: row.id as string,
      username: row.username as string,
      name: row.name as string,
      role: row.role as UserRole,
      permissions,
    };

    // Create session cookie
    await createSession(user);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

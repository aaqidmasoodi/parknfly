import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Permission, ROUTE_PERMISSIONS, getDefaultRoute } from "@/lib/auth";

const secretKey = process.env.SESSION_SECRET;
const encodedKey = secretKey
  ? new TextEncoder().encode(secretKey)
  : null;

const COOKIE_NAME = "parkandfly-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for login page, auth API, seed API, and static files
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie || !encodedKey) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ["HS256"],
    });

    const permissions = (payload.permissions as string[]) || [];

    // For API routes (not auth/seed), allow if authenticated
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // Check route-specific permission
    let requiredPermission: Permission | null = null;
    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
      if (route === "/" && pathname === "/") {
        requiredPermission = perm;
        break;
      }
      if (route !== "/" && pathname.startsWith(route)) {
        requiredPermission = perm;
        break;
      }
    }

    // If the route requires a permission, check it
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      const defaultRoute = getDefaultRoute(permissions as Permission[]);
      const redirectUrl = new URL(defaultRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-permissions", JSON.stringify(permissions));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};

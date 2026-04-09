// Dynamic per-user permission system
// Permissions are stored per-user in the database.
// Roles are just "presets" used when creating a user.

// ─── Permission type ─────────────────────────────────────────────
export type Permission =
  // Page access
  | "view_dashboard"
  | "view_bookings"
  | "view_returns"
  | "view_settings"
  | "manage_users"
  // Actions
  | "check_in"
  | "mark_arrived"
  | "dispatch_shuttle"
  | "complete_booking"
  | "csv_import"
  | "reset_data"
  | "send_message";

// ─── Permission metadata for UI ──────────────────────────────────
export interface PermissionMeta {
  key: Permission;
  label: string;
  description: string;
  group: "pages" | "actions";
}

export const ALL_PERMISSIONS: PermissionMeta[] = [
  // Pages
  { key: "view_dashboard", label: "Dashboard", description: "View the main dashboard", group: "pages" },
  { key: "view_bookings", label: "Bookings", description: "View the bookings database", group: "pages" },
  { key: "view_returns", label: "Returns", description: "View the returns page", group: "pages" },
  { key: "view_settings", label: "Settings", description: "View and edit settings", group: "pages" },
  { key: "manage_users", label: "User Management", description: "Add, remove, and edit user permissions", group: "pages" },
  // Actions
  { key: "check_in", label: "Check In", description: "Check in bookings on arrival", group: "actions" },
  { key: "mark_arrived", label: "Mark Arrived", description: "Mark a returning customer as arrived", group: "actions" },
  { key: "dispatch_shuttle", label: "Dispatch Shuttle", description: "Send shuttle to pick up customer", group: "actions" },
  { key: "complete_booking", label: "Complete Booking", description: "Mark a booking as completed", group: "actions" },
  { key: "csv_import", label: "Import CSV", description: "Import booking data from CSV files", group: "actions" },
  { key: "reset_data", label: "Reset Data", description: "Delete all bookings and reset system", group: "actions" },
  { key: "send_message", label: "Send Messages", description: "Send WhatsApp messages to customers", group: "actions" },
];

// ─── Role presets (used only when creating a new user) ───────────
export enum UserRole {
  MANAGER = "manager",
  RETURNS_HANDLER = "returns_handler",
}

export const ROLE_PRESETS: Record<UserRole, { label: string; permissions: Permission[] }> = {
  [UserRole.MANAGER]: {
    label: "Manager",
    permissions: ALL_PERMISSIONS.map((p) => p.key), // everything
  },
  [UserRole.RETURNS_HANDLER]: {
    label: "Returns Handler",
    permissions: ["view_bookings", "view_returns", "check_in", "mark_arrived"],
  },
};

// ─── Route → permission mapping (for proxy & sidebar) ────────────
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/": "view_dashboard",
  "/bookings": "view_bookings",
  "/returns": "view_returns",
  "/settings": "view_settings",
  "/users": "manage_users",
};

// ─── Helper functions ────────────────────────────────────────────

/**
 * Check if a set of permissions includes a specific one.
 */
export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

/**
 * Get the first allowed route given a set of permissions.
 */
export function getDefaultRoute(permissions: Permission[]): string {
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (permissions.includes(perm)) return route;
  }
  return "/login";
}

// ─── Auth user type ──────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { UserRole, Permission, ALL_PERMISSIONS, ROLE_PRESETS } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users as UsersIcon,
  Plus,
  Trash2,
  Shield,
  RotateCcw,
  CheckCircle2,
  Loader2,
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  CarFront,
  Settings,
  UserCheck,
  Upload,
  AlertTriangle,
  Send,
  MessageCircle,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AppUser {
  id: string;
  username: string;
  name: string;
  role: string;
  permissions: Permission[];
  createdAt: string;
  createdBy: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  manager: {
    label: "Manager",
    color: "text-primary bg-primary/10 border-primary/20",
    icon: Shield,
  },
  returns_handler: {
    label: "Returns Handler",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    icon: RotateCcw,
  },
};

// Permission icons for the UI
const PERMISSION_ICONS: Partial<Record<Permission, typeof Shield>> = {
  view_dashboard: LayoutDashboard,
  view_bookings: CarFront,
  view_returns: RotateCcw,
  view_settings: Settings,
  manage_users: UsersIcon,
  check_in: LogIn,
  mark_arrived: UserCheck,
  dispatch_shuttle: Send,
  complete_booking: CheckCircle2,
  csv_import: Upload,
  reset_data: AlertTriangle,
  send_message: MessageCircle,
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Add form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.RETURNS_HANDLER);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Force reset password
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingUser, setIsResettingUser] = useState(false);

  // Permission saving
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      toast.success("User created", {
        description: `${newName} (${ROLE_LABELS[newRole]?.label || newRole}) has been added.`,
      });

      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewRole(UserRole.RETURNS_HANDLER);
      setShowAddForm(false);
      setShowPassword(false);

      await fetchUsers();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted");
      setDeletingId(null);
      if (expandedUserId === id) setExpandedUserId(null);
      await fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePermission = async (userId: string, permission: Permission) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const currentPerms = user.permissions || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter((p) => p !== permission)
      : [...currentPerms, permission];

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissions: newPerms } : u))
    );

    setSavingPermissions(userId);

    try {
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPerms }),
      });

      if (!res.ok) {
        // Revert on failure
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, permissions: currentPerms } : u))
        );
        toast.error("Failed to update permission");
      } else {
        toast.success("Permission updated", {
          description: `${permission} ${newPerms.includes(permission) ? "enabled" : "disabled"} for ${user.name}`,
          duration: 1500,
        });
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permissions: currentPerms } : u))
      );
      toast.error("Failed to update permission");
    } finally {
      setSavingPermissions(null);
    }
  };

  const handleForceResetPassword = async () => {
    if (!resettingUserId || resetPasswordValue.length < 6) return;
    setIsResettingUser(true);
    try {
      const res = await fetch(`/api/users/${resettingUserId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPasswordValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password reset!", {
        description: `New password has been forced for ${users.find(u => u.id === resettingUserId)?.name}.`,
      });
      setResettingUserId(null);
      setResetPasswordValue("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsResettingUser(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pagePermissions = ALL_PERMISSIONS.filter((p) => p.group === "pages");
  const actionPermissions = ALL_PERMISSIONS.filter((p) => p.group === "actions");

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-15%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:pr-48 h-14 border-b border-border/40 shrink-0 glass-card z-10 sticky top-0">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          User Management
        </h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md border-0 text-sm"
          size="sm"
        >
          {showAddForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add User
            </>
          )}
        </Button>
      </header>

      {/* Force Reset Password Dialog */}
      <Dialog open={!!resettingUserId} onOpenChange={(open) => {
        if (!open) {
          setResettingUserId(null);
          setResetPasswordValue("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-semibold text-foreground">{users.find(u => u.id === resettingUserId)?.name}</span>. They will use this upon next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="force-new-password">New Password</Label>
              <Input
                id="force-new-password"
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setResettingUserId(null)}>Cancel</Button>
             <Button onClick={handleForceResetPassword} disabled={resetPasswordValue.length < 6 || isResettingUser}>
                {isResettingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Force Reset
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto z-10">
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-24 md:pb-6 animate-fade-in-up">
          {/* Add User Form */}
          {showAddForm && (
            <Card className="glass-card border-primary/20 shadow-xl overflow-hidden animate-slide-in">
              <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Create New User
                </CardTitle>
                <CardDescription className="text-xs">
                  Select a role preset to set default permissions. You can customize them after creation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="grid sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="new-name" className="text-xs font-medium">
                      Full Name
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="new-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. John Smith"
                        className="pl-9 bg-background/50 border-border/50 h-10 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="new-username" className="text-xs font-medium">
                      Username
                    </Label>
                    <Input
                      id="new-username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. john"
                      className="bg-background/50 border-border/50 h-10 rounded-xl"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs font-medium">
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Set a password"
                        className="pl-9 pr-10 bg-background/50 border-border/50 h-10 rounded-xl"
                        required
                        minLength={4}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Role Preset */}
                  <div className="space-y-2">
                    <Label htmlFor="new-role" className="text-xs font-medium">
                      Role Preset
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ROLE_LABELS).map(([value, config]) => {
                        const Icon = config.icon;
                        const isSelected = newRole === value;
                        const preset = ROLE_PRESETS[value as UserRole];
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setNewRole(value as UserRole)}
                            className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                              isSelected
                                ? `${config.color} border-current shadow-sm`
                                : "bg-background/50 border-border/50 text-muted-foreground hover:bg-muted/30"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5" />
                              {config.label}
                            </span>
                            <span className="text-[10px] opacity-70">{preset?.permissions.length || 0} permissions</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="sm:col-span-2 flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isCreating || !newUsername || !newPassword || !newName}
                      className="gap-2 shadow-md"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isCreating ? "Creating…" : "Create User"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <Card className="glass-card border-border/50 shadow-lg overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10">
                    <UsersIcon className="h-4 w-4 text-primary" />
                  </div>
                  Team Members
                </div>
                <span className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {users.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground opacity-70">
                  <UsersIcon className="h-10 w-10 mb-3" />
                  <p className="text-sm font-medium">No users yet</p>
                  <p className="text-xs mt-1">Click &quot;Add User&quot; to create the first team member.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {users.map((u) => {
                    const roleConfig = ROLE_LABELS[u.role] || {
                      label: u.role,
                      color: "text-muted-foreground bg-muted/30 border-border/30",
                      icon: User,
                    };
                    const RoleIcon = roleConfig.icon;
                    const isCurrentUser = u.id === currentUser?.id;
                    const isExpanded = expandedUserId === u.id;
                    const isConfirmingDelete = deletingId === u.id;
                    const isSaving = savingPermissions === u.id;
                    const permCount = u.permissions?.length || 0;
                    const totalPerms = ALL_PERMISSIONS.length;

                    return (
                      <div key={u.id} className="group">
                        {/* User Row */}
                        <div
                          className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                        >
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13px] font-semibold tracking-tight">
                                {u.name}
                              </p>
                              {isCurrentUser && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">
                                  You
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleConfig.color}`}>
                                <RoleIcon className="h-2.5 w-2.5" />
                                {roleConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] text-muted-foreground">@{u.username}</span>
                              <span className="text-[10px] text-muted-foreground/50">•</span>
                              <span className="text-[10px] text-muted-foreground">{permCount}/{totalPerms} permissions</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {!isCurrentUser && (
                              <>
                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 text-[11px] px-2"
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[11px] px-2"
                                      onClick={() => setDeletingId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setResettingUserId(u.id);
                                      }}
                                      title="Force Reset Password"
                                    >
                                      <Lock className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingId(u.id);
                                      }}
                                      title="Delete user"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Permission Editor */}
                        {isExpanded && (
                          <div className="px-4 sm:px-6 pb-5 pt-1 bg-muted/5 border-t border-border/20 animate-slide-in">
                            <div className="relative">
                              {isSaving && (
                                <div className="absolute top-2 right-0 flex items-center gap-1.5 text-[10px] text-primary font-medium">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Saving…
                                </div>
                              )}

                              {/* Page Access */}
                              <div className="mb-4">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                                  <LayoutDashboard className="h-3 w-3" />
                                  Page Access
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {pagePermissions.map((perm) => {
                                    const Icon = PERMISSION_ICONS[perm.key] || Shield;
                                    const isEnabled = u.permissions?.includes(perm.key);
                                    return (
                                      <div
                                        key={perm.key}
                                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                                          isEnabled
                                            ? "bg-primary/5 border-primary/15"
                                            : "bg-background/50 border-border/30"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                                          <div className="min-w-0">
                                            <p className={`text-xs font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                              {perm.label}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 truncate">{perm.description}</p>
                                          </div>
                                        </div>
                                        <Switch
                                          checked={isEnabled}
                                          onCheckedChange={() => handleTogglePermission(u.id, perm.key)}
                                          className="shrink-0"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Actions */}
                              <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                                  <Shield className="h-3 w-3" />
                                  Actions
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {actionPermissions.map((perm) => {
                                    const Icon = PERMISSION_ICONS[perm.key] || Shield;
                                    const isEnabled = u.permissions?.includes(perm.key);
                                    return (
                                      <div
                                        key={perm.key}
                                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                                          isEnabled
                                            ? "bg-primary/5 border-primary/15"
                                            : "bg-background/50 border-border/30"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                                          <div className="min-w-0">
                                            <p className={`text-xs font-medium ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                              {perm.label}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 truncate">{perm.description}</p>
                                          </div>
                                        </div>
                                        <Switch
                                          checked={isEnabled}
                                          onCheckedChange={() => handleTogglePermission(u.id, perm.key)}
                                          className="shrink-0"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Note about session refresh */}
                              <p className="text-[10px] text-muted-foreground/60 mt-3 italic">
                                Note: Permission changes take effect on the user&apos;s next login.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

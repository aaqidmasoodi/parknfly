"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, Loader2, Shield } from "lucide-react";
import { ALL_PERMISSIONS } from "@/lib/auth";

export default function ProfilePage() {
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      return setPasswordError("New passwords do not match.");
    }
    if (newPassword.length < 6) {
      return setPasswordError("New password must be at least 6 characters.");
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`/api/users/${user?.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-15%] right-[-5%] w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      
      <header className="flex items-center gap-2 px-6 md:pr-48 h-14 border-b border-border/40 shrink-0 glass-card z-10 sticky top-0">
        <User className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">Your Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        <div className="p-6 md:p-8 max-w-4xl mx-auto pb-20 space-y-6 animate-fade-in-up">
          
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Left column: User info summary */}
            <div className="md:col-span-1 space-y-6">
              <Card className="glass-card shadow-lg border-border/50">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center text-2xl font-bold text-primary mb-4 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">{user.name}</h2>
                  <p className="text-sm font-mono text-muted-foreground mt-1">@{user.username}</p>
                  
                  <div className="mt-4 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Shield className="h-3 w-3" />
                    {user.role}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card shadow-md border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Your Permissions</CardTitle>
                  <CardDescription className="text-xs">Access granted to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {ALL_PERMISSIONS.filter(p => user.permissions?.includes(p.key)).map(p => (
                      <div key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded-md">
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0"/>
                        {p.label}
                      </div>
                    ))}
                  </div>
                  {user.permissions?.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No special permissions.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column: Actions */}
            <div className="md:col-span-2 space-y-6">
              {/* Change Password Card */}
              <Card className="glass-card shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-primary" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update the password required to access your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-background/50"
                        />
                      </div>
                    </div>

                    {passwordError && (
                      <div className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">{passwordError}</div>
                    )}
                    {passwordSuccess && (
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">{passwordSuccess}</div>
                    )}

                    <div className="pt-2">
                      <Button type="submit" disabled={isUpdatingPassword} className="w-full sm:w-auto shadow-md">
                        {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                        Update Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

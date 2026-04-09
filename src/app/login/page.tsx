"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Lock, User, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user.role === "returns_handler") {
        window.location.href = "/returns";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Unable to connect. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 to-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/park-and-fly-logo.jpg"
            alt="Park & Fly"
            width={280}
            height={100}
            className="h-24 w-auto object-contain"
            priority
          />
        </div>

        <Card className="glass-card border-border/50 shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardHeader className="text-center pb-2 pt-8">
            <h1 className="text-xl font-bold tracking-tight">Operations Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access the dashboard
            </p>
          </CardHeader>
          <CardContent className="pt-4 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-slide-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Username
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-xl"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-300"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Park & Fly Operations Hub — Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}

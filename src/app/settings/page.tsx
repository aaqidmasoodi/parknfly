"use client";

import { useState } from "react";
import { useWhatsApp } from "@/lib/whatsapp-context";
import { useSettings } from "@/lib/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageTemplateList } from "@/components/MessageTemplateList";
import { ResetDialog } from "@/components/ResetDialog";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
  Clock,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { Label } from "@/components/ui/label";

const STATUS_CONFIG = {
  disconnected: {
    icon: WifiOff,
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "Disconnected",
    description: "Connect to send automated WhatsApp messages directly from the dashboard.",
  },
  connecting: {
    icon: Loader2,
    color: "text-amber-500",
    dot: "bg-amber-500",
    label: "Connecting…",
    description: "Initializing WhatsApp client. A QR code will appear shortly.",
  },
  qr_ready: {
    icon: QrCode,
    color: "text-blue-500",
    dot: "bg-blue-500",
    label: "Scan QR Code",
    description: "Open WhatsApp on your phone → Linked Devices → Link a Device → scan the code below.",
  },
  connected: {
    icon: CheckCircle2,
    color: "text-[#25D366]",
    dot: "bg-[#25D366]",
    label: "Connected",
    description: "WhatsApp is live. Messages will be sent automatically from the dashboard.",
  },
  error: {
    icon: AlertTriangle,
    color: "text-destructive",
    dot: "bg-destructive",
    label: "Error",
    description: "Something went wrong. Try disconnecting and reconnecting.",
  },
} as const;

export default function SettingsPage() {
  const { status, qrCode, isConnected, connect, disconnect, sendMessage } = useWhatsApp();
  const { settings, updateSetting } = useSettings();
  const [testPhone, setTestPhone] = useState("0870376567");
  const [isSending, setIsSending] = useState(false);

  const handleTestMessage = async () => {
    if (!testPhone) return;
    setIsSending(true);
    try {
      await sendMessage(testPhone, "Hello from Park & Fly. This is a test message to verify the WhatsApp integration is working perfectly.");
      alert("Test message sent successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to send test message");
    } finally {
      setIsSending(false);
    }
  };

  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-2 px-6 h-14 border-b border-border/40 shrink-0 glass-card z-10 sticky top-0">
        <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto pb-20 md:pb-8 animate-fade-in-up">
          
          {/* Two-column layout for desktop */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left column - WhatsApp Connection */}
            <div className="lg:col-span-2 space-y-6">
              {/* WhatsApp Connection Card */}
              <Card className="glass-card shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    WhatsApp Integration
                  </CardTitle>
                  <CardDescription>
                    Connect to send automated check-in confirmations, shuttle alerts, and return reminders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Status row bg */}
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot} ${status === "connected" ? "animate-glow" : ""}`} />
                        <div>
                          <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed mt-0.5">{cfg.description}</p>
                        </div>
                      </div>
                      <StatusIcon
                        className={`h-5 w-5 shrink-0 ${cfg.color} ${status === "connecting" ? "animate-spin" : ""}`}
                      />
                    </div>
                  </div>

                  {/* QR Code display */}
                  {status === "qr_ready" && qrCode && (
                    <div className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card/50 shadow-inner animate-slide-in">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Image
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          width={220}
                          height={220}
                          className="rounded-md"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        This QR code will expire in ~60 seconds. Click "Refresh" if it expires.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-2"
                        onClick={() => { disconnect(); setTimeout(connect, 500); }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh QR
                      </Button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!isConnected && status !== "qr_ready" && (
                      <Button
                        onClick={connect}
                        disabled={status === "connecting"}
                        className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md border-0"
                      >
                        {status === "connecting" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        {status === "connecting" ? "Connecting…" : "Connect WhatsApp"}
                      </Button>
                    )}
                    {(isConnected || status === "qr_ready") && (
                      <Button variant="outline" onClick={disconnect} className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border-border/50">
                        <WifiOff className="h-4 w-4" />
                        Disconnect
                      </Button>
                    )}
                  </div>

                  {isConnected && (
                    <div className="space-y-3 pt-4 border-t border-border/50 animate-slide-in">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Test Connection
                      </p>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="e.g. 0851234567"
                          className="max-w-[200px] bg-background/50"
                        />
                        <Button
                          onClick={handleTestMessage}
                          disabled={isSending || !testPhone}
                          variant="secondary"
                          className="shadow-sm border border-border/50"
                        >
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Send Test
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Send a test message to this number to verify it works.
                      </p>
                    </div>
                  )}

                  {/* Connection status note */}
                  {isConnected && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 space-y-1.5 shadow-sm">
                      <p className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        WhatsApp Bridge Connected
                      </p>
                      <p className="text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
                        Automated messages are enabled. Messages will be sent directly through WhatsApp Web.
                      </p>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Customizable Message Templates */}
              <Card className="glass-card shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    Custom Message Templates
                  </CardTitle>
                  <CardDescription>
                    Configure the exact wording and images sent to customers for each action.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MessageTemplateList />
                </CardContent>
              </Card>
            </div>

            {/* Right column - Sidebar */}
            <div className="space-y-6">
              {/* Return Settings */}
              <Card className="glass-card shadow-lg border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    Return Settings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure return behavior and thresholds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="overdue-hours" className="text-xs font-medium">
                        Overdue Return Threshold
                      </Label>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-mono font-bold text-primary">{settings.overdueReturnHours}h</span>
                      </div>
                    </div>
                    <Input
                      id="overdue-hours"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={settings.overdueReturnHours}
                      onChange={(e) => updateSetting("overdueReturnHours", Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)))}
                      className="bg-background/50 border-border/50 h-9"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      A return is classified as overdue if it is more than {settings.overdueReturnHours} hours late. For example, if a customer was supposed to return at 1 PM but comes at 5 PM with a 4-hour threshold, that&apos;s an overdue return.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30 bg-destructive/5 shadow-none overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-destructive/40 to-destructive"></div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-destructive/80 text-xs">
                    Destructive actions that permanently remove data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                      <p className="text-xs font-medium text-destructive mb-1">Wipe All Data</p>
                      <p className="text-[11px] text-destructive/80 leading-relaxed mb-2">
                        Permanently delete all bookings, message templates, and settings from this browser.
                      </p>
                      <ResetDialog />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="glass-card shadow-lg border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Scan the QR code with WhatsApp on your phone to enable automated messaging.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Message templates support placeholders like {"{{name}}"}, {"{{ref}}"}, and {"{{vehicle}}"} for personalization.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All data is stored locally in your browser and never leaves your device.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

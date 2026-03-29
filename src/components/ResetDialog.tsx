"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookings } from "@/lib/store";
import { useMessages } from "@/lib/message-store";
import { Trash2, AlertTriangle } from "lucide-react";

export function ResetDialog() {
  const { clearAll } = useBookings();
  const { clearAll: clearMessages } = useMessages();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleReset = () => {
    clearAll();
    clearMessages();
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setConfirmText("");
      window.location.reload();
    }, 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirmText("");
          setDone(false);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Reset Everything
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset All Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all bookings, message templates, and
            stored settings. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm font-medium">All data has been cleared.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs text-destructive">
                  <strong>Warning:</strong> This will delete:
                </p>
                <ul className="text-xs text-destructive/80 mt-1 space-y-0.5 list-disc pl-4">
                  <li>All imported bookings and their status history</li>
                  <li>All custom message templates</li>
                  <li>All stored preferences</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm">
                  Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={!canDelete}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Permanently Delete Everything
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

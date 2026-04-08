"use client";

import { useState, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBookings } from "@/lib/store";
import { parseCSV } from "@/lib/csv-parser";
import { Booking, BookingStatus } from "@/lib/types";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Files,
} from "lucide-react";

interface ParsedFile {
  file: File;
  bookings: Booking[];
  error?: string;
}

export function CSVImportDialog() {
  const { importBookings, mergeImportBookings, clearAll, bookings } = useBookings();
  const [open, setOpen] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [checkInAll, setCheckInAll] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    setDone(false);

    const fileArray = Array.from(files);
    const csvFiles = fileArray.filter(
      (f) => f.name.endsWith(".csv") || f.type === "text/csv"
    );

    if (csvFiles.length === 0) {
      setError("Please select CSV files.");
      return;
    }

    csvFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = parseCSV(text);
          setParsedFiles((prev) => {
            // Avoid duplicate files
            const exists = prev.find((p) => p.file.name === file.name);
            if (exists) return prev;
            return [
              ...prev,
              {
                file,
                bookings: parsed,
                error: parsed.length === 0 ? "No valid bookings found" : undefined,
              },
            ];
          });
        } catch {
          setParsedFiles((prev) => [
            ...prev,
            { file, bookings: [], error: "Failed to parse" },
          ]);
        }
      };
      reader.readAsText(file);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (fileName: string) => {
    setParsedFiles((prev) => prev.filter((p) => p.file.name !== fileName));
  };

  const totalBookings = parsedFiles.reduce(
    (sum, p) => sum + p.bookings.length,
    0
  );

  const validFiles = parsedFiles.filter((p) => p.bookings.length > 0);

  const handleImport = useCallback(() => {
    if (validFiles.length === 0) return;
    setImporting(true);

    // Combine all bookings from all files
    const allBookings = validFiles.flatMap((p) => p.bookings);

    // Deduplicate across files by bookingRef
    const deduped = new Map<string, Booking>();
    for (const b of allBookings) {
      if (!deduped.has(b.bookingRef)) {
        deduped.set(b.bookingRef, b);
      }
    }
    const combined = Array.from(deduped.values());

    if (checkInAll) {
      const now = new Date().toISOString();
      for (const b of combined) {
        if (b.status !== BookingStatus.CHECKED_IN) {
          b.statusHistory.push({
            from: b.status,
            to: BookingStatus.CHECKED_IN,
            timestamp: now,
          });
          b.status = BookingStatus.CHECKED_IN;
        }
      }
    }

    if (mergeMode) {
      mergeImportBookings(combined);
    } else {
      clearAll();
      importBookings(combined);
    }

    setImportedCount(combined.length);
    setDone(true);
    setImporting(false);
  }, [validFiles, mergeMode, checkInAll, mergeImportBookings, clearAll, importBookings]);

  const reset = () => {
    setParsedFiles([]);
    setError(null);
    setDone(false);
    setImporting(false);
    setMergeMode(false);
    setCheckInAll(false);
    setImportedCount(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Booking Data</DialogTitle>
          <DialogDescription>
            Upload one or more CSV files. Park & Fly exports departures and returns as
            separate files — drop them both here and they'll be merged automatically.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">
              {importedCount} bookings imported successfully
            </p>
            <p className="text-xs text-muted-foreground">
              {mergeMode ? "Merged with existing data" : "Replaced all existing data"}
            </p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-accent/30 hover:border-primary/30 transition-all duration-200"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv";
                input.multiple = true;
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement)?.files;
                  if (files) handleFiles(files);
                };
                input.click();
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Files className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">
                  Drop CSV files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports multiple files • Departures + Returns
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* File List */}
            {parsedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Files ({parsedFiles.length})
                </p>
                <div className="space-y-1.5">
                  {parsedFiles.map((pf) => (
                    <div
                      key={pf.file.name}
                      className="flex items-center gap-3 rounded-lg border bg-card p-2.5 group"
                    >
                      <FileSpreadsheet
                        className={`h-4 w-4 shrink-0 ${
                          pf.error
                            ? "text-destructive"
                            : "text-emerald-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {pf.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pf.error ? (
                            <span className="text-destructive">{pf.error}</span>
                          ) : (
                            <>
                              {pf.bookings.length} booking
                              {pf.bookings.length !== 1 ? "s" : ""} •{" "}
                              {(pf.file.size / 1024).toFixed(1)} KB
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(pf.file.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {totalBookings > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Total: {totalBookings} bookings from {validFiles.length} file
                        {validFiles.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Sample Preview */}
                    <div className="space-y-0.5">
                      {validFiles
                        .flatMap((p) => p.bookings)
                        .slice(0, 4)
                        .map((b, i) => (
                          <p
                            key={i}
                            className="text-xs text-muted-foreground font-mono truncate"
                          >
                            {b.bookingRef} — {b.customerName}
                          </p>
                        ))}
                      {totalBookings > 4 && (
                        <p className="text-xs text-muted-foreground">
                          …and {totalBookings - 4} more
                        </p>
                      )}
                    </div>

                    {/* Merge Mode Toggle */}
                    {bookings.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
                        <div>
                          <Label htmlFor="merge-mode" className="text-xs font-medium cursor-pointer">
                            Merge with existing data
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            {mergeMode
                              ? "New bookings will be added, duplicates will be skipped"
                              : "All existing data will be replaced"}
                          </p>
                        </div>
                        <Switch
                          id="merge-mode"
                          checked={mergeMode}
                          onCheckedChange={setMergeMode}
                        />
                      </div>
                    )}

                    {/* Check In All Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
                      <div>
                        <Label htmlFor="check-in-all" className="text-xs font-medium cursor-pointer">
                          Mark all as Checked-In
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Useful for importing returns already on the lot
                        </p>
                      </div>
                      <Switch
                        id="check-in-all"
                        checked={checkInAll}
                        onCheckedChange={setCheckInAll}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleImport}
                disabled={totalBookings === 0 || importing}
                className="w-full gap-2"
              >
                {importing
                  ? "Importing…"
                  : `Import ${totalBookings} Booking${totalBookings !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

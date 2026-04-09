"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
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
  PlaneLanding,
  PlaneTakeoff,
} from "lucide-react";
import { startOfDay } from "date-fns";

interface ParsedFile {
  file: File;
  bookings: Booking[];
  departures: Booking[];  // entryDate >= today
  returns: Booking[];     // entryDate < today → already on lot
  error?: string;
}

// Auto-detect if a booking is a "return" (car already on lot)
// If entryDate < start of today, the customer has already dropped off — mark CHECKED_IN
function classifyBookings(bookings: Booking[]): { departures: Booking[]; returns: Booking[] } {
  const todayStart = startOfDay(new Date());
  const departures: Booking[] = [];
  const returns: Booking[] = [];

  for (const b of bookings) {
    const entryDate = new Date(b.entryDate);
    if (entryDate < todayStart) {
      // Car is already on the lot — auto check-in
      returns.push({
        ...b,
        status: BookingStatus.CHECKED_IN,
        statusHistory: [
          ...b.statusHistory,
          {
            from: b.status,
            to: BookingStatus.CHECKED_IN,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } else {
      departures.push(b);
    }
  }

  return { departures, returns };
}

export function CSVImportDialog() {
  const { hasPermission } = useAuth();
  const { importBookings, mergeImportBookings, clearAll, bookings } = useBookings();
  const [open, setOpen] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Permission gate
  if (!hasPermission("csv_import")) return null;

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
          const { departures, returns } = classifyBookings(parsed);

          setParsedFiles((prev) => {
            const exists = prev.find((p) => p.file.name === file.name);
            if (exists) return prev;
            return [
              ...prev,
              {
                file,
                bookings: parsed,
                departures,
                returns,
                error: parsed.length === 0 ? "No valid bookings found" : undefined,
              },
            ];
          });
        } catch {
          setParsedFiles((prev) => [
            ...prev,
            { file, bookings: [], departures: [], returns: [], error: "Failed to parse" },
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

  const totalBookings = parsedFiles.reduce((sum, p) => sum + p.bookings.length, 0);
  const totalDepartures = parsedFiles.reduce((sum, p) => sum + p.departures.length, 0);
  const totalReturns = parsedFiles.reduce((sum, p) => sum + p.returns.length, 0);
  const validFiles = parsedFiles.filter((p) => p.bookings.length > 0);

  const handleImport = useCallback(() => {
    if (validFiles.length === 0) return;
    setImporting(true);

    // Combine all bookings (returns already have CHECKED_IN status from classifyBookings)
    const allBookings = validFiles.flatMap((p) => [...p.departures, ...p.returns]);

    // Deduplicate by bookingRef
    const deduped = new Map<string, Booking>();
    for (const b of allBookings) {
      if (!deduped.has(b.bookingRef)) {
        deduped.set(b.bookingRef, b);
      }
    }
    const combined = Array.from(deduped.values());

    if (mergeMode) {
      mergeImportBookings(combined);
    } else {
      clearAll();
      importBookings(combined);
    }

    setImportedCount(combined.length);
    setDone(true);
    setImporting(false);
  }, [validFiles, mergeMode, mergeImportBookings, clearAll, importBookings]);

  const reset = () => {
    setParsedFiles([]);
    setError(null);
    setDone(false);
    setImporting(false);
    setMergeMode(false);
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
            Upload CSV files. Bookings with past entry dates are automatically detected as{" "}
            <span className="font-medium text-emerald-500">on-lot returns</span> and checked in.
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
            <div className="flex gap-4 text-xs text-muted-foreground">
              {totalDepartures > 0 && (
                <span className="flex items-center gap-1">
                  <PlaneTakeoff className="h-3 w-3 text-primary" />
                  {totalDepartures} departures
                </span>
              )}
              {totalReturns > 0 && (
                <span className="flex items-center gap-1">
                  <PlaneLanding className="h-3 w-3 text-emerald-500" />
                  {totalReturns} auto checked-in
                </span>
              )}
            </div>
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
                <p className="text-sm font-medium">Drop CSV files here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports multiple files</p>
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
                    <div key={pf.file.name} className="rounded-lg border bg-card p-2.5 group">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet
                          className={`h-4 w-4 shrink-0 ${pf.error ? "text-destructive" : "text-emerald-500"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pf.file.name}</p>
                          {pf.error ? (
                            <p className="text-xs text-destructive">{pf.error}</p>
                          ) : (
                            <div className="flex items-center gap-3 mt-1">
                              {pf.departures.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                  <PlaneTakeoff className="h-2.5 w-2.5" />
                                  {pf.departures.length} departing today
                                </span>
                              )}
                              {pf.returns.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                  <PlaneLanding className="h-2.5 w-2.5" />
                                  {pf.returns.length} on lot → auto check-in
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(pf.file.name); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {totalBookings > 0 && (
                  <div className="rounded-xl bg-muted/40 border border-border/40 p-3 space-y-3">
                    {/* Split summary */}
                    <div className="grid grid-cols-2 gap-2">
                      {totalDepartures > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                          <PlaneTakeoff className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-primary">{totalDepartures}</p>
                            <p className="text-[10px] text-muted-foreground">Departing today</p>
                          </div>
                        </div>
                      )}
                      {totalReturns > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <PlaneLanding className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-600">{totalReturns}</p>
                            <p className="text-[10px] text-muted-foreground">On lot (auto check-in)</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sample preview */}
                    <div className="space-y-0.5">
                      {validFiles.flatMap((p) => p.bookings).slice(0, 3).map((b, i) => (
                        <p key={i} className="text-xs text-muted-foreground font-mono truncate">
                          {b.bookingRef} — {b.customerName}
                        </p>
                      ))}
                      {totalBookings > 3 && (
                        <p className="text-xs text-muted-foreground">…and {totalBookings - 3} more</p>
                      )}
                    </div>

                    {/* Merge toggle */}
                    {bookings.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div>
                          <Label htmlFor="merge-mode" className="text-xs font-medium cursor-pointer">
                            Merge with existing data
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            {mergeMode
                              ? "New bookings added, duplicates skipped"
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

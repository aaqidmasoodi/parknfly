import { Booking, BookingStatus, Vehicle } from "./types";

/**
 * Parse the messy Park & Fly CSV export into clean Booking objects.
 * 
 * The CSV has:
 * - Multiline fields (customer name + phone, vehicle details)
 * - Embedded HTML in the last 2 columns (Show, Action)
 * - Inconsistent date formats
 * - Missing data in some fields
 */
export function parseCSV(csvText: string): Booking[] {
  // The CSV is extremely messy with multiline fields and embedded HTML.
  // We'll use a custom approach: parse it field by field respecting quoted fields.
  const records = parseCSVRecords(csvText);
  
  // Skip header row
  const dataRows = records.slice(1);
  
  return dataRows
    .map((row, index) => parseRow(row, index))
    .filter((b): b is Booking => b !== null);
}

function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // Check if it's an escaped quote
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        currentRecord.push(currentField.trim());
        currentField = "";
        i++;
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        currentRecord.push(currentField.trim());
        currentField = "";
        if (currentRecord.length > 3) {
          // Only add records that have enough fields (skip empty lines)
          records.push(currentRecord);
        }
        currentRecord = [];
        i += char === "\r" ? 2 : 1;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/record
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.length > 3) {
      records.push(currentRecord);
    }
  }

  return records;
}

function parseRow(fields: string[], index: number): Booking | null {
  try {
    // Fields: Product Code, Booking Ref, Customer, Entry Date Time, Return Date Time,
    //         Vehicle Make/Reg, Product Type, Passenger, Airport and Terminal,
    //         In Flight Number, Out Flight Number, Price, Under Price, Show, Action
    if (fields.length < 12) return null;

    const productCode = cleanText(fields[0]);
    const bookingRef = cleanText(fields[1]);
    
    if (!bookingRef || bookingRef === "Booking Ref" || bookingRef === "Bookings") return null;

    // Parse customer (name + phone on separate lines)
    const { name, phone } = parseCustomer(fields[2]);

    // Parse dates
    const entryDate = parseDateTime(fields[3]);
    const returnDate = parseDateTime(fields[4]);

    // Parse vehicle (make, model, colour, reg on separate lines)
    const vehicle = parseVehicle(fields[5]);

    const productType = cleanText(fields[6]) || "PR";
    const passengers = parseInt(fields[7]) || 0;
    const terminal = cleanText(fields[8]) || "";
    const inFlightNumber = cleanText(fields[9]) || "";
    const outFlightNumber = cleanText(fields[10]) || "";
    const price = parseFloat(fields[11]) || 0;

    return {
      id: `booking-${index}-${bookingRef.replace(/\s/g, "")}`,
      productCode,
      bookingRef,
      customerName: name,
      customerPhone: phone,
      entryDate: entryDate || new Date().toISOString(),
      returnDate: returnDate || new Date().toISOString(),
      vehicle,
      productType,
      passengers,
      terminal,
      inFlightNumber,
      outFlightNumber,
      price,
      status: BookingStatus.BOOKED,
      statusHistory: [],
    };
  } catch {
    console.warn(`Failed to parse row ${index}`, fields);
    return null;
  }
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "") // Strip HTML
    .replace(/\s+/g, " ")    // Collapse whitespace
    .trim();
}

function parseCustomer(raw: string): { name: string; phone: string } {
  if (!raw) return { name: "", phone: "" };
  
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  
  if (lines.length >= 2) {
    return { name: lines[0], phone: lines[1] };
  }
  if (lines.length === 1) {
    // Check if it contains a phone number pattern
    const phoneMatch = lines[0].match(/([\d+\s-]{8,})/);
    if (phoneMatch) {
      const phone = phoneMatch[1].trim();
      const name = lines[0].replace(phone, "").trim();
      return { name: name || lines[0], phone };
    }
    return { name: lines[0], phone: "" };
  }
  return { name: "", phone: "" };
}

function parseDateTime(raw: string): string | null {
  if (!raw) return null;
  
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  
  let dateStr = lines[0] || "";
  let timeStr = lines[1] || "00:00:00";

  // Parse date like "23-Mar-2026"
  const dateMatch = dateStr.match(/(\d{1,2})-([A-Za-z]+)-(\d{4})/);
  if (!dateMatch) return null;

  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const day = parseInt(dateMatch[1]);
  const month = months[dateMatch[2]];
  const year = parseInt(dateMatch[3]);

  if (month === undefined) return null;

  // Parse time like "03:00:00"
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  const hours = timeMatch ? parseInt(timeMatch[1]) : 0;
  const minutes = timeMatch ? parseInt(timeMatch[2]) : 0;

  const date = new Date(year, month, day, hours, minutes);
  return date.toISOString();
}

function parseVehicle(raw: string): Vehicle {
  if (!raw) return { make: "", model: "", colour: "", reg: "" };

  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  // The format is: Make, Model, Colour, Reg (one per line)
  return {
    make: lines[0] || "",
    model: lines[1] || "",
    colour: lines[2] || "",
    reg: lines[3] || lines[0] || "", // Sometimes only reg is present
  };
}

/**
 * Merge incoming bookings with existing ones.
 * Deduplicates by bookingRef — if a booking already exists, keep the one
 * with more filled-in data (or prefer the existing one if equal).
 */
export function mergeBookings(existing: Booking[], incoming: Booking[]): Booking[] {
  const map = new Map<string, Booking>();

  // Add existing bookings first
  for (const b of existing) {
    map.set(b.bookingRef, b);
  }

  // Merge incoming — only overwrite if the new record has more data
  for (const b of incoming) {
    const ex = map.get(b.bookingRef);
    if (!ex) {
      // Brand new booking
      map.set(b.bookingRef, b);
    } else {
      // Already exists — keep existing (preserves status changes, parking spot, etc.)
      // but we could update missing fields
      map.set(b.bookingRef, {
        ...ex,
        // Fill in any fields that were empty in the existing record
        terminal: ex.terminal || b.terminal,
        inFlightNumber: ex.inFlightNumber || b.inFlightNumber,
        outFlightNumber: ex.outFlightNumber || b.outFlightNumber,
        vehicle: {
          make: ex.vehicle.make || b.vehicle.make,
          model: ex.vehicle.model || b.vehicle.model,
          colour: ex.vehicle.colour || b.vehicle.colour,
          reg: ex.vehicle.reg || b.vehicle.reg,
        },
      });
    }
  }

  return Array.from(map.values());
}


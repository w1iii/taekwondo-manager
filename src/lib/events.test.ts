import { describe, expect, it } from "vitest";

import {
  parseEventFormData,
  formatPesos,
  formatDate,
  isEventUpcoming,
  isRegistrationOpen,
  DEFAULT_ENTRY_FEE_PESOS,
  MAX_EVENT_IMAGE_BYTES,
} from "@/lib/events";

function form(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const VALID = {
  name: "Region VI Open",
  description: "",
  location: "Bacolod Convention Center",
  image: "",
  eventDate: "2026-12-01",
  registrationDeadline: "2026-11-01T23:59",
  entryFeePesos: "600",
};

describe("parseEventFormData", () => {
  it("accepts a valid form", () => {
    const parsed = parseEventFormData(form(VALID));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe(VALID.name);
      expect(parsed.data.entryFeePesos).toBe(600);
      expect(parsed.data.eventDate.getFullYear()).toBe(2026);
    }
  });

  it("defaults the entry fee when blank", () => {
    const parsed = parseEventFormData(form({ ...VALID, entryFeePesos: "" }));
    if (parsed.ok) expect(parsed.data.entryFeePesos).toBe(DEFAULT_ENTRY_FEE_PESOS);
  });

  it("rejects a blank name", () => {
    expect(parseEventFormData(form({ ...VALID, name: "" })).ok).toBe(false);
  });

  it("rejects a blank location", () => {
    expect(parseEventFormData(form({ ...VALID, location: " " })).ok).toBe(false);
  });

  it("rejects an invalid event date", () => {
    expect(parseEventFormData(form({ ...VALID, eventDate: "not-a-date" })).ok).toBe(false);
  });

  it("rejects an invalid registration deadline", () => {
    expect(parseEventFormData(form({ ...VALID, registrationDeadline: "" })).ok).toBe(false);
  });

  it("rejects a deadline after the event date", () => {
    expect(
      parseEventFormData(
        form({
          ...VALID,
          eventDate: "2026-01-01",
          registrationDeadline: "2026-06-01T23:59",
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a negative entry fee", () => {
    expect(parseEventFormData(form({ ...VALID, entryFeePesos: "-5" })).ok).toBe(false);
  });

  it("rejects a fractional entry fee", () => {
    expect(parseEventFormData(form({ ...VALID, entryFeePesos: "10.5" })).ok).toBe(false);
  });

  it("treats an empty description as null", () => {
    const parsed = parseEventFormData(form({ ...VALID, description: "" }));
    if (parsed.ok) expect(parsed.data.description).toBeNull();
  });
});

describe("formatPesos", () => {
  it("formats amounts with the peso sign", () => {
    expect(formatPesos(500)).toMatch(/₱/);
    expect(formatPesos(1200)).toMatch(/1,200/);
  });
});

describe("formatDate", () => {
  it("returns a non-empty date string", () => {
    expect(formatDate(new Date("2026-12-01"))).toBeTruthy();
  });
});

describe("isEventUpcoming", () => {
  it("compares against the current time", () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect(isEventUpcoming(future)).toBe(true);
    expect(isEventUpcoming(past)).toBe(false);
  });
});

describe("isRegistrationOpen", () => {
  it("compares the deadline to now", () => {
    const open = new Date(Date.now() + 86_400_000);
    const closed = new Date(Date.now() - 86_400_000);
    expect(isRegistrationOpen(open)).toBe(true);
    expect(isRegistrationOpen(closed)).toBe(false);
  });
});

describe("MAX_EVENT_IMAGE_BYTES", () => {
  it("stays under the server action body size limit", () => {
    // Must remain < 16 MiB (serverActions.bodySizeLimit) minus multipart overhead.
    expect(MAX_EVENT_IMAGE_BYTES).toBeLessThan(16 * 1024 * 1024);
    expect(MAX_EVENT_IMAGE_BYTES).toBe(15 * 1024 * 1024);
  });
});

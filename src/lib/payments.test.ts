import { describe, expect, it } from "vitest";

import {
  parsePaymentFormData,
  proofStatusLabel,
  proofStatusVariant,
  receiptNumber,
  MAX_PROOF_BYTES,
} from "@/lib/payments";

function file(name = "proof.png", size = 1024, type = "image/png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("parsePaymentFormData", () => {
  it("accepts a valid reference and proof", () => {
    const form = new FormData();
    form.set("referenceNo", "4412 9912");
    form.set("proof", file());
    const parsed = parsePaymentFormData(form);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.referenceNo).toBe("4412 9912");
    }
  });

  it("rejects a missing reference", () => {
    const form = new FormData();
    form.set("proof", file());
    const parsed = parsePaymentFormData(form);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/reference/i);
  });

  it("rejects a reference that is too short", () => {
    const form = new FormData();
    form.set("referenceNo", "123");
    form.set("proof", file());
    expect(parsePaymentFormData(form).ok).toBe(false);
  });

  it("rejects a reference that is too long", () => {
    const form = new FormData();
    form.set("referenceNo", "x".repeat(61));
    form.set("proof", file());
    expect(parsePaymentFormData(form).ok).toBe(false);
  });

  it("trims surrounding whitespace from the reference", () => {
    const form = new FormData();
    form.set("referenceNo", "  4412 9912  ");
    form.set("proof", file());
    const parsed = parsePaymentFormData(form);
    if (parsed.ok) expect(parsed.data.referenceNo).toBe("4412 9912");
  });

  it("rejects a missing proof", () => {
    const form = new FormData();
    form.set("referenceNo", "4412 9912");
    const parsed = parsePaymentFormData(form);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/screenshot/i);
  });

  it("rejects a non-image proof", () => {
    const form = new FormData();
    form.set("referenceNo", "4412 9912");
    form.set("proof", file("receipt.txt", 100, "text/plain"));
    expect(parsePaymentFormData(form).ok).toBe(false);
  });

  it("rejects an oversized proof", () => {
    const form = new FormData();
    form.set("referenceNo", "4412 9912");
    form.set("proof", file("big.png", MAX_PROOF_BYTES + 1));
    const parsed = parsePaymentFormData(form);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/MB/);
  });
});

describe("proofStatusLabel", () => {
  it("maps statuses to readable labels", () => {
    expect(proofStatusLabel("APPROVED")).toBe("Approved");
    expect(proofStatusLabel("REJECTED")).toBe("Rejected");
    expect(proofStatusLabel("PENDING")).toBe("Pending review");
  });
});

describe("proofStatusVariant", () => {
  it("maps statuses to badge variants", () => {
    expect(proofStatusVariant("APPROVED")).toBe("default");
    expect(proofStatusVariant("PENDING")).toBe("secondary");
    expect(proofStatusVariant("REJECTED")).toBe("destructive");
  });
});

describe("receiptNumber", () => {
  it("builds a stable uppercase receipt id", () => {
    expect(receiptNumber("abc123def")).toBe("RCPT-ABC123DE");
  });
});

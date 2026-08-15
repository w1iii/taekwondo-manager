import { describe, expect, it } from "vitest";

import {
  parseAthleteFormData,
  genderLabel,
  beltLabel,
  GENDER_OPTIONS,
  BELT_OPTIONS,
} from "@/lib/athletes";

function form(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const VALID = {
  name: "Juan Dela Cruz",
  gender: "MALE",
  birthYear: "2011",
  weightKg: "40",
  beltType: "BLUE",
};

describe("parseAthleteFormData", () => {
  it("accepts a valid form", () => {
    const parsed = parseAthleteFormData(form(VALID));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe(VALID.name);
      expect(parsed.data.birthYear).toBe(2011);
      expect(parsed.data.weightKg).toBe(40);
      expect(parsed.data.beltType).toBe("BLUE");
    }
  });

  it("treats an empty belt as no belt", () => {
    const parsed = parseAthleteFormData(form({ ...VALID, beltType: "" }));
    if (parsed.ok) expect(parsed.data.beltType).toBeNull();
  });

  it("defaults an empty weight to zero", () => {
    const parsed = parseAthleteFormData(form({ ...VALID, weightKg: "" }));
    if (parsed.ok) expect(parsed.data.weightKg).toBe(0);
  });

  it("rejects a short name", () => {
    expect(parseAthleteFormData(form({ ...VALID, name: "J" })).ok).toBe(false);
  });

  it("rejects an invalid gender", () => {
    expect(parseAthleteFormData(form({ ...VALID, gender: "OTHER" })).ok).toBe(false);
  });

  it("rejects a birth year in the past before 1950", () => {
    expect(parseAthleteFormData(form({ ...VALID, birthYear: "1900" })).ok).toBe(false);
  });

  it("rejects a birth year in the future", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    expect(parseAthleteFormData(form({ ...VALID, birthYear: nextYear })).ok).toBe(false);
  });

  it("rejects a non-integer birth year", () => {
    expect(parseAthleteFormData(form({ ...VALID, birthYear: "2011.5" })).ok).toBe(false);
  });

  it("rejects weight outside 0–200", () => {
    expect(parseAthleteFormData(form({ ...VALID, weightKg: "250" })).ok).toBe(false);
    expect(parseAthleteFormData(form({ ...VALID, weightKg: "-1" })).ok).toBe(false);
  });

  it("rejects an unknown belt rank", () => {
    expect(parseAthleteFormData(form({ ...VALID, beltType: "RAINBOW" })).ok).toBe(false);
  });

  it("trims the name", () => {
    const parsed = parseAthleteFormData(form({ ...VALID, name: "  Juan Dela Cruz  " }));
    if (parsed.ok) expect(parsed.data.name).toBe("Juan Dela Cruz");
  });
});

describe("genderLabel", () => {
  it("maps genders to labels", () => {
    expect(genderLabel("MALE")).toBe("Male");
    expect(genderLabel("FEMALE")).toBe("Female");
  });
});

describe("beltLabel", () => {
  it("maps belts to labels", () => {
    expect(beltLabel("BLACK")).toBe("Black");
    expect(beltLabel("WHITE")).toBe("White");
  });

  it("handles missing belts", () => {
    expect(beltLabel(null)).toBe("No belt");
    expect(beltLabel(undefined)).toBe("No belt");
  });

  it("falls back to the raw value for unknown belts", () => {
    expect(beltLabel("RAINBOW")).toBe("RAINBOW");
  });
});

describe("option lists", () => {
  it("exposes both genders", () => {
    expect(GENDER_OPTIONS.map((g) => g.value)).toEqual(["MALE", "FEMALE"]);
  });

  it("exposes all belt ranks", () => {
    expect(BELT_OPTIONS.map((b) => b.value)).toEqual([
      "WHITE",
      "YELLOW",
      "GREEN",
      "BLUE",
      "RED",
      "BLACK",
    ]);
  });
});

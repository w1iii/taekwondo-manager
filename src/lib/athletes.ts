export type Gender = "MALE" | "FEMALE";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export function genderLabel(gender: Gender): string {
  return gender === "MALE" ? "Male" : "Female";
}

export type Belt = "WHITE" | "YELLOW" | "GREEN" | "BLUE" | "RED" | "BLACK";

export const BELT_OPTIONS: { value: Belt; label: string }[] = [
  { value: "WHITE", label: "White" },
  { value: "YELLOW", label: "Yellow" },
  { value: "GREEN", label: "Green" },
  { value: "BLUE", label: "Blue" },
  { value: "RED", label: "Red" },
  { value: "BLACK", label: "Black" },
];

export function beltLabel(belt: string | null | undefined): string {
  if (!belt) return "No belt";
  return BELT_OPTIONS.find((b) => b.value === belt)?.label ?? belt;
}

export type AthleteFormData = {
  name: string;
  gender: Gender;
  birthYear: number;
  weightKg: number;
  beltType: Belt | null;
};

export type AthleteFormState = { ok: true } | { ok: false; error: string };

export type ParsedAthleteForm =
  | { ok: true; data: AthleteFormData }
  | { ok: false; error: string };

export function parseAthleteFormData(formData: FormData): ParsedAthleteForm {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const genderRaw = (formData.get("gender") as string | null) ?? "";
  const birthYearRaw = (formData.get("birthYear") as string | null) ?? "";
  const weightRaw = (formData.get("weightKg") as string | null) ?? "";
  const beltRaw = (formData.get("beltType") as string | null) ?? "";

  if (name.length < 2) {
    return { ok: false, error: "Enter the athlete's full name." };
  }
  if (genderRaw !== "MALE" && genderRaw !== "FEMALE") {
    return { ok: false, error: "Pick a gender." };
  }

  const birthYear = Number(birthYearRaw);
  const currentYear = new Date().getFullYear();
  if (
    !Number.isInteger(birthYear) ||
    birthYear < 1950 ||
    birthYear > currentYear
  ) {
    return { ok: false, error: "Birth year must be a year between 1950 and now." };
  }

  const weightKg = weightRaw === "" ? 0 : Number(weightRaw);
  if (!Number.isInteger(weightKg) || weightKg < 0 || weightKg > 200) {
    return { ok: false, error: "Weight must be 0–200 kg." };
  }

  let beltType: Belt | null = null;
  if (beltRaw !== "") {
    if (!BELT_OPTIONS.some((b) => b.value === beltRaw)) {
      return { ok: false, error: "Pick a valid belt rank." };
    }
    beltType = beltRaw as Belt;
  }

  return {
    ok: true,
    data: { name, gender: genderRaw, birthYear, weightKg, beltType },
  };
}

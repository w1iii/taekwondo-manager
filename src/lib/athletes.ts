export type Gender = "MALE" | "FEMALE";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export function genderLabel(gender: Gender): string {
  return gender === "MALE" ? "Male" : "Female";
}

export type AthleteFormData = {
  name: string;
  gender: Gender;
  birthYear: number;
  weightKg: number;
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

  return {
    ok: true,
    data: { name, gender: genderRaw, birthYear, weightKg },
  };
}

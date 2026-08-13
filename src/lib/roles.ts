export const ROLES = ["coach", "organizer"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "coach";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleHome(role: Role): string {
  return role === "organizer" ? "/admin" : "/dashboard";
}
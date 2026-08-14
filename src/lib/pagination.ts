export const PAGE_SIZE = 25;

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, totalPages: number): number {
  return Math.min(page, Math.max(1, totalPages));
}

export function toSearchParams(
  obj: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

export function pageHref(
  obj: Record<string, string | string[] | undefined>,
  key: string,
  page: number,
): string {
  const params = toSearchParams(obj);
  if (page <= 1) params.delete(key);
  else params.set(key, String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

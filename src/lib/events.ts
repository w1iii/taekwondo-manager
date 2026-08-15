export const DEFAULT_ENTRY_FEE_PESOS = 500;

// Must stay <= Next.js serverActions.bodySizeLimit (16 mb) minus multipart overhead.
export const MAX_EVENT_IMAGE_BYTES = 15 * 1024 * 1024;

export function formatPesos(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  }).format(new Date(date));
}

export function formatDeadline(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function isEventUpcoming(date: Date | string | number): boolean {
  return new Date(date).getTime() >= Date.now();
}

export function isRegistrationOpen(deadline: Date | string | number): boolean {
  return new Date().getTime() <= new Date(deadline).getTime();
}

export function dateInputValue(date: Date | string | number): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function datetimeLocalInputValue(date: Date | string | number): string {
  const d = new Date(date);
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export type EventFormData = {
  name: string;
  description: string | null;
  location: string;
  imageUrl: string | null;
  eventDate: Date;
  registrationDeadline: Date;
  entryFeePesos: number;
};

export type EventFormState = { ok: true } | { ok: false; error: string };

export type ParsedEventForm =
  | { ok: true; data: EventFormData }
  | { ok: false; error: string };

export function parseEventFormData(formData: FormData): ParsedEventForm {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const eventDateRaw = (formData.get("eventDate") as string | null) ?? "";
  const deadlineRaw = (formData.get("registrationDeadline") as string | null) ?? "";
  const feeRaw = (formData.get("entryFeePesos") as string | null) ?? "";

  if (name.length < 2) {
    return { ok: false, error: "Enter an event name." };
  }
  if (location.length < 2) {
    return { ok: false, error: "Enter the event location." };
  }

  const eventDate = new Date(`${eventDateRaw}T00:00:00.000Z`);
  const registrationDeadline = new Date(deadlineRaw);
  if (Number.isNaN(eventDate.getTime())) {
    return { ok: false, error: "Pick a date for the event." };
  }
  if (Number.isNaN(registrationDeadline.getTime())) {
    return { ok: false, error: "Pick a registration deadline." };
  }
  if (registrationDeadline.getTime() > eventDate.getTime()) {
    return { ok: false, error: "Registration must close before the event date." };
  }

  const entryFeePesos = feeRaw === "" ? DEFAULT_ENTRY_FEE_PESOS : Number(feeRaw);
  if (!Number.isInteger(entryFeePesos) || entryFeePesos < 0) {
    return { ok: false, error: "Entry fee must be a whole number of pesos (0 or more)." };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      location,
      imageUrl: null,
      eventDate,
      registrationDeadline,
      entryFeePesos,
    },
  };
}

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { TZDate, tz } from "@date-fns/tz";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export function orgNow(): Date {
  return new Date();
}

export function toZonedParts(date: Date, timezone = DEFAULT_TIMEZONE) {
  const zoned = tz(timezone);
  return {
    date: format(date, "yyyy-MM-dd", { in: zoned }),
    time: format(date, "HH:mm", { in: zoned }),
    dateTime: format(date, "yyyy-MM-dd HH:mm", { in: zoned }),
  };
}

export function combineLocalDateTime(
  date: string,
  time: string | null | undefined,
  timezone = DEFAULT_TIMEZONE,
): Date {
  const safeTime = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  return new TZDate(`${date}T${safeTime}:00`, timezone);
}

export function formatDate(
  value: string | Date | null | undefined,
  timezone = DEFAULT_TIMEZONE,
  pattern = "d MMM yyyy",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, pattern, { in: tz(timezone) });
}

export function formatDateTime(
  value: string | Date | null | undefined,
  timezone = DEFAULT_TIMEZONE,
): string {
  return formatDate(value, timezone, "d MMM yyyy, HH:mm");
}

export function addDaysIso(date: string | Date, days: number): string {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return format(addDays(parsed, days), "yyyy-MM-dd");
}

export function daysUntil(target: string | Date, from: Date = new Date()): number {
  const parsed = typeof target === "string" ? parseISO(target) : target;
  return differenceInCalendarDays(parsed, from);
}

export function daysOverdue(dueDate: string | Date, from: Date = new Date()): number {
  const overdue = -daysUntil(dueDate, from);
  return overdue > 0 ? overdue : 0;
}

export function calculateDueDate(
  issueDate: string | Date,
  paymentTermsDays: number,
  options?: { startFrom?: string | Date | null },
): string {
  const start = options?.startFrom ?? issueDate;
  const parsed = typeof start === "string" ? parseISO(start) : start;
  const days = Number.isFinite(paymentTermsDays) ? Math.max(0, Math.trunc(paymentTermsDays)) : 0;
  return format(addDays(parsed, days), "yyyy-MM-dd");
}

export function ageingBucket(daysOutstanding: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (daysOutstanding <= 30) return "0-30";
  if (daysOutstanding <= 60) return "31-60";
  if (daysOutstanding <= 90) return "61-90";
  return "90+";
}

export function expiryStatus(
  expiryDate: string | Date | null | undefined,
  warningDays = 30,
  from: Date = new Date(),
): "missing" | "valid" | "expiring_soon" | "expired" {
  if (!expiryDate) return "missing";
  const remaining = daysUntil(expiryDate, from);
  if (remaining < 0) return "expired";
  if (remaining <= warningDays) return "expiring_soon";
  return "valid";
}

export function shouldRemind(
  expiryDate: string | Date,
  reminderDays: number[],
  from: Date = new Date(),
): number | null {
  const remaining = daysUntil(expiryDate, from);
  return reminderDays.includes(remaining) ? remaining : null;
}

export function isoDate(value: Date = new Date()): string {
  return format(value, "yyyy-MM-dd");
}

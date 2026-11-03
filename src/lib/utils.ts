export const DAY_MS = 24 * 60 * 60 * 1000;

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => ARABIC_DIGITS[Number(digit)]);
}

export function formatArabicNumber(value: number): string {
  return toArabicDigits(value.toLocaleString("en-US"));
}

export function startOfDay(value: Date | string | number = new Date()): Date {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDaysFromToday(days: number, base: Date | string | number = new Date()): string {
  const date = startOfDay(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

export function localDateKey(value: Date | string | number = new Date()): string {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameLocalDay(
  first: Date | string | number,
  second: Date | string | number = new Date(),
): boolean {
  return localDateKey(first) === localDateKey(second);
}

export function formatLongDate(value: Date | string | number = new Date()): string {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: Date | string | number): string {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function formatDayCount(days: number): string {
  if (days <= 0) return "اليوم";
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days <= 10) return `${toArabicDigits(days)} أيام`;
  return `${toArabicDigits(days)} يوماً`;
}

export function formatInterval(days: number): string {
  if (days <= 0) return "اليوم";
  if (days === 1) return "غداً";
  if (days === 2) return "بعد يومين";
  if (days <= 10) return `بعد ${toArabicDigits(days)} أيام`;
  return `بعد ${toArabicDigits(days)} يوماً`;
}

export function formatDueLabel(value: string, now: Date = new Date()): string {
  const target = startOfDay(value);
  const today = startOfDay(now);
  const difference = Math.round((target.getTime() - today.getTime()) / DAY_MS);

  if (difference < 0) {
    const overdue = Math.abs(difference);
    if (overdue === 1) return "متأخرة يوماً واحداً";
    if (overdue === 2) return "متأخرة يومين";
    if (overdue <= 10) return `متأخرة ${toArabicDigits(overdue)} أيام`;
    return `متأخرة ${toArabicDigits(overdue)} يوماً`;
  }

  if (difference === 0) return "مستحقة اليوم";
  if (difference === 1) return "غداً";
  if (difference === 2) return "بعد يومين";
  if (difference <= 10) return `بعد ${toArabicDigits(difference)} أيام`;
  return `بعد ${toArabicDigits(difference)} يوماً`;
}

export function daysFromToday(value: string, now: Date = new Date()): number {
  const target = startOfDay(value);
  const today = startOfDay(now);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export function normalizeArabic(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `unit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

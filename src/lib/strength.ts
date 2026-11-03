import type { StrengthLevel, UnitCategory } from "./types";
import { clamp } from "./utils";

export interface StrengthProfile {
  value: StrengthLevel;
  label: string;
  description: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  badgeClass: string;
  softClass: string;
  dotClass: string;
  barClass: string;
  textClass: string;
  score: number;
}

export const strengthLevels: StrengthLevel[] = ["weak", "medium", "good", "strong"];

/**
 * المعايير الأولية لكل درجة حفظ.
 * هذه القيم تُغذّي خوارزمية SM-2 مباشرة عند إضافة ورد محفوظ مسبقاً، وعند
 * تغيير درجة الحفظ يدوياً من سجل المحفوظات.
 */
export const strengthProfiles: Record<StrengthLevel, StrengthProfile> = {
  weak: {
    value: "weak",
    label: "ضعيف",
    description: "يحتاج تثبيتاً عاجلاً",
    interval: 1,
    easeFactor: 1.7,
    repetitions: 1,
    badgeClass: "bg-red-500 text-white",
    softClass: "border-red-200 bg-red-50 text-red-700",
    dotClass: "bg-red-500",
    barClass: "bg-red-500",
    textClass: "text-red-700",
    score: 25,
  },
  medium: {
    value: "medium",
    label: "متوسط",
    description: "شبه ثابت مع أخطاء متفرقة",
    interval: 3,
    easeFactor: 2.1,
    repetitions: 2,
    badgeClass: "bg-amber-500 text-white",
    softClass: "border-amber-200 bg-amber-50 text-amber-700",
    dotClass: "bg-amber-500",
    barClass: "bg-amber-500",
    textClass: "text-amber-700",
    score: 52,
  },
  good: {
    value: "good",
    label: "جيد",
    description: "حفظ متين يستمر بمراجعة منتظمة",
    interval: 7,
    easeFactor: 2.5,
    repetitions: 3,
    badgeClass: "bg-blue-500 text-white",
    softClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-500",
    barClass: "bg-blue-500",
    textClass: "text-blue-700",
    score: 78,
  },
  strong: {
    value: "strong",
    label: "قوي",
    description: "حفظ متقن وراسخ",
    interval: 14,
    easeFactor: 2.8,
    repetitions: 4,
    badgeClass: "bg-emerald-500 text-white",
    softClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    score: 95,
  },
};

export const strengthPriority: Record<StrengthLevel, number> = {
  weak: 0,
  medium: 1,
  good: 2,
  strong: 3,
};

export function isStrengthLevel(value: unknown): value is StrengthLevel {
  return typeof value === "string" && strengthLevels.includes(value as StrengthLevel);
}

export function categoryForStrength(strength: StrengthLevel): UnitCategory {
  return strength === "weak" || strength === "medium" ? "weak" : "new";
}

export function deriveStrengthFromSchedule(
  easeFactor: number,
  repetitions: number,
  lastQuality?: number,
): StrengthLevel {
  if (lastQuality === 1) return "weak";
  if (easeFactor < 1.9 || repetitions <= 1) return "weak";
  if (easeFactor < 2.35 || repetitions <= 2) return "medium";
  if (easeFactor < 2.65 || repetitions <= 3) return "good";
  return "strong";
}

export function inferStrengthFromLegacy(input: {
  strength?: unknown;
  category?: UnitCategory;
  easeFactor?: unknown;
  repetitions?: unknown;
  lastQuality?: number;
}): StrengthLevel {
  if (isStrengthLevel(input.strength)) return input.strength;

  const easeFactor = typeof input.easeFactor === "number" ? input.easeFactor : 2.5;
  const repetitions = typeof input.repetitions === "number" ? input.repetitions : 0;

  if (input.category === "weak" || easeFactor < 1.9 || repetitions <= 1) return "weak";
  if (easeFactor < 2.35 || repetitions <= 2) return "medium";
  if (easeFactor < 2.65 || repetitions <= 3) return "good";
  return "strong";
}

export function getStrengthScore(strength: StrengthLevel): number {
  return clamp(strengthProfiles[strength].score, 0, 100);
}

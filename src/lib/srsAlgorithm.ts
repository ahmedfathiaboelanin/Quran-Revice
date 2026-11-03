import type { MemorizationUnit, NewUnitInput, ReviewQuality, StrengthLevel } from "./types";
import {
  categoryForStrength,
  deriveStrengthFromSchedule,
  getStrengthScore,
  strengthProfiles,
} from "./strength";
import { addDaysFromToday, clamp, createId } from "./utils";

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3;

export interface GradeSchedule {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
}

function roundEase(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * معادلة SuperMemo-2 لتحديث معامل السهولة.
 * الدرجات المستخدمة: 1 (نسيت)، 3 (صعب)، 4 (جيد)، 5 (متقن).
 */
export function calculateEaseFactor(easeFactor: number, quality: ReviewQuality): number {
  const distance = 5 - quality;
  const adjustment = 0.1 - distance * (0.08 + distance * 0.02);
  return roundEase(clamp(easeFactor + adjustment, MIN_EASE_FACTOR, MAX_EASE_FACTOR));
}

export function calculateNextSchedule(
  unit: Pick<MemorizationUnit, "interval" | "repetitions" | "easeFactor">,
  quality: ReviewQuality,
  now: Date = new Date(),
): GradeSchedule {
  const previousInterval = Math.max(0, unit.interval);
  const previousRepetitions = Math.max(0, unit.repetitions);
  const easeFactor = calculateEaseFactor(unit.easeFactor, quality);

  let interval: number;
  let repetitions: number;

  switch (quality) {
    case 1:
      interval = 1;
      repetitions = 0;
      break;

    case 3:
      repetitions = previousRepetitions + 1;
      if (previousRepetitions === 0) {
        interval = 1;
      } else if (previousRepetitions === 1) {
        interval = 3;
      } else {
        interval = Math.max(previousInterval + 1, Math.round(previousInterval * 1.2));
      }
      break;

    case 4:
      repetitions = previousRepetitions + 1;
      if (previousRepetitions === 0) {
        interval = 1;
      } else if (previousRepetitions === 1) {
        interval = 6;
      } else {
        interval = Math.max(previousInterval + 1, Math.round(previousInterval * unit.easeFactor));
      }
      break;

    case 5:
      repetitions = previousRepetitions + 1;
      if (previousRepetitions === 0) {
        interval = 3;
      } else if (previousRepetitions === 1) {
        interval = 8;
      } else {
        interval = Math.max(
          previousInterval + 2,
          Math.round(previousInterval * unit.easeFactor * 1.3),
        );
      }
      break;
  }

  return {
    interval: clamp(interval, 1, 3650),
    repetitions,
    easeFactor,
    nextReviewDate: addDaysFromToday(interval, now),
  };
}

export function previewInterval(
  unit: Pick<MemorizationUnit, "interval" | "repetitions" | "easeFactor">,
  quality: ReviewQuality,
): number {
  return calculateNextSchedule(unit, quality).interval;
}

export function applyGrade(
  unit: MemorizationUnit,
  quality: ReviewQuality,
  now: Date = new Date(),
): MemorizationUnit {
  const schedule = calculateNextSchedule(unit, quality, now);
  const strength = deriveStrengthFromSchedule(
    schedule.easeFactor,
    schedule.repetitions,
    quality,
  );

  return {
    ...unit,
    ...schedule,
    strength,
    category: categoryForStrength(strength),
    lastReviewed: now.toISOString(),
    reviewCount: unit.reviewCount + 1,
    lapseCount: unit.lapseCount + (quality === 1 ? 1 : 0),
    lastQuality: quality,
  };
}

export function createUnit(input: NewUnitInput, now: Date = new Date()): MemorizationUnit {
  const profile = strengthProfiles[input.strength];

  return {
    id: createId(),
    title: input.title,
    type: input.type,
    reference: input.reference,
    category: input.category ?? categoryForStrength(input.strength),
    strength: input.strength,
    pageCount: Math.max(1, Math.round(input.pageCount)),
    ayahCount: input.ayahCount,
    interval: profile.interval,
    repetitions: profile.repetitions,
    easeFactor: profile.easeFactor,
    nextReviewDate: addDaysFromToday(profile.interval, now),
    lastReviewed: null,
    createdAt: now.toISOString(),
    reviewCount: 0,
    lapseCount: 0,
  };
}

/**
 * تحديث درجة الحفظ يدوياً من سجل المحفوظات.
 * يعيد ضبط معايير SM-2 فوراً حتى يتغير موعد الاستحقاق تبعاً للدرجة الجديدة.
 */
export function updateUnitStrength(
  unit: MemorizationUnit,
  strength: StrengthLevel,
  now: Date = new Date(),
): MemorizationUnit {
  const profile = strengthProfiles[strength];

  return {
    ...unit,
    strength,
    category: categoryForStrength(strength),
    interval: profile.interval,
    repetitions: profile.repetitions,
    easeFactor: profile.easeFactor,
    nextReviewDate: addDaysFromToday(profile.interval, now),
  };
}

export function isDue(unit: MemorizationUnit, now: Date = new Date()): boolean {
  return new Date(unit.nextReviewDate).getTime() <= now.getTime();
}

export function getDueUnits(units: MemorizationUnit[], now: Date = new Date()): MemorizationUnit[] {
  return units
    .filter((unit) => isDue(unit, now))
    .sort(
      (first, second) =>
        new Date(first.nextReviewDate).getTime() - new Date(second.nextReviewDate).getTime(),
    );
}

export function isWeak(unit: MemorizationUnit): boolean {
  return unit.strength === "weak" || unit.strength === "medium";
}

export interface StrengthInfo {
  score: number;
  label: string;
  tone: "danger" | "warning" | "good" | "strong";
}

export function getStrength(unit: MemorizationUnit): StrengthInfo {
  const profile = strengthProfiles[unit.strength];
  const toneByStrength: Record<StrengthLevel, StrengthInfo["tone"]> = {
    weak: "danger",
    medium: "warning",
    good: "good",
    strong: "strong",
  };

  return {
    score: getStrengthScore(unit.strength),
    label: profile.label,
    tone: toneByStrength[unit.strength],
  };
}

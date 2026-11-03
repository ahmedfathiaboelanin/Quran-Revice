import { getDueUnits, isDue } from "./srsAlgorithm";
import { strengthPriority } from "./strength";
import type { MemorizationUnit, StrengthLevel, WirdCapacityMode, WirdSettings } from "./types";
import { clamp, isSameLocalDay, localDateKey } from "./utils";

export const DEFAULT_WIRD_SETTINGS: WirdSettings = {
  capacityMode: "pages",
  dailyPages: 5,
  dailyUnits: 3,
};

export interface DailyWirdPlan {
  date: string;
  mode: WirdCapacityMode;
  target: number;
  due: MemorizationUnit[];
  selected: MemorizationUnit[];
  deferred: MemorizationUnit[];
  pulledAhead: MemorizationUnit[];
  selectedPages: number;
  selectedUnits: number;
  duePages: number;
  remainingCapacity: number;
}

export interface GenerateDailyWirdOptions {
  includeUpcoming?: boolean;
}

export interface DailyWirdProgressInfo {
  mode: WirdCapacityMode;
  target: number;
  completed: number;
  remaining: number;
  percent: number;
  unitLabel: string;
}

export function unitPageCount(unit: MemorizationUnit): number {
  return Math.max(1, Math.round(unit.pageCount || 1));
}

export function normalizeWirdSettings(raw: unknown): WirdSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WIRD_SETTINGS };
  const value = raw as Record<string, unknown>;
  const mode = value.capacityMode === "units" ? "units" : "pages";
  const dailyPages = Math.round(Number(value.dailyPages));
  const dailyUnits = Math.round(Number(value.dailyUnits));

  return {
    capacityMode: mode,
    dailyPages: Number.isFinite(dailyPages) ? clamp(dailyPages, 1, 604) : DEFAULT_WIRD_SETTINGS.dailyPages,
    dailyUnits: Number.isFinite(dailyUnits) ? clamp(dailyUnits, 1, 114) : DEFAULT_WIRD_SETTINGS.dailyUnits,
  };
}

function capacityCost(unit: MemorizationUnit, mode: WirdCapacityMode): number {
  return mode === "pages" ? unitPageCount(unit) : 1;
}

function comparePriority(first: MemorizationUnit, second: MemorizationUnit): number {
  const strengthDifference = strengthPriority[first.strength] - strengthPriority[second.strength];
  if (strengthDifference !== 0) return strengthDifference;

  const dueDifference =
    new Date(first.nextReviewDate).getTime() - new Date(second.nextReviewDate).getTime();
  if (dueDifference !== 0) return dueDifference;

  return first.title.localeCompare(second.title, "ar");
}

function isUpcomingPullCandidate(unit: MemorizationUnit, now: Date): boolean {
  if (isDue(unit, now)) return false;
  if (unit.lastReviewed && isSameLocalDay(unit.lastReviewed, now)) return false;
  const strength: StrengthLevel = unit.strength;
  return strength === "weak" || strength === "medium";
}

/**
 * يبني ورد اليوم حسب سعة المستخدم وأولوية الحفظ:
 * ضعيف ← متوسط ← جيد ← قوي، مع تقديم الأقدم استحقاقاً داخل كل درجة.
 *
 * عند تضخم المستحق، تُرجع الدالة العناصر التي لم تدخل النصاب في `deferred`
 * ليتم تأجيلها إلى الغد بدلاً من إغراق المستخدم بها اليوم.
 */
export function generateDailyWird(
  units: MemorizationUnit[],
  settings: WirdSettings,
  now: Date = new Date(),
  options: GenerateDailyWirdOptions = {},
): DailyWirdPlan {
  const target = Math.max(
    1,
    Math.round(settings.capacityMode === "pages" ? settings.dailyPages : settings.dailyUnits),
  );
  const due = getDueUnits(units, now).sort(comparePriority);
  const selected: MemorizationUnit[] = [];
  const deferred: MemorizationUnit[] = [];
  const pulledAhead: MemorizationUnit[] = [];
  let used = 0;

  for (const unit of due) {
    const cost = capacityCost(unit, settings.capacityMode);
    const fits = used + cost <= target;

    // إذا كانت أول وحدة أكبر من النصاب بالكامل نحتفظ بها حتى لا تتعطل
    // المراجعة إلى الأبد، ثم نؤجل بقية العناصر.
    if (fits || selected.length === 0) {
      selected.push(unit);
      used += cost;
    } else {
      deferred.push(unit);
    }
  }

  if (options.includeUpcoming && used < target) {
    const upcoming = units
      .filter((unit) => isUpcomingPullCandidate(unit, now))
      .sort(comparePriority);

    for (const unit of upcoming) {
      const cost = capacityCost(unit, settings.capacityMode);
      if (used + cost > target) continue;

      selected.push(unit);
      pulledAhead.push(unit);
      used += cost;
    }
  }

  const selectedPages = selected.reduce((total, unit) => total + unitPageCount(unit), 0);
  const duePages = due.reduce((total, unit) => total + unitPageCount(unit), 0);

  return {
    date: localDateKey(now),
    mode: settings.capacityMode,
    target,
    due,
    selected,
    deferred,
    pulledAhead,
    selectedPages,
    selectedUnits: selected.length,
    duePages,
    remainingCapacity: Math.max(0, target - used),
  };
}

export function getDailyWirdProgress(
  units: MemorizationUnit[],
  settings: WirdSettings,
  now: Date = new Date(),
): DailyWirdProgressInfo {
  const mode = settings.capacityMode;
  const target = Math.max(1, Math.round(mode === "pages" ? settings.dailyPages : settings.dailyUnits));
  const reviewedToday = units.filter(
    (unit) => unit.lastReviewed && isSameLocalDay(unit.lastReviewed, now),
  );
  const completed =
    mode === "pages"
      ? reviewedToday.reduce((total, unit) => total + unitPageCount(unit), 0)
      : reviewedToday.length;

  return {
    mode,
    target,
    completed,
    remaining: Math.max(0, target - completed),
    percent: Math.min(100, Math.round((completed / target) * 100)),
    unitLabel: mode === "pages" ? "صفحة" : "وحدة",
  };
}

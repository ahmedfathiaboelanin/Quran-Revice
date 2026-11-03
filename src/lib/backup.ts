import { MAX_EASE_FACTOR, MIN_EASE_FACTOR } from "./srsAlgorithm";
import { inferStrengthFromLegacy } from "./strength";
import type {
  MemorizationUnit,
  ReviewQuality,
  UnitCategory,
  UnitReference,
  UnitType,
  WirdSettings,
} from "./types";
import { normalizeWirdSettings } from "./wirdPlanner";
import { clamp, createId, isValidDate } from "./utils";

interface BackupPayload {
  app: "quran-revise";
  version: 2;
  exportedAt: string;
  units: MemorizationUnit[];
  settings?: WirdSettings;
}

export interface ParsedBackup {
  units: MemorizationUnit[];
  skipped: number;
  settings?: WirdSettings;
}

const VALID_TYPES: UnitType[] = ["surah", "ayah_range", "page"];
const VALID_CATEGORIES: UnitCategory[] = ["new", "weak"];
const VALID_QUALITIES: ReviewQuality[] = [1, 3, 4, 5];

function toNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toInteger(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(clamp(toNumber(value, fallback), min, max));
}

function normalizeReference(raw: unknown, type: UnitType): UnitReference | null {
  if (!raw || typeof raw !== "object") return null;
  const reference = raw as Record<string, unknown>;
  const surah = reference.surah === undefined ? undefined : Math.round(toNumber(reference.surah, 0));
  const surahName = typeof reference.surahName === "string" ? reference.surahName : undefined;

  if (type === "surah") {
    if (!surah || surah < 1 || surah > 114) return null;
    return { surah, surahName };
  }

  if (type === "ayah_range") {
    const startAyah = Math.round(toNumber(reference.startAyah, 0));
    const endAyah = Math.round(toNumber(reference.endAyah, 0));
    if (!surah || surah < 1 || surah > 114) return null;
    if (startAyah < 1 || endAyah < startAyah) return null;
    return { surah, surahName, startAyah, endAyah };
  }

  const startPage = Math.round(toNumber(reference.startPage, 0));
  const endPage = Math.round(toNumber(reference.endPage, startPage));
  if (startPage < 1 || startPage > 604 || endPage < startPage || endPage > 604) return null;
  return { startPage, endPage };
}

function fallbackTitle(type: UnitType, reference: UnitReference): string {
  const surahName = reference.surahName ?? (reference.surah ? `سورة ${reference.surah}` : "سورة");

  if (type === "surah") return surahName;
  if (type === "ayah_range") {
    return `${surahName} • الآيات ${reference.startAyah}–${reference.endAyah}`;
  }
  if (reference.startPage === reference.endPage) {
    return `صفحة ${reference.startPage}`;
  }
  return `الصفحات ${reference.startPage}–${reference.endPage}`;
}

export function normalizeUnit(raw: unknown, index = 0): MemorizationUnit | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const type = VALID_TYPES.includes(item.type as UnitType) ? (item.type as UnitType) : null;
  if (!type) return null;

  const reference = normalizeReference(item.reference, type);
  if (!reference) return null;

  const category = VALID_CATEGORIES.includes(item.category as UnitCategory)
    ? (item.category as UnitCategory)
    : "new";
  const now = new Date().toISOString();
  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim()
      : fallbackTitle(type, reference);
  const lastQuality = VALID_QUALITIES.includes(item.lastQuality as ReviewQuality)
    ? (item.lastQuality as ReviewQuality)
    : undefined;
  const strength = inferStrengthFromLegacy({
    strength: item.strength,
    category,
    easeFactor: toNumber(item.easeFactor, 2.5),
    repetitions: toInteger(item.repetitions, 0, 0, 1000),
    lastQuality,
  });
  const providedPageCount = toInteger(item.pageCount, 0, 0, 604);
  const fallbackPageCount =
    type === "page"
      ? Math.max(1, (reference.endPage ?? reference.startPage ?? 1) - (reference.startPage ?? 1) + 1)
      : 1;

  return {
    id:
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : `imported-${Date.now()}-${index}-${createId()}`,
    title,
    type,
    reference,
    category,
    strength,
    pageCount: providedPageCount > 0 ? providedPageCount : fallbackPageCount,
    ayahCount:
      item.ayahCount === undefined ? undefined : toInteger(item.ayahCount, 0, 0, 6236),
    interval: toInteger(item.interval, 0, 0, 3650),
    repetitions: toInteger(item.repetitions, 0, 0, 1000),
    easeFactor: Math.round(
      clamp(toNumber(item.easeFactor, 2.5), MIN_EASE_FACTOR, MAX_EASE_FACTOR) * 100,
    ) / 100,
    nextReviewDate: isValidDate(item.nextReviewDate) ? item.nextReviewDate : now,
    lastReviewed: isValidDate(item.lastReviewed) ? item.lastReviewed : null,
    createdAt: isValidDate(item.createdAt) ? item.createdAt : now,
    reviewCount: toInteger(item.reviewCount, 0, 0, 1000000),
    lapseCount: toInteger(item.lapseCount, 0, 0, 1000000),
    lastQuality,
  };
}

export function createBackupJson(units: MemorizationUnit[], settings?: WirdSettings): string {
  const payload: BackupPayload = {
    app: "quran-revise",
    version: 2,
    exportedAt: new Date().toISOString(),
    units,
    settings,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseBackup(text: string): ParsedBackup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("تعذر قراءة الملف. تأكد من أنه ملف JSON صالح.");
  }

  const rawUnits = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { units?: unknown }).units)
      ? (parsed as { units: unknown[] }).units
      : null;

  if (!rawUnits) {
    throw new Error("الملف لا يحتوي على بيانات ورد الحفظ المتوقعة.");
  }

  const units: MemorizationUnit[] = [];
  const ids = new Set<string>();
  let skipped = 0;

  rawUnits.forEach((rawUnit, index) => {
    const unit = normalizeUnit(rawUnit, index);
    if (!unit || ids.has(unit.id)) {
      skipped += 1;
      return;
    }
    ids.add(unit.id);
    units.push(unit);
  });

  if (units.length === 0) {
    throw new Error("لم يتم العثور على أي وحدات صالحة داخل الملف.");
  }

  const rawSettings =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { settings?: unknown }).settings
      : undefined;

  return {
    units,
    skipped,
    settings: rawSettings ? normalizeWirdSettings(rawSettings) : undefined,
  };
}

export function downloadBackup(units: MemorizationUnit[], settings?: WirdSettings): string {
  const filename = `quran-revise-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([createBackupJson(units, settings)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

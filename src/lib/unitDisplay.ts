import type { MemorizationUnit, UnitCategory, UnitType } from "./types";
import { formatArabicNumber, formatDayCount, normalizeArabic } from "./utils";

export const unitTypeLabels: Record<UnitType, string> = {
  surah: "سورة كاملة",
  ayah_range: "نطاق آيات",
  page: "صفحة مصحف",
};

export const categoryLabels: Record<UnitCategory, string> = {
  new: "حفظ جديد",
  weak: "مراجعة غير مثبتة",
};

export function describeUnit(unit: MemorizationUnit): string {
  const { reference } = unit;
  const surahName = reference.surahName ?? (reference.surah ? `سورة ${reference.surah}` : "سورة");

  switch (unit.type) {
    case "surah":
      return `${surahName} • ${formatArabicNumber(reference.endAyah ?? unit.ayahCount ?? 0)} آية`;
    case "ayah_range":
      return `${surahName} • الآيات ${formatArabicNumber(reference.startAyah ?? 0)}–${formatArabicNumber(
        reference.endAyah ?? 0,
      )}`;
    case "page": {
      const startPage = reference.startPage ?? 1;
      const endPage = reference.endPage ?? startPage;
      if (startPage === endPage) {
        return `صفحة ${formatArabicNumber(startPage)} من المصحف`;
      }
      return `الصفحات ${formatArabicNumber(startPage)}–${formatArabicNumber(endPage)}`;
    }
  }
}

export function referenceIdentity(unit: Pick<MemorizationUnit, "type" | "reference">): string {
  const { reference, type } = unit;

  if (type === "surah") {
    return `${type}:${reference.surah ?? ""}`;
  }
  if (type === "ayah_range") {
    return `${type}:${reference.surah ?? ""}:${reference.startAyah ?? ""}:${reference.endAyah ?? ""}`;
  }
  return `${type}:${reference.startPage ?? ""}:${reference.endPage ?? ""}`;
}

export function matchesSearch(unit: MemorizationUnit, query: string): boolean {
  const normalizedQuery = normalizeArabic(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeArabic(
    [unit.title, describeUnit(unit), unitTypeLabels[unit.type], categoryLabels[unit.category]].join(" "),
  );

  return normalizedQuery.split(" ").every((token) => haystack.includes(token));
}

export function intervalSummary(unit: MemorizationUnit): string {
  if (unit.interval <= 0) return "لم تبدأ المراجعة";
  return `الفاصل الحالي: ${formatDayCount(unit.interval)}`;
}

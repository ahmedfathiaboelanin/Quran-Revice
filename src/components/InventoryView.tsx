"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Layers,
  Library,
  ListOrdered,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { strengthLevels, strengthPriority, strengthProfiles } from "@/lib/strength";
import type { MemorizationUnit, StrengthLevel } from "@/lib/types";
import { describeUnit, matchesSearch } from "@/lib/unitDisplay";
import { cn, formatDueLabel, toArabicDigits } from "@/lib/utils";

type InventoryFilter = "all" | StrengthLevel;

interface InventoryViewProps {
  units: MemorizationUnit[];
  now: Date;
  onReview: (unit: MemorizationUnit) => void;
  onDelete: (unit: MemorizationUnit) => void;
  onBulkAdd: () => void;
  onStrengthChange: (unit: MemorizationUnit, strength: StrengthLevel) => void;
}

const typeIcons = {
  surah: BookOpen,
  ayah_range: ListOrdered,
  page: Layers,
};

export function InventoryView({
  units,
  now,
  onReview,
  onDelete,
  onBulkAdd,
  onStrengthChange,
}: InventoryViewProps) {
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: units.length,
      weak: units.filter((unit) => unit.strength === "weak").length,
      medium: units.filter((unit) => unit.strength === "medium").length,
      good: units.filter((unit) => unit.strength === "good").length,
      strong: units.filter((unit) => unit.strength === "strong").length,
    }),
    [units],
  );

  const filteredUnits = useMemo(
    () =>
      units
        .filter((unit) => filter === "all" || unit.strength === filter)
        .filter((unit) => matchesSearch(unit, query))
        .sort(
          (first, second) =>
            strengthPriority[first.strength] - strengthPriority[second.strength] ||
            new Date(first.nextReviewDate).getTime() - new Date(second.nextReviewDate).getTime(),
        ),
    [units, filter, query],
  );

  const tabs: Array<{ id: InventoryFilter; label: string; count: number; dot?: string }> = [
    { id: "all", label: "الكل", count: counts.all },
    ...strengthLevels.map((level) => ({
      id: level,
      label: strengthProfiles[level].label,
      count: counts[level],
      dot: strengthProfiles[level].dotClass,
    })),
  ];

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-line/90 bg-white/80 shadow-[0_16px_45px_rgba(27,42,35,0.05)]">
        <div className="flex flex-col gap-3 border-b border-line/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-900 text-gold-300 shadow-sm">
              <Library className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-brand-950">سجل محفوظاتي</h2>
              <p className="mt-1 max-w-xl text-[10px] font-semibold leading-5 text-muted sm:text-[11px]">
                أدر محفوظاتك السابقة، وحدّث درجة الحفظ في أي وقت. تغيير الدرجة يعيد ضبط موعد
                الاستحقاق وفق معايير SM-2.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBulkAdd}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة محفوظات سابقة
          </button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="custom-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-cream-50/80 p-1.5">
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-extrabold transition sm:text-[11px]",
                    active
                      ? "bg-white text-brand-950 shadow-[0_5px_16px_rgba(27,42,35,0.08)]"
                      : "text-muted hover:bg-white/70 hover:text-brand-900",
                  )}
                >
                  {tab.dot ? <span className={cn("h-2 w-2 rounded-full", tab.dot)} /> : null}
                  {tab.label}
                  <span
                    className={cn(
                      "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[8px] font-extrabold",
                      active ? "bg-gold-400 text-brand-950" : "bg-cream-200 text-muted",
                    )}
                  >
                    {toArabicDigits(tab.count)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم السورة أو نطاق الآيات أو الصفحات…"
                className="h-11 w-full rounded-xl border border-line bg-white pr-9 pl-9 text-xs font-semibold text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-muted/70 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-cream-100 hover:text-brand-900"
                  aria-label="مسح البحث"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <p className="shrink-0 text-[10px] font-bold text-muted">
              عرض {toArabicDigits(filteredUnits.length)} من {toArabicDigits(units.length)} ورد
            </p>
          </div>
        </div>
      </section>

      {filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/55 px-5 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold-200 bg-gold-100/70 text-gold-700">
            <Search className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-extrabold text-brand-950">
            {units.length === 0 ? "سجل المحفوظات فارغ" : "لا توجد أوراد مطابقة"}
          </h3>
          <p className="mt-2 max-w-md text-balance text-xs leading-7 text-muted">
            {units.length === 0
              ? "ابدأ بإضافة السور أو الأجزاء أو نطاقات الصفحات التي حفظتها سابقاً، وحدد درجة حفظها الحالية."
              : "غيّر درجة الحفظ أو امسح البحث لعرض أوراد أخرى من سجلك."}
          </p>
          {units.length === 0 ? (
            <button
              type="button"
              onClick={onBulkAdd}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-800"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة محفوظات سابقة
            </button>
          ) : (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-extrabold text-brand-900 transition hover:bg-brand-50"
            >
              <X className="h-3.5 w-3.5" />
              عرض الكل
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUnits.map((unit) => (
            <InventoryRow
              key={unit.id}
              unit={unit}
              now={now}
              onReview={onReview}
              onDelete={onDelete}
              onStrengthChange={onStrengthChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface InventoryRowProps {
  unit: MemorizationUnit;
  now: Date;
  onReview: (unit: MemorizationUnit) => void;
  onDelete: (unit: MemorizationUnit) => void;
  onStrengthChange: (unit: MemorizationUnit, strength: StrengthLevel) => void;
}

function InventoryRow({ unit, now, onReview, onDelete, onStrengthChange }: InventoryRowProps) {
  const TypeIcon = typeIcons[unit.type];
  const profile = strengthProfiles[unit.strength];

  return (
    <article className="group rounded-2xl border border-line/90 bg-white/80 p-3.5 shadow-[0_8px_24px_rgba(27,42,35,0.04)] transition hover:border-brand-100 hover:shadow-[0_12px_30px_rgba(27,42,35,0.07)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-800">
            <TypeIcon className="h-4 w-4" strokeWidth={1.9} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-sm font-extrabold leading-5 text-brand-950">
                {unit.title}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-extrabold shadow-sm",
                  profile.badgeClass,
                )}
              >
                {profile.label}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-muted">
              {describeUnit(unit)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-muted">
              <span className="rounded-full border border-line bg-cream-100/80 px-2 py-1">
                {toArabicDigits(unit.pageCount)} صفحة
              </span>
              <span className="rounded-full border border-line bg-cream-100/80 px-2 py-1">
                {formatDueLabel(unit.nextReviewDate, now)}
              </span>
              <span className="rounded-full border border-line bg-cream-100/80 px-2 py-1">
                {toArabicDigits(unit.reviewCount)} مراجعة
              </span>
              {unit.lapseCount > 0 ? (
                <span className="rounded-full border border-red-100 bg-red-50 px-2 py-1 text-red-600">
                  تعثر {toArabicDigits(unit.lapseCount)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          <label className="relative min-w-0 flex-1 lg:w-36 lg:flex-none">
            <span className="sr-only">تحديث درجة حفظ {unit.title}</span>
            <select
              value={unit.strength}
              onChange={(event) =>
                onStrengthChange(unit, event.target.value as StrengthLevel)
              }
              className={cn(
                "h-10 w-full appearance-none rounded-xl border pr-3 pl-8 text-[11px] font-extrabold shadow-sm outline-none transition focus:ring-4 focus:ring-brand-100/70",
                profile.softClass,
              )}
            >
              {strengthLevels.map((level) => (
                <option key={level} value={level}>
                  {strengthProfiles[level].label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-current opacity-70" />
          </label>

          <button
            type="button"
            onClick={() => onReview(unit)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-brand-800"
          >
            <Play className="h-3 w-3 fill-current" />
            راجع
          </button>

          <button
            type="button"
            onClick={() => onDelete(unit)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted/70 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600"
            aria-label={`حذف ${unit.title}`}
            title="حذف الورد"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

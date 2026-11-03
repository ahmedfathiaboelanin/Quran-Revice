"use client";

import {
  BookOpen,
  CalendarClock,
  Layers,
  ListOrdered,
  Play,
  Trash2,
} from "lucide-react";
import { getStrength, isDue } from "@/lib/srsAlgorithm";
import { strengthProfiles } from "@/lib/strength";
import type { MemorizationUnit } from "@/lib/types";
import { describeUnit, intervalSummary, unitTypeLabels } from "@/lib/unitDisplay";
import { cn, formatDueLabel } from "@/lib/utils";

interface UnitCardProps {
  unit: MemorizationUnit;
  now: Date;
  onReview: (unit: MemorizationUnit) => void;
  onDelete: (unit: MemorizationUnit) => void;
}

const typeIcons = {
  surah: BookOpen,
  ayah_range: ListOrdered,
  page: Layers,
};

const strengthStyles = {
  danger: {
    text: "text-red-700",
    bar: "bg-red-500",
    chip: "border-red-100 bg-red-50 text-red-700",
  },
  warning: {
    text: "text-gold-700",
    bar: "bg-gold-400",
    chip: "border-gold-200 bg-gold-100 text-gold-700",
  },
  good: {
    text: "text-brand-700",
    bar: "bg-brand-600",
    chip: "border-brand-100 bg-brand-50 text-brand-800",
  },
  strong: {
    text: "text-brand-800",
    bar: "bg-gradient-to-l from-brand-700 to-gold-400",
    chip: "border-brand-100 bg-brand-100/70 text-brand-900",
  },
};

export function UnitCard({ unit, now, onReview, onDelete }: UnitCardProps) {
  const TypeIcon = typeIcons[unit.type];
  const strength = getStrength(unit);
  const strengthStyle = strengthStyles[strength.tone];
  const profile = strengthProfiles[unit.strength];
  const due = isDue(unit, now);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-white/80 p-5 shadow-[0_14px_40px_rgba(27,42,35,0.055)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(27,42,35,0.09)]",
        due ? "border-gold-300/80" : "border-line/90",
      )}
    >
      {due ? (
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-gold-300 via-gold-400 to-brand-600" />
      ) : null}

      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
            due
              ? "border-gold-200 bg-gold-100 text-gold-700"
              : "border-brand-100 bg-brand-50 text-brand-800",
          )}
        >
          <TypeIcon className="h-5 w-5" strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 className="line-clamp-2 min-w-0 text-base font-extrabold leading-6 text-brand-950">
              {unit.title}
            </h3>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
                profile.badgeClass,
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              {profile.label}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">{describeUnit(unit)}</p>
        </div>

        <button
          type="button"
          onClick={() => onDelete(unit)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted/70 opacity-70 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          aria-label={`حذف ${unit.title}`}
          title="حذف الورد"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
            due
              ? "border-gold-200 bg-gold-100/80 text-gold-700"
              : "border-line bg-cream-100/80 text-muted",
          )}
          title={new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(new Date(unit.nextReviewDate))}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDueLabel(unit.nextReviewDate, now)}
        </span>
        <span className="rounded-full border border-line bg-cream-100/80 px-2.5 py-1 text-muted">
          {unitTypeLabels[unit.type]}
        </span>
        <span className="rounded-full border border-line bg-cream-100/80 px-2.5 py-1 text-muted">
          {unit.pageCount.toLocaleString("ar-EG")} صفحة
        </span>
        {unit.reviewCount > 0 ? (
          <span className="rounded-full border border-line bg-cream-100/80 px-2.5 py-1 text-muted">
            {unit.reviewCount.toLocaleString("ar-EG")} مراجعة
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-bold">
          <span className="text-muted">قوة الحفظ</span>
          <span className={strengthStyle.text}>{strength.label}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-cream-200"
          role="progressbar"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`قوة حفظ ${unit.title}`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500", strengthStyle.bar)}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line/70 pt-4">
        <button
          type="button"
          onClick={() => onReview(unit)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-800"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          راجع الآن
        </button>
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold", strengthStyle.chip)}>
          {intervalSummary(unit)}
        </span>
      </div>
    </article>
  );
}

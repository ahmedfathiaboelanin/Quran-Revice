"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Gauge,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import type { DailyWirdSnapshot, MemorizationUnit, WirdSettings } from "@/lib/types";
import { cn, toArabicDigits } from "@/lib/utils";
import { generateDailyWird, getDailyWirdProgress } from "@/lib/wirdPlanner";

interface DailyWirdProgressProps {
  units: MemorizationUnit[];
  settings: WirdSettings;
  now: Date;
  lastPlan: DailyWirdSnapshot | null;
  onOpenSettings: () => void;
  onStartReview: (units: MemorizationUnit[]) => void;
}

export function DailyWirdProgress({
  units,
  settings,
  now,
  lastPlan,
  onOpenSettings,
  onStartReview,
}: DailyWirdProgressProps) {
  const progress = useMemo(
    () => getDailyWirdProgress(units, settings, now),
    [units, settings, now],
  );
  const pullAheadPlan = useMemo(
    () => generateDailyWird(units, settings, now, { includeUpcoming: true }),
    [units, settings, now],
  );
  const pulledCount = pullAheadPlan.pulledAhead.length;
  const deferredCount = lastPlan?.deferredIds.length ?? 0;
  const modeLabel = progress.mode === "pages" ? "صفحة" : "ورد";
  const canFill = progress.remaining > 0 && pulledCount > 0;

  return (
    <section className="animate-fade-up mt-4 overflow-hidden rounded-3xl border border-line/90 bg-white/80 shadow-[0_16px_45px_rgba(27,42,35,0.055)] backdrop-blur-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-900 text-gold-300 shadow-sm">
              <Gauge className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-brand-950">تقدم الورد اليومي</h2>
                {progress.percent >= 100 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
                    <CheckCircle2 className="h-3 w-3" />
                    مكتمل
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-semibold leading-6 text-muted">
                أتممت{" "}
                <span className="font-extrabold text-brand-950">
                  {toArabicDigits(progress.completed)}
                </span>{" "}
                من أصل{" "}
                <span className="font-extrabold text-brand-950">
                  {toArabicDigits(progress.target)}
                </span>{" "}
                {modeLabel} اليوم —{" "}
                <span className="font-extrabold text-gold-700">
                  {toArabicDigits(progress.percent)}٪
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[11px] font-extrabold text-brand-900 transition hover:border-brand-100 hover:bg-brand-50"
            >
              <Settings2 className="h-3.5 w-3.5" />
              إعدادات الورد
            </button>

            {canFill ? (
              <button
                type="button"
                onClick={() => onStartReview(pullAheadPlan.selected)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gold-400 px-3 text-[11px] font-extrabold text-brand-950 shadow-[0_8px_20px_rgba(201,162,39,0.18)] transition hover:bg-gold-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                إكمال نصاب الورد
                <span className="rounded-full bg-brand-950/10 px-1.5 py-0.5 text-[9px]">
                  +{toArabicDigits(pulledCount)}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-cream-200"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="تقدم الورد اليومي"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                progress.percent >= 100
                  ? "bg-gradient-to-l from-emerald-600 to-emerald-400"
                  : "bg-gradient-to-l from-brand-700 via-brand-600 to-gold-400",
              )}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 text-[10px] font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-cream-100/80 px-2.5 py-1">
              <Target className="h-3 w-3 text-brand-700" />
              المتبقي في النصاب: {toArabicDigits(progress.remaining)} {modeLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-cream-100/80 px-2.5 py-1">
              <RotateCcw className="h-3 w-3 text-gold-700" />
              مستحق الآن: {toArabicDigits(pullAheadPlan.due.length)} ورد
            </span>
          </div>

          {deferredCount > 0 ? (
            <span className="text-[9px] font-bold text-gold-700">
              تم توزيع {toArabicDigits(deferredCount)} مراجعة على الأيام القادمة لتخفيف الحمل.
            </span>
          ) : (
            <span className="text-[9px] font-bold text-brand-700">
              {pulledCount > 0
                ? `يمكنك سحب ${toArabicDigits(pulledCount)} ورداً من الضعيف والمتوسط لإكمال النصاب.`
                : "نصابك اليومي متوازن حسب أولوية الحفظ."}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

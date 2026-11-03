"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  ListOrdered,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { getReviewContent } from "@/lib/quranApi";
import { previewInterval } from "@/lib/srsAlgorithm";
import { strengthProfiles } from "@/lib/strength";
import { useQuranStore } from "@/lib/store";
import type { ReviewContent, ReviewQuality } from "@/lib/types";
import { describeUnit, unitTypeLabels } from "@/lib/unitDisplay";
import { cn, formatInterval, toArabicDigits } from "@/lib/utils";

interface ReviewSessionProps {
  unitIds: string[];
  onExit: () => void;
}

type LoadStatus = "loading" | "ready" | "error";

interface GradeOption {
  quality: ReviewQuality;
  label: string;
  hint: string;
  icon: typeof RotateCcw;
  className: string;
  previewClassName: string;
}

const gradeOptions: GradeOption[] = [
  {
    quality: 1,
    label: "نسيت",
    hint: "تماماً",
    icon: RotateCcw,
    className: "border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100",
    previewClassName: "bg-white/70 text-red-700",
  },
  {
    quality: 3,
    label: "صعب",
    hint: "به أخطاء",
    icon: TriangleAlert,
    className: "border-gold-300 bg-gold-50/80 text-gold-700 hover:bg-gold-100",
    previewClassName: "bg-white/70 text-gold-700",
  },
  {
    quality: 4,
    label: "جيد",
    hint: "مراجعة جيدة",
    icon: ThumbsUp,
    className: "border-brand-800 bg-brand-900 text-white hover:bg-brand-800",
    previewClassName: "bg-white/15 text-white",
  },
  {
    quality: 5,
    label: "متقن",
    hint: "حفظ راسخ",
    icon: Sparkles,
    className: "border-gold-400 bg-gold-100 text-gold-700 hover:bg-gold-200",
    previewClassName: "bg-white/70 text-gold-700",
  },
];

const typeIcons = {
  surah: BookOpen,
  ayah_range: ListOrdered,
  page: Layers,
};

export function ReviewSession({ unitIds, onExit }: ReviewSessionProps) {
  const [queue] = useState(() => Array.from(new Set(unitIds)));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(queue.length === 0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [content, setContent] = useState<ReviewContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [blurMode, setBlurMode] = useState(false);
  const [revealedAyahs, setRevealedAyahs] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<ReviewQuality, number>>({
    1: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  const units = useQuranStore((state) => state.units);
  const gradeUnit = useQuranStore((state) => state.gradeUnit);
  const readerRef = useRef<HTMLDivElement>(null);
  const gradingLock = useRef(false);

  const currentId = queue[index];
  const currentUnit = units.find((unit) => unit.id === currentId);
  const completed = finished ? queue.length : index;
  const progress = queue.length > 0 ? Math.round((completed / queue.length) * 100) : 0;

  useEffect(() => {
    if (!currentId) return;

    let active = true;
    setStatus("loading");
    setContent(null);
    setLoadError(null);

    const unit = useQuranStore.getState().units.find((item) => item.id === currentId);
    if (!unit) {
      setStatus("error");
      setLoadError("هذا الورد لم يعد موجوداً في قائمتك. يمكنك تخطيه والمتابعة.");
      return;
    }

    getReviewContent(unit)
      .then((data) => {
        if (!active) return;
        if (data.ayahCount === 0) {
          setStatus("error");
          setLoadError("لم يتم العثور على آيات لهذا النطاق. تحقق من الورد أو أعد إضافته.");
          return;
        }
        setContent(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setLoadError(
          error instanceof Error ? error.message : "تعذر تحميل نص الورد. تحقق من الاتصال.",
        );
      });

    return () => {
      active = false;
    };
  }, [currentId, retryNonce]);

  useEffect(() => {
    setBlurMode(false);
    setRevealedAyahs(new Set());
    gradingLock.current = false;
    readerRef.current?.scrollTo({ top: 0 });
  }, [currentId]);

  const goNext = () => {
    if (index + 1 >= queue.length) {
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
  };

  const revealAyah = (key: string) => {
    if (!blurMode) return;
    setRevealedAyahs((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

  const toggleBlurMode = () => {
    setBlurMode((current) => {
      if (!current) setRevealedAyahs(new Set());
      return !current;
    });
  };

  const handleGrade = (quality: ReviewQuality) => {
    if (!currentUnit || status !== "ready" || gradingLock.current) return;

    gradingLock.current = true;
    gradeUnit(currentUnit.id, quality);
    setCounts((current) => ({ ...current, [quality]: current[quality] + 1 }));

    if (index + 1 >= queue.length) {
      setFinished(true);
    } else {
      setIndex((current) => current + 1);
    }
  };

  if (finished) {
    return (
      <SessionComplete
        total={queue.length}
        counts={counts}
        onExit={onExit}
      />
    );
  }

  const TypeIcon = currentUnit ? typeIcons[currentUnit.type] : BookOpen;
  const revealedCount = revealedAyahs.size;

  return (
    <div className="app-canvas flex h-[100dvh] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-white/70 bg-cream-50/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={onExit}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white/80 text-brand-900 shadow-sm transition hover:bg-brand-50"
            aria-label="العودة إلى لوحة التحكم"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold tracking-wide text-gold-600">
              جلسة المراجعة • {toArabicDigits(index + 1)} من {toArabicDigits(queue.length)}
            </p>
            <h1 className="truncate text-sm font-extrabold text-brand-950 sm:text-base">
              {currentUnit?.title ?? "جارٍ تحميل الورد"}
            </h1>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-line bg-white/70 px-3 py-1.5 text-[10px] font-bold text-muted sm:flex">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
            {toArabicDigits(completed)} مكتمل
          </div>
        </div>

        <div className="h-1 w-full bg-cream-200">
          <div
            className="h-full rounded-l-full bg-gradient-to-l from-brand-700 to-gold-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main ref={readerRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6">
          {currentUnit ? (
            <section className="animate-fade-up overflow-hidden rounded-3xl border border-line/90 bg-white/80 shadow-[0_18px_50px_rgba(27,42,35,0.07)] backdrop-blur-sm">
              <div className="flex items-start gap-3 border-b border-line/70 bg-gradient-to-l from-brand-50/70 to-gold-100/40 p-4 sm:p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-900 text-gold-300 shadow-sm">
                  <TypeIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
                        strengthProfiles[currentUnit.strength].badgeClass,
                      )}
                    >
                      {strengthProfiles[currentUnit.strength].label}
                    </span>
                    <span className="rounded-full border border-line bg-white/70 px-2 py-0.5 text-[10px] font-bold text-muted">
                      {unitTypeLabels[currentUnit.type]}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-muted">
                    {describeUnit(currentUnit)}
                  </p>
                </div>
              </div>

              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-cream-50/90 px-4 py-2.5 backdrop-blur-lg sm:px-5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleBlurMode}
                    aria-pressed={blurMode}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-extrabold transition",
                      blurMode
                        ? "border-gold-400 bg-gold-100 text-gold-700"
                        : "border-line bg-white text-brand-900 hover:border-gold-200 hover:bg-gold-50",
                    )}
                  >
                    {blurMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {blurMode ? "وضع التسميع مفعّل" : "إخفاء الآيات للتسميع"}
                  </button>

                  {blurMode && revealedCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setRevealedAyahs(new Set())}
                      className="h-9 rounded-full border border-line bg-white px-3 text-[11px] font-bold text-muted transition hover:bg-cream-100"
                    >
                      إخفاء الكل
                    </button>
                  ) : null}
                </div>

                {blurMode ? (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gold-700">
                    <span>
                      كشفت {toArabicDigits(revealedCount)} من{" "}
                      {toArabicDigits(content?.ayahCount ?? 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedAyahs(
                          new Set(
                            content?.groups.flatMap((group) =>
                              group.ayahs.map(
                                (ayah) => `${group.surah.number}:${ayah.numberInSurah}`,
                              ),
                            ) ?? [],
                          ),
                        )
                      }
                      className="rounded-full bg-gold-200/70 px-2 py-1 text-gold-700 transition hover:bg-gold-200"
                    >
                      إظهار الكل
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="p-3 sm:p-5">
                {status === "loading" ? <ReaderSkeleton /> : null}

                {status === "error" ? (
                  <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-9 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600">
                      <AlertCircle className="h-6 w-6" />
                    </span>
                    <h2 className="mt-3 text-sm font-extrabold text-red-900">تعذر تحميل الورد</h2>
                    <p className="mt-1 max-w-md text-xs leading-6 text-red-800">{loadError}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRetryNonce((value) => value + 1)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        إعادة المحاولة
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                      >
                        تخطي الورد
                      </button>
                    </div>
                  </div>
                ) : null}

                {status === "ready" && content ? (
                  <div>
                    {blurMode ? (
                      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-gold-200 bg-gold-100/60 px-3 py-2.5 text-[11px] font-semibold leading-6 text-gold-700">
                        <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                        وضع التسميع الغيبي: اضغط على أي آية لكشفها والتحقق من حفظك.
                      </div>
                    ) : null}

                    {content.groups.map((group) => (
                      <section key={group.surah.number} className="mb-7 last:mb-1">
                        <div className="mb-4 flex items-center gap-3">
                          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-300" />
                          <div className="rounded-2xl border border-gold-200/80 bg-gold-100/70 px-4 py-2 text-center">
                            <p className="font-quran text-xl font-bold leading-8 text-brand-950">
                              {group.surah.name}
                            </p>
                            <p className="text-[9px] font-bold tracking-wide text-gold-700">
                              {group.surah.englishName}
                            </p>
                          </div>
                          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-300" />
                        </div>

                        <div className="space-y-1.5">
                          {group.ayahs.map((ayah) => {
                            const key = `${group.surah.number}:${ayah.numberInSurah}`;
                            const hidden = blurMode && !revealedAyahs.has(key);
                            const justRevealed = blurMode && revealedAyahs.has(key);

                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={!blurMode}
                                onClick={() => revealAyah(key)}
                                aria-label={
                                  hidden
                                    ? `الآية ${ayah.numberInSurah} مخفية، اضغط لكشفها`
                                    : undefined
                                }
                                aria-pressed={blurMode ? !hidden : undefined}
                                className={cn(
                                  "flex w-full items-start gap-2 rounded-2xl px-2 py-2 text-right transition sm:gap-3 sm:px-3",
                                  blurMode
                                    ? "cursor-pointer hover:bg-gold-50/70"
                                    : "cursor-default",
                                )}
                              >
                                <span
                                  className={cn(
                                    "quran-text-reader min-w-0 flex-1 text-right text-brand-950",
                                    hidden && "quran-blur",
                                    justRevealed && "ayah-revealed",
                                  )}
                                >
                                  {ayah.text}
                                </span>
                                <span className="mt-1 grid h-8 min-w-8 shrink-0 place-items-center rounded-full border border-gold-200 bg-gold-50 px-1 font-sans text-[10px] font-extrabold text-gold-700">
                                  {toArabicDigits(ayah.numberInSurah)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-line bg-white/80 px-5 py-14 text-center">
              <AlertCircle className="h-8 w-8 text-gold-500" />
              <h2 className="mt-3 text-sm font-extrabold text-brand-950">الورد غير موجود</h2>
              <p className="mt-1 text-xs text-muted">قد يكون قد حُذف من قائمتك.</p>
              <button
                type="button"
                onClick={goNext}
                className="mt-4 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-bold text-white"
              >
                تخطي والمتابعة
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-white/70 bg-cream-50/90 px-3 pt-2.5 shadow-[0_-8px_30px_rgba(27,42,35,0.05)] backdrop-blur-xl sm:px-5">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] font-extrabold text-brand-950">قيّم تسميعك</p>
            <p className="text-[9px] font-semibold text-muted">
              سيُحدد موعد المراجعة القادم تلقائياً
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-2.5">
            {gradeOptions.map((option) => {
              const Icon = option.icon;
              const interval =
                currentUnit && status === "ready"
                  ? previewInterval(currentUnit, option.quality)
                  : null;

              return (
                <button
                  key={option.quality}
                  type="button"
                  disabled={!currentUnit || status !== "ready"}
                  onClick={() => handleGrade(option.quality)}
                  className={cn(
                    "flex min-h-[4.6rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 text-center shadow-sm transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[5rem]",
                    option.className,
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="mt-1 text-xs font-extrabold sm:text-sm">{option.label}</span>
                  <span className="hidden text-[9px] font-semibold opacity-75 sm:block">
                    {option.hint}
                  </span>
                  {interval ? (
                    <span
                      className={cn(
                        "mt-1 hidden rounded-full px-1.5 py-0.5 text-[8px] font-bold sm:inline-flex",
                        option.previewClassName,
                      )}
                    >
                      {formatInterval(interval)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReaderSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-2" aria-label="جارٍ تحميل الآيات">
      <div className="mx-auto mb-6 h-14 w-48 rounded-2xl bg-cream-200" />
      {[92, 100, 78, 96, 65, 88].map((width, index) => (
        <div
          key={index}
          className="h-8 rounded-xl bg-cream-200/80"
          style={{ width: `${width}%` }}
        />
      ))}
      <div className="flex items-center justify-center gap-2 pt-6 text-xs font-bold text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        جارٍ تحضير نص الورد…
      </div>
    </div>
  );
}

interface SessionCompleteProps {
  total: number;
  counts: Record<ReviewQuality, number>;
  onExit: () => void;
}

function SessionComplete({ total, counts, onExit }: SessionCompleteProps) {
  const strong = counts[5] + counts[4];
  const needsWork = counts[1] + counts[3];
  const message =
    total === 0
      ? "لم تكن هناك وحدات جاهزة للمراجعة."
      : needsWork === 0
        ? "تسميع متقن، بارك الله فيك. حافظ على وردك ولا تنقطع."
        : strong >= needsWork
          ? "أنجزت وردك اليوم. ثبّت ما تعثّر فيه في المراجعة القادمة."
          : "المراجعة بداية التثبيت. لا تقلق، سيعيد التطبيق جدولة ما يحتاج تقوية قريباً.";

  return (
    <div className="app-canvas flex min-h-[100dvh] flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl animate-fade-up text-center">
          <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.8rem] bg-gradient-to-br from-brand-800 to-brand-950 text-gold-300 shadow-[0_18px_44px_rgba(6,43,32,0.25)]">
            <CheckCircle2 className="h-10 w-10" />
            <span className="absolute -left-1 -top-1 h-4 w-4 rounded-full border-2 border-cream-50 bg-gold-400" />
          </div>

          <p className="text-xs font-extrabold tracking-wide text-gold-600">تمت الجلسة بحمد الله</p>
          <h1 className="mt-2 text-balance font-quran text-3xl font-bold leading-[1.5] text-brand-950 sm:text-4xl">
            أتممت مراجعة ورد اليوم
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-7 text-muted">
            {total > 0
              ? `راجعت ${toArabicDigits(total)} ${total === 1 ? "وحدة" : "وحدات"} من وردك. ${message}`
              : message}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-3xl border border-line/90 bg-white/80 p-3 shadow-[0_18px_50px_rgba(27,42,35,0.06)] sm:grid-cols-4">
            {gradeOptions.map((option) => (
              <div
                key={option.quality}
                className="rounded-2xl border border-line/70 bg-cream-50 px-2 py-3"
              >
                <p className="text-2xl font-extrabold text-brand-950">
                  {toArabicDigits(counts[option.quality])}
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-muted">{option.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onExit}
              className="flex-1 rounded-2xl bg-brand-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(11,61,46,0.2)] transition hover:bg-brand-800"
            >
              العودة إلى لوحة التحكم
            </button>
          </div>

          <p className="mt-5 text-[11px] font-semibold text-muted">
            «وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا»
          </p>
        </div>
      </main>
    </div>
  );
}

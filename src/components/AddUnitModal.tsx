"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Layers,
  ListOrdered,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useSurahs } from "@/hooks/useSurahs";
import { getAyahRangePageCount } from "@/lib/quranApi";
import { useQuranStore } from "@/lib/store";
import { strengthLevels, strengthProfiles } from "@/lib/strength";
import type { MemorizationUnit, StrengthLevel, UnitReference, UnitType } from "@/lib/types";
import { referenceIdentity, unitTypeLabels } from "@/lib/unitDisplay";
import { cn, formatInterval, toArabicDigits } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (unit: MemorizationUnit) => void;
}

const typeOptions: Array<{ value: UnitType; label: string; icon: typeof BookOpen }> = [
  { value: "surah", label: "بالسورة", icon: BookOpen },
  { value: "ayah_range", label: "بنطاق آيات", icon: ListOrdered },
  { value: "page", label: "بالصفحة", icon: Layers },
];

const inputClassName =
  "h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-muted/70 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

const labelClassName = "mb-1.5 block text-xs font-extrabold text-brand-950";

export function AddUnitModal({ open, onClose, onAdded }: AddUnitModalProps) {
  const { surahs, loading, error: surahsError, reload } = useSurahs();
  const units = useQuranStore((state) => state.units);
  const addUnit = useQuranStore((state) => state.addUnit);

  const [type, setType] = useState<UnitType>("surah");
  const [strength, setStrength] = useState<StrengthLevel>("weak");
  const [surahNumber, setSurahNumber] = useState(1);
  const [startAyah, setStartAyah] = useState(1);
  const [endAyah, setEndAyah] = useState(7);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

  const selectedSurah = surahs.find((surah) => surah.number === surahNumber) ?? surahs[0];

  useEffect(() => {
    if (initialized.current || surahs.length === 0) return;
    const firstSurah = surahs[0];
    setSurahNumber(firstSurah.number);
    setStartAyah(1);
    setEndAyah(firstSurah.numberOfAyahs);
    initialized.current = true;
  }, [surahs]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setSubmitting(false);
  }, [open]);

  const handleSurahChange = (value: string) => {
    const nextNumber = Number(value);
    const nextSurah = surahs.find((surah) => surah.number === nextNumber);
    setSurahNumber(nextNumber);
    setStartAyah(1);
    setEndAyah(nextSurah?.numberOfAyahs ?? 1);
    setFormError(null);
  };

  const previewTitle = (() => {
    if (type === "surah") return selectedSurah?.name ?? "سورة";
    if (type === "ayah_range") {
      if (!selectedSurah) return "نطاق آيات";
      if (startAyah < 1 || endAyah < startAyah || endAyah > selectedSurah.numberOfAyahs) {
        return "نطاق الآيات غير صالح";
      }
      return `${selectedSurah.name} • الآيات ${toArabicDigits(startAyah)}–${toArabicDigits(endAyah)}`;
    }
    if (startPage < 1 || endPage < startPage || endPage > 604) {
      return "نطاق الصفحات غير صالح";
    }
    if (startPage === endPage) return `صفحة ${toArabicDigits(startPage)}`;
    return `الصفحات ${toArabicDigits(startPage)}–${toArabicDigits(endPage)}`;
  })();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (!selectedSurah && type !== "page") {
      setFormError("تعذر تحميل بيانات السور. أعد المحاولة ثم أضف الورد.");
      return;
    }

    let reference: UnitReference;
    let title: string;
    let ayahCount: number | undefined;
    let pageCount = 1;

    if (type === "surah" && selectedSurah) {
      reference = {
        surah: selectedSurah.number,
        surahName: selectedSurah.name,
        startAyah: 1,
        endAyah: selectedSurah.numberOfAyahs,
      };
      title = selectedSurah.name;
      ayahCount = selectedSurah.numberOfAyahs;
      pageCount = selectedSurah.pageCount;
    } else if (type === "ayah_range" && selectedSurah) {
      if (
        !Number.isInteger(startAyah) ||
        !Number.isInteger(endAyah) ||
        startAyah < 1 ||
        endAyah > selectedSurah.numberOfAyahs ||
        startAyah > endAyah
      ) {
        setFormError(`حدد نطاقاً صالحاً بين الآية ١ والآية ${toArabicDigits(selectedSurah.numberOfAyahs)}.`);
        return;
      }

      reference = {
        surah: selectedSurah.number,
        surahName: selectedSurah.name,
        startAyah,
        endAyah,
      };
      title = `${selectedSurah.name} • الآيات ${toArabicDigits(startAyah)}–${toArabicDigits(endAyah)}`;
      ayahCount = endAyah - startAyah + 1;
    } else {
      if (
        !Number.isInteger(startPage) ||
        !Number.isInteger(endPage) ||
        startPage < 1 ||
        endPage > 604 ||
        startPage > endPage
      ) {
        setFormError("حدد نطاقاً صالحاً بين الصفحة ١ والصفحة ٦٠٤.");
        return;
      }

      reference = { startPage, endPage };
      title =
        startPage === endPage
          ? `صفحة ${toArabicDigits(startPage)}`
          : `الصفحات ${toArabicDigits(startPage)}–${toArabicDigits(endPage)}`;
      pageCount = endPage - startPage + 1;
    }

    const duplicate = units.some(
      (unit) => referenceIdentity(unit) === referenceIdentity({ type, reference }),
    );

    if (duplicate) {
      setFormError("هذا الورد موجود بالفعل في قائمتك. يمكنك مراجعته من لوحة التحكم.");
      return;
    }

    setSubmitting(true);
    try {
      if (type === "ayah_range" && selectedSurah) {
        pageCount = await getAyahRangePageCount(selectedSurah.number, startAyah, endAyah);
      }

      const unit = addUnit({
        title,
        type,
        reference,
        strength,
        pageCount,
        ayahCount,
      });
      onAdded(unit);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر إضافة الورد. حاول مرة أخرى.");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة ورد حفظ أو مراجعة"
      description="اختر نطاق الورد ودرجة حفظه الحالية، وسيبدأ التطبيق جدولة SM-2 من المعايير المناسبة لها فوراً."
      size="lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink transition hover:bg-cream-100"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="add-unit-form"
            disabled={submitting || loading || Boolean(surahsError)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(11,61,46,0.18)] transition hover:bg-brand-800 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? "جارٍ الإضافة…" : "إضافة الورد"}
          </button>
        </div>
      }
    >
      <form id="add-unit-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        {surahsError ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1 font-semibold">{surahsError}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-red-700 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        <section>
          <p className="mb-2 text-xs font-extrabold text-brand-950">طريقة تحديد الورد</p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-cream-100/70 p-1.5">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setType(option.value);
                    setFormError(null);
                  }}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[11px] font-extrabold transition sm:flex-row sm:gap-2 sm:text-xs",
                    active
                      ? "bg-white text-brand-950 shadow-[0_6px_18px_rgba(27,42,35,0.09)]"
                      : "text-muted hover:bg-white/60 hover:text-brand-900",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-gold-600" : "text-muted")} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-brand-950">درجة الحفظ الحالية</p>
            <span className="text-[9px] font-semibold text-muted">تُضبط معايير SM-2 تلقائياً</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {strengthLevels.map((level) => {
              const profile = strengthProfiles[level];
              const active = strength === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStrength(level);
                    setFormError(null);
                  }}
                  className={cn(
                    "rounded-2xl border p-3 text-right transition",
                    active
                      ? "border-brand-300 bg-brand-50 shadow-[0_0_0_3px_rgba(31,132,100,0.08)]"
                      : "border-line bg-white hover:border-brand-100",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", profile.dotClass)} />
                    <span className="text-xs font-extrabold text-brand-950">{profile.label}</span>
                    {active ? (
                      <span
                        className={cn(
                          "mr-auto rounded-full px-1.5 py-0.5 text-[8px] font-extrabold",
                          profile.badgeClass,
                        )}
                      >
                        مختارة
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[9px] font-semibold leading-4 text-muted">
                    {profile.description}
                  </p>
                  <p className="mt-1 text-[9px] font-bold text-brand-700">
                    الاستحقاق {formatInterval(profile.interval)} • سهولة {toArabicDigits(profile.easeFactor)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {type !== "page" ? (
          <section>
            <label className={labelClassName} htmlFor="surah-select">
              السورة
            </label>
            <div className="relative">
              <select
                id="surah-select"
                value={surahNumber}
                onChange={(event) => handleSurahChange(event.target.value)}
                disabled={loading || surahs.length === 0}
                className={cn(inputClassName, "appearance-none pl-10 disabled:bg-cream-100")}
              >
                {loading ? <option value={surahNumber}>جارٍ تحميل السور…</option> : null}
                {surahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {toArabicDigits(surah.number)}. {surah.name}
                  </option>
                ))}
              </select>
              {loading ? (
                <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-600" />
              ) : (
                <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              )}
            </div>

            {selectedSurah ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-muted">
                <span className="rounded-full border border-line bg-cream-100 px-2 py-1">
                  {toArabicDigits(selectedSurah.numberOfAyahs)} آية
                </span>
                <span className="rounded-full border border-line bg-cream-100 px-2 py-1">
                  {toArabicDigits(selectedSurah.pageCount)} صفحة
                </span>
                <span className="rounded-full border border-line bg-cream-100 px-2 py-1">
                  الجزء {toArabicDigits(selectedSurah.juzStart)}
                  {selectedSurah.juzEnd !== selectedSurah.juzStart
                    ? `–${toArabicDigits(selectedSurah.juzEnd)}`
                    : ""}
                </span>
                <span className="truncate">{selectedSurah.englishName}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {type === "ayah_range" ? (
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClassName} htmlFor="start-ayah">
                من الآية
              </label>
              <input
                id="start-ayah"
                type="number"
                inputMode="numeric"
                min={1}
                max={selectedSurah?.numberOfAyahs ?? 286}
                value={startAyah}
                onChange={(event) => {
                  setStartAyah(Number(event.target.value));
                  setFormError(null);
                }}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="end-ayah">
                إلى الآية
              </label>
              <input
                id="end-ayah"
                type="number"
                inputMode="numeric"
                min={1}
                max={selectedSurah?.numberOfAyahs ?? 286}
                value={endAyah}
                onChange={(event) => {
                  setEndAyah(Number(event.target.value));
                  setFormError(null);
                }}
                className={inputClassName}
              />
            </div>
            {selectedSurah ? (
              <p className="col-span-2 -mt-1 text-[10px] font-semibold text-muted">
                نطاق هذه السورة من الآية ١ إلى الآية {toArabicDigits(selectedSurah.numberOfAyahs)}.
              </p>
            ) : null}
          </section>
        ) : null}

        {type === "page" ? (
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClassName} htmlFor="start-page">
                من الصفحة
              </label>
              <input
                id="start-page"
                type="number"
                inputMode="numeric"
                min={1}
                max={604}
                value={startPage}
                onChange={(event) => {
                  setStartPage(Number(event.target.value));
                  setFormError(null);
                }}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="end-page">
                إلى الصفحة
              </label>
              <input
                id="end-page"
                type="number"
                inputMode="numeric"
                min={1}
                max={604}
                value={endPage}
                onChange={(event) => {
                  setEndPage(Number(event.target.value));
                  setFormError(null);
                }}
                className={inputClassName}
              />
            </div>
            <p className="col-span-2 -mt-1 text-[10px] font-semibold text-muted">
              صفحات المصحف من ١ إلى ٦٠٤، ويُعرض نص كل الصفحات المحددة في جلسة المراجعة.
            </p>
          </section>
        ) : null}

        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-6 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        ) : null}

        <section className="rounded-2xl border border-gold-200/80 bg-gradient-to-l from-gold-100/70 to-brand-50/70 p-4">
          <p className="text-[10px] font-extrabold tracking-wide text-gold-700">سيتم إضافة</p>
          <p className="mt-1 text-balance text-sm font-extrabold text-brand-950">{previewTitle}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted">
            {unitTypeLabels[type]} • درجة {strengthProfiles[strength].label} • أول استحقاق{" "}
            {formatInterval(strengthProfiles[strength].interval)}
          </p>
        </section>
      </form>
    </Modal>
  );
}

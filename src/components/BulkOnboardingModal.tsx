"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Layers,
  Library,
  ListOrdered,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useJuzs } from "@/hooks/useJuzs";
import { useSurahs } from "@/hooks/useSurahs";
import { strengthLevels, strengthProfiles } from "@/lib/strength";
import { useQuranStore } from "@/lib/store";
import type {
  JuzData,
  NewUnitInput,
  StrengthLevel,
  SurahMeta,
  UnitType,
} from "@/lib/types";
import { cn, normalizeArabic, toArabicDigits } from "@/lib/utils";

type BulkTab = "surahs" | "juzs" | "pages";

interface BulkOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (result: { added: number; skipped: number }) => void;
}

const inputClassName =
  "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-extrabold text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

const tabs: Array<{ id: BulkTab; label: string; icon: typeof BookOpen }> = [
  { id: "surahs", label: "السور", icon: BookOpen },
  { id: "juzs", label: "الأجزاء", icon: Library },
  { id: "pages", label: "الصفحات", icon: Layers },
];

function toggleSetValue<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function juzPageCount(juz: JuzData): number {
  return juz.portions.reduce((total, portion) => total + portion.pageCount, 0);
}

export function BulkOnboardingModal({
  open,
  onClose,
  onAdded,
}: BulkOnboardingModalProps) {
  const { surahs, loading: surahsLoading, error: surahsError, reload: reloadSurahs } = useSurahs();
  const { juzs, loading: juzsLoading, error: juzsError, reload: reloadJuzs } = useJuzs();
  const addUnits = useQuranStore((state) => state.addUnits);

  const [tab, setTab] = useState<BulkTab>("surahs");
  const [strength, setStrength] = useState<StrengthLevel>("medium");
  const [selectedSurahs, setSelectedSurahs] = useState<Set<number>>(new Set());
  const [selectedJuzs, setSelectedJuzs] = useState<Set<number>>(new Set());
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(10);
  const [pagesPerUnit, setPagesPerUnit] = useState(1);
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredSurahs = useMemo(() => {
    const tokens = normalizeArabic(query).split(" ").filter(Boolean);
    if (tokens.length === 0) return surahs;

    return surahs.filter((surah) => {
      const haystack = normalizeArabic(
        `${surah.name} ${surah.englishName} ${surah.number} ${toArabicDigits(surah.number)}`,
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [surahs, query]);

  const surahGroups = useMemo(() => {
    const groups = new Map<number, SurahMeta[]>();
    const hasQuery = normalizeArabic(query).length > 0;

    if (!hasQuery) {
      for (let juz = 1; juz <= 30; juz += 1) groups.set(juz, []);
    }

    for (const surah of filteredSurahs) {
      const juz = surah.juzStart ?? 1;
      if (!groups.has(juz)) groups.set(juz, []);
      groups.get(juz)?.push(surah);
    }

    const entries = [...groups.entries()].sort((first, second) => first[0] - second[0]);
    return hasQuery ? entries.filter((entry) => entry[1].length > 0) : entries;
  }, [filteredSurahs, query]);

  const selectedJuzPortionCount = useMemo(
    () =>
      juzs
        .filter((juz) => selectedJuzs.has(juz.number))
        .reduce((total, juz) => total + juz.portions.length, 0),
    [juzs, selectedJuzs],
  );

  const pageUnitCount = useMemo(() => {
    const start = Math.max(1, Math.floor(startPage));
    const end = Math.min(604, Math.floor(endPage));
    const perUnit = Math.max(1, Math.floor(pagesPerUnit));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return 0;
    return Math.ceil((end - start + 1) / perUnit);
  }, [startPage, endPage, pagesPerUnit]);

  const pendingCount =
    tab === "surahs"
      ? selectedSurahs.size
      : tab === "juzs"
        ? selectedJuzPortionCount
        : pageUnitCount;

  const activeLoading = tab === "juzs" ? juzsLoading : tab === "surahs" ? surahsLoading : false;
  const activeError = tab === "juzs" ? juzsError : tab === "surahs" ? surahsError : null;

  const toggleSurah = (number: number) => {
    setSelectedSurahs((current) => toggleSetValue(current, number));
    setFormError(null);
  };

  const selectVisibleSurahs = () => {
    setSelectedSurahs((current) => {
      const next = new Set(current);
      for (const surah of filteredSurahs) next.add(surah.number);
      return next;
    });
    setFormError(null);
  };

  const selectGroup = (group: SurahMeta[]) => {
    setSelectedSurahs((current) => {
      const next = new Set(current);
      const allSelected = group.every((surah) => next.has(surah.number));
      for (const surah of group) {
        if (allSelected) next.delete(surah.number);
        else next.add(surah.number);
      }
      return next;
    });
    setFormError(null);
  };

  const toggleJuz = (number: number) => {
    setSelectedJuzs((current) => toggleSetValue(current, number));
    setFormError(null);
  };

  const selectWholeJuz = (number: number) => {
    setSelectedJuzs((current) => {
      const next = new Set(current);
      next.add(number);
      return next;
    });
    setTab("juzs");
    setFormError(null);
  };

  const handleSubmit = () => {
    if (submitting) return;
    setFormError(null);
    const drafts: NewUnitInput[] = [];

    if (tab === "surahs") {
      if (selectedSurahs.size === 0) {
        setFormError("اختر سورة واحدة على الأقل من القائمة.");
        return;
      }

      for (const surahNumber of [...selectedSurahs].sort((a, b) => a - b)) {
        const surah = surahs.find((item) => item.number === surahNumber);
        if (!surah) continue;
        drafts.push({
          title: surah.name,
          type: "surah",
          reference: {
            surah: surah.number,
            surahName: surah.name,
            startAyah: 1,
            endAyah: surah.numberOfAyahs,
          },
          strength,
          pageCount: surah.pageCount,
          ayahCount: surah.numberOfAyahs,
        });
      }
    } else if (tab === "juzs") {
      if (selectedJuzs.size === 0) {
        setFormError("اختر جزءاً واحداً على الأقل من قائمة الأجزاء.");
        return;
      }

      for (const juzNumber of [...selectedJuzs].sort((a, b) => a - b)) {
        const juz = juzs.find((item) => item.number === juzNumber);
        if (!juz) continue;
        for (const portion of juz.portions) {
          const isWholeSurah =
            portion.startAyah === 1 && portion.endAyah === portion.surah.numberOfAyahs;
          const type: UnitType = isWholeSurah ? "surah" : "ayah_range";
          drafts.push({
            title: isWholeSurah
              ? portion.surah.name
              : `${portion.surah.name} • الآيات ${toArabicDigits(portion.startAyah)}–${toArabicDigits(portion.endAyah)}`,
            type,
            reference: isWholeSurah
              ? {
                  surah: portion.surah.number,
                  surahName: portion.surah.name,
                  startAyah: 1,
                  endAyah: portion.surah.numberOfAyahs,
                }
              : {
                  surah: portion.surah.number,
                  surahName: portion.surah.name,
                  startAyah: portion.startAyah,
                  endAyah: portion.endAyah,
                },
            strength,
            pageCount: portion.pageCount,
            ayahCount: portion.ayahCount,
          });
        }
      }
    } else {
      const start = Math.max(1, Math.floor(startPage));
      const end = Math.min(604, Math.floor(endPage));
      const perUnit = Math.max(1, Math.floor(pagesPerUnit));

      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
        setFormError("حدد نطاق صفحات صالحاً بين الصفحة ١ والصفحة ٦٠٤.");
        return;
      }

      for (let page = start; page <= end; page += perUnit) {
        const lastPage = Math.min(end, page + perUnit - 1);
        drafts.push({
          title: page === lastPage ? `صفحة ${toArabicDigits(page)}` : `الصفحات ${toArabicDigits(page)}–${toArabicDigits(lastPage)}`,
          type: "page",
          reference: { startPage: page, endPage: lastPage },
          strength,
          pageCount: lastPage - page + 1,
        });
      }
    }

    if (drafts.length === 0) {
      setFormError("لم يتم تجهيز أي أوراد من التحديد الحالي.");
      return;
    }

    setSubmitting(true);
    const result = addUnits(drafts);
    setSubmitting(false);

    if (result.added.length === 0) {
      setFormError("كل الأوراد المحددة موجودة بالفعل في سجلك.");
      return;
    }

    onAdded({ added: result.added.length, skipped: result.skipped });
  };

  const renderStrengthPicker = () => (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-brand-950">درجة الحفظ لهذه الإضافة</p>
        <span className="text-[9px] font-semibold text-muted">تُطبق على كل الأوراد المحددة</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {strengthLevels.map((level) => {
          const profile = strengthProfiles[level];
          const active = strength === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => {
                setStrength(level);
                setFormError(null);
              }}
              aria-pressed={active}
              className={cn(
                "rounded-2xl border p-2.5 text-right transition",
                active
                  ? "border-brand-300 bg-brand-50 shadow-[0_0_0_3px_rgba(31,132,100,0.08)]"
                  : "border-line bg-white hover:border-brand-100",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", profile.dotClass)} />
                <span className="text-[11px] font-extrabold text-brand-950">{profile.label}</span>
                {active ? <Check className="mr-auto h-3 w-3 text-brand-700" /> : null}
              </span>
              <span className="mt-1 block text-[8px] font-semibold leading-4 text-muted">
                {profile.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="سجل محفوظاتي — إضافة سريعة"
      description="أضف ما حفظته سابقاً دفعة واحدة، واختر درجة الحفظ لتُضبط مراجعاتك من اليوم الأول."
      size="lg"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-bold text-muted">
            سيُضاف{" "}
            <span className="font-extrabold text-brand-950">{toArabicDigits(pendingCount)}</span>{" "}
            {tab === "juzs" ? "ورداً من الأجزاء" : tab === "pages" ? "ورداً من الصفحات" : "سورة"} بدرجة{" "}
            <span className="font-extrabold text-brand-950">{strengthProfiles[strength].label}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-cream-100"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || activeLoading || pendingCount === 0 || Boolean(activeError)}
              className="inline-flex min-w-36 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {submitting ? "جارٍ الإضافة…" : `إضافة ${toArabicDigits(pendingCount)} ورد`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-cream-100/70 p-1.5">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setFormError(null);
                }}
                aria-pressed={active}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-extrabold transition",
                  active
                    ? "bg-white text-brand-950 shadow-[0_5px_16px_rgba(27,42,35,0.08)]"
                    : "text-muted hover:bg-white/60 hover:text-brand-900",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-gold-600" : "text-muted")} />
                {item.label}
                {item.id === "surahs" && selectedSurahs.size > 0 ? (
                  <span className="rounded-full bg-brand-900 px-1.5 py-0.5 text-[8px] text-white">
                    {toArabicDigits(selectedSurahs.size)}
                  </span>
                ) : null}
                {item.id === "juzs" && selectedJuzs.size > 0 ? (
                  <span className="rounded-full bg-brand-900 px-1.5 py-0.5 text-[8px] text-white">
                    {toArabicDigits(selectedJuzs.size)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {renderStrengthPicker()}

        {activeError ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="flex-1 font-semibold">{activeError}</p>
            <button
              type="button"
              onClick={() => void (tab === "juzs" ? reloadJuzs() : reloadSurahs())}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-red-700 shadow-sm"
            >
              <RefreshCw className="h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        {tab === "surahs" ? (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث باسم السورة أو رقمها…"
                  className="h-10 w-full rounded-xl border border-line bg-white pr-9 pl-9 text-xs font-semibold text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-muted/70 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-cream-100"
                    aria-label="مسح البحث"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={selectVisibleSurahs}
                  disabled={filteredSurahs.length === 0}
                  className="rounded-lg border border-line bg-white px-2.5 py-2 text-[10px] font-extrabold text-brand-900 transition hover:bg-brand-50 disabled:opacity-40"
                >
                  تحديد الظاهر
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSurahs(new Set())}
                  disabled={selectedSurahs.size === 0}
                  className="rounded-lg border border-line bg-white px-2.5 py-2 text-[10px] font-extrabold text-muted transition hover:bg-cream-100 disabled:opacity-40"
                >
                  مسح
                </button>
              </div>
            </div>

            {surahsLoading ? (
              <BulkLoading label="جارٍ تحميل السور…" />
            ) : filteredSurahs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-cream-50 p-6 text-center text-xs font-semibold text-muted">
                لا توجد سور مطابقة لبحثك.
              </p>
            ) : (
              <div className="space-y-4">
                {surahGroups.map(([juz, group]) => {
                  const allSelected =
                    group.length > 0 && group.every((surah) => selectedSurahs.has(surah.number));
                  return (
                    <div key={juz}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-900 px-2.5 py-1 text-[9px] font-extrabold text-white">
                          الجزء {toArabicDigits(juz)}
                        </span>
                        <span className="text-[9px] font-bold text-muted">
                          {group.length > 0
                            ? `${toArabicDigits(group.length)} سورة تبدأ في هذا الجزء`
                            : "تكملة سور من الجزء السابق"}
                        </span>
                        <div className="mr-auto flex flex-wrap gap-1">
                          {group.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => selectGroup(group)}
                              className="rounded-full border border-line bg-white px-2.5 py-1 text-[9px] font-extrabold text-brand-800 transition hover:bg-brand-50"
                            >
                              {allSelected ? "إلغاء تحديد السور" : "تحديد سور الجزء"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => selectWholeJuz(juz)}
                            className="rounded-full border border-gold-200 bg-gold-100/70 px-2.5 py-1 text-[9px] font-extrabold text-gold-800 transition hover:bg-gold-100"
                          >
                            الجزء كاملاً
                          </button>
                        </div>
                      </div>
                      {group.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-line bg-cream-50 px-3 py-2.5 text-[9px] font-semibold leading-5 text-muted">
                          لا تبدأ سورة جديدة في هذا الجزء، لكن يمكنك إضافته كاملاً من زر «الجزء
                          كاملاً» دون تكرار أي سورة.
                        </p>
                      ) : (
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {group.map((surah) => (
                            <SurahChip
                              key={surah.number}
                              surah={surah}
                              selected={selectedSurahs.has(surah.number)}
                              onToggle={() => toggleSurah(surah.number)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {tab === "juzs" ? (
          <section className="space-y-3">
            <div className="flex flex-col gap-2 rounded-2xl border border-gold-200/80 bg-gold-100/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-semibold leading-5 text-gold-800">
                اختيار الجزء يضيف كل نطاقاته بدقة، حتى لو امتدت السورة على أكثر من جزء.
              </p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedJuzs(new Set(juzs.map((juz) => juz.number)))
                  }
                  disabled={juzs.length === 0}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-brand-900 shadow-sm transition hover:bg-brand-50 disabled:opacity-40"
                >
                  تحديد كل الأجزاء
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJuzs(new Set())}
                  disabled={selectedJuzs.size === 0}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-muted shadow-sm transition hover:bg-cream-100 disabled:opacity-40"
                >
                  مسح
                </button>
              </div>
            </div>

            {juzsLoading ? (
              <BulkLoading label="جارٍ تحميل الأجزاء…" />
            ) : (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {juzs.map((juz) => {
                  const selected = selectedJuzs.has(juz.number);
                  const surahNames = [...new Set(juz.portions.map((portion) => portion.surah.name))];
                  return (
                    <button
                      key={juz.number}
                      type="button"
                      onClick={() => toggleJuz(juz.number)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-2xl border p-3 text-right transition",
                        selected
                          ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgba(31,132,100,0.08)]"
                          : "border-line bg-white hover:border-brand-100 hover:bg-cream-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-brand-950">
                          الجزء {toArabicDigits(juz.number)}
                        </span>
                        <span
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-full border",
                            selected
                              ? "border-brand-700 bg-brand-900 text-white"
                              : "border-line bg-cream-50 text-transparent",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[9px] font-semibold text-muted">
                        {surahNames.slice(0, 3).join("، ")}
                        {surahNames.length > 3 ? "…" : ""}
                      </p>
                      <p className="mt-1 text-[8px] font-bold text-brand-700">
                        {toArabicDigits(juz.portions.length)} ورد • {toArabicDigits(juzPageCount(juz))} صفحة
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {tab === "pages" ? (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-brand-950" htmlFor="bulk-start-page">
                  من الصفحة
                </label>
                <input
                  id="bulk-start-page"
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
                <label className="mb-1.5 block text-xs font-extrabold text-brand-950" htmlFor="bulk-end-page">
                  إلى الصفحة
                </label>
                <input
                  id="bulk-end-page"
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
            </div>

            <div>
              <p className="mb-1.5 text-xs font-extrabold text-brand-950">تقسيم الورد</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 5, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPagesPerUnit(value);
                      setFormError(null);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-2 text-[10px] font-extrabold transition",
                      pagesPerUnit === value
                        ? "border-brand-700 bg-brand-900 text-white"
                        : "border-line bg-white text-muted hover:border-brand-200 hover:text-brand-800",
                    )}
                  >
                    {value === 1 ? "صفحة لكل ورد" : `${toArabicDigits(value)} صفحات لكل ورد`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-cream-50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-brand-950">
                  سيتم إنشاء {toArabicDigits(pageUnitCount)} ورد
                </p>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[9px] font-extrabold text-brand-800">
                  {toArabicDigits(Math.max(0, Math.min(604, Math.floor(endPage)) - Math.max(1, Math.floor(startPage)) + 1))} صفحة
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(pageUnitCount, 6) }, (_, index) => {
                  const page = Math.max(1, Math.floor(startPage)) + index * Math.max(1, Math.floor(pagesPerUnit));
                  const end = Math.min(
                    Math.min(604, Math.floor(endPage)),
                    page + Math.max(1, Math.floor(pagesPerUnit)) - 1,
                  );
                  return (
                    <span
                      key={page}
                      className="rounded-full border border-line bg-white px-2 py-1 text-[8px] font-bold text-muted"
                    >
                      {page === end ? `ص ${toArabicDigits(page)}` : `ص ${toArabicDigits(page)}–${toArabicDigits(end)}`}
                    </span>
                  );
                })}
                {pageUnitCount > 6 ? (
                  <span className="rounded-full bg-cream-200 px-2 py-1 text-[8px] font-bold text-muted">
                    +{toArabicDigits(pageUnitCount - 6)}
                  </span>
                ) : null}
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[9px] font-semibold leading-5 text-muted">
              <ListOrdered className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              مثال: من الصفحة ١ إلى ٥٠ مع تقسيم صفحتين لكل ورد ينتج ٢٥ وحدة مراجعة مستقلة.
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

        <p className="rounded-xl border border-line/80 bg-cream-100/60 p-2.5 text-[9px] font-semibold leading-5 text-muted">
          تُطبق درجة الحفظ المختارة على الأوراد في التبويب الحالي فقط. الأوراد المكررة في سجلك
          ستُتجاهل تلقائياً عند الحفظ.
        </p>
      </div>
    </Modal>
  );
}

interface SurahChipProps {
  surah: SurahMeta;
  selected: boolean;
  onToggle: () => void;
}

function SurahChip({ surah, selected, onToggle }: SurahChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-right transition",
        selected
          ? "border-brand-600 bg-brand-50 shadow-[0_0_0_2px_rgba(31,132,100,0.08)]"
          : "border-line bg-white hover:border-brand-100 hover:bg-cream-50",
      )}
    >
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-[9px] font-extrabold",
          selected
            ? "border-brand-700 bg-brand-900 text-white"
            : "border-line bg-cream-100 text-muted",
        )}
      >
        {selected ? <Check className="h-3 w-3" /> : toArabicDigits(surah.number)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-extrabold text-brand-950">{surah.name}</span>
        <span className="mt-0.5 block text-[8px] font-semibold text-muted">
          {toArabicDigits(surah.numberOfAyahs)} آية • {toArabicDigits(surah.pageCount)} صفحة
        </span>
      </span>
      {surah.juzEnd !== surah.juzStart ? (
        <span className="shrink-0 rounded-full bg-gold-100 px-1.5 py-0.5 text-[7px] font-bold text-gold-700">
          ج {toArabicDigits(surah.juzStart)}–{toArabicDigits(surah.juzEnd)}
        </span>
      ) : null}
    </button>
  );
}

function BulkLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream-50 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      <p className="mt-2 text-xs font-bold text-muted">{label}</p>
    </div>
  );
}

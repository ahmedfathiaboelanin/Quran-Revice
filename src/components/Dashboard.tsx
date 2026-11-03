"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  History,
  Library,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { AddUnitModal } from "@/components/AddUnitModal";
import { BulkOnboardingModal } from "@/components/BulkOnboardingModal";
import { DailyWirdProgress } from "@/components/DailyWirdProgress";
import { Header } from "@/components/Header";
import { InventoryView } from "@/components/InventoryView";
import { ReviewSession } from "@/components/ReviewSession";
import { UnitCard } from "@/components/UnitCard";
import { WirdSettingsModal } from "@/components/WirdSettingsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { useHydrated } from "@/hooks/useHydrated";
import { useNow } from "@/hooks/useNow";
import { useToast } from "@/hooks/useToast";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { getDueUnits, isWeak } from "@/lib/srsAlgorithm";
import { strengthProfiles } from "@/lib/strength";
import { useQuranStore } from "@/lib/store";
import type { MemorizationUnit, StrengthLevel } from "@/lib/types";
import { cn, formatArabicNumber, formatLongDate, localDateKey, toArabicDigits } from "@/lib/utils";

type DashboardTab = "due" | "weak" | "inventory";

export default function Dashboard() {
  const hydrated = useHydrated();
  const now = useNow();
  const units = useQuranStore((state) => state.units);
  const removeUnit = useQuranStore((state) => state.removeUnit);
  const importUnits = useQuranStore((state) => state.importUnits);
  const updateStrength = useQuranStore((state) => state.updateStrength);
  const wirdSettings = useQuranStore((state) => state.wirdSettings);
  const lastPlan = useQuranStore((state) => state.lastPlan);
  const setWirdSettings = useQuranStore((state) => state.setWirdSettings);
  const rebalanceDailyWird = useQuranStore((state) => state.rebalanceDailyWird);
  const { toast, show, dismiss } = useToast();

  const [tab, setTab] = useState<DashboardTab>("due");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemorizationUnit | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dueUnits = useMemo(() => getDueUnits(units, now), [units, now]);
  const weakUnits = useMemo(
    () =>
      units
        .filter(isWeak)
        .sort(
          (first, second) =>
            first.easeFactor - second.easeFactor || second.lapseCount - first.lapseCount,
        ),
    [units],
  );
  const totalReviews = useMemo(
    () => units.reduce((total, unit) => total + unit.reviewCount, 0),
    [units],
  );
  const todayKey = localDateKey(now);

  useEffect(() => {
    if (!hydrated) return;
    rebalanceDailyWird();
  }, [hydrated, rebalanceDailyWird, todayKey]);

  const startReview = (targetUnits: MemorizationUnit[]) => {
    if (targetUnits.length === 0) {
      show("لا توجد وحدات جاهزة للمراجعة الآن.", "info");
      return;
    }
    setReviewIds(targetUnits.map((unit) => unit.id));
  };

  const handleExport = () => {
    if (units.length === 0) {
      show("لا توجد أوراد لتصديرها بعد.", "info");
      return;
    }
    downloadBackup(units, wirdSettings);
    show(`تم تنزيل نسخة احتياطية تضم ${formatArabicNumber(units.length)} ورد.`);
  };

  const handleStrengthChange = (unit: MemorizationUnit, strength: StrengthLevel) => {
    updateStrength(unit.id, strength);
    show(
      `تم تحديث درجة «${unit.title}» إلى ${strengthProfiles[strength].label}، وأُعيد ضبط موعد استحقاقها.`,
      "success",
    );
  };

  const handleBulkAdded = (result: { added: number; skipped: number }) => {
    setBulkOpen(false);
    rebalanceDailyWird(true);
    const parts = [`تمت إضافة ${toArabicDigits(result.added)} ورد إلى سجل محفوظاتك`];
    if (result.skipped > 0) {
      parts.push(`وتُوجّه ${toArabicDigits(result.skipped)} ورد مكرر`);
    }
    show(`${parts.join("، ")}.`, result.skipped > 0 ? "info" : "success");
  };

  const handleSaveSettings = (settings: typeof wirdSettings) => {
    setWirdSettings(settings);
    rebalanceDailyWird(true);
    setSettingsOpen(false);
    show("تم تحديث إعدادات الورد اليومي وإعادة توزيع المستحق.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      show("حجم ملف النسخة الاحتياطية أكبر من الحد المسموح (٥ ميجابايت).", "error");
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      const added = importUnits(parsed.units);
      const updated = parsed.units.length - added;
      const parts = [`تم استيراد ${toArabicDigits(parsed.units.length)} ورد`];

      if (added > 0 && updated > 0) {
        parts.push(`(${toArabicDigits(added)} جديد، ${toArabicDigits(updated)} محدّث)`);
      } else if (added > 0) {
        parts.push(`(${toArabicDigits(added)} جديد)`);
      } else {
        parts.push(`(${toArabicDigits(updated)} محدّث)`);
      }

      if (parsed.skipped > 0) {
        parts.push(`وتم تجاهل ${toArabicDigits(parsed.skipped)} سجلاً غير صالح`);
      }

      if (parsed.settings) {
        setWirdSettings(parsed.settings);
      }
      rebalanceDailyWird(true);
      show(`${parts.join(" ")}.`, parsed.skipped > 0 ? "info" : "success");
    } catch (error) {
      show(error instanceof Error ? error.message : "تعذر استيراد النسخة الاحتياطية.", "error");
    } finally {
      setImporting(false);
    }
  };

  if (!hydrated) {
    return <DashboardLoading />;
  }

  if (reviewIds) {
    return <ReviewSession unitIds={reviewIds} onExit={() => setReviewIds(null)} />;
  }

  const tabs: Array<{
    id: DashboardTab;
    label: string;
    count: number;
    icon: typeof CalendarClock;
  }> = [
    { id: "due", label: "مراجعات اليوم", count: dueUnits.length, icon: CalendarClock },
    { id: "weak", label: "تحتاج تثبيت", count: weakUnits.length, icon: ShieldAlert },
    { id: "inventory", label: "سجل محفوظاتي", count: units.length, icon: Library },
  ];

  const hasNoUnits = units.length === 0;

  return (
    <div className="app-canvas min-h-[100dvh]">
      <Header onAdd={() => setAddOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <section className="relative animate-fade-up overflow-hidden rounded-[2rem] border border-brand-900/10 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-5 text-white shadow-[0_26px_70px_rgba(6,43,32,0.24)] sm:p-7">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border border-gold-300/15" />
          <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full border border-dashed border-gold-300/15" />
          <div className="dot-pattern pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="pointer-events-none absolute -bottom-20 right-8 h-52 w-52 rounded-full bg-gold-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-gold-100 backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-gold-300" />
                {formatLongDate(now)}
              </div>
              <h1 className="mt-4 text-balance font-quran text-3xl font-bold leading-[1.55] sm:text-4xl">
                السلام عليكم،
                <br />
                <span className="text-gold-300">لنبدأ ورد اليوم بطمأنينة</span>
              </h1>
              <p className="mt-3 max-w-lg text-balance text-xs leading-7 text-white/65 sm:text-sm">
                {hasNoUnits
                  ? "أضف أول ورد حفظ أو مراجعة، وسيتولى التطبيق تنظيم مواعيد المراجعة بالتكرار المتباعد حتى يثبت حفظك."
                  : dueUnits.length > 0
                    ? `لديك ${formatArabicNumber(dueUnits.length)} ورداً مستحقاً اليوم. المراجعة القصيرة المنتظمة خير من المراجعة الطويلة المتقطعة.`
                    : "لا توجد مراجعات مستحقة اليوم. يمكنك مراجعة أي ورد الآن من محفوظاتك، أو إضافة ورد جديد."}
              </p>
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 sm:h-28 sm:w-28">
                <span className="absolute inset-2.5 rounded-full border border-dashed border-gold-300/25" />
                <div className="text-center">
                  <p className="text-3xl font-extrabold leading-none text-gold-300 sm:text-4xl">
                    {toArabicDigits(dueUnits.length)}
                  </p>
                  <p className="mt-1 text-[9px] font-bold text-white/60">مستحق اليوم</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 sm:flex-none">
                <button
                  type="button"
                  onClick={() => startReview(dueUnits)}
                  disabled={dueUnits.length === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 py-2.5 text-xs font-extrabold text-brand-950 shadow-[0_10px_28px_rgba(201,162,39,0.24)] transition hover:bg-gold-300 disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none sm:px-5 sm:text-sm"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {dueUnits.length > 0 ? "ابدأ المراجعة اليومية" : "لا توجد مراجعات اليوم"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white/85 transition hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة ورد جديد
                </button>
              </div>
            </div>
          </div>
        </section>

        <DailyWirdProgress
          units={units}
          settings={wirdSettings}
          now={now}
          lastPlan={lastPlan}
          onOpenSettings={() => setSettingsOpen(true)}
          onStartReview={startReview}
        />

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={CalendarClock}
            value={dueUnits.length}
            label="مراجعات اليوم"
            hint="جاهزة الآن"
            tone="gold"
          />
          <StatCard
            icon={ShieldAlert}
            value={weakUnits.length}
            label="تحتاج تثبيت"
            hint="تحتاج متابعة"
            tone="red"
          />
          <StatCard
            icon={BookOpen}
            value={units.length}
            label="كل المحفوظات"
            hint="في وردك"
            tone="brand"
          />
          <StatCard
            icon={History}
            value={totalReviews}
            label="إجمالي المراجعات"
            hint="منذ البداية"
            tone="cream"
          />
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="custom-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto rounded-2xl border border-line/90 bg-white/70 p-1.5 shadow-sm">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-extrabold transition sm:text-xs",
                      active
                        ? "bg-brand-900 text-white shadow-sm"
                        : "text-muted hover:bg-brand-50 hover:text-brand-900",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] font-extrabold",
                        active ? "bg-gold-400 text-brand-950" : "bg-cream-200 text-muted",
                      )}
                    >
                      {toArabicDigits(item.count)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {tab === "due" && dueUnits.length > 1 ? (
                <button
                  type="button"
                  onClick={() => startReview(dueUnits)}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 px-3 text-[11px] font-extrabold text-brand-800 transition hover:bg-brand-100"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  مراجعة الكل
                </button>
              ) : null}
            </div>
          </div>

          {tab === "inventory" ? (
            <InventoryView
              units={units}
              now={now}
              onReview={(unit) => startReview([unit])}
              onDelete={setDeleteTarget}
              onBulkAdd={() => setBulkOpen(true)}
              onStrengthChange={handleStrengthChange}
            />
          ) : hasNoUnits ? (
            <EmptyState
              icon={Sparkles}
              title="ابدأ رحلة حفظك مع كتاب الله"
              description="أضف أول ورد جديد، أو استخدم سجل محفوظاتي لإدخال ما حفظته سابقاً بدرجة حفظه الحالية."
              actionLabel="إضافة أول ورد"
              actionIcon={Plus}
              onAction={() => setAddOpen(true)}
            />
          ) : (tab === "due" ? dueUnits : weakUnits).length === 0 ? (
            tab === "due" ? (
              <EmptyState
                icon={CheckCircle2}
                title="أحسنت، لا توجد مراجعات مستحقة اليوم"
                description="وردك اليومي مكتمل. يمكنك مراجعة أي ورد الآن من سجل محفوظاتك، أو سحب ورد إضافي من نصاب الغد."
                actionLabel="عرض سجل محفوظاتي"
                actionIcon={Library}
                onAction={() => setTab("inventory")}
              />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="محفوظاتك متماسكة حتى الآن"
                description="لا توجد أوراد بدرجة ضعيف أو متوسط. استمر على وردك اليومي ليبقى حفظك ثابتاً."
                actionLabel="عرض سجل محفوظاتي"
                actionIcon={Library}
                onAction={() => setTab("inventory")}
              />
            )
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(tab === "due" ? dueUnits : weakUnits).map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  now={now}
                  onReview={(target) => startReview([target])}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-9 overflow-hidden rounded-3xl border border-line/90 bg-white/75 shadow-[0_18px_50px_rgba(27,42,35,0.05)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-brand-950">النسخ الاحتياطي لبياناتك</h2>
                <p className="mt-1 max-w-xl text-[11px] leading-6 text-muted">
                  تقدمك محفوظ على هذا الجهاز فقط. صدّر نسخة JSON دورياً، أو استوردها على جهاز آخر
                  لاستكمال وردك. الاستيراد يدمج الأوراد دون حذف الموجود.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-extrabold text-brand-900 transition hover:border-brand-100 hover:bg-brand-50"
              >
                <Download className="h-4 w-4 text-brand-700" />
                تصدير JSON
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                استيراد نسخة
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => void handleImport(event)}
                className="hidden"
                aria-label="اختيار ملف النسخة الاحتياطية"
              />
            </div>
          </div>
        </section>

        <footer className="mt-9 border-t border-line/70 pt-6 text-center">
          <p className="font-quran text-lg text-brand-900">«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»</p>
          <p className="mt-2 text-[10px] font-semibold leading-5 text-muted">
            ورد الحفظ — يعمل دون اتصال بعد أول زيارة، وبيانات تقدمك تبقى على جهازك.
          </p>
        </footer>
      </main>

      {addOpen ? (
        <AddUnitModal
          open
          onClose={() => setAddOpen(false)}
          onAdded={(unit) => {
            setAddOpen(false);
            rebalanceDailyWird(true);
            show(
              `تمت إضافة «${unit.title}» بدرجة ${strengthProfiles[unit.strength].label} إلى وردك.`,
            );
          }}
        />
      ) : null}

      {bulkOpen ? (
        <BulkOnboardingModal
          open
          onClose={() => setBulkOpen(false)}
          onAdded={handleBulkAdded}
        />
      ) : null}

      <WirdSettingsModal
        open={settingsOpen}
        settings={wirdSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الورد"
        description={
          deleteTarget
            ? `سيتم حذف «${deleteTarget.title}» وسجل مراجعته نهائياً من هذا الجهاز. لا يمكن التراجع إلا من نسخة احتياطية.`
            : ""
        }
        confirmLabel="حذف الورد"
        onConfirm={() => {
          if (!deleteTarget) return;
          removeUnit(deleteTarget.id);
          show(`تم حذف «${deleteTarget.title}».`, "info");
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

interface StatCardProps {
  icon: typeof CalendarClock;
  value: number;
  label: string;
  hint: string;
  tone: "gold" | "red" | "brand" | "cream";
}

const statTones = {
  gold: {
    icon: "bg-gold-100 text-gold-700",
    value: "text-gold-700",
  },
  red: {
    icon: "bg-red-50 text-red-600",
    value: "text-red-700",
  },
  brand: {
    icon: "bg-brand-50 text-brand-800",
    value: "text-brand-900",
  },
  cream: {
    icon: "bg-cream-200 text-brand-900",
    value: "text-brand-900",
  },
};

function StatCard({ icon: Icon, value, label, hint, tone }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line/90 bg-white/75 p-4 shadow-[0_10px_30px_rgba(27,42,35,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", statTones[tone].icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[9px] font-bold text-muted">{hint}</span>
      </div>
      <p className={cn("mt-3 text-2xl font-extrabold leading-none", statTones[tone].value)}>
        {formatArabicNumber(value)}
      </p>
      <p className="mt-1.5 text-[11px] font-bold text-muted">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon: typeof Sparkles;
  title: string;
  description: string;
  actionLabel: string;
  actionIcon?: typeof Plus;
  onAction: () => void;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/55 px-5 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold-200 bg-gold-100/70 text-gold-700">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-balance text-base font-extrabold text-brand-950">{title}</h2>
      <p className="mt-2 max-w-md text-balance text-xs leading-7 text-muted">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-800"
      >
        {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
        {actionLabel}
      </button>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="app-canvas grid min-h-[100dvh] place-items-center px-4">
      <div className="flex flex-col items-center">
        <div className="relative grid h-16 w-16 animate-pulse place-items-center rounded-[1.4rem] bg-gradient-to-br from-brand-800 to-brand-950 text-gold-300 shadow-[0_16px_40px_rgba(6,43,32,0.22)]">
          <BookOpen className="h-8 w-8" />
          <span className="absolute -left-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-cream-50 bg-gold-400" />
        </div>
        <p className="mt-4 text-xs font-bold text-muted">جارٍ تحميل وردك…</p>
      </div>
    </div>
  );
}

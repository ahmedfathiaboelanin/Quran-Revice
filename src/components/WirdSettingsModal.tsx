"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Layers,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { strengthProfiles } from "@/lib/strength";
import type { WirdCapacityMode, WirdSettings } from "@/lib/types";
import { cn, toArabicDigits } from "@/lib/utils";
import { normalizeWirdSettings } from "@/lib/wirdPlanner";

interface WirdSettingsModalProps {
  open: boolean;
  settings: WirdSettings;
  onClose: () => void;
  onSave: (settings: WirdSettings) => void;
}

const pagePresets = [3, 5, 10, 15, 20];
const unitPresets = [1, 2, 3, 5];

const inputClassName =
  "h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-extrabold text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100/70";

export function WirdSettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: WirdSettingsModalProps) {
  const [draft, setDraft] = useState<WirdSettings>(settings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setError(null);
  }, [open, settings]);

  const mode = draft.capacityMode;
  const target = mode === "pages" ? draft.dailyPages : draft.dailyUnits;

  const updateMode = (capacityMode: WirdCapacityMode) => {
    setDraft((current) => ({ ...current, capacityMode }));
    setError(null);
  };

  const updateTarget = (value: number) => {
    setDraft((current) =>
      mode === "pages"
        ? { ...current, dailyPages: value }
        : { ...current, dailyUnits: value },
    );
    setError(null);
  };

  const handleSave = () => {
    const normalized = normalizeWirdSettings(draft);
    if (normalized.capacityMode === "pages" && normalized.dailyPages < 1) {
      setError("حدد عدد صفحات يومياً لا يقل عن صفحة واحدة.");
      return;
    }
    if (normalized.capacityMode === "units" && normalized.dailyUnits < 1) {
      setError("حدد عدد أوراد يومياً لا يقل عن ورد واحد.");
      return;
    }
    onSave(normalized);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إعدادات الورد اليومي"
      description="حدد سعة يومك، وسيوزع التطبيق المراجعات حسب أولوية درجة الحفظ ويؤجل الفائض إلى الغد."
      size="md"
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
            type="button"
            onClick={handleSave}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(11,61,46,0.18)] transition hover:bg-brand-800"
          >
            <Settings2 className="h-4 w-4" />
            حفظ الإعدادات
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="mb-2 text-xs font-extrabold text-brand-950">طريقة قياس النصاب اليومي</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateMode("pages")}
              aria-pressed={mode === "pages"}
              className={cn(
                "rounded-2xl border p-3 text-right transition",
                mode === "pages"
                  ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgba(31,132,100,0.08)]"
                  : "border-line bg-white hover:border-brand-100",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-100 text-brand-800">
                  <Layers className="h-4 w-4" />
                </span>
                <span className="text-xs font-extrabold text-brand-950">بعدد الصفحات</span>
              </span>
              <span className="mt-2 block text-[10px] font-semibold leading-5 text-muted">
                مناسب إذا كان وردك موزعاً على صفحات المصحف
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateMode("units")}
              aria-pressed={mode === "units"}
              className={cn(
                "rounded-2xl border p-3 text-right transition",
                mode === "units"
                  ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgba(31,132,100,0.08)]"
                  : "border-line bg-white hover:border-brand-100",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold-100 text-gold-700">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span className="text-xs font-extrabold text-brand-950">بعدد الأوراد</span>
              </span>
              <span className="mt-2 block text-[10px] font-semibold leading-5 text-muted">
                مناسب إذا كنت تفضل عدداً ثابتاً من السور أو المقاطع
              </span>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white/80 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-brand-950">
                {mode === "pages" ? "عدد الصفحات اليومي" : "عدد الأوراد اليومي"}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-muted">
                {mode === "pages"
                  ? "سيُحسب مجموع صفحات الورد المستحق، وليس عدد البطاقات فقط."
                  : "كل سورة أو نطاق آيات أو مجموعة صفحات تُعد ورداً واحداً."}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold text-brand-800">
              {toArabicDigits(target)} {mode === "pages" ? "صفحة" : "ورد"}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateTarget(Math.max(1, target - 1))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-cream-50 text-lg font-extrabold text-brand-900 transition hover:bg-cream-100"
              aria-label="تقليل النصاب"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={mode === "pages" ? 604 : 114}
              value={target}
              onChange={(event) => updateTarget(Number(event.target.value))}
              className={inputClassName}
              aria-label={mode === "pages" ? "عدد الصفحات اليومي" : "عدد الأوراد اليومي"}
            />
            <button
              type="button"
              onClick={() => updateTarget(Math.min(mode === "pages" ? 604 : 114, target + 1))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-cream-50 text-lg font-extrabold text-brand-900 transition hover:bg-cream-100"
              aria-label="زيادة النصاب"
            >
              +
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(mode === "pages" ? pagePresets : unitPresets).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateTarget(preset)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition",
                  target === preset
                    ? "border-brand-600 bg-brand-900 text-white"
                    : "border-line bg-cream-50 text-muted hover:border-brand-200 hover:text-brand-800",
                )}
              >
                {toArabicDigits(preset)} {mode === "pages" ? "صفحات" : "أوراد"}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gold-200/80 bg-gradient-to-l from-gold-100/70 to-brand-50/70 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-600" />
            <h3 className="text-xs font-extrabold text-brand-950">كيف يوزّع التطبيق الورد؟</h3>
          </div>
          <ol className="mt-3 space-y-2.5">
            {(["weak", "medium", "good", "strong"] as const).map((level, index) => {
              const profile = strengthProfiles[level];
              return (
                <li key={level} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[9px] font-extrabold text-brand-900 shadow-sm">
                    {toArabicDigits(index + 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-brand-950">
                      <span className={cn("h-2 w-2 rounded-full", profile.dotClass)} />
                      {profile.label}
                      {level === "good" ? (
                        <span className="text-[9px] font-semibold text-muted">وقوي معه</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] font-semibold leading-4 text-muted">
                      {profile.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/70 p-2.5 text-[9px] font-semibold leading-5 text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            عند تجاوز المستحق لسعتك اليومية، تُؤجل العناصر الأقل أولوية إلى الغد تلقائياً حتى لا
            يثقل الورد عليك.
          </p>
        </section>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </p>
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted">
          <CalendarRange className="h-3.5 w-3.5" />
          يمكنك تغيير النصاب في أي وقت، وسيُعاد توزيع المستحق فوراً.
        </p>
      </div>
    </Modal>
  );
}

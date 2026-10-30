"use client";

import { BookOpen, Plus } from "lucide-react";
import { InstallPwa } from "@/components/InstallPwa";

interface HeaderProps {
  onAdd: () => void;
}

export function Header({ onAdd }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-cream-50/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 text-gold-300 shadow-[0_10px_24px_rgba(6,43,32,0.24)]">
            <BookOpen className="h-6 w-6" strokeWidth={1.7} />
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-cream-50 bg-gold-400" />
          </div>
          <div className="min-w-0">
            <p className="font-quran text-xl font-bold leading-none text-brand-950 sm:text-2xl">
              ورد الحفظ
            </p>
            <p className="mt-1 truncate text-[10px] font-bold tracking-wide text-muted sm:text-[11px]">
              رفيقك اليومي لمراجعة كتاب الله
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InstallPwa />
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3.5 text-xs font-extrabold text-white shadow-[0_8px_20px_rgba(11,61,46,0.22)] transition hover:-translate-y-0.5 hover:bg-brand-800 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة ورد</span>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { ToastMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const Icon = toast.tone === "error" ? AlertTriangle : toast.tone === "info" ? Info : Check;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div
        role="status"
        className={cn(
          "pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_50px_rgba(6,43,32,0.22)] backdrop-blur-md",
          toast.tone === "error"
            ? "border-red-200 bg-red-50/95 text-red-900"
            : toast.tone === "info"
              ? "border-gold-200 bg-gold-100/95 text-gold-700"
              : "border-brand-100 bg-brand-50/95 text-brand-900",
        )}
      >
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full",
            toast.tone === "error"
              ? "bg-red-100 text-red-700"
              : toast.tone === "info"
                ? "bg-gold-200/70 text-gold-700"
                : "bg-brand-100 text-brand-800",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full opacity-60 transition hover:bg-black/5 hover:opacity-100"
          aria-label="إغلاق التنبيه"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-ink transition hover:bg-cream-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition",
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand-800 hover:bg-brand-700",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            tone === "danger" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700",
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="pt-1 text-sm leading-7 text-muted">{description}</p>
      </div>
    </Modal>
  );
}

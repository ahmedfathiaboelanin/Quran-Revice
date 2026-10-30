"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, SquarePlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function InstallPwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const navigatorWithStandalone = navigator as NavigatorWithStandalone;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;

    setIsStandalone(standalone);
    setIsIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    setDeferredPrompt(null);

    await prompt.prompt();
    await prompt.userChoice;
  };

  const buttonClassName =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white/75 px-3 text-xs font-extrabold text-brand-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-300 hover:bg-gold-100/60";

  if (deferredPrompt) {
    return (
      <button type="button" onClick={handleInstall} className={buttonClassName}>
        <Download className="h-4 w-4 text-gold-600" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sr-only sm:hidden">تثبيت التطبيق</span>
      </button>
    );
  }

  if (!isIos) return null;

  return (
    <>
      <button type="button" onClick={() => setShowIosHelp(true)} className={buttonClassName}>
        <Smartphone className="h-4 w-4 text-gold-600" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sr-only sm:hidden">تثبيت التطبيق</span>
      </button>

      <Modal
        open={showIosHelp}
        onClose={() => setShowIosHelp(false)}
        title="تثبيت ورد الحفظ على iPhone أو iPad"
        description="يمكنك استخدام التطبيق كتطبيق مستقل من الشاشة الرئيسية."
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="w-full rounded-xl bg-brand-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            فهمت
          </button>
        }
      >
        <ol className="space-y-4">
          <li className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
              <Share2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">افتح التطبيق في Safari</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                ثم اضغط على زر المشاركة في شريط المتصفح.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700">
              <SquarePlus className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">اختر «إضافة إلى الشاشة الرئيسية»</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                سيظهر التطبيق بعد ذلك كأيقونة مستقلة تعمل دون شريط المتصفح.
              </p>
            </div>
          </li>
        </ol>
      </Modal>
    </>
  );
}

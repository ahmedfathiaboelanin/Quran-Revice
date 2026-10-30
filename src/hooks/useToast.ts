"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastMessage, ToastTone } from "@/lib/types";

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ id: Date.now(), message, tone });
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 4200);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { toast, show, dismiss };
}

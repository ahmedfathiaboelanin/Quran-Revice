"use client";

import { useCallback, useEffect, useState } from "react";
import { getJuzs } from "@/lib/quranApi";
import type { JuzData } from "@/lib/types";

export function useJuzs() {
  const [juzs, setJuzs] = useState<JuzData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getJuzs();
      setJuzs(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل قائمة الأجزاء.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { juzs, loading, error, reload: load };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { getSurahs } from "@/lib/quranApi";
import type { SurahMeta } from "@/lib/types";

export function useSurahs() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSurahs();
      setSurahs(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل قائمة السور.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { surahs, loading, error, reload: load };
}

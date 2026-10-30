import type {
  ContentGroup,
  DisplayAyah,
  MemorizationUnit,
  PageData,
  ReviewContent,
  SurahData,
  SurahMeta,
} from "./types";

export const TOTAL_MUSHAF_PAGES = 604;

const DATA_BASE = (process.env.NEXT_PUBLIC_QURAN_DATA_BASE ?? "/quran").replace(/\/$/, "");
const requestCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const cached = requestCache.get(path);
  if (cached) return cached as Promise<T>;

  const request = fetch(`${DATA_BASE}${path}`, {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`تعذر تحميل بيانات القرآن (${response.status}).`);
      }
      return (await response.json()) as T;
    })
    .catch((error: unknown) => {
      requestCache.delete(path);
      throw error;
    });

  requestCache.set(path, request);
  return request;
}

export async function getSurahs(): Promise<SurahMeta[]> {
  const surahs = await fetchJson<SurahMeta[]>("/surahs.json");
  return [...surahs].sort((first, second) => first.number - second.number);
}

export async function getSurah(surahNumber: number): Promise<SurahData> {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new Error("رقم السورة غير صالح.");
  }
  return fetchJson<SurahData>(`/surahs/${surahNumber}.json`);
}

export async function getPage(pageNumber: number): Promise<PageData> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > TOTAL_MUSHAF_PAGES) {
    throw new Error("رقم الصفحة غير صالح.");
  }
  return fetchJson<PageData>(`/pages/${pageNumber}.json`);
}

function toDisplayAyah(
  ayah: {
    number: number;
    numberInSurah: number;
    text: string;
    juz: number;
    page: number;
  },
  surah: { number: number; name: string; englishName: string },
): DisplayAyah {
  return {
    number: ayah.number,
    numberInSurah: ayah.numberInSurah,
    text: ayah.text,
    juz: ayah.juz,
    page: ayah.page,
    surah: surah.number,
    surahName: surah.name,
    englishName: surah.englishName,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

function groupAyahs(ayahs: DisplayAyah[]): ContentGroup[] {
  const groups = new Map<number, ContentGroup>();

  for (const ayah of ayahs) {
    const existing = groups.get(ayah.surah);
    if (existing) {
      existing.ayahs.push(ayah);
      continue;
    }

    groups.set(ayah.surah, {
      surah: {
        number: ayah.surah,
        name: ayah.surahName,
        englishName: ayah.englishName,
      },
      ayahs: [ayah],
    });
  }

  return [...groups.values()];
}

export async function getReviewContent(unit: MemorizationUnit): Promise<ReviewContent> {
  const { reference } = unit;

  if (unit.type === "surah") {
    const surahNumber = reference.surah;
    if (!surahNumber) throw new Error("السورة غير محددة في هذا الورد.");

    const surah = await getSurah(surahNumber);
    const ayahs = surah.ayahs.map((ayah) => toDisplayAyah(ayah, surah));

    return {
      unitId: unit.id,
      groups: ayahs.length > 0 ? [{ surah, ayahs }] : [],
      ayahCount: ayahs.length,
    };
  }

  if (unit.type === "ayah_range") {
    const surahNumber = reference.surah;
    const startAyah = reference.startAyah;
    const endAyah = reference.endAyah;

    if (!surahNumber || !startAyah || !endAyah) {
      throw new Error("نطاق الآيات غير مكتمل في هذا الورد.");
    }

    const surah = await getSurah(surahNumber);
    const ayahs = surah.ayahs
      .filter((ayah) => ayah.numberInSurah >= startAyah && ayah.numberInSurah <= endAyah)
      .map((ayah) => toDisplayAyah(ayah, surah));

    return {
      unitId: unit.id,
      groups: ayahs.length > 0 ? [{ surah, ayahs }] : [],
      ayahCount: ayahs.length,
    };
  }

  const startPage = reference.startPage;
  const endPage = reference.endPage ?? startPage;

  if (!startPage || !endPage) {
    throw new Error("نطاق الصفحات غير مكتمل في هذا الورد.");
  }

  const pageNumbers = Array.from(
    { length: Math.max(0, endPage - startPage + 1) },
    (_, index) => startPage + index,
  );
  const pages = await mapWithConcurrency(pageNumbers, 6, getPage);
  const seen = new Set<string>();
  const ayahs: DisplayAyah[] = [];

  for (const page of pages) {
    for (const ayah of page.ayahs) {
      const key = `${ayah.surah}:${ayah.numberInSurah}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ayahs.push({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        juz: ayah.juz,
        page: ayah.page,
        surah: ayah.surah,
        surahName: ayah.surahName,
        englishName: ayah.englishName,
      });
    }
  }

  return {
    unitId: unit.id,
    groups: groupAyahs(ayahs),
    ayahCount: ayahs.length,
  };
}

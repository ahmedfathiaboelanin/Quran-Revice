export type UnitType = "surah" | "ayah_range" | "page";

export type UnitCategory = "new" | "weak";

export type ReviewQuality = 1 | 3 | 4 | 5;

export interface UnitReference {
  surah?: number;
  surahName?: string;
  startAyah?: number;
  endAyah?: number;
  startPage?: number;
  endPage?: number;
}

export interface MemorizationUnit {
  id: string;
  title: string;
  type: UnitType;
  reference: UnitReference;
  category: UnitCategory;
  ayahCount?: number;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
  lastReviewed: string | null;
  createdAt: string;
  reviewCount: number;
  lapseCount: number;
  lastQuality?: ReviewQuality;
}

export interface NewUnitInput {
  title: string;
  type: UnitType;
  reference: UnitReference;
  category: UnitCategory;
  ayahCount?: number;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
}

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
}

export interface SurahData extends SurahMeta {
  ayahs: Ayah[];
}

export interface PageAyah extends Ayah {
  surah: number;
  surahName: string;
  englishName: string;
}

export interface PageData {
  page: number;
  ayahs: PageAyah[];
}

export interface DisplayAyah extends Ayah {
  surah: number;
  surahName: string;
  englishName: string;
}

export interface ContentGroup {
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
  ayahs: DisplayAyah[];
}

export interface ReviewContent {
  unitId: string;
  groups: ContentGroup[];
  ayahCount: number;
}

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

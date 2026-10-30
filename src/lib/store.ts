"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyGrade, createUnit } from "./srsAlgorithm";
import type { MemorizationUnit, NewUnitInput, ReviewQuality } from "./types";

interface QuranStore {
  units: MemorizationUnit[];
  addUnit: (input: NewUnitInput) => MemorizationUnit;
  removeUnit: (id: string) => void;
  gradeUnit: (id: string, quality: ReviewQuality) => void;
  importUnits: (units: MemorizationUnit[]) => number;
  clearAll: () => void;
}

export const useQuranStore = create<QuranStore>()(
  persist(
    (set, get) => ({
      units: [],

      addUnit: (input) => {
        const unit = createUnit(input);
        set((state) => ({ units: [unit, ...state.units] }));
        return unit;
      },

      removeUnit: (id) => {
        set((state) => ({ units: state.units.filter((unit) => unit.id !== id) }));
      },

      gradeUnit: (id, quality) => {
        set((state) => ({
          units: state.units.map((unit) => (unit.id === id ? applyGrade(unit, quality) : unit)),
        }));
      },

      importUnits: (importedUnits) => {
        const existingIds = new Set(get().units.map((unit) => unit.id));
        const added = importedUnits.filter((unit) => !existingIds.has(unit.id)).length;
        const merged = new Map(get().units.map((unit) => [unit.id, unit]));

        for (const unit of importedUnits) {
          merged.set(unit.id, unit);
        }

        set({ units: [...merged.values()] });
        return added;
      },

      clearAll: () => {
        set({ units: [] });
      },
    }),
    {
      name: "quran-revise-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ units: state.units }),
    },
  ),
);

"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeUnit } from "./backup";
import { applyGrade, createUnit, updateUnitStrength } from "./srsAlgorithm";
import type {
  DailyWirdSnapshot,
  MemorizationUnit,
  NewUnitInput,
  ReviewQuality,
  StrengthLevel,
  WirdSettings,
} from "./types";
import { referenceIdentity } from "./unitDisplay";
import { addDaysFromToday, localDateKey } from "./utils";
import {
  DEFAULT_WIRD_SETTINGS,
  generateDailyWird,
  normalizeWirdSettings,
} from "./wirdPlanner";

interface AddUnitsResult {
  added: MemorizationUnit[];
  skipped: number;
}

interface QuranStore {
  units: MemorizationUnit[];
  wirdSettings: WirdSettings;
  lastPlannedDate: string | null;
  lastPlan: DailyWirdSnapshot | null;
  addUnit: (input: NewUnitInput) => MemorizationUnit;
  addUnits: (inputs: NewUnitInput[]) => AddUnitsResult;
  removeUnit: (id: string) => void;
  gradeUnit: (id: string, quality: ReviewQuality) => void;
  updateStrength: (id: string, strength: StrengthLevel) => void;
  setWirdSettings: (settings: WirdSettings) => void;
  rebalanceDailyWird: (force?: boolean) => DailyWirdSnapshot | null;
  importUnits: (units: MemorizationUnit[]) => number;
  clearAll: () => void;
}

function normalizeSnapshot(raw: unknown): DailyWirdSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.date !== "string") return null;
  const mode = item.mode === "units" ? "units" : "pages";
  const selectedIds = Array.isArray(item.selectedIds)
    ? item.selectedIds.filter((id): id is string => typeof id === "string")
    : [];
  const deferredIds = Array.isArray(item.deferredIds)
    ? item.deferredIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    date: item.date,
    mode,
    target: Math.max(1, Math.round(Number(item.target) || 1)),
    selectedIds,
    deferredIds,
    selectedPages: Math.max(0, Math.round(Number(item.selectedPages) || 0)),
    selectedUnits: Math.max(0, Math.round(Number(item.selectedUnits) || selectedIds.length)),
  };
}

export const useQuranStore = create<QuranStore>()(
  persist(
    (set, get) => ({
      units: [],
      wirdSettings: { ...DEFAULT_WIRD_SETTINGS },
      lastPlannedDate: null,
      lastPlan: null,

      addUnit: (input) => {
        const unit = createUnit(input);
        set((state) => ({ units: [unit, ...state.units] }));
        return unit;
      },

      addUnits: (inputs) => {
        const now = new Date();
        const identities = new Set(get().units.map((unit) => referenceIdentity(unit)));
        const added: MemorizationUnit[] = [];
        let skipped = 0;

        for (const input of inputs) {
          const identity = referenceIdentity({ type: input.type, reference: input.reference });
          if (identities.has(identity)) {
            skipped += 1;
            continue;
          }

          identities.add(identity);
          added.push(createUnit(input, now));
        }

        if (added.length > 0) {
          set((state) => ({ units: [...added, ...state.units] }));
        }

        return { added, skipped };
      },

      removeUnit: (id) => {
        set((state) => ({ units: state.units.filter((unit) => unit.id !== id) }));
      },

      gradeUnit: (id, quality) => {
        set((state) => ({
          units: state.units.map((unit) => (unit.id === id ? applyGrade(unit, quality) : unit)),
        }));
      },

      updateStrength: (id, strength) => {
        const now = new Date();
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === id ? updateUnitStrength(unit, strength, now) : unit,
          ),
        }));
      },

      setWirdSettings: (settings) => {
        set({ wirdSettings: normalizeWirdSettings(settings), lastPlannedDate: null });
      },

      rebalanceDailyWird: (force = false) => {
        const now = new Date();
        const date = localDateKey(now);
        const state = get();

        if (!force && state.lastPlannedDate === date) {
          return state.lastPlan;
        }

        const plan = generateDailyWird(state.units, state.wirdSettings, now);
        const deferredIds = new Set(plan.deferred.map((unit) => unit.id));
        const tomorrow = addDaysFromToday(1, now);
        const snapshot: DailyWirdSnapshot = {
          date,
          mode: plan.mode,
          target: plan.target,
          selectedIds: plan.selected.map((unit) => unit.id),
          deferredIds: [...deferredIds],
          selectedPages: plan.selectedPages,
          selectedUnits: plan.selectedUnits,
        };

        set((current) => ({
          units: current.units.map((unit) =>
            deferredIds.has(unit.id) ? { ...unit, nextReviewDate: tomorrow } : unit,
          ),
          lastPlannedDate: date,
          lastPlan: snapshot,
        }));

        return snapshot;
      },

      importUnits: (importedUnits) => {
        const existingIds = new Set(get().units.map((unit) => unit.id));
        const added = importedUnits.filter((unit) => !existingIds.has(unit.id)).length;
        const merged = new Map(get().units.map((unit) => [unit.id, unit]));

        for (const unit of importedUnits) {
          merged.set(unit.id, unit);
        }

        set({ units: [...merged.values()], lastPlannedDate: null, lastPlan: null });
        return added;
      },

      clearAll: () => {
        set({ units: [], lastPlannedDate: null, lastPlan: null });
      },
    }),
    {
      name: "quran-revise-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        units: state.units,
        wirdSettings: state.wirdSettings,
        lastPlannedDate: state.lastPlannedDate,
        lastPlan: state.lastPlan,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {
            units: [],
            wirdSettings: { ...DEFAULT_WIRD_SETTINGS },
            lastPlannedDate: null,
            lastPlan: null,
          };
        }

        const state = persistedState as Record<string, unknown>;
        const rawUnits = Array.isArray(state.units) ? state.units : [];
        const units = rawUnits
          .map((unit, index) => normalizeUnit(unit, index))
          .filter((unit): unit is MemorizationUnit => Boolean(unit));

        return {
          units,
          wirdSettings: normalizeWirdSettings(state.wirdSettings),
          lastPlannedDate:
            typeof state.lastPlannedDate === "string" ? state.lastPlannedDate : null,
          lastPlan: normalizeSnapshot(state.lastPlan),
        };
      },
    },
  ),
);

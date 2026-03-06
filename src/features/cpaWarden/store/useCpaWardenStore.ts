import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { secureStorage } from '@/services/storage/secureStorage';
import {
  CPA_WARDEN_INTERVALS,
  CPA_WARDEN_MAX_CONCURRENCY,
  CPA_WARDEN_MAX_FAILURE_THRESHOLD,
  CPA_WARDEN_MAX_TIMEOUT_MS,
  CPA_WARDEN_MIN_CONCURRENCY,
  CPA_WARDEN_MIN_FAILURE_THRESHOLD,
  CPA_WARDEN_MIN_TIMEOUT_MS,
  CPA_WARDEN_STORE_KEY,
  DEFAULT_CPA_WARDEN_CONFIG,
} from '../constants';
import type { CpaWardenConfig, CpaWardenRunSummary } from '../types';

interface CpaWardenStoreState {
  config: CpaWardenConfig;
  lastRunAt: string | null;
  lastSummary: CpaWardenRunSummary | null;
  failureStreaks: Record<string, number>;
  skippedTicks: number;
  isChecking: boolean;
  updateConfig: (patch: Partial<CpaWardenConfig>) => void;
  setIsChecking: (value: boolean) => void;
  setLastRunAt: (value: string | null) => void;
  setLastSummary: (value: CpaWardenRunSummary | null) => void;
  setFailureStreaks: (value: Record<string, number>) => void;
  increaseSkippedTicks: () => void;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeProbePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_CPA_WARDEN_CONFIG.probePath;
  return trimmed;
};

const VALID_INTERVALS = new Set(CPA_WARDEN_INTERVALS.map((item) => item.value));

const sanitizeConfig = (input: Partial<CpaWardenConfig> | undefined): CpaWardenConfig => {
  const merged: CpaWardenConfig = {
    ...DEFAULT_CPA_WARDEN_CONFIG,
    ...(input ?? {}),
  };

  return {
    enabled: Boolean(merged.enabled),
    interval: VALID_INTERVALS.has(merged.interval) ? merged.interval : DEFAULT_CPA_WARDEN_CONFIG.interval,
    probePath: normalizeProbePath(merged.probePath),
    timeoutMs: clamp(Math.round(Number(merged.timeoutMs) || DEFAULT_CPA_WARDEN_CONFIG.timeoutMs), CPA_WARDEN_MIN_TIMEOUT_MS, CPA_WARDEN_MAX_TIMEOUT_MS),
    concurrency: clamp(Math.round(Number(merged.concurrency) || DEFAULT_CPA_WARDEN_CONFIG.concurrency), CPA_WARDEN_MIN_CONCURRENCY, CPA_WARDEN_MAX_CONCURRENCY),
    failureThreshold: clamp(
      Math.round(Number(merged.failureThreshold) || DEFAULT_CPA_WARDEN_CONFIG.failureThreshold),
      CPA_WARDEN_MIN_FAILURE_THRESHOLD,
      CPA_WARDEN_MAX_FAILURE_THRESHOLD
    ),
    autoDisable: Boolean(merged.autoDisable),
  };
};

export const useCpaWardenStore = create<CpaWardenStoreState>()(
  persist(
    (set) => ({
      config: DEFAULT_CPA_WARDEN_CONFIG,
      lastRunAt: null,
      lastSummary: null,
      failureStreaks: {},
      skippedTicks: 0,
      isChecking: false,
      updateConfig: (patch) =>
        set((state) => ({
          config: sanitizeConfig({ ...state.config, ...patch }),
        })),
      setIsChecking: (value) => set({ isChecking: value }),
      setLastRunAt: (value) => set({ lastRunAt: value }),
      setLastSummary: (value) => set({ lastSummary: value }),
      setFailureStreaks: (value) => set({ failureStreaks: value }),
      increaseSkippedTicks: () => set((state) => ({ skippedTicks: state.skippedTicks + 1 })),
    }),
    {
      name: CPA_WARDEN_STORE_KEY,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const data = secureStorage.getItem<CpaWardenStoreState>(name);
          return data ? JSON.stringify(data) : null;
        },
        setItem: (name, value) => {
          secureStorage.setItem(name, JSON.parse(value));
        },
        removeItem: (name) => {
          secureStorage.removeItem(name);
        },
      })),
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<CpaWardenStoreState>;
        return {
          ...state,
          config: sanitizeConfig(state?.config),
        };
      },
      partialize: (state) => ({
        config: state.config,
        lastRunAt: state.lastRunAt,
        lastSummary: state.lastSummary,
        failureStreaks: state.failureStreaks,
        skippedTicks: state.skippedTicks,
      }),
    }
  )
);

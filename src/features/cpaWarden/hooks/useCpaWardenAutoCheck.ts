import { useEffect, useRef } from 'react';
import { CPA_WARDEN_INTERVALS } from '../constants';
import { useCpaWardenActions } from './useCpaWardenActions';
import { useCpaWardenStore } from '../store/useCpaWardenStore';

export function useCpaWardenAutoCheck() {
  const { runCheckNow } = useCpaWardenActions();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enabled = useCpaWardenStore((state) => state.config.enabled);
  const interval = useCpaWardenStore((state) => state.config.interval);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) return;

    const intervalConfig = CPA_WARDEN_INTERVALS.find((item) => item.value === interval);
    if (!intervalConfig) return;

    const intervalMs = intervalConfig.ms;
    const lastRunAt = useCpaWardenStore.getState().lastRunAt;
    const elapsed = lastRunAt ? Date.now() - new Date(lastRunAt).getTime() : Number.POSITIVE_INFINITY;

    if (!Number.isFinite(elapsed) || elapsed >= intervalMs) {
      void runCheckNow({ trigger: 'auto', silent: true }).catch(() => {});
    }

    timerRef.current = setInterval(() => {
      void runCheckNow({ trigger: 'auto', silent: true }).catch(() => {});
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, runCheckNow]);
}

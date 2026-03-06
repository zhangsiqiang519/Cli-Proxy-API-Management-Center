export type CpaWardenInterval = '5m' | '30m' | '2h' | '24h';

export type CpaWardenTrigger = 'manual' | 'auto';

export interface CpaWardenConfig {
  enabled: boolean;
  interval: CpaWardenInterval;
  probePath: string;
  timeoutMs: number;
  concurrency: number;
  failureThreshold: number;
  autoDisable: boolean;
}

export interface CpaWardenFailureSample {
  name: string;
  authIndex: string;
  reason: string;
  streak: number;
  disabled: boolean;
  disableError?: string;
}

export interface CpaWardenRunSummary {
  trigger: CpaWardenTrigger;
  checkedAt: string;
  durationMs: number;
  targetCount: number;
  successCount: number;
  failedCount: number;
  disabledCount: number;
  skippedCount: number;
  failedSamples: CpaWardenFailureSample[];
}

export interface CpaWardenTarget {
  name: string;
  authIndex: string;
}

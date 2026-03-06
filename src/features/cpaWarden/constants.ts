import type { CpaWardenConfig, CpaWardenInterval } from './types';

export const CPA_WARDEN_STORE_KEY = 'cli-proxy-cpa-warden';

export const CPA_WARDEN_INTERVALS: Array<{ value: CpaWardenInterval; labelKey: string; ms: number }> = [
  { value: '5m', labelKey: 'auth_files.cpa_warden.interval_5m', ms: 5 * 60 * 1000 },
  { value: '30m', labelKey: 'auth_files.cpa_warden.interval_30m', ms: 30 * 60 * 1000 },
  { value: '2h', labelKey: 'auth_files.cpa_warden.interval_2h', ms: 2 * 60 * 60 * 1000 },
  { value: '24h', labelKey: 'auth_files.cpa_warden.interval_24h', ms: 24 * 60 * 60 * 1000 },
];

export const DEFAULT_CPA_WARDEN_CONFIG: CpaWardenConfig = {
  enabled: false,
  interval: '30m',
  probePath: '/v1/models',
  timeoutMs: 10_000,
  concurrency: 3,
  failureThreshold: 2,
  autoDisable: true,
};

export const CPA_WARDEN_DEFAULT_FAILURE_SAMPLE_LIMIT = 8;
export const CPA_WARDEN_MAX_CONCURRENCY = 10;
export const CPA_WARDEN_MIN_CONCURRENCY = 1;
export const CPA_WARDEN_MIN_TIMEOUT_MS = 1_000;
export const CPA_WARDEN_MAX_TIMEOUT_MS = 120_000;
export const CPA_WARDEN_MIN_FAILURE_THRESHOLD = 1;
export const CPA_WARDEN_MAX_FAILURE_THRESHOLD = 10;

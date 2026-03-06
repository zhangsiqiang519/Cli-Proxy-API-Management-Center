import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { triggerHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { authFilesApi, apiCallApi, getApiCallErrorMessage } from '@/services/api';
import { useNotificationStore } from '@/stores';
import { isRuntimeOnlyAuthFile } from '@/features/authFiles/constants';
import { CPA_WARDEN_DEFAULT_FAILURE_SAMPLE_LIMIT } from '../constants';
import { useCpaWardenStore } from '../store/useCpaWardenStore';
import type {
  CpaWardenFailureSample,
  CpaWardenRunSummary,
  CpaWardenTarget,
  CpaWardenTrigger,
} from '../types';

type RunCheckOptions = {
  trigger?: CpaWardenTrigger;
  silent?: boolean;
};

const toAuthIndex = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const buildTargets = (files: Awaited<ReturnType<typeof authFilesApi.list>>['files']): CpaWardenTarget[] => {
  return files
    .filter((file) => !file.disabled)
    .filter((file) => !isRuntimeOnlyAuthFile(file))
    .map((file) => ({
      name: file.name,
      authIndex: toAuthIndex(file.auth_index ?? file.authIndex),
    }))
    .filter((item) => item.authIndex);
};

export function useCpaWardenActions() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);

  const runCheckNow = useCallback(
    async (options?: RunCheckOptions): Promise<CpaWardenRunSummary | null> => {
      const trigger = options?.trigger ?? 'manual';
      const isManual = trigger === 'manual';
      const silent = options?.silent ?? false;

      const currentState = useCpaWardenStore.getState();
      if (currentState.isChecking) {
        currentState.increaseSkippedTicks();
        if (isManual && !silent) {
          showNotification(t('auth_files.cpa_warden.skipped_running'), 'warning');
        }
        return null;
      }

      const startedAt = Date.now();
      currentState.setIsChecking(true);

      try {
        const snapshot = useCpaWardenStore.getState();
        const config = snapshot.config;
        const previousStreaks = snapshot.failureStreaks;

        const list = await authFilesApi.list();
        const targets = buildTargets(list.files || []);

        const nextStreaks: Record<string, number> = {};
        const failedSamples: CpaWardenFailureSample[] = [];

        let successCount = 0;
        let failedCount = 0;
        let disabledCount = 0;

        const workers = Array.from({ length: config.concurrency }, async (_unused, workerIndex) => {
          for (let index = workerIndex; index < targets.length; index += config.concurrency) {
            const target = targets[index];
            const previous = previousStreaks[target.name] ?? 0;

            try {
              const result = await apiCallApi.request(
                {
                  authIndex: target.authIndex,
                  method: 'GET',
                  url: config.probePath,
                },
                {
                  timeout: config.timeoutMs,
                }
              );

              const ok = result.statusCode >= 200 && result.statusCode < 400;
              if (ok) {
                nextStreaks[target.name] = 0;
                successCount += 1;
                continue;
              }

              const streak = previous + 1;
              nextStreaks[target.name] = streak;
              failedCount += 1;

              const sample: CpaWardenFailureSample = {
                name: target.name,
                authIndex: target.authIndex,
                reason: getApiCallErrorMessage(result),
                streak,
                disabled: false,
              };

              if (config.autoDisable && streak >= config.failureThreshold) {
                try {
                  await authFilesApi.setStatus(target.name, true);
                  sample.disabled = true;
                  disabledCount += 1;
                } catch (disableError: unknown) {
                  sample.disableError =
                    disableError instanceof Error
                      ? disableError.message
                      : t('auth_files.cpa_warden.disable_unknown_error');
                }
              }

              failedSamples.push(sample);
            } catch (error: unknown) {
              const streak = previous + 1;
              nextStreaks[target.name] = streak;
              failedCount += 1;

              const sample: CpaWardenFailureSample = {
                name: target.name,
                authIndex: target.authIndex,
                reason:
                  error instanceof Error ? error.message : t('auth_files.cpa_warden.request_unknown_error'),
                streak,
                disabled: false,
              };

              if (config.autoDisable && streak >= config.failureThreshold) {
                try {
                  await authFilesApi.setStatus(target.name, true);
                  sample.disabled = true;
                  disabledCount += 1;
                } catch (disableError: unknown) {
                  sample.disableError =
                    disableError instanceof Error
                      ? disableError.message
                      : t('auth_files.cpa_warden.disable_unknown_error');
                }
              }

              failedSamples.push(sample);
            }
          }
        });

        await Promise.all(workers);

        const checkedAt = new Date().toISOString();
        const durationMs = Date.now() - startedAt;
        const summary: CpaWardenRunSummary = {
          trigger,
          checkedAt,
          durationMs,
          targetCount: targets.length,
          successCount,
          failedCount,
          disabledCount,
          skippedCount: useCpaWardenStore.getState().skippedTicks,
          failedSamples: failedSamples.slice(0, CPA_WARDEN_DEFAULT_FAILURE_SAMPLE_LIMIT),
        };

        useCpaWardenStore.getState().setFailureStreaks(nextStreaks);
        useCpaWardenStore.getState().setLastRunAt(checkedAt);
        useCpaWardenStore.getState().setLastSummary(summary);

        if (summary.disabledCount > 0) {
          await triggerHeaderRefresh().catch(() => {});
        }

        if (isManual && !silent) {
          showNotification(
            t('auth_files.cpa_warden.run_done', {
              total: summary.targetCount,
              failed: summary.failedCount,
              disabled: summary.disabledCount,
            }),
            summary.failedCount > 0 ? 'warning' : 'success'
          );
        }

        return summary;
      } catch (error: unknown) {
        if (isManual && !silent) {
          const message = error instanceof Error ? error.message : t('auth_files.cpa_warden.request_unknown_error');
          showNotification(`${t('auth_files.cpa_warden.run_failed')}: ${message}`, 'error');
        }
        throw error;
      } finally {
        useCpaWardenStore.getState().setIsChecking(false);
      }
    },
    [showNotification, t]
  );

  return {
    runCheckNow,
  };
}

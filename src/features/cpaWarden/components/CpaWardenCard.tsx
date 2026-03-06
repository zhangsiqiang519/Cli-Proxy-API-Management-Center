import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  CPA_WARDEN_MAX_CONCURRENCY,
  CPA_WARDEN_MAX_FAILURE_THRESHOLD,
  CPA_WARDEN_MAX_TIMEOUT_MS,
  CPA_WARDEN_MIN_CONCURRENCY,
  CPA_WARDEN_MIN_FAILURE_THRESHOLD,
  CPA_WARDEN_MIN_TIMEOUT_MS,
  CPA_WARDEN_INTERVALS,
} from '../constants';
import { useCpaWardenActions } from '../hooks/useCpaWardenActions';
import { useCpaWardenStore } from '../store/useCpaWardenStore';

const asPositiveInt = (value: string, fallback: number): number => {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
};

const handleNumberConfigInput = (
  rawValue: string,
  fallback: number,
  min: number,
  max: number,
  apply: (value: number) => void
) => {
  const parsed = asPositiveInt(rawValue, fallback);
  const clamped = Math.min(max, Math.max(min, parsed));
  apply(clamped);
};

export function CpaWardenCard() {
  const { t } = useTranslation();
  const { runCheckNow } = useCpaWardenActions();

  const config = useCpaWardenStore((state) => state.config);
  const lastSummary = useCpaWardenStore((state) => state.lastSummary);
  const lastRunAt = useCpaWardenStore((state) => state.lastRunAt);
  const isChecking = useCpaWardenStore((state) => state.isChecking);
  const skippedTicks = useCpaWardenStore((state) => state.skippedTicks);
  const updateConfig = useCpaWardenStore((state) => state.updateConfig);

  const intervalOptions = useMemo(
    () =>
      CPA_WARDEN_INTERVALS.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
      })),
    [t]
  );

  const applyTimeout = (rawValue: string) => {
    handleNumberConfigInput(
      rawValue,
      config.timeoutMs,
      CPA_WARDEN_MIN_TIMEOUT_MS,
      CPA_WARDEN_MAX_TIMEOUT_MS,
      (value) => updateConfig({ timeoutMs: value })
    );
  };

  const applyConcurrency = (rawValue: string) => {
    handleNumberConfigInput(
      rawValue,
      config.concurrency,
      CPA_WARDEN_MIN_CONCURRENCY,
      CPA_WARDEN_MAX_CONCURRENCY,
      (value) => updateConfig({ concurrency: value })
    );
  };

  const applyThreshold = (rawValue: string) => {
    handleNumberConfigInput(
      rawValue,
      config.failureThreshold,
      CPA_WARDEN_MIN_FAILURE_THRESHOLD,
      CPA_WARDEN_MAX_FAILURE_THRESHOLD,
      (value) => updateConfig({ failureThreshold: value })
    );
  };

  return (
    <Card
      title={t('auth_files.cpa_warden.title')}
      subtitle={t('auth_files.cpa_warden.subtitle')}
      extra={
        <Button size="sm" onClick={() => void runCheckNow()} loading={isChecking}>
          {t('auth_files.cpa_warden.run_now')}
        </Button>
      }
    >
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ToggleSwitch
          checked={config.enabled}
          onChange={(value) => updateConfig({ enabled: value })}
          label={t('auth_files.cpa_warden.enabled')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label>{t('auth_files.cpa_warden.interval_label')}</label>
            <Select
              value={config.interval}
              options={intervalOptions}
              onChange={(value) => updateConfig({ interval: value as typeof config.interval })}
            />
          </div>

          <Input
            label={t('auth_files.cpa_warden.probe_path_label')}
            value={config.probePath}
            onChange={(event) => updateConfig({ probePath: event.target.value })}
            onBlur={(event) => updateConfig({ probePath: event.target.value.trim() || '/v1/models' })}
            placeholder="/v1/models"
          />

          <Input
            label={t('auth_files.cpa_warden.timeout_label')}
            type="number"
            min={CPA_WARDEN_MIN_TIMEOUT_MS}
            max={CPA_WARDEN_MAX_TIMEOUT_MS}
            value={config.timeoutMs}
            onBlur={(event) => applyTimeout(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            onChange={(event) => updateConfig({ timeoutMs: asPositiveInt(event.target.value, config.timeoutMs) })}
          />

          <Input
            label={t('auth_files.cpa_warden.concurrency_label')}
            type="number"
            min={CPA_WARDEN_MIN_CONCURRENCY}
            max={CPA_WARDEN_MAX_CONCURRENCY}
            value={config.concurrency}
            onBlur={(event) => applyConcurrency(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            onChange={(event) => updateConfig({ concurrency: asPositiveInt(event.target.value, config.concurrency) })}
          />

          <Input
            label={t('auth_files.cpa_warden.failure_threshold_label')}
            type="number"
            min={CPA_WARDEN_MIN_FAILURE_THRESHOLD}
            max={CPA_WARDEN_MAX_FAILURE_THRESHOLD}
            value={config.failureThreshold}
            onBlur={(event) => applyThreshold(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            onChange={(event) => updateConfig({ failureThreshold: asPositiveInt(event.target.value, config.failureThreshold) })}
          />
        </div>

        <ToggleSwitch
          checked={config.autoDisable}
          onChange={(value) => updateConfig({ autoDisable: value })}
          label={t('auth_files.cpa_warden.auto_disable')}
        />

        <div
          style={{
            fontSize: 12,
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            opacity: 0.75,
            borderRadius: 6,
            lineHeight: 1.6,
          }}
        >
          {t('auth_files.cpa_warden.browser_hint')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div className="hint">{t('auth_files.cpa_warden.last_run')}: {lastRunAt ? new Date(lastRunAt).toLocaleString() : '-'}</div>
          <div className="hint">{t('auth_files.cpa_warden.skipped_ticks')}: {skippedTicks}</div>
          <div className="hint">{t('auth_files.cpa_warden.last_checked')}: {lastSummary?.targetCount ?? 0}</div>
          <div className="hint">{t('auth_files.cpa_warden.last_failed')}: {lastSummary?.failedCount ?? 0}</div>
          <div className="hint">{t('auth_files.cpa_warden.last_disabled')}: {lastSummary?.disabledCount ?? 0}</div>
        </div>

        {lastSummary?.failedSamples?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t('auth_files.cpa_warden.failed_samples')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lastSummary.failedSamples.map((sample) => (
                <div
                  key={`${sample.name}-${sample.authIndex}`}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    background: 'var(--bg-tertiary)',
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                >
                  <div>
                    <strong>{sample.name}</strong> · authIndex={sample.authIndex} · streak={sample.streak}
                  </div>
                  <div>{sample.reason}</div>
                  {sample.disabled ? <div>{t('auth_files.cpa_warden.sample_disabled')}</div> : null}
                  {sample.disableError ? (
                    <div>{t('auth_files.cpa_warden.sample_disable_error')}: {sample.disableError}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

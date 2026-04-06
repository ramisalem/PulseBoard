import { create } from 'zustand';
import type { Metric } from '@typings/metrics';
import type { WebSocketMessage } from '@typings/websocket';
import { metricsDb } from '../services/metricsDb';
import { notificationService } from '@core/notifications/notificationService';
import { logger } from '@core/logger';

interface MetricsState {
  metrics: Record<string, Metric>;
  connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting';
  isInitialized: boolean;

  setConnectionStatus: (status: MetricsState['connectionStatus']) => void;
  processMetricBatch: (messages: WebSocketMessage[]) => void;
  mergeSnapshot: (snapshotMetrics: Metric[]) => void;
  loadFromCache: () => void;
  clearMetrics: () => void;
}

const SPARKLINE_MAX_LENGTH = 50;

export const useMetricsStore = create<MetricsState>(set => ({
  metrics: {},
  connectionStatus: 'disconnected',
  isInitialized: false,

  setConnectionStatus: status => set({ connectionStatus: status }),

  loadFromCache: () => {
    try {
      const cachedMetrics = metricsDb.getAllMetrics();
      const metricsRecord: Record<string, Metric> = {};

      for (const metric of cachedMetrics) {
        metricsRecord[metric.id] = metric;
      }

      set({ metrics: metricsRecord, isInitialized: true });
      logger.info('Loaded metrics from cache', { count: cachedMetrics.length });
    } catch (error) {
      logger.error('Failed to load metrics from cache', {
        error: String(error),
      });
      set({ isInitialized: true });
    }
  },

  processMetricBatch: messages => {
    set(state => {
      const updatedMetrics = { ...state.metrics };
      const metricsToPersist: Metric[] = [];

      for (const msg of messages) {
        if (!msg.metric_id) continue;

        const existing = updatedMetrics[msg.metric_id];

        const previousValue = existing ? existing.current_value : null;
        const delta =
          msg.delta !== null
            ? msg.delta
            : previousValue !== null
              ? msg.value - previousValue
              : null;

        const currentSparkline = existing?.sparkline ?? [];
        const newSparkline = [...currentSparkline, msg.value].slice(
          -SPARKLINE_MAX_LENGTH,
        );

        const isAlerting =
          msg.alert_threshold !== null && msg.value > msg.alert_threshold;

        const wasAlerting = existing?.is_alerting ?? false;

        const metric: Metric = {
          id: msg.metric_id,
          name:
            existing?.name ??
            `Metric ${(msg.metric_id ?? 'unknown').slice(0, 8)}`,
          current_value: msg.value,
          previous_value: previousValue,
          delta,
          alert_threshold: msg.alert_threshold,
          is_alerting: isAlerting,
          sparkline: newSparkline,
          last_updated: msg.timestamp,
        };

        if (isAlerting && !wasAlerting && msg.alert_threshold !== null) {
          logger.info('Threshold alert triggered, sending notification', {
            metricId: metric.id,
            metricName: metric.name,
            value: msg.value,
            threshold: msg.alert_threshold,
            wasAlerting,
          });
          notificationService.sendAlertNotification(
            metric.id,
            metric.name,
            msg.value,
            msg.alert_threshold,
          );
        }

        updatedMetrics[msg.metric_id] = metric;
        metricsToPersist.push(metric);

        try {
          metricsDb.addHistoryPoint(msg.metric_id, msg.value, msg.timestamp);
        } catch (error) {
          logger.warn('Failed to add history point', { error: String(error) });
        }
      }

      try {
        metricsDb.upsertMetrics(metricsToPersist);
      } catch (error) {
        logger.warn('Failed to persist metrics', { error: String(error) });
      }

      return { metrics: updatedMetrics };
    });
  },

  mergeSnapshot: snapshotMetrics => {
    set(state => {
      const mergedMetrics = { ...state.metrics };

      for (const snapMetric of snapshotMetrics) {
        const existing = mergedMetrics[snapMetric.id];
        if (
          !existing ||
          new Date(snapMetric.last_updated) > new Date(existing.last_updated)
        ) {
          mergedMetrics[snapMetric.id] = snapMetric;
        } else if (existing) {
          mergedMetrics[snapMetric.id] = {
            ...existing,
            name: snapMetric.name,
          };
        }
      }

      try {
        metricsDb.upsertMetrics(snapshotMetrics);
      } catch (error) {
        logger.warn('Failed to persist snapshot', { error: String(error) });
      }

      return { metrics: mergedMetrics };
    });
  },

  clearMetrics: () => {
    try {
      metricsDb.clearAll();
    } catch (error) {
      logger.warn('Failed to clear metrics cache', { error: String(error) });
    }
    set({ metrics: {}, connectionStatus: 'disconnected' });
  },
}));

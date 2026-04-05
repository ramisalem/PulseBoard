import { create } from 'zustand';
import type { Metric } from '@typings/metrics';
import type { WebSocketMessage } from '@typings/websocket';

interface MetricsState {
  metrics: Record<string, Metric>;
  connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting';

  setConnectionStatus: (status: MetricsState['connectionStatus']) => void;
  processMetricBatch: (messages: WebSocketMessage[]) => void;
  mergeSnapshot: (snapshotMetrics: Metric[]) => void;
  clearMetrics: () => void;
}

const SPARKLINE_MAX_LENGTH = 50;

export const useMetricsStore = create<MetricsState>(set => ({
  metrics: {},
  connectionStatus: 'disconnected',

  setConnectionStatus: status => set({ connectionStatus: status }),

  processMetricBatch: messages => {
    set(state => {
      const updatedMetrics = { ...state.metrics };

      for (const msg of messages) {
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

        updatedMetrics[msg.metric_id] = {
          id: msg.metric_id,
          name: existing?.name ?? `Metric ${msg.metric_id.slice(0, 4)}`,
          current_value: msg.value,
          previous_value: previousValue,
          delta,
          alert_threshold: msg.alert_threshold,
          is_alerting: isAlerting,
          sparkline: newSparkline,
          last_updated: msg.timestamp,
        };
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
        }
      }

      return { metrics: mergedMetrics };
    });
  },

  clearMetrics: () => set({ metrics: {}, connectionStatus: 'disconnected' }),
}));

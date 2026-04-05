import { useMetricsStore } from '../store/metricsStore';
import type { WebSocketMessage } from '@typings/websocket';

describe('MetricsStore', () => {
  beforeEach(() => {
    useMetricsStore.setState({
      metrics: {},
      connectionStatus: 'disconnected',
    });
  });

  describe('processMetricBatch', () => {
    it('should add a new metric to state from a single message', () => {
      const message: WebSocketMessage = {
        event_id: 'evt-1',
        metric_id: 'metric-1',
        value: 42.5,
        timestamp: '2023-10-01T10:00:00Z',
        delta: null,
        alert_threshold: null,
      };

      useMetricsStore.getState().processMetricBatch([message]);

      const state = useMetricsStore.getState();
      expect(state.metrics['metric-1']).toBeDefined();
      expect(state.metrics['metric-1'].current_value).toBe(42.5);
      expect(state.metrics['metric-1'].sparkline).toEqual([42.5]);
    });

    it('should calculate delta direction correctly (up)', () => {
      const msg1: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm1',
        value: 10,
        timestamp: 'T1',
        delta: null,
        alert_threshold: null,
      };
      const msg2: WebSocketMessage = {
        event_id: 'e2',
        metric_id: 'm1',
        value: 15,
        timestamp: 'T2',
        delta: 5,
        alert_threshold: null,
      };

      useMetricsStore.getState().processMetricBatch([msg1, msg2]);

      const metric = useMetricsStore.getState().metrics['m1'];
      expect(metric.delta).toBe(5);
      expect(metric.previous_value).toBe(10);
    });

    it('should calculate implicit delta if server delta is null', () => {
      const msg1: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm1',
        value: 10,
        timestamp: 'T1',
        delta: null,
        alert_threshold: null,
      };
      const msg2: WebSocketMessage = {
        event_id: 'e2',
        metric_id: 'm1',
        value: 5,
        timestamp: 'T2',
        delta: null,
        alert_threshold: null,
      };

      useMetricsStore.getState().processMetricBatch([msg1, msg2]);

      const metric = useMetricsStore.getState().metrics['m1'];
      expect(metric.delta).toBe(-5);
    });

    it('should trim sparkline to maximum 50 data points', () => {
      const messages: WebSocketMessage[] = Array.from(
        { length: 60 },
        (_, i) => ({
          event_id: `evt-${i}`,
          metric_id: 'metric-spark',
          value: i,
          timestamp: `T${i}`,
          delta: i > 0 ? 1 : null,
          alert_threshold: null,
        }),
      );

      useMetricsStore.getState().processMetricBatch(messages);

      const metric = useMetricsStore.getState().metrics['metric-spark'];
      expect(metric.sparkline.length).toBe(50);
      expect(metric.sparkline[0]).toBe(10);
      expect(metric.sparkline[49]).toBe(59);
    });

    it('should trigger alert state when value exceeds threshold', () => {
      const msg: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm-alert',
        value: 100,
        timestamp: 'T1',
        delta: null,
        alert_threshold: 90,
      };

      useMetricsStore.getState().processMetricBatch([msg]);

      const metric = useMetricsStore.getState().metrics['m-alert'];
      expect(metric.is_alerting).toBe(true);
    });

    it('should resolve alert state when value drops below threshold', () => {
      const msg1: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm-alert',
        value: 100,
        timestamp: 'T1',
        delta: null,
        alert_threshold: 90,
      };
      const msg2: WebSocketMessage = {
        event_id: 'e2',
        metric_id: 'm-alert',
        value: 80,
        timestamp: 'T2',
        delta: -20,
        alert_threshold: 90,
      };

      useMetricsStore.getState().processMetricBatch([msg1, msg2]);

      const metric = useMetricsStore.getState().metrics['m-alert'];
      expect(metric.is_alerting).toBe(false);
      expect(metric.current_value).toBe(80);
    });
  });

  describe('mergeSnapshot', () => {
    it('should overwrite WS data if snapshot is newer', () => {
      const wsMsg: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm1',
        value: 10,
        timestamp: '2023-10-01T10:00:00Z',
        delta: null,
        alert_threshold: null,
      };
      useMetricsStore.getState().processMetricBatch([wsMsg]);

      useMetricsStore.getState().mergeSnapshot([
        {
          id: 'm1',
          name: 'Real Metric Name',
          current_value: 15,
          previous_value: null,
          delta: null,
          alert_threshold: null,
          is_alerting: false,
          sparkline: [15],
          last_updated: '2023-10-01T10:05:00Z',
        },
      ]);

      const metric = useMetricsStore.getState().metrics['m1'];
      expect(metric.name).toBe('Real Metric Name');
      expect(metric.current_value).toBe(15);
    });

    it('should NOT overwrite WS data if snapshot is older', () => {
      const wsMsg: WebSocketMessage = {
        event_id: 'e1',
        metric_id: 'm1',
        value: 20,
        timestamp: '2023-10-01T10:05:00Z',
        delta: null,
        alert_threshold: null,
      };
      useMetricsStore.getState().processMetricBatch([wsMsg]);

      useMetricsStore.getState().mergeSnapshot([
        {
          id: 'm1',
          name: 'Old Name',
          current_value: 15,
          previous_value: null,
          delta: null,
          alert_threshold: null,
          is_alerting: false,
          sparkline: [15],
          last_updated: '2023-10-01T10:00:00Z',
        },
      ]);

      const metric = useMetricsStore.getState().metrics['m1'];
      expect(metric.current_value).toBe(20);
      expect(metric.name).toBe('Metric m1');
    });
  });
});

import { useEffect, useRef, useCallback } from 'react';
import { BackPressureQueue } from '@core/websocket/BackPressureQueue';
import { ReconnectStrategy } from '@core/websocket/ReconnectStrategy';
import { useMetricsStore } from '../store/metricsStore';
import { logger } from '@core/logger';
import type { WebSocketMessage } from '@typings/websocket';

const WS_URL = 'ws://localhost:4000/metrics';

export function useMetricsWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<BackPressureQueue | null>(null);
  const reconnectRef = useRef<ReconnectStrategy | null>(null);

  const setConnectionStatus = useMetricsStore(
    state => state.setConnectionStatus,
  );
  const processMetricBatch = useMetricsStore(state => state.processMetricBatch);

  const cleanup = useCallback(() => {
    reconnectRef.current?.cancel();
    queueRef.current?.clear();

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (!queueRef.current) {
      queueRef.current = new BackPressureQueue(batch => {
        processMetricBatch(batch);
      });
    }

    if (!reconnectRef.current) {
      reconnectRef.current = new ReconnectStrategy();
    }

    setConnectionStatus('connecting');
    logger.info('Connecting to Metrics WebSocket');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      logger.info('Metrics WebSocket connected');
      setConnectionStatus('connected');
      reconnectRef.current?.reset();
    };

    ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        queueRef.current?.push(message);
      } catch (error) {
        logger.error('Failed to parse WS message', { error: String(error) });
      }
    };

    ws.onclose = async event => {
      logger.warn('Metrics WebSocket closed', {
        code: event.code,
        reason: event.reason,
      });
      wsRef.current = null;

      if (event.code === 1000) {
        setConnectionStatus('disconnected');
        return;
      }

      setConnectionStatus('reconnecting');

      try {
        await reconnectRef.current?.waitForRetry();
        connect();
      } catch {
        setConnectionStatus('disconnected');
      }
    };

    ws.onerror = error => {
      logger.error('Metrics WebSocket error', { error: String(error) });
    };
  }, [cleanup, setConnectionStatus, processMetricBatch]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionStatus('disconnected');
  }, [cleanup, setConnectionStatus]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    connectionStatus: useMetricsStore(state => state.connectionStatus),
  };
}

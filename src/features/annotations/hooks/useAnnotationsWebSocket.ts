import { useEffect, useRef, useCallback } from 'react';
import { BackPressureQueue } from '@core/websocket/BackPressureQueue';
import { ReconnectStrategy } from '@core/websocket/ReconnectStrategy';
import { useAnnotationsStore } from '../store/annotationsStore';
import { logger } from '@core/logger';
import type { AnnotationMessage } from '@typings/websocket';
import type { Annotation } from '@typings/annotations';

const WS_URL = 'ws://localhost:4000/annotations';

export const useAnnotationsWebSocket = (metricId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReconnectStrategy | null>(null);

  const loadAnnotations = useAnnotationsStore(state => state.loadAnnotations);

  const addRemoteAnnotation = useAnnotationsStore(
    state => state.addRemoteAnnotation,
  );

  const cleanup = useCallback(() => {
    reconnectRef.current?.cancel();
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (!metricId) return cleanup();

    loadAnnotations(metricId);

    const queue = new BackPressureQueue(messages => {
      for (const msg of messages) {
        const annotationMsg = msg as unknown as AnnotationMessage;
        if (annotationMsg.metric_id === metricId) {
          const annotation: Annotation = {
            id: annotationMsg.annotation_id,
            metric_id: annotationMsg.metric_id,
            user_id: annotationMsg.user_id,
            username: `User ${annotationMsg.user_id.slice(0, 4)}`,
            text: annotationMsg.text,
            data_point_timestamp: annotationMsg.data_point_timestamp,
            created_at: annotationMsg.created_at,
            is_pending: false,
            sync_status: 'synced',
          };
          addRemoteAnnotation(metricId, annotation);
        }
      }
    });

    reconnectRef.current = new ReconnectStrategy();

    const connect = () => {
      cleanup();
      const ws = new WebSocket(`${WS_URL}?metric_id=${metricId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (reconnectRef.current) {
          reconnectRef.current.reset();
        }
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          (queue as any).push(data);
        } catch {
          logger.error('Failed to parse annotation WS message');
        }
      };

      ws.onclose = async () => {
        await reconnectRef.current?.waitForRetry();
        if (metricId) connect();
      };
    };

    connect();

    return () => {
      cleanup();
      queue.clear();
    };
  }, [metricId, loadAnnotations, addRemoteAnnotation, cleanup]);
};

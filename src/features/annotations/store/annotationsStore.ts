import { create } from 'zustand';
import type { Annotation } from '@typings/annotations';
import { annotationsDb } from '../services/annotationsDb';
import { operationQueueDb } from '@features/offlineQueue/services/operationQueue';
import { useAuthStore } from '@features/auth/store/authStore';
import { logger } from '@core/logger';
import { v4 as uuidv4 } from 'uuid';

interface AnnotationsState {
  annotations: Record<string, Annotation[]>;
  isLoading: boolean;

  loadAnnotations: (metricId: string) => void;
  addOptimistic: (metricId: string, annotation: Annotation) => void;
  syncSuccess: (metricId: string, tempId: string, serverId: string) => void;
  rollback: (metricId: string, tempId: string) => void;
  addRemoteAnnotation: (metricId: string, annotation: Annotation) => void;
  createAnnotation: (
    metricId: string,
    text: string,
    dataPointTimestamp: string,
  ) => Annotation | null;
  deleteAnnotation: (annotationId: string, metricId: string) => void;
  clearMetric: (metricId: string) => void;
}

export const useAnnotationsStore = create<AnnotationsState>((set, get) => ({
  annotations: {},
  isLoading: false,

  loadAnnotations: (metricId: string) => {
    set({ isLoading: true });
    const loadedAnnotations = annotationsDb.getByMetricId(metricId);
    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: loadedAnnotations,
      },
      isLoading: false,
    }));
  },

  addOptimistic: (metricId, annotation) => {
    annotationsDb.insert(annotation);
    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: [annotation, ...(state.annotations[metricId] ?? [])],
      },
    }));
  },

  syncSuccess: (metricId, tempId, serverId) => {
    const existing = get().annotations[metricId] ?? [];
    const annotation = existing.find(a => a.id === tempId);
    if (annotation) {
      annotationsDb.updateSyncStatus(tempId, 'synced');
    }
    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: (state.annotations[metricId] ?? []).map(a =>
          a.id === tempId
            ? {
                ...a,
                id: serverId,
                sync_status: 'synced' as const,
                is_pending: false,
              }
            : a,
        ),
      },
    }));
  },

  rollback: (metricId, tempId) => {
    annotationsDb.delete(tempId);
    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: (state.annotations[metricId] ?? []).filter(
          a => a.id !== tempId,
        ),
      },
    }));
  },

  addRemoteAnnotation: (metricId, annotation) => {
    const existing = get().annotations[metricId] ?? [];
    if (existing.some(a => a.id === annotation.id)) {
      return;
    }
    annotationsDb.insert(annotation);
    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: [annotation, ...(state.annotations[metricId] ?? [])],
      },
    }));
  },

  createAnnotation: (
    metricId: string,
    text: string,
    dataPointTimestamp: string,
  ) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      logger.warn('Cannot create annotation: not authenticated');
      return null;
    }

    const annotation: Annotation = {
      id: uuidv4(),
      metric_id: metricId,
      user_id: user.id,
      username: user.username,
      text,
      data_point_timestamp: dataPointTimestamp,
      created_at: new Date().toISOString(),
      is_pending: true,
      sync_status: 'pending',
    };

    annotationsDb.insert(annotation);

    operationQueueDb.enqueue(
      'create_annotation',
      {
        id: annotation.id,
        metric_id: annotation.metric_id,
        user_id: annotation.user_id,
        username: annotation.username,
        text: annotation.text,
        data_point_timestamp: annotation.data_point_timestamp,
        created_at: annotation.created_at,
      },
      metricId,
    );

    logger.info('Annotation created and queued for sync', {
      annotationId: annotation.id,
      metricId,
    });

    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: [annotation, ...(state.annotations[metricId] ?? [])],
      },
    }));

    return annotation;
  },

  deleteAnnotation: (annotationId: string, metricId: string) => {
    const metricAnnotations = get().annotations[metricId] ?? [];
    const annotation = metricAnnotations.find(a => a.id === annotationId);
    if (!annotation) return;

    annotationsDb.delete(annotationId);

    if (annotation.sync_status === 'synced') {
      operationQueueDb.enqueue(
        'delete_annotation',
        { id: annotationId },
        annotation.metric_id,
      );
    }

    logger.info('Annotation deleted', { annotationId });

    set(state => ({
      annotations: {
        ...state.annotations,
        [metricId]: (state.annotations[metricId] ?? []).filter(
          a => a.id !== annotationId,
        ),
      },
    }));
  },

  clearMetric: (metricId: string) => {
    set(state => {
      const newAnnotations = { ...state.annotations };
      delete newAnnotations[metricId];
      return { annotations: newAnnotations };
    });
  },
}));

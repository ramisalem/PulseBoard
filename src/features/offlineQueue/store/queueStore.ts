import { create } from 'zustand';
import { operationQueueDb } from '@features/offlineQueue/services/operationQueue';
import type { QueuedOperation } from '@typings/offlineQueue';
import { logger } from '@core/logger';

interface QueueUIState {
  pendingOps: QueuedOperation[];
  isLoading: boolean;

  loadPendingOps: () => void;
  discardOp: (id: string) => void;
  discardAllOps: () => void;
}

export const useQueueStore = create<QueueUIState>((set, get) => ({
  pendingOps: [],
  isLoading: false,

  loadPendingOps: () => {
    set({ isLoading: true });
    const ops = operationQueueDb.getPending();
    set({ pendingOps: ops, isLoading: false });
  },

  discardOp: (id: string) => {
    operationQueueDb.markDiscarded(id);
    set(state => ({
      pendingOps: state.pendingOps.filter(op => op.id !== id),
    }));
    logger.info('User discarded offline operation', { opId: id });
  },

  discardAllOps: () => {
    const { pendingOps } = get();
    for (const op of pendingOps) {
      operationQueueDb.markDiscarded(op.id);
    }
    set({ pendingOps: [] });
  },
}));

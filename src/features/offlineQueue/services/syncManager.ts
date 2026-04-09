import NetInfo, {
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { operationQueueDb } from './operationQueue';
import { resolveConflict, type SyncResult } from './conflictResolver';
import { apiClient } from '@core/api/client';
import { logger } from '@core/logger';
import type { QueuedOperation } from '@typings/offlineQueue';

const ENDPOINTS: Record<string, string> = {
  create_annotation: '/annotations',
  update_annotation: '/annotations',
  delete_annotation: '/annotations',
};

class SyncManager {
  private unsubscribe: NetInfoSubscription | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isSyncing = false;

  start(): void {
    this.unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        logger.info('Network detected, starting sync cycle');
        this.processQueue();
      }
    });

    // Also sync when app comes to foreground (server might be back)
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !this.isSyncing) {
        logger.info('App came to foreground, checking for pending operations');
        this.processQueue();
      }
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  /** Manually trigger a sync (e.g., from UI button) */
  async triggerSync(): Promise<void> {
    if (!this.isSyncing) {
      logger.info('Manual sync triggered');
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isSyncing = true;
    const pendingOps = operationQueueDb.getPending();

    if (pendingOps.length === 0) {
      this.isSyncing = false;
      return;
    }

    logger.info(`Processing ${pendingOps.length} offline operations`);

    for (const op of pendingOps) {
      await this.processSingleOp(op);
    }

    operationQueueDb.clearSynced();
    this.isSyncing = false;
    logger.info('Sync cycle completed');
  }

  private async processSingleOp(op: QueuedOperation): Promise<void> {
    operationQueueDb.markProcessing(op.id);
    const endpoint = ENDPOINTS[op.operation_type];

    try {
      const response = await apiClient.post(endpoint, op.payload);
      const result: SyncResult = resolveConflict(op, {
        status: response.status,
        data: response.data,
      });

      if (result.success) {
        operationQueueDb.markSynced(op.id);
      } else if (result.shouldRollback) {
        operationQueueDb.markDiscarded(op.id);
      }
    } catch (error) {
      operationQueueDb.markFailed(op.id);
      logger.error('Failed to sync operation', {
        opId: op.id,
        error: String(error),
      });
    }
  }
}

export const syncManager = new SyncManager();

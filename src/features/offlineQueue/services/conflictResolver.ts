import type { QueuedOperation } from '@typings/offlineQueue';
import { logger } from '@core/logger';

export interface SyncResult {
  success: boolean;
  shouldRollback: boolean;
  serverData?: Record<string, unknown>;
}

export function resolveConflict(
  operation: QueuedOperation,
  serverResponse: { status: number; data?: Record<string, unknown> },
): SyncResult {
  if (serverResponse.status >= 200 && serverResponse.status < 300) {
    return { success: true, shouldRollback: false };
  }

  if (serverResponse.status === 409) {
    logger.warn('Conflict detected, adopting Server-Wins strategy', {
      opId: operation.id,
    });
    return {
      success: false,
      shouldRollback: true,
      serverData: serverResponse.data,
    };
  }

  if (serverResponse.status >= 400 && serverResponse.status < 500) {
    return { success: false, shouldRollback: true };
  }

  return { success: false, shouldRollback: false };
}

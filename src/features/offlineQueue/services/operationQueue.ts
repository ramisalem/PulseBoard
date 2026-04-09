import { getDatabase } from '@core/database/connection';
import type { QueuedOperation, OperationType } from '@typings/offlineQueue';
import { generateId } from '@core/utils/uuid';
import { logger } from '@core/logger';

export const operationQueueDb = {
  enqueue(
    operationType: OperationType,
    payload: Record<string, unknown>,
    metricId: string,
  ): QueuedOperation {
    const db = getDatabase();
    const op: QueuedOperation = {
      id: generateId(),
      operation_type: operationType,
      payload,
      metric_id: metricId,
      created_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
      status: 'pending',
    };

    db.execute(
      `INSERT INTO offline_queue (id, operation_type, payload, metric_id, created_at, retry_count, max_retries, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        op.id,
        op.operation_type,
        JSON.stringify(op.payload),
        op.metric_id,
        op.created_at,
        op.retry_count,
        op.max_retries,
        op.status,
      ],
    );

    logger.debug('Operation enqueued', { opId: op.id, type: operationType });
    return op;
  },

  getPending(): QueuedOperation[] {
    const db = getDatabase();
    const result = db.execute(
      'SELECT * FROM offline_queue WHERE status = ? ORDER BY created_at ASC;',
      ['pending'],
    );

    if (!result.rows || result.rows.length === 0) return [];

    return result.rows!._array.map((row: Record<string, unknown>) => ({
      ...row,
      payload: JSON.parse(row.payload as string),
    })) as QueuedOperation[];
  },

  markProcessing(id: string): void {
    const db = getDatabase();
    db.execute("UPDATE offline_queue SET status = 'processing' WHERE id = ?;", [
      id,
    ]);
  },

  markSynced(id: string): void {
    const db = getDatabase();
    db.execute("UPDATE offline_queue SET status = 'synced' WHERE id = ?;", [
      id,
    ]);
  },

  markFailed(id: string): void {
    const db = getDatabase();
    db.execute(
      `UPDATE offline_queue 
       SET status = 'failed', retry_count = retry_count + 1 
       WHERE id = ? AND retry_count < max_retries;`,
      [id],
    );
  },

  markDiscarded(id: string): void {
    const db = getDatabase();
    db.execute("UPDATE offline_queue SET status = 'discarded' WHERE id = ?;", [
      id,
    ]);
  },

  clearSynced(): void {
    const db = getDatabase();
    db.execute(
      "DELETE FROM offline_queue WHERE status IN ('synced', 'discarded');",
      [],
    );
  },
};

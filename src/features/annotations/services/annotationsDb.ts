import { getDatabase } from '@core/database/connection';
import type { Annotation } from '@typings/annotations';
import { logger } from '@core/logger';

export const annotationsDb = {
  getByMetricId(metricId: string): Annotation[] {
    const db = getDatabase();
    const result = db.execute(
      `SELECT * FROM annotations WHERE metric_id = ? ORDER BY created_at DESC;`,
      [metricId],
    );

    if (!result.rows || result.rows.length === 0) return [];

    return result.rows._array.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      metric_id: row.metric_id as string,
      user_id: row.user_id as string,
      username: row.username as string,
      text: row.text as string,
      data_point_timestamp: row.data_point_timestamp as string,
      created_at: row.created_at as string,
      is_pending: false,
      sync_status: (row.sync_status as Annotation['sync_status']) || 'synced',
    }));
  },

  insert(annotation: Annotation): void {
    const db = getDatabase();
    db.execute(
      `INSERT OR REPLACE INTO annotations 
       (id, metric_id, user_id, username, text, data_point_timestamp, created_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        annotation.id,
        annotation.metric_id,
        annotation.user_id,
        annotation.username,
        annotation.text,
        annotation.data_point_timestamp,
        annotation.created_at,
        annotation.sync_status,
      ],
    );
  },

  updateSyncStatus(id: string, status: Annotation['sync_status']): void {
    const db = getDatabase();
    db.execute(`UPDATE annotations SET sync_status = ? WHERE id = ?;`, [
      status,
      id,
    ]);
  },

  delete(id: string): void {
    const db = getDatabase();
    db.execute('DELETE FROM annotations WHERE id = ?;', [id]);
  },

  clearByMetric(metricId: string): void {
    const db = getDatabase();
    db.execute('DELETE FROM annotations WHERE metric_id = ?;', [metricId]);
    logger.info('Cleared annotations for metric', { metricId });
  },
};

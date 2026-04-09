import { getDatabase } from '@core/database/connection';
import type { Metric, HistoricalDataPoint } from '@typings/metrics';
import { logger } from '@core/logger';

export const metricsDb = {
  upsertMetric(metric: Metric): void {
    const db = getDatabase();
    db.execute(
      `INSERT OR REPLACE INTO metrics 
       (id, name, current_value, previous_value, delta, alert_threshold, is_alerting, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        metric.id,
        metric.name,
        metric.current_value,
        metric.previous_value,
        metric.delta,
        metric.alert_threshold,
        metric.is_alerting ? 1 : 0,
        metric.last_updated,
      ],
    );
  },

  upsertMetrics(metrics: Metric[]): void {
    const db = getDatabase();
    db.transaction(() => {
      for (const metric of metrics) {
        db.execute(
          `INSERT OR REPLACE INTO metrics 
           (id, name, current_value, previous_value, delta, alert_threshold, is_alerting, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            metric.id,
            metric.name,
            metric.current_value,
            metric.previous_value,
            metric.delta,
            metric.alert_threshold,
            metric.is_alerting ? 1 : 0,
            metric.last_updated,
          ],
        );
      }
    });
    logger.debug('Persisted metrics to cache', { count: metrics.length });
  },

  getAllMetrics(): Metric[] {
    const db = getDatabase();
    const result = db.execute(
      'SELECT * FROM metrics ORDER BY last_updated DESC;',
    );

    if (!result.rows || result.rows.length === 0) return [];

    return result.rows._array.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      current_value: row.current_value as number,
      previous_value: row.previous_value as number | null,
      delta: row.delta as number | null,
      alert_threshold: row.alert_threshold as number | null,
      is_alerting: Boolean(row.is_alerting),
      sparkline: this.getSparkline(row.id as string),
      last_updated: row.last_updated as string,
    }));
  },

  getMetricById(id: string): Metric | null {
    const db = getDatabase();
    const result = db.execute('SELECT * FROM metrics WHERE id = ?;', [id]);

    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows._array[0] as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      current_value: row.current_value as number,
      previous_value: row.previous_value as number | null,
      delta: row.delta as number | null,
      alert_threshold: row.alert_threshold as number | null,
      is_alerting: Boolean(row.is_alerting),
      sparkline: this.getSparkline(id),
      last_updated: row.last_updated as string,
    };
  },

  getSparkline(metricId: string): number[] {
    const db = getDatabase();
    const result = db.execute(
      `SELECT value FROM metric_history 
       WHERE metric_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 50;`,
      [metricId],
    );

    if (!result.rows || result.rows.length === 0) return [];

    return result.rows._array
      .map((row: Record<string, unknown>) => row.value as number)
      .reverse();
  },

  addHistoryPoint(metricId: string, value: number, timestamp: string): void {
    const db = getDatabase();
    const id = `${metricId}-${timestamp}`;
    db.execute(
      `INSERT OR IGNORE INTO metric_history (id, metric_id, value, timestamp)
       VALUES (?, ?, ?, ?);`,
      [id, metricId, value, timestamp],
    );
  },

  getHistory(metricId: string, limit = 100): HistoricalDataPoint[] {
    const db = getDatabase();
    const result = db.execute(
      `SELECT timestamp, value FROM metric_history 
       WHERE metric_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?;`,
      [metricId, limit],
    );

    if (!result.rows || result.rows.length === 0) return [];

    return result.rows._array.map((row: Record<string, unknown>) => ({
      timestamp: row.timestamp as string,
      value: row.value as number,
    }));
  },

  clearAll(): void {
    const db = getDatabase();
    db.execute('DELETE FROM metrics;');
    db.execute('DELETE FROM metric_history;');
    logger.info('Cleared all cached metrics');
  },
};

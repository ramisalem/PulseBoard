import { open, type QuickSQLiteConnection } from 'react-native-quick-sqlite';
import { logger } from '@core/logger';

const DB_NAME = 'PulseBoard.db';
const DB_VERSION = 1;

let db: QuickSQLiteConnection | null = null;

export function getDatabase(): QuickSQLiteConnection {
  if (!db) {
    db = open({ name: DB_NAME });
    logger.info('Database opened', { name: DB_NAME });
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

export function runMigrations(): void {
  const database = getDatabase();

  database.execute('PRAGMA journal_mode=WAL;');
  database.execute('PRAGMA foreign_keys=ON;');

  database.execute(`
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      current_value REAL NOT NULL,
      previous_value REAL,
      delta REAL,
      alert_threshold REAL,
      is_alerting INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL
    );
  `);

  database.execute(`
    CREATE TABLE IF NOT EXISTS metric_history (
      id TEXT PRIMARY KEY,
      metric_id TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE
    );
  `);

  database.execute(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      metric_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      data_point_timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced'
    );
  `);

  database.execute(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      metric_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  database.execute(
    `CREATE INDEX IF NOT EXISTS idx_annotations_metric ON annotations(metric_id);`,
  );
  database.execute(
    `CREATE INDEX IF NOT EXISTS idx_history_metric ON metric_history(metric_id, timestamp DESC);`,
  );
  database.execute(
    `CREATE INDEX IF NOT EXISTS idx_queue_status ON offline_queue(status);`,
  );

  logger.info('Database migrations completed', { version: DB_VERSION });
}

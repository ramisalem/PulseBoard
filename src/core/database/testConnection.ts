import {
  getDatabase,
  closeDatabase,
  runMigrations,
} from '@core/database/connection';
import { logger } from '@core/logger';

export function testDatabaseConnection(): void {
  try {
    logger.info('=== DB Integration Test Start ===');

    const db = getDatabase();
    logger.info('Step 1: Database opened successfully');

    runMigrations();
    logger.info('Step 2: Migrations ran successfully');

    const tables = db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
    );
    logger.info('Step 3: Tables found', {
      tables: tables.rows?._array.map((r: { name: string }) => r.name),
    });

    const indexes = db.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;",
    );
    logger.info('Step 4: Indexes found', {
      indexes: indexes.rows?._array.map((r: { name: string }) => r.name),
    });

    db.execute(
      'INSERT OR REPLACE INTO metrics (id, name, current_value, last_updated) VALUES (?, ?, ?, ?);',
      ['test-metric-1', 'CPU Usage', 75.5, new Date().toISOString()],
    );
    logger.info('Step 5: Test insert succeeded');

    const result = db.execute('SELECT * FROM metrics WHERE id = ?;', [
      'test-metric-1',
    ]);
    logger.info('Step 6: Read back inserted row', {
      row: result.rows?._array[0],
    });

    db.execute('DELETE FROM metrics WHERE id = ?;', ['test-metric-1']);
    logger.info('Step 7: Cleanup delete succeeded');

    closeDatabase();
    logger.info('=== DB Integration Test PASSED ===');
  } catch (error) {
    logger.error('=== DB Integration Test FAILED ===', {
      error: String(error),
    });
  }
}

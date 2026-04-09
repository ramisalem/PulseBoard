import { operationQueueDb } from '../services/operationQueue';

describe('OperationQueue', () => {
  beforeEach(() => {});

  describe('enqueue', () => {
    it('should add operation to queue', () => {
      const payload = { text: 'Test annotation', metric_id: 'metric-1' };
      const op = operationQueueDb.enqueue(
        'create_annotation',
        payload,
        'metric-1',
      );

      expect(op.id).toBeDefined();
      expect(op.operation_type).toBe('create_annotation');
      expect(op.status).toBe('pending');
      expect(op.retry_count).toBe(0);
    });
  });
});

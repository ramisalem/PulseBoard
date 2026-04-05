jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (task: { gen?: () => void } | (() => void)) => {
      setTimeout(() => {
        if (
          task &&
          typeof task === 'object' &&
          typeof task.gen === 'function'
        ) {
          task.gen();
        } else if (typeof task === 'function') {
          task();
        }
      }, 0);
      return {
        then: (cb: () => void) => (cb ? cb() : undefined),
        done: false,
        cancel: jest.fn(),
      };
    },
    createInteractionHandle: jest.fn(() => 1),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
    addListener: jest.fn(),
    emit: jest.fn(),
  },
}));

import { BackPressureQueue } from '../BackPressureQueue';
import type { WebSocketMessage } from '@typings/websocket';

describe('BackPressureQueue', () => {
  let queue: BackPressureQueue;
  let mockHandler: jest.Mock;

  const createMessage = (eventId: string): WebSocketMessage => ({
    event_id: eventId,
    metric_id: `metric-${eventId}`,
    value: Math.random() * 100,
    timestamp: new Date().toISOString(),
    delta: null,
    alert_threshold: null,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockHandler = jest.fn();
    queue = new BackPressureQueue(mockHandler);
  });

  afterEach(() => {
    queue.clear();
    jest.useRealTimers();
  });

  describe('Deduplication', () => {
    it('should not process duplicate messages within the 5-minute window', () => {
      const msg = createMessage('event-1');

      queue.push(msg);
      queue.push(msg);

      jest.advanceTimersByTime(100);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith([msg]);
    });

    it('should process messages with different event_ids', () => {
      const msg1 = createMessage('event-1');
      const msg2 = createMessage('event-2');

      queue.push(msg1);
      queue.push(msg2);

      jest.advanceTimersByTime(100);

      const totalProcessed = mockHandler.mock.calls.reduce(
        (acc: number, call: [WebSocketMessage[]]) => acc + call[0].length,
        0,
      );
      expect(totalProcessed).toBe(2);
    });
  });

  describe('Back-Pressure', () => {
    it('should drop oldest messages when queue exceeds MAX_QUEUE_SIZE', () => {
      const msgNew = createMessage('event-new');

      // @ts-expect-error - Accessing private for testing
      queue.queue = new Array(1000)
        .fill(null)
        .map((_: null, i: number) => createMessage(`old-${i}`));

      queue.push(msgNew);

      jest.advanceTimersByTime(100);

      const allProcessed = mockHandler.mock.calls.flatMap(call => call[0]);
      const processedIds = allProcessed.map(
        (m: WebSocketMessage) => m.event_id,
      );

      expect(processedIds).not.toContain('old-0');
      expect(processedIds).toContain('event-new');
    });
  });

  describe('Drain Order & Batching', () => {
    it('should drain messages in FIFO order', () => {
      const msg1 = createMessage('event-1');
      const msg2 = createMessage('event-2');
      const msg3 = createMessage('event-3');

      queue.push(msg1);
      queue.push(msg2);
      queue.push(msg3);

      jest.advanceTimersByTime(100);

      const processedBatch = mockHandler.mock.calls[0][0];
      expect(processedBatch[0].event_id).toBe('event-1');
      expect(processedBatch[1].event_id).toBe('event-2');
      expect(processedBatch[2].event_id).toBe('event-3');
    });

    it('should yield to event loop for large batches (maintain 60fps)', () => {
      for (let i = 0; i < 120; i++) {
        queue.push(createMessage(`event-${i}`));
      }

      jest.advanceTimersByTime(100);

      jest.advanceTimersByTime(0);
      jest.advanceTimersByTime(0);

      for (const call of mockHandler.mock.calls) {
        expect(call[0].length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('Clear', () => {
    it('should clear all pending messages and reset state', () => {
      queue.push(createMessage('event-1'));
      queue.push(createMessage('event-2'));

      queue.clear();

      expect(queue.pendingCount).toBe(0);

      jest.advanceTimersByTime(100);

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});

import { InteractionManager } from 'react-native';
import type { WebSocketMessage } from '@typings/websocket';
import { logger } from '@core/logger';

const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_QUEUE_SIZE = 1000;

type MessageHandler = (messages: WebSocketMessage[]) => void;

export class BackPressureQueue {
  private queue: WebSocketMessage[] = [];
  private dedupMap: Map<string, number> = new Map();
  private isDraining = false;
  private onMessageBatch: MessageHandler;

  public processingCount = 0;

  constructor(onMessageBatch: MessageHandler) {
    this.onMessageBatch = onMessageBatch;
    this.cleanupDedupMap();
  }

  push(message: WebSocketMessage): void {
    if (this.dedupMap.has(message.event_id)) {
      return;
    }

    this.dedupMap.set(message.event_id, Date.now());

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      const dropped = this.queue.shift();
      if (dropped) {
        logger.warn('Back-pressure: Dropped oldest message', {
          eventId: dropped.event_id,
        });
      }
    }

    this.queue.push(message);
    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.isDraining) return;

    this.isDraining = true;
    InteractionManager.runAfterInteractions({
      name: 'WebSocketDrain',
      gen: () => {
        this.drain();
      },
    });
  }

  private drain(): void {
    if (this.queue.length === 0) {
      this.isDraining = false;
      return;
    }

    const batch = this.queue.splice(0, 50);
    this.processingCount = batch.length;

    try {
      this.onMessageBatch(batch);
    } catch (error) {
      logger.error('Error processing WS batch', {
        error: String(error),
        batchSize: batch.length,
      });
    }

    this.processingCount = 0;

    if (this.queue.length > 0) {
      setImmediate(() => this.drain());
    } else {
      this.isDraining = false;
    }
  }

  private cleanupDedupMap(): void {
    const now = Date.now();
    for (const [eventId, timestamp] of this.dedupMap.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        this.dedupMap.delete(eventId);
      }
    }
    setTimeout(() => this.cleanupDedupMap(), DEDUP_WINDOW_MS);
  }

  clear(): void {
    this.queue = [];
    this.dedupMap.clear();
    this.isDraining = false;
    this.processingCount = 0;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

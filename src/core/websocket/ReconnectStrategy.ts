import { logger } from '@core/logger';

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_FACTOR = 0.5;

export class ReconnectStrategy {
  private attempt: number = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  get nextDelay(): number {
    const exponentialDelay = Math.min(
      MAX_DELAY_MS,
      BASE_DELAY_MS * Math.pow(2, this.attempt),
    );
    const jitter = Math.random() * exponentialDelay * JITTER_FACTOR;

    return Math.floor(exponentialDelay - jitter);
  }

  waitForRetry(): Promise<void> {
    return new Promise(resolve => {
      const delay = this.nextDelay;
      this.attempt++;

      logger.info(`Scheduling reconnect attempt ${this.attempt} in ${delay}ms`);

      this.timeoutId = setTimeout(() => {
        resolve();
      }, delay);
    });
  }

  reset(): void {
    this.attempt = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    logger.debug('Reconnect strategy reset');
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.attempt = 0;
  }

  get currentAttempt(): number {
    return this.attempt;
  }
}

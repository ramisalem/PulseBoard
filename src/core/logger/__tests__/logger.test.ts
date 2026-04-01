/// <reference types="@types/jest" />
/// <reference path="../../../types/global.d.ts" />
import { logger } from '../index';

// Mock __DEV__ globally
const originalDev = (globalThis as unknown as { __DEV__?: boolean }).__DEV__ ?? true;

describe('Logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Reset __DEV__ to true before each test
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();

    // Restore original __DEV__ value
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
  });

  describe('PII stripping', () => {
    it('should redact access_token field', () => {
      const data = { access_token: 'super-secret-token', user_id: '123' };
      logger.debug('test', data);

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('"access_token":"[REDACTED]"')
      );
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('"user_id":"123"')
      );
    });

    it('should redact Bearer tokens in message strings', () => {
      logger.info('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]')
      );
      expect(console.info).not.toHaveBeenCalledWith(
        expect.stringContaining('eyJhbGciOiJIUzI1NiJ9')
      );
    });

    it('should redact nested sensitive fields', () => {
      const data = {
        user: {
          email: 'test@example.com',
          name: 'John'
        }
      };
      logger.debug('test', data as unknown as Record<string, unknown>);

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('"email":"[REDACTED]"')
      );
    });

    it('should handle multiple sensitive patterns', () => {
      const message = 'Token: abc123, Authorization: Bearer xyz789';
      logger.info(message);

      const logged = (console.info as unknown as jest.Mock).mock.calls[0][0];
      const redactCount = (logged as string).match(/\[REDACTED\]/g)?.length || 0;
      expect(redactCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Log levels', () => {
    it('should not log debug in production', () => {
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

      logger.debug('should not appear');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should always log errors', () => {
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

      logger.error('critical error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('sanitize helper', () => {
    it('should return sanitized entry without logging', () => {
      const entry = logger.sanitize('test', { password: 'secret' });

      expect(entry.message).toBe('test');
      expect(entry.data?.password).toBe('[REDACTED]');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });
});

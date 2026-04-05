import { secureStorage } from '@core/security/keychain';
import { mockAuthApi } from './mockAuthApi';
import type { AuthTokens } from '@typings/auth';
import { logger } from '@core/logger';

class TokenManager {
  private refreshPromise: Promise<AuthTokens> | null = null;

  async getTokens(): Promise<AuthTokens | null> {
    const tokens = await secureStorage.getTokens();
    if (!tokens) return null;

    if (Date.now() >= tokens.access_token_expires_at) {
      this.refreshTokens(tokens.refresh_token).catch(() => {});
    }

    return tokens;
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    await secureStorage.saveTokens(tokens);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    if (this.refreshPromise) {
      logger.debug('Token refresh already in flight, awaiting...');
      return this.refreshPromise;
    }

    this.refreshPromise = this.executeRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async executeRefresh(refreshToken: string): Promise<AuthTokens> {
    try {
      logger.info('Attempting silent token refresh');
      const newTokens = await mockAuthApi.refreshTokens(refreshToken);
      await this.saveTokens(newTokens);
      logger.info('Token refresh successful');
      return newTokens;
    } catch (error) {
      logger.error('Token refresh failed', { error: String(error) });
      throw error;
    }
  }

  async clearTokens(): Promise<void> {
    this.refreshPromise = null;
    await secureStorage.clearTokens();
  }
}

export const tokenManager = new TokenManager();

import MockAdapter from 'axios-mock-adapter';
import { apiClient, setLogoutCallback } from '@core/api/client';
import { tokenManager } from '../services/tokenManager';
import { mockAuthApi } from '../services/mockAuthApi';
import type { AuthTokens } from '@typings/auth';

jest.mock('@core/security/keychain', () => ({
  secureStorage: {
    getTokens: jest.fn(),
    saveTokens: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

jest.mock('@core/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { secureStorage } from '@core/security/keychain';

describe('Auth Interceptor & Token Manager', () => {
  let mockAxios: MockAdapter;
  let logoutMock: jest.Mock;

  const mockTokens: AuthTokens = {
    access_token: 'initial_access',
    refresh_token: 'initial_refresh',
    access_token_expires_at: Date.now() + 60000,
  };

  const expiredTokens: AuthTokens = {
    access_token: 'expired_access',
    refresh_token: 'valid_refresh',
    access_token_expires_at: Date.now() - 1000,
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
    logoutMock = jest.fn();
    setLogoutCallback(logoutMock);

    jest.spyOn(secureStorage, 'getTokens').mockResolvedValue(mockTokens);
    jest.spyOn(secureStorage, 'saveTokens').mockResolvedValue();
    jest.spyOn(secureStorage, 'clearTokens').mockResolvedValue();
    jest.spyOn(mockAuthApi, 'refreshTokens');

    (tokenManager as unknown as { refreshPromise: null }).refreshPromise = null;
  });

  afterEach(() => {
    mockAxios.restore();
    jest.restoreAllMocks();
  });

  describe('Silent Token Refresh', () => {
    it('should attach valid token without refreshing', async () => {
      mockAxios.onGet('/test').reply(200, {});

      await apiClient.get('/test');

      expect(mockAxios.history.get[0].headers?.Authorization).toBe(
        `Bearer ${mockTokens.access_token}`,
      );
      expect(mockAuthApi.refreshTokens).not.toHaveBeenCalled();
    });

    it('should intercept request with expired token and silently refresh before sending', async () => {
      jest.spyOn(secureStorage, 'getTokens').mockResolvedValue(expiredTokens);

      const newTokens: AuthTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        access_token_expires_at: Date.now() + 60000,
      };
      jest.spyOn(mockAuthApi, 'refreshTokens').mockResolvedValue(newTokens);

      mockAxios.onGet('/test').reply(200, {});

      await apiClient.get('/test');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockAuthApi.refreshTokens).toHaveBeenCalledWith(
        expiredTokens.refresh_token,
      );
      expect(mockAxios.history.get[0].headers?.Authorization).toBe(
        `Bearer new_access_token`,
      );
    });
  });

  describe('Mid-Request 401 & Revocation', () => {
    it('should retry request once if server returns 401 and refresh succeeds', async () => {
      mockAxios.onGet('/test').replyOnce(401, {});
      mockAxios.onGet('/test').replyOnce(200, { success: true });

      const newTokens: AuthTokens = {
        access_token: 'retried_access',
        refresh_token: 'retried_refresh',
        access_token_expires_at: Date.now() + 60000,
      };
      jest.spyOn(mockAuthApi, 'refreshTokens').mockResolvedValue(newTokens);

      const response = await apiClient.get('/test');

      expect(response.data).toEqual({ success: true });
      expect(mockAuthApi.refreshTokens).toHaveBeenCalled();
      expect(logoutMock).not.toHaveBeenCalled();
    });

    it('should trigger hard logout if refresh token is revoked (401 on refresh)', async () => {
      mockAxios.onGet('/test').reply(401, {});

      const revocationError = new Error('Refresh token has been revoked');
      revocationError.name = 'RevocationError';
      jest
        .spyOn(mockAuthApi, 'refreshTokens')
        .mockRejectedValue(revocationError);

      await expect(apiClient.get('/test')).rejects.toThrow(
        'Refresh token has been revoked',
      );

      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(secureStorage.clearTokens).not.toHaveBeenCalled();
    });

    it('should not retry more than once for the same request', async () => {
      mockAxios.onGet('/test').reply(401, {});
      jest
        .spyOn(mockAuthApi, 'refreshTokens')
        .mockResolvedValue({ ...mockTokens });

      await expect(apiClient.get('/test')).rejects.toEqual(
        expect.objectContaining({ response: expect.any(Object) }),
      );

      expect(mockAuthApi.refreshTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Request Queuing', () => {
    it('should only fire one refresh request if multiple API calls fail simultaneously', async () => {
      jest.spyOn(secureStorage, 'getTokens').mockResolvedValue(expiredTokens);

      let refreshResolve: (value: AuthTokens) => void;
      const refreshPromise = new Promise<AuthTokens>(resolve => {
        refreshResolve = resolve;
      });
      jest.spyOn(mockAuthApi, 'refreshTokens').mockReturnValue(refreshPromise);

      mockAxios.onGet('/test1').reply(200, {});
      mockAxios.onGet('/test2').reply(200, {});
      mockAxios.onGet('/test3').reply(200, {});

      const p1 = apiClient.get('/test1');
      const p2 = apiClient.get('/test2');
      const p3 = apiClient.get('/test3');

      const newTokens: AuthTokens = {
        access_token: 'concurrent_access',
        refresh_token: 'cr',
        access_token_expires_at: Date.now() + 60000,
      };
      refreshResolve!(newTokens);

      await Promise.all([p1, p2, p3]);

      expect(mockAuthApi.refreshTokens).toHaveBeenCalledTimes(1);
    });
  });
});

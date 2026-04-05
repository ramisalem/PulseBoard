import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from '@features/auth/services/tokenManager';
import type { AuthTokens } from '@typings/auth';
import { logger } from '@core/logger';
import { secureStorage } from '@core/security/keychain';

type OnLogoutRequired = () => void;
let logoutCallback: OnLogoutRequired | null = null;

export const apiClient = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 10000,
});

export function setLogoutCallback(callback: OnLogoutRequired): void {
  logoutCallback = callback;
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await tokenManager.getTokens();

    if (tokens) {
      const isExpired = Date.now() >= tokens.access_token_expires_at;

      if (isExpired) {
        try {
          const newTokens = await tokenManager.refreshTokens(
            tokens.refresh_token,
          );
          config.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return config;
        } catch {
          logger.error('Pre-emptive token refresh failed during request setup');
          logoutCallback?.();
          return Promise.reject(new Error('Session expired'));
        }
      }

      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = await secureStorage.getTokens();
        if (!tokens) throw new Error('No tokens');

        const newTokens: AuthTokens = await tokenManager.refreshTokens(
          tokens.refresh_token,
        );

        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        logger.error('Mid-request 401 refresh failed. Logging out.');
        logoutCallback?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

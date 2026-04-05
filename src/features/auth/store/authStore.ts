import { create } from 'zustand';
import type { AuthState } from '@typings/auth';
import { mockAuthApi } from '../services/mockAuthApi';
import { tokenManager } from '../services/tokenManager';
import { setLogoutCallback } from '@core/api/client';
import { logger } from '@core/logger';

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => {
  setLogoutCallback(() => {
    get().logout();
  });

  return {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isAuthLoading: true,

    login: async (username, password) => {
      try {
        const { user, tokens } = await mockAuthApi.login(username, password);
        await tokenManager.saveTokens(tokens);

        set({
          user,
          tokens,
          isAuthenticated: true,
          isAuthLoading: false,
        });
      } catch (error) {
        logger.error('Login failed', { error: String(error) });
        set({ isAuthLoading: false });
        throw error;
      }
    },

    logout: async () => {
      logger.info('Logging out, clearing all state');

      await tokenManager.clearTokens();

      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
    },

    restoreSession: async () => {
      try {
        const tokens = await tokenManager.getTokens();
        if (tokens) {
          set({
            tokens,
            user: {
              id: 'user-123',
              username: 'testuser',
              email: 'test@pulseboard.io',
            },
            isAuthenticated: true,
            isAuthLoading: false,
          });
        } else {
          set({ isAuthLoading: false });
        }
      } catch (error) {
        logger.error('Session restore failed', { error: String(error) });
        set({ isAuthLoading: false });
      }
    },
  };
});

import type { AuthTokens, User } from '@typings/auth';

let isRefreshTokenRevoked = false;
const MOCK_USER: User = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@pulseboard.io',
};

export const mockAuthApi = {
  async login(
    _username: string,
    _password: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    isRefreshTokenRevoked = false;

    return {
      user: MOCK_USER,
      tokens: {
        access_token: `mock_access_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        access_token_expires_at: Date.now() + 15 * 60 * 1000,
      },
    };
  },

  async refreshTokens(currentRefreshToken: string): Promise<AuthTokens> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (
      isRefreshTokenRevoked ||
      !currentRefreshToken.startsWith('mock_refresh_')
    ) {
      const error = new Error('Refresh token has been revoked');
      error.name = 'RevocationError';
      throw error;
    }

    return {
      access_token: `mock_access_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      access_token_expires_at: Date.now() + 15 * 60 * 1000,
    };
  },

  simulateRevocation(): void {
    isRefreshTokenRevoked = true;
  },

  expireTokens(tokens: AuthTokens): AuthTokens {
    return {
      ...tokens,
      access_token_expires_at: Date.now() - 1000,
    };
  },
};

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: number; // Unix timestamp ms
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

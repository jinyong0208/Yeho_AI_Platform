import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  tenantId: string;
  tenantCode?: string;
  tenantName?: string;
  userId: string;
  username: string;
  roles: string[];
}

interface AuthState {
  accessToken?: string;
  tokenExpiresAt?: number;
  user?: AuthUser;
  login: (token: string, user: AuthUser, expiresInSeconds?: number) => void;
  logout: () => void;
}

const DEFAULT_TOKEN_TTL_SECONDS = 12 * 60 * 60;

const normalizeExpiresInSeconds = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 60) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }
  return value;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      login: (accessToken, user, expiresInSeconds) =>
        set({ accessToken, user, tokenExpiresAt: Date.now() + normalizeExpiresInSeconds(expiresInSeconds) * 1000 }),
      logout: () => set({ accessToken: undefined, tokenExpiresAt: undefined, user: undefined }),
    }),
    {
      name: 'yeho-ai-auth',
    },
  ),
);

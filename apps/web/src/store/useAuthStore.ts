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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      login: (accessToken, user, expiresInSeconds = 12 * 60 * 60) =>
        set({ accessToken, user, tokenExpiresAt: Date.now() + expiresInSeconds * 1000 }),
      logout: () => set({ accessToken: undefined, tokenExpiresAt: undefined, user: undefined }),
    }),
    {
      name: 'yeho-ai-auth',
    },
  ),
);

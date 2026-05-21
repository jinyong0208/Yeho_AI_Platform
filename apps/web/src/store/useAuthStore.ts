import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  tenantId: string;
  userId: string;
  username: string;
  roles: string[];
}

interface AuthState {
  accessToken?: string;
  user?: AuthUser;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      login: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: undefined, user: undefined }),
    }),
    {
      name: 'yeho-ai-auth',
    },
  ),
);

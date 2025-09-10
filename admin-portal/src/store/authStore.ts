import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: 'ADMIN' | 'STAFF' | 'USER';
  isVerified: boolean;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user: User) =>
        set({ user, isAuthenticated: !!user }),

      setTokens: (tokens: AuthTokens) =>
        set({ tokens }),

      login: (user: User, tokens: AuthTokens) =>
        set({ 
          user, 
          tokens, 
          isAuthenticated: true, 
          isLoading: false 
        }),

      logout: () =>
        set({ 
          user: null, 
          tokens: null, 
          isAuthenticated: false, 
          isLoading: false 
        }),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }),

      clearAuth: () =>
        set({ 
          user: null, 
          tokens: null, 
          isAuthenticated: false, 
          isLoading: false 
        }),
    }),
    {
      name: 'civic-auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

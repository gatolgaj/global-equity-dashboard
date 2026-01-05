import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Session expiry in milliseconds (7 days)
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthState {
  // State
  isAuthenticated: boolean;
  lastLoginTime: number | null;

  // Actions
  login: (password: string) => boolean;
  logout: () => void;
  checkSession: () => boolean;
}

// Get password from environment variable
const getAppPassword = (): string => {
  return import.meta.env.VITE_APP_PASSWORD || 'terebinth2025';
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isAuthenticated: false,
        lastLoginTime: null,

        // Login action - validates password and sets authenticated state
        login: (password: string): boolean => {
          const correctPassword = getAppPassword();

          if (password === correctPassword) {
            set({
              isAuthenticated: true,
              lastLoginTime: Date.now(),
            });
            return true;
          }
          return false;
        },

        // Logout action - clears auth state
        logout: () => {
          set({
            isAuthenticated: false,
            lastLoginTime: null,
          });
        },

        // Check if session is still valid (not expired)
        checkSession: (): boolean => {
          const { isAuthenticated, lastLoginTime } = get();

          if (!isAuthenticated || !lastLoginTime) {
            return false;
          }

          // Check if session has expired
          const now = Date.now();
          if (now - lastLoginTime > SESSION_EXPIRY_MS) {
            // Session expired, log out
            set({
              isAuthenticated: false,
              lastLoginTime: null,
            });
            return false;
          }

          return true;
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          lastLoginTime: state.lastLoginTime,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

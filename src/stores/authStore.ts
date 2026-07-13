/**
 * Auth Store (Zustand)
 *
 * Manages authentication state globally.
 * Uses phone number + password for authentication.
 */

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import {
  type AuthUser,
  getCurrentUser,
  onAuthStateChange,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
} from '../services/authService';

// ============================================================
// Store Interface
// ============================================================

interface AuthStore {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (phone: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// ============================================================
// Store Implementation
// ============================================================

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: () => {
    // Listen for auth changes
    onAuthStateChange((user, session) => {
      set({ user, session, loading: false });
    });

    // Get initial user
    getCurrentUser().then((user) => {
      set({ user, loading: false });
    }).catch(() => {
      set({ loading: false });
    });
  },

  signIn: async (phone: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const result = await authSignIn(phone, password);
      set({ user: result.user, session: result.session, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登录失败';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signUp: async (phone: string, password: string, displayName?: string) => {
    set({ loading: true, error: null });
    try {
      const user = await authSignUp(phone, password, displayName);
      set({ user, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '注册失败';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await authSignOut();
      set({ user: null, session: null, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '退出失败';
      set({ error: message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
